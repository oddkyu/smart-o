"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Award, ArrowRight, ShieldCheck, FileText, Clock, HelpCircle, RefreshCw, Camera, Sparkles } from "lucide-react";

import StatsSection from "@/components/StatsSection";
import FolderManager from "@/components/FolderManager";
import QuickActionButton from "@/components/QuickActionButton";
import GoogleAdDummy from "@/components/GoogleAdDummy";
import { useUserStatus } from "@/contexts/UserContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface Folder {
  id: string;
  name: string;
  color: string;
  wrongCount: number;
}

const INITIAL_FOLDERS: Folder[] = [
  { id: "f-1", name: "TOEIC Part 5 - 문법", color: "from-indigo-500 to-indigo-600", wrongCount: 18 },
  { id: "f-2", name: "TOEIC Part 6 - 장문", color: "from-sky-500 to-blue-600", wrongCount: 12 },
  { id: "f-3", name: "TOEIC Part 7 - 독해", color: "from-emerald-500 to-teal-600", wrongCount: 9 },
  { id: "f-4", name: "TOEIC Vocabulary", color: "from-rose-400 to-rose-600", wrongCount: 7 },
];

export default function Home() {
  const [folders, setFolders] = useState<Folder[]>(INITIAL_FOLDERS);
  const [mounted, setMounted] = useState(false);
  const { status } = useUserStatus();

  useEffect(() => {
    setMounted(true);
    
    async function loadData() {
      if (isSupabaseConfigured && supabase) {
        try {
          // Get User Session
          const { data: authData } = await supabase.auth.getUser();
          const userId = authData.user?.id;
          if (userId) {
            // Fetch folders
            const { data: fData, error: fError } = await supabase
              .from("folders")
              .select("*")
              .eq("user_id", userId)
              .order("created_at", { ascending: true });
            
            if (fError) throw fError;

            // Fetch notes count to calculate wrongCount per folder
            const { data: nData, error: nError } = await supabase
              .from("incorrect_notes")
              .select("folder_id")
              .eq("user_id", userId);

            if (nError) throw nError;

            const counts: Record<string, number> = {};
            nData?.forEach((n: any) => {
              counts[n.folder_id] = (counts[n.folder_id] || 0) + 1;
            });

            const formattedFolders = (fData || []).map((f: any) => ({
              id: f.id,
              name: f.name,
              color: f.color,
              wrongCount: counts[f.id] || 0,
            }));

            // 만약 Supabase에 등록된 과목이 없다면 최초 실행으로 간주하여 초기 폴더를 삽입해 줌
            if (formattedFolders.length === 0) {
              try {
                const insertData = INITIAL_FOLDERS.map(f => ({ name: f.name, color: f.color, user_id: userId }));
                const { data: inserted, error: insErr } = await supabase
                  .from("folders")
                  .insert(insertData)
                  .select();
                
                if (!insErr && inserted) {
                  const initFolders = inserted.map(item => ({
                    id: item.id,
                    name: item.name,
                    color: item.color,
                    wrongCount: 0
                  }));
                  setFolders(initFolders);
                  localStorage.setItem("smart-o-folders", JSON.stringify(initFolders));
                  return;
                }
              } catch (initErr) {
                console.error("Failed to seed initial folders to Supabase", initErr);
              }
            } else {
              // 구 데이터 삭제 마이그레이션 로직
              const legacyIds = formattedFolders.filter((f: any) => f.name.includes("9급") || f.name.includes("수능") || f.name.includes("행정학") || f.name.includes("한국사") || f.name.includes("민법")).map((f: any) => f.id);
              if (legacyIds.length > 0) {
                await supabase.from("folders").delete().in("id", legacyIds);
              }
              
              const filteredFolders = formattedFolders.filter((f: any) => !legacyIds.includes(f.id));
              if (filteredFolders.length === 0 && legacyIds.length > 0) {
                 const insertData = INITIAL_FOLDERS.map(f => ({ name: f.name, color: f.color, user_id: userId }));
                 const { data: inserted } = await supabase.from("folders").insert(insertData).select();
                 if (inserted) {
                   const initFolders = inserted.map(item => ({ id: item.id, name: item.name, color: item.color, wrongCount: 0 }));
                   setFolders(initFolders);
                   localStorage.setItem("smart-o-folders", JSON.stringify(initFolders));
                   return;
                 }
              }

              setFolders(filteredFolders);
              localStorage.setItem("smart-o-folders", JSON.stringify(filteredFolders));
              return;
            }
          }
        } catch (err) {
          // No user session or connection error - gracefully fallback without scary red console errors
          console.warn("Failed to fetch data from Supabase, falling back to localStorage");
        }
      }

      // Fallback to localStorage
      const stored = localStorage.getItem("smart-o-folders");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const hasLegacy = parsed.some((f: any) => f.name.includes("9급") || f.name.includes("수능") || f.name.includes("행정학") || f.name.includes("한국사") || f.name.includes("민법"));
          if (hasLegacy) {
            localStorage.setItem("smart-o-folders", JSON.stringify(INITIAL_FOLDERS));
            setFolders(INITIAL_FOLDERS);
          } else {
            setFolders(parsed);
          }
        } catch (e) {
          console.error("Failed to parse folders from localStorage", e);
        }
      } else {
        localStorage.setItem("smart-o-folders", JSON.stringify(INITIAL_FOLDERS));
        setFolders(INITIAL_FOLDERS);
      }
    }

    loadData();
  }, []);

  const [recentNotes, setRecentNotes] = useState<any[]>([]);

  useEffect(() => {
    async function loadRecentNotes() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          if (authData.user?.id) {
            const { data, error } = await supabase
              .from("incorrect_notes")
              .select("*")
              .eq("user_id", authData.user.id)
              .order("created_at", { ascending: false })
              .limit(2);
            
            if (error) throw error;
            if (data && data.length > 0) {
              setRecentNotes(data);
              return;
            }
          }
        } catch (err) {
          console.warn("Failed to fetch recent notes from Supabase");
        }
      }
      
      // Fallback: Check local storage notes
      const storedNotes = localStorage.getItem("smart-o-notes");
      if (storedNotes) {
        try {
          const parsed = JSON.parse(storedNotes);
          if (parsed && parsed.length > 0) {
            setRecentNotes(parsed.slice(-2).reverse()); // last 두 개
            return;
          }
        } catch (e) {
          console.error("Failed to parse notes from localStorage", e);
        }
      }
    }
    loadRecentNotes();
  }, []);

  const saveFolders = (newFolders: Folder[]) => {
    setFolders(newFolders);
    if (typeof window !== "undefined") {
      localStorage.setItem("smart-o-folders", JSON.stringify(newFolders));
    }
  };

  const handleAddFolder = async (name: string, color: string) => {
    let newFolderId = `f-${Date.now()}`;
    
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;
        if (!userId) throw new Error("No user");

        const { data, error } = await supabase
          .from("folders")
          .insert([{ name, color, user_id: userId }])
          .select();
        
        if (error) throw error;
        if (data && data.length > 0) {
          newFolderId = data[0].id;
        }
      } catch (err) {
        console.warn("Supabase insert folder error, using local id");
      }
    }

    const newFolder: Folder = {
      id: newFolderId,
      name,
      color,
      wrongCount: 0,
    };
    
    const updated = [...folders, newFolder];
    saveFolders(updated);
  };

  const handleUpdateFolder = async (id: string, name: string, color: string) => {
    if (isSupabaseConfigured && supabase && !id.startsWith("f-")) {
      try {
        const { error } = await supabase
          .from("folders")
          .update({ name, color })
          .eq("id", id);
        
        if (error) throw error;
      } catch (err) {
        console.warn("Supabase update folder error, proceeding with local update");
      }
    }

    const updated = folders.map((f) => (f.id === id ? { ...f, name, color } : f));
    saveFolders(updated);
  };

  const handleDeleteFolder = async (id: string) => {
    if (isSupabaseConfigured && supabase && !id.startsWith("f-")) {
      try {
        const { error } = await supabase
          .from("folders")
          .delete()
          .eq("id", id);
        
        if (error) throw error;
      } catch (err) {
        console.warn("Supabase delete folder error, proceeding with local delete");
      }
    }

    const updated = folders.filter((f) => f.id !== id);
    saveFolders(updated);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
        <span className="text-xs font-semibold">스마트 대시보드 로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative pb-24 transition-colors duration-250">
      
      {/* Background decoration blurs */}
      <div className="absolute top-0 left-1/4 h-[300px] sm:h-[500px] w-[300px] sm:w-[500px] -translate-y-64 rounded-full bg-primary/5 dark:bg-primary/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 h-[300px] sm:h-[500px] w-[300px] sm:w-[500px] -translate-y-32 rounded-full bg-purple-500/5 blur-[100px] pointer-events-none"></div>

      {/* Main Container */}
      <main className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-8 transition-all duration-500 animate-fade-in-up ${status === "premium" ? "space-y-12 sm:space-y-20" : "space-y-8"}`}>
        
        {status === "guest" ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-8 animate-fade-in-up">
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
                스마트폰으로 찍으면 <br className="sm:hidden" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">3초 만에 복원되는</span> <br className="hidden sm:block" />
                토익 오답노트
              </h2>
              <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                복잡한 타이핑, 지우개질은 그만! 사진 한 장이면 AI가 지문과 질문을 완벽히 분리하고 정답과 해설까지 알아서 정리해 줍니다.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/capture" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 px-8 py-4 sm:px-10 sm:py-5 text-sm sm:text-base font-extrabold text-white hover:opacity-90 shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-1 active:scale-95">
                  <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span>가입 없이 무료 체험 사진 업로드</span>
                </Link>
                <Link href="/vocab" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary border border-border px-8 py-4 sm:px-10 sm:py-5 text-sm sm:text-base font-extrabold text-foreground hover:bg-muted transition-all hover:-translate-y-1 active:scale-95">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500" />
                  <span>스마트 단어장 체험하기</span>
                </Link>
              </div>
            </div>

            {/* Features Section */}
            <div className="grid sm:grid-cols-3 gap-6 w-full max-w-5xl mt-12 sm:mt-16 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
              <div className="glass-panel p-8 rounded-3xl text-center space-y-4 hover:border-primary/30 transition-colors">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-foreground sm:text-lg">AI 자동 복원</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">빨간펜, 형광펜 낙서를 지우고 깔끔한 원본 텍스트로 즉시 변환합니다.</p>
              </div>
              <div className="glass-panel p-8 rounded-3xl text-center space-y-4 hover:border-indigo-500/30 transition-colors">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
                  <BookOpen className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-foreground sm:text-lg">스마트 분류</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">RC/LC 파트별로 자동 분류되어 취약점 파악이 쉬워집니다.</p>
              </div>
              <div className="glass-panel p-8 rounded-3xl text-center space-y-4 hover:border-purple-500/30 transition-colors">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500">
                  <RefreshCw className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-foreground sm:text-lg">무한 회독 시스템</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">틀린 문제를 반복해서 풀 수 있는 실전 오답 풀기 모드를 제공합니다.</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 3. Stats Section */}
        <StatsSection folders={folders} />

        {/* Killer Content: Smart Vocabulary Banner */}
        <div className="animate-fade-in-up">
          <Link href="/vocab" className="glass-panel group relative flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8 hover:border-indigo-500/50 transition-all duration-300">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-indigo-600"></div>
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-colors"></div>
              
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left z-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-lg sm:text-xl font-extrabold text-foreground group-hover:text-primary transition-colors">스마트 단어장</h3>
                    <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-500 border border-indigo-500/20">Free</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                    AI가 추출한 내 오답 속 핵심 단어들을 3D 플래시카드로 완벽하게 암기하세요.
                  </p>
                </div>
              </div>
              
              <div className="w-full sm:w-auto shrink-0 z-10 mt-2 sm:mt-0">
                <div className="flex items-center justify-center gap-1.5 rounded-xl sm:rounded-full bg-primary/10 sm:bg-secondary/80 px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-bold text-primary sm:text-foreground group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  학습 시작하기
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
          </Link>
        </div>

        {/* 4. Folders Grid Manager */}
        <FolderManager
          folders={folders}
          onAddFolder={handleAddFolder}
          onUpdateFolder={handleUpdateFolder}
          onDeleteFolder={handleDeleteFolder}
        />

        {/* Banner Ad for Free Users */}
        {status === "free" && (
          <div className="py-2 animate-fade-in-up">
            <GoogleAdDummy type="banner" />
          </div>
        )}

        {/* 5. Recent Added Notes Section */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-1.5">
              <FileText className="h-4.5 w-4.5 text-primary" />
              <h2 className="text-sm sm:text-lg font-bold text-foreground">최근 추가된 오답</h2>
            </div>
            <Link href="/notes" className="text-[10px] sm:text-xs text-muted-foreground hover:text-primary font-bold transition">
              오답 창고 바로가기 &rarr;
            </Link>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {(recentNotes ?? []).length > 0 ? (
              (recentNotes ?? []).map((note) => {
                let passage = "";
                let text = note.question;
                try {
                  if (text.startsWith("{")) {
                    const parsed = JSON.parse(text);
                    passage = parsed.passage || "";
                    text = parsed.text || "";
                  }
                } catch (e) {}

                return (
                  <Link 
                    href={`/notes?subject=${encodeURIComponent(note.subject)}#note-${note.id}`}
                    key={note.id} 
                    className="glass-panel block rounded-xl sm:rounded-2xl p-4.5 sm:p-6 relative overflow-hidden border border-border hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 transition duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary">
                        {note.subject}
                      </span>
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>최근 복원</span>
                      </div>
                    </div>

                    <div className="mt-3.5 space-y-2.5">
                      {passage && (
                        <div className="bg-secondary/30 p-3 rounded-lg border border-border/50 text-[10px] sm:text-xs font-medium text-foreground leading-relaxed line-clamp-3">
                          {passage}
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <span className="text-red-500 font-extrabold text-xs sm:text-sm shrink-0">Q.</span>
                        <p className="text-xs sm:text-sm font-bold text-foreground leading-relaxed line-clamp-2">
                          {text}
                        </p>
                      </div>

                      <div className="pl-4 space-y-1 text-[11px] text-muted-foreground">
                        {note.options && note.options.slice(0, 3).map((opt: string, oIdx: number) => (
                          <p key={oIdx} className={`line-clamp-1 ${oIdx + 1 === (note.correct_answer ?? note.correctAnswer) ? "text-red-500 dark:text-red-400 font-bold" : ""}`}>
                            {opt}
                          </p>
                        ))}
                        {note.options && note.options.length > 3 && <p className="text-muted-foreground/60">... (이하 생략) ...</p>}
                      </div>
                    </div>

                    {note.ai_hint && (
                      <div className="mt-4 rounded-xl bg-secondary border border-border p-3 sm:p-4 space-y-1">
                        <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-primary">
                          <HelpCircle className="h-3.5 w-3.5" />
                          <span>AI 처방 요약</span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {note.ai_hint || note.aiHint}
                        </p>
                      </div>
                    )}

                    <div className="mt-3.5 pt-3 border-t border-border flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>단원: {note.chapter}</span>
                      <span className="flex items-center gap-1 text-orange-650 dark:text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded-full">
                        <RefreshCw className="h-3 w-3" />
                        <span>회독 {note.wrong_count || note.wrongCount || 1}회차</span>
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-secondary/30 rounded-2xl border border-border/50 border-dashed animate-fade-in-up">
                <div className="text-5xl mb-4 drop-shadow-md">🐹</div>
                <p className="text-sm sm:text-base font-extrabold text-foreground bg-primary/10 text-primary px-4 py-2 rounded-full mb-3">
                  페이스메이커 나롱이: "지금은 등록된 오답이 없어! 완벽해!"
                </p>
                <p className="text-xs text-muted-foreground mt-1">오른쪽 하단 카메라 버튼을 눌러 새로운 오답을 추가해보세요.</p>
              </div>
            )}
          </div>
        </section>
        </>
        )}

      </main>

      {/* 6. Glowing Floating Camera Button */}
      <QuickActionButton />
    </div>
  );
}
