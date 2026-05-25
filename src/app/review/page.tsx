"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Save, HelpCircle, AlertCircle, CheckCircle2, Image as ImageIcon } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useUserStatus } from "@/contexts/UserContext";

const GRADIENT_COLORS = [
  "from-indigo-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-400 to-rose-600",
  "from-purple-500 to-indigo-650",
  "from-blue-500 to-blue-600"
];

function getRandomColor() {
  return GRADIENT_COLORS[Math.floor(Math.random() * GRADIENT_COLORS.length)];
}

export default function ReviewPage() {
  const { status } = useUserStatus();
  
  // Mock Gemini extracted state
  const [subject, setSubject] = useState("TOEIC Part 5 - 문법");
  const [chapter, setChapter] = useState("전치사/접속사");
  const [passageText, setPassageText] = useState("");
  const [questionText, setQuestionText] = useState("All employees must submit their expense reports ------- the end of each month.");
  const [options, setOptions] = useState([
    "by",
    "until",
    "since",
    "during"
  ]);
  const [aiHint, setAiHint] = useState("'by the end of'는 기한을 나타내는 전치사 관용 표현이며, 동작의 완료 기한을 뜻하므로 'by'가 정답입니다. 'until'은 상태의 지속을 나타낼 때 사용합니다.");
  const [grammarNodeId, setGrammarNodeId] = useState<string | null>("PREPOSITION");
  const [correctAnswer, setCorrectAnswer] = useState<number>(1); // Default to 1 (by)
  const [words, setWords] = useState<any[]>([]);
  const [originalTranslation, setOriginalTranslation] = useState<string>("");
  const [fineGrainedConcept, setFineGrainedConcept] = useState<string>("");

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = sessionStorage.getItem("smart-o-captured-url");
      const base64 = sessionStorage.getItem("smart-o-captured-base64");
      setImageUrl(url || base64);

      // AI 분석으로 로드된 진짜 제미나이 데이터 파싱 및 폼 상태에 자동 반영
      const extractedStr = sessionStorage.getItem("smart-o-extracted-data");
      if (extractedStr) {
        try {
          const parsed = JSON.parse(extractedStr);
          const defaultSubj = sessionStorage.getItem("smart-o-default-subject");
          if (defaultSubj) {
            setSubject(defaultSubj);
          } else if (parsed.subject) {
            setSubject(parsed.subject);
          }
          if (parsed.chapter) setChapter(parsed.chapter);
          if (parsed.passage) setPassageText(parsed.passage);
          if (parsed.question) setQuestionText(parsed.question);
          if (parsed.options && Array.isArray(parsed.options)) setOptions(parsed.options);
          if (parsed.aiHint) setAiHint(parsed.aiHint);
          if (parsed.grammar_node_id) setGrammarNodeId(parsed.grammar_node_id);
          if (parsed.correctAnswer) setCorrectAnswer(parsed.correctAnswer);
          if (parsed.words && Array.isArray(parsed.words)) setWords(parsed.words);
          if (parsed.original_translation) setOriginalTranslation(parsed.original_translation);
          if (parsed.fine_grained_concept) setFineGrainedConcept(parsed.fine_grained_concept);
        } catch (e) {
          console.error("Failed to parse extracted data from sessionStorage", e);
        }
      }
    }
  }, []);

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // [Option B] 데모 환경 등에서 토글이 "guest" 상태일 경우 저장 불가, 모달 노출
      if (status === "guest") {
        setShowSignupModal(true);
        setSaving(false);
        return;
      }

      let dbSaved = false;

      if (isSupabaseConfigured && supabase) {
        // Get user session
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;
        
        if (userId) {
          // 1. Find or create folder in Supabase
          let folderId = "";
          const { data: foldersData, error: foldersError } = await supabase
            .from("folders")
            .select("*")
            .eq("user_id", userId);
          
          if (foldersError) throw foldersError;
          
          const matchingFolder = (foldersData || []).find(
            (f: any) => f.name.trim().toLowerCase() === subject.trim().toLowerCase()
          );

          if (matchingFolder) {
            folderId = matchingFolder.id;
          } else {
            const color = getRandomColor();
            const { data: newFolderData, error: newFolderError } = await supabase
              .from("folders")
              .insert([{ name: subject, color, user_id: userId }])
              .select();
            
            if (newFolderError) throw newFolderError;
            if (newFolderData && newFolderData.length > 0) {
              folderId = newFolderData[0].id;
            }
          }

          // 2. Insert note in Supabase
          const insertPayload: any = {
            user_id: userId,
            folder_id: folderId,
            subject,
            chapter,
            question: { passage: passageText, text: questionText, translation: originalTranslation, fine_grained_concept: fineGrainedConcept },
            options,
            correct_answer: correctAnswer,
            ai_hint: aiHint,
            image_url: imageUrl,
            wrong_count: 1,
            words: words,
            grammar_node_id: grammarNodeId
          };

          const { error: noteError } = await supabase
            .from("incorrect_notes")
            .insert([insertPayload]);
          
          if (noteError) {
            const errMsg = noteError.message || noteError.details || "";
            if (noteError.code === "42703" || noteError.code === "PGRST204" || errMsg.includes("words")) {
              console.warn("Supabase 'notes' table is missing 'words' column. Saving without words. Please add a 'words' JSONB column to your database.");
              delete insertPayload.words;
              const { error: retryError } = await supabase
                .from("incorrect_notes")
                .insert([insertPayload]);
              
              if (retryError) throw retryError;
            } else {
              throw noteError;
            }
          }
          dbSaved = true;
        }
      }

      // If we couldn't save to DB (no supabase or no user ID but toggle is Free/Premium), fallback to localStorage
      if (!dbSaved) {
        if (typeof window !== "undefined") {
          // 1. Folders management
          const storedFolders = localStorage.getItem("smart-o-folders");
          let folders = storedFolders ? JSON.parse(storedFolders) : [];
          let folderObj = folders.find(
            (f: any) => f.name.trim().toLowerCase() === subject.trim().toLowerCase()
          );

          if (!folderObj) {
            folderObj = {
              id: `f-${Date.now()}`,
              name: subject,
              color: getRandomColor(),
              wrongCount: 0
            };
            folders.push(folderObj);
          }
          
          // Increment count
          folderObj.wrongCount = (folderObj.wrongCount || 0) + 1;
          localStorage.setItem("smart-o-folders", JSON.stringify(folders));

          // 2. Notes management
          const storedNotes = localStorage.getItem("smart-o-notes");
          let notes = storedNotes ? JSON.parse(storedNotes) : [];
          const newNote = {
            id: `n-${Date.now()}`,
            subject,
            chapter,
            question: JSON.stringify({ passage: passageText, text: questionText, translation: originalTranslation, fine_grained_concept: fineGrainedConcept }),
            options,
            correctAnswer,
            aiHint,
            wrongCount: 1,
            imageUrl: imageUrl || undefined,
            createdAt: new Date().toISOString(),
            words: words,
            grammarNodeId: grammarNodeId
          };
          notes.push(newNote);
          localStorage.setItem("smart-o-notes", JSON.stringify(notes));
        }
      }

      // Cleanup capture cache
      sessionStorage.removeItem("smart-o-captured-url");
      sessionStorage.removeItem("smart-o-captured-base64");

      setSaveSuccess(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);

    } catch (err: any) {
      console.error("Failed to save wrong note", err?.message || JSON.stringify(err) || err);
      alert("오답 노트를 저장하는 과정에서 오류가 발생했습니다. 콘솔을 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative pb-16 transition-colors duration-250">
      {/* Background Glow */}
      <div className="absolute top-0 right-1/3 h-[300px] sm:h-[500px] w-[300px] sm:w-[500px] -translate-y-64 rounded-full bg-primary/5 dark:bg-primary/10 blur-[100px] pointer-events-none"></div>

      <DashboardHeader />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6 animate-fade-in-up">
        
        {/* Back Link */}
        <Link href="/capture" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>카메라 화면으로 돌아가기</span>
        </Link>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <span>AI 분석 결과 검토 및 편집</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Gemini AI가 이미지 분석을 완료했습니다. 틀린 텍스트가 있다면 바로 수정해 주세요.
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1.5 border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400 w-fit">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>볼펜 낙서 제거 완료</span>
          </div>
        </div>

        {/* Image Preview Card (Premium UI touch) */}
        {imageUrl && (
          <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center animate-fade-in-up">
            <div className="relative rounded-xl overflow-hidden border border-border bg-slate-900 aspect-[4/3] w-full sm:w-44 flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Captured problem thumbnail" className="max-h-full object-contain" />
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                <ImageIcon className="h-3 w-3" />
                <span>문제 이미지 로드 완료</span>
              </div>
              <h4 className="text-xs font-bold text-foreground mt-1">촬영된 원본 문제 스크린샷</h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                오답을 저장하면 해당 이미지가 오답 노트 본문에 연결되어 언제든 원본을 확인하고 다시 풀어볼 수 있습니다.
              </p>
            </div>
          </div>
        )}

        {/* Main Form Box */}
        <form onSubmit={handleSave} className="bg-card border border-border shadow-sm rounded-2xl p-5 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in-up">
          
          {/* Section: Category & Tagging as Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1.5 focus-within:border-primary focus-within:bg-secondary transition-colors shadow-sm">
              <span className="text-[10px] sm:text-xs font-bold text-muted-foreground whitespace-nowrap">과목명</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-bold text-foreground w-28 sm:w-40 focus:outline-none"
                required
              />
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1.5 focus-within:border-primary focus-within:bg-secondary transition-colors shadow-sm">
              <span className="text-[10px] sm:text-xs font-bold text-muted-foreground whitespace-nowrap">단원정보</span>
              <input
                type="text"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-bold text-foreground w-28 sm:w-40 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Section: Question Text (First) */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
              <span className="text-red-500 dark:text-red-400">Q.</span> 실제 질문 내용
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={2}
              className="w-full bg-transparent border-b border-border/60 py-2 text-sm sm:text-base font-bold text-foreground leading-relaxed focus:border-primary focus:outline-none transition-colors resize-y"
              required
              placeholder="질문을 입력하세요..."
            />
          </div>

          {/* Section: Passage Text (Below Question) */}
          <div className="space-y-2 bg-secondary/20 p-4 sm:p-5 rounded-2xl border border-border/50 shadow-sm">
            <label className="text-[10px] sm:text-xs font-bold text-muted-foreground">배경 지문 (없을 경우 비워둠)</label>
            <textarea
              value={passageText}
              onChange={(e) => setPassageText(e.target.value)}
              rows={4}
              className="w-full bg-transparent border-none p-0 text-xs sm:text-sm text-foreground leading-relaxed focus:outline-none resize-y"
              placeholder="배경 지문을 입력하세요..."
            />
          </div>

          {/* Section: Options 1~4 with interactive correct answer selection */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-1">
              <label className="text-xs font-bold text-foreground">정답 문항 확인 (4지선다)</label>
              <span className="text-[10px] text-muted-foreground">알파벳을 클릭해 <strong className="text-red-500 font-bold">정답</strong>을 설정하세요.</span>
            </div>
            
            <div className="space-y-2 sm:space-y-2.5">
              {options.slice(0, 4).map((option, idx) => {
                const isSelected = correctAnswer === idx + 1;
                const letter = String.fromCharCode(65 + idx); // A, B, C, D
                return (
                  <div key={idx} className={`flex gap-2.5 items-center rounded-xl p-1.5 sm:p-2 transition-colors ${isSelected ? "bg-red-500/5 ring-1 ring-red-500/20" : "hover:bg-secondary/40"}`}>
                    <button
                      type="button"
                      onClick={() => setCorrectAnswer(idx + 1)}
                      className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? "bg-red-500 border-red-500 text-white font-extrabold shadow-sm shadow-red-500/20 scale-105"
                          : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                      }`}
                      title="정답으로 지정"
                    >
                      <span className="text-xs sm:text-sm">{letter}</span>
                    </button>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      className={`flex-1 bg-transparent border-b px-2 py-1.5 text-xs sm:text-sm text-foreground focus:outline-none transition-colors ${
                        isSelected
                          ? "border-red-500/40 font-bold text-red-600 dark:text-red-400"
                          : "border-border/60 focus:border-primary/50"
                      }`}
                      required
                      placeholder={`보기 ${letter} 내용을 입력하세요`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: AI Hint Explanation */}
          <div className="space-y-3 pt-6 border-t border-border/60">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-primary" />
              <label className="text-xs font-bold text-foreground">AI 추천 힌트 및 해설 요약</label>
            </div>
            <textarea
              value={aiHint}
              onChange={(e) => setAiHint(e.target.value)}
              rows={3}
              className="w-full bg-transparent border-b border-border/60 py-2 text-xs sm:text-sm text-foreground leading-relaxed focus:border-primary focus:outline-none transition-colors resize-y"
              required
              placeholder="해설을 입력하세요..."
            />
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <Link
              href="/"
              className="rounded-xl border border-border hover:bg-secondary px-5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              폐기하기
            </Link>
            
            <button
              type="submit"
              disabled={saving || saveSuccess}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-6 py-2.5 text-xs font-extrabold text-white hover:opacity-90 shadow-md shadow-indigo-500/10 cursor-pointer transition active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  <span>오답 노트 저장 중...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>오답 폴더 저장 완료!</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>내 오답 폴더에 최종 저장</span>
                </>
              )}
            </button>
          </div>

        </form>

        {/* Global Save Alert Toast */}
        {saveSuccess && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-card border border-border px-6 py-4 shadow-2xl flex items-center gap-3 animate-bounce">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">성공적으로 저장되었습니다!</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">대시보드로 이동하여 복습을 계속 진행하세요.</p>
            </div>
          </div>
        )}

        {/* Guest Signup Prompt Modal */}
        {showSignupModal && (
          <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-background w-full max-w-sm rounded-3xl p-6 text-center space-y-6 relative border border-border shadow-2xl">
              <div className="h-16 w-16 mx-auto bg-gradient-to-tr from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-2">
                <Save className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-xl text-foreground mb-2">회원가입이 필요해요!</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  AI가 완벽하게 분석한 이 오답노트를 영구 보관하고 스마트 단어장과 연동하려면 <span className="font-bold text-primary">단 3초 만에 회원가입</span>해 주세요!
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button type="button" onClick={() => setShowSignupModal(false)} className="rounded-2xl bg-secondary py-3.5 font-bold text-muted-foreground hover:bg-muted active:scale-95 transition-all">
                  닫기
                </button>
                <button type="button" onClick={() => { setShowSignupModal(false); window.location.href = "/"; }} className="rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 py-3.5 font-extrabold text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                  회원가입 하기
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

