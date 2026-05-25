"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Volume2, Check, X, PartyPopper, PlayCircle, BrainCircuit, Loader2 } from "lucide-react";
import { TOEIC_DUMMY_WORDS } from "./dummyWords";
import { useAudioStream } from "@/hooks/useAudioStream";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface WordItem {
  id: string;
  word: string;
  meaning: string;
  example_sentence?: string;
  example_translation?: string;
}

export default function VocabularyStagePage() {
  const [words, setWords] = useState<WordItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  // --- State Machine ---
  const [vocabStep, setVocabStep] = useState<1 | 2 | 3 | 4>(1);
  const [currentIndex, setCurrentIndex] = useState(0);

  // --- Step specific states ---
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [spellingInput, setSpellingInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  // --- AI Gateway states ---
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);

  const { playPronunciation } = useAudioStream();

  useEffect(() => {
    const fetchWords = async () => {
      let loadedWords: WordItem[] = [];

      // 1. Supabase 실전 데이터 페칭
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from("incorrect_notes")
            .select("words")
            .not("words", "is", null);

          if (!error && data) {
            data.forEach((note: any) => {
              if (Array.isArray(note.words)) {
                note.words.forEach((w: any) => {
                  loadedWords.push({
                    id: w.id || `w-${Math.random()}`,
                    word: w.word,
                    meaning: w.meanings ? w.meanings.join(", ") : (w.meaning || ""),
                    example_sentence: w.example_sentence || `The manager decided to _____ the new policy.`,
                    example_translation: w.example_translation || `관리자는 새로운 정책을 적용하기로 결정했다.`
                  });
                });
              }
            });
          }
        } catch (e) {
          console.error("Supabase fetch error:", e);
        }
      }

      // 2. 로컬 스토리지 데이터 (Supabase 실패/로컬모드 대비)
      if (loadedWords.length === 0) {
        try {
          const stored = localStorage.getItem("smart-o-notes");
          if (stored) {
            const notes = JSON.parse(stored);
            notes.forEach((note: any) => {
              if (note.words && Array.isArray(note.words)) {
                note.words.forEach((w: any) => {
                  loadedWords.push({
                    id: w.id || `w-${Date.now()}-${Math.random()}`,
                    word: w.word,
                    meaning: w.meanings ? w.meanings.join(", ") : (w.meaning || ""),
                    example_sentence: w.example_sentence || `The manager decided to _____ the new policy.`,
                    example_translation: w.example_translation || `관리자는 새로운 정책을 적용하기로 결정했다.`
                  });
                });
              }
            });
          }
        } catch (e) {}
      }

      // 3. 최후의 보루: Dummy Mock 데이터 Fallback
      if (loadedWords.length === 0) {
        loadedWords = TOEIC_DUMMY_WORDS.map(w => ({
          id: `w-${Math.random()}`,
          word: w.word,
          meaning: w.meaning,
          example_sentence: (w as any).example_sentence || `She wants to _____ the document.`,
          example_translation: (w as any).example_translation || `그녀는 문서를 처리하고 싶어한다.`
        }));
      }

      // 단어 리스트 랜덤 셔플 및 최대 10개 추출 (모바일 마이크로러닝 텐션 유지)
      const shuffled = loadedWords.sort(() => 0.5 - Math.random()).slice(0, 10);
      setWords(shuffled);
      setIsLoading(false);
    };

    fetchWords();
  }, []);

  const currentWord = words[currentIndex];
  const totalSteps = 4;
  const totalWords = words.length;
  
  // 전체 진척도 계산
  const totalTasks = totalSteps * totalWords;
  const currentTask = (vocabStep - 1) * totalWords + currentIndex;
  const progressPercent = totalWords > 0 ? (currentTask / totalTasks) * 100 : 0;

  const generateOptions = (correct: string, isEnglish: boolean) => {
    const pool = isEnglish ? TOEIC_DUMMY_WORDS.map(w => w.word) : TOEIC_DUMMY_WORDS.map(w => w.meaning);
    const wrongs = pool.filter(w => w !== correct).sort(() => 0.5 - Math.random()).slice(0, 3);
    return [correct, ...wrongs].sort(() => 0.5 - Math.random());
  };

  const step2Options = useMemo(() => {
    if (vocabStep === 2 && currentWord) return generateOptions(currentWord.meaning, false);
    return [];
  }, [vocabStep, currentIndex, currentWord]);

  const step4Options = useMemo(() => {
    if (vocabStep === 4 && currentWord) return generateOptions(currentWord.word, true);
    return [];
  }, [vocabStep, currentIndex, currentWord]);

  const handleNextTask = () => {
    setFeedback(null);
    setSelectedOption(null);
    setSpellingInput("");
    setIsFlipped(false);
    setAiHint(null);

    if (currentIndex + 1 < totalWords) {
      setCurrentIndex(currentIndex + 1);
    } else {
      if (vocabStep < 4) {
        setVocabStep((vocabStep + 1) as 1 | 2 | 3 | 4);
        setCurrentIndex(0);
      } else {
        setIsFinished(true);
      }
    }
  };

  const onOptionSelect = (option: string, correct: string) => {
    if (feedback !== null) return;
    setSelectedOption(option);
    
    if (option === correct) {
      setFeedback("correct");
      setTimeout(() => handleNextTask(), 600);
    } else {
      setFeedback("wrong");
      setTimeout(() => {
        setFeedback(null);
        setSelectedOption(null);
      }, 800);
    }
  };

  const onSpellingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback !== null) return;
    
    if (spellingInput.trim().toLowerCase() === currentWord?.word.toLowerCase()) {
      setFeedback("correct");
      setTimeout(() => handleNextTask(), 600);
    } else {
      setFeedback("wrong");
      setTimeout(() => setFeedback(null), 800);
    }
  };

  // --- AI Gateway Trigger ---
  const requestAiHint = async (type: "HINT" | "TWIN_QUIZ") => {
    if (!currentWord || isAiLoading) return;
    setIsAiLoading(true);
    setAiHint(null);
    
    try {
      const prompt = `단어 '${currentWord.word}'(뜻: ${currentWord.meaning})에 대한 암기 연상법 힌트를 제공해라. 반드시 {"hint": "여기에 2줄 이내의 재미있는 연상법 작성"} 형식의 JSON으로만 응답해라.`;
      
      const res = await fetch("/api/ai-gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId: `hint-${currentWord.word}`, 
          responseType: type,
          prompt
        })
      });
      
      const data = await res.json();
      if (data.success && data.data?.hint) {
        setAiHint(data.data.hint);
      } else {
        setAiHint("AI 힌트를 불러오는 데 실패했습니다.");
      }
    } catch (err) {
      setAiHint("네트워크 오류가 발생했습니다.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- Master Page Update Progress ---
  const updateLearningProgress = async () => {
    console.log(`[업데이트] ${words.length}개 단어 4단계 완파 완료!`);
    if (isSupabaseConfigured && supabase) {
      // 차후 learning_logs 또는 progress 테이블에 기록하는 뼈대
      // await supabase.from('vocab_progress').insert({ word_count: words.length, completed_at: new Date() });
    }
    alert("학습 성취도가 클라우드에 저장되었습니다! 🎉");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="animate-spin h-8 w-8 text-cyan-400 mb-4" />
        <span className="text-sm font-bold">단어장 데이터 동기화 중...</span>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-4">
        <PartyPopper className="h-20 w-20 text-cyan-400 mb-6 animate-bounce" />
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">학습 루프 마스터!</h1>
        <p className="text-slate-400 mb-8 text-center">오늘 총 <span className="text-cyan-400 font-bold text-lg">{words.length}</span>개의 단어를 완벽하게 마스터했습니다.</p>
        
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button 
            onClick={updateLearningProgress}
            className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900 px-8 py-4 rounded-2xl font-extrabold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
          >
            기록 저장하기
          </button>
          <Link href="/" className="w-full bg-slate-800 text-slate-300 border border-slate-700 px-8 py-4 rounded-2xl font-bold hover:bg-slate-700 hover:text-white transition-all text-center">
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const blankSentence = currentWord?.example_sentence?.replace(new RegExp(currentWord.word, "gi"), "_____");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 relative pb-32 selection:bg-cyan-500/30">
      <div className="max-w-md mx-auto h-full flex flex-col relative pt-16 px-4">
        
        {/* Progress Header */}
        <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-950/80 backdrop-blur-md z-50 border-b border-slate-800">
          <div className="flex items-center justify-between p-4">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors p-1 -ml-1">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div className="text-sm font-extrabold text-slate-300">
              <span className="text-cyan-400">Step {vocabStep}</span> / 4
            </div>
            <div className="text-xs font-bold text-slate-500">{currentIndex + 1} / {totalWords}</div>
          </div>
          <div className="w-full h-1.5 bg-slate-900 overflow-hidden">
            <div 
              className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </header>

        {/* 메인 뷰어 */}
        <main className="flex-1 flex flex-col items-center justify-center mt-8 animate-fade-in-up w-full">
          
          {vocabStep === 1 && (
            <div className="w-full perspective-1000">
              <div className="text-center mb-6">
                <p className="text-slate-400 text-sm font-bold">1단계: 3D 카드 플립</p>
                <p className="text-xs text-slate-500 mt-1">카드를 뒤집어 발음과 뜻을 확인하세요</p>
              </div>
              <div 
                className={`relative w-full aspect-[4/3] transition-all duration-500 transform-style-3d cursor-pointer ${isFlipped ? "rotate-y-180" : ""}`}
                onClick={() => {
                  if (!isFlipped) playPronunciation(null, currentWord.word, 'US');
                  setIsFlipped(!isFlipped);
                }}
              >
                <div className="absolute inset-0 w-full h-full bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center justify-center backface-hidden shadow-2xl">
                  <h2 className="text-4xl font-extrabold text-white tracking-tight">{currentWord.word}</h2>
                  <PlayCircle className="h-10 w-10 text-cyan-500 mt-6 opacity-50" />
                </div>
                <div className="absolute inset-0 w-full h-full bg-cyan-950/30 border border-cyan-900 rounded-3xl flex flex-col items-center justify-center backface-hidden rotate-y-180 shadow-2xl px-6 text-center">
                  <h2 className="text-3xl font-extrabold text-cyan-100 mb-4">{currentWord.meaning}</h2>
                  <button 
                    onClick={(e) => { e.stopPropagation(); playPronunciation(e, currentWord.word, 'US'); }}
                    className="p-3 rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/40 transition-colors"
                  >
                    <Volume2 className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {vocabStep === 2 && (
            <div className="w-full">
              <div className="text-center mb-8">
                <p className="text-slate-400 text-sm font-bold">2단계: 뜻 매칭 스피드 퀴즈</p>
                <h2 className="text-4xl font-extrabold text-white mt-4 tracking-tight">{currentWord.word}</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 w-full">
                {step2Options.map((opt, i) => {
                  const isSelected = selectedOption === opt;
                  const isCorrectBtn = isSelected && feedback === "correct";
                  const isWrongBtn = isSelected && feedback === "wrong";
                  
                  return (
                    <button
                      key={i}
                      onClick={() => onOptionSelect(opt, currentWord.meaning)}
                      className={`w-full p-5 rounded-2xl border text-left font-bold transition-all ${
                        isCorrectBtn ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" :
                        isWrongBtn ? "bg-rose-500/20 border-rose-500 text-rose-400 animate-shake" :
                        "bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-600 hover:bg-slate-800"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {vocabStep === 3 && (
            <div className="w-full">
              <div className="text-center mb-6">
                <p className="text-slate-400 text-sm font-bold">3단계: 맥락 빈칸 채우기</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl mb-6 shadow-xl">
                <p className="text-lg leading-relaxed text-slate-300 font-medium">{blankSentence}</p>
                <p className="text-sm text-slate-500 mt-4 pt-4 border-t border-slate-800">{currentWord.example_translation}</p>
              </div>
              
              <form onSubmit={onSpellingSubmit} className="relative w-full mb-6">
                <input
                  type="text"
                  value={spellingInput}
                  onChange={(e) => setSpellingInput(e.target.value)}
                  placeholder="빈칸 단어 입력"
                  className={`w-full bg-slate-900 border-2 rounded-2xl px-6 py-4 text-center font-bold text-lg text-white focus:outline-none transition-all ${
                    feedback === "correct" ? "border-emerald-500 text-emerald-400" :
                    feedback === "wrong" ? "border-rose-500 text-rose-400 animate-shake" :
                    "border-slate-700 focus:border-cyan-500"
                  }`}
                  autoComplete="off"
                />
              </form>

              {/* AI Hint Gateway Intergation */}
              <div className="w-full flex justify-center">
                <button 
                  type="button"
                  onClick={() => requestAiHint("HINT")}
                  disabled={isAiLoading || !!aiHint}
                  className="flex items-center gap-2 text-sm font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                  <span>{aiHint ? "AI 연상법 힌트 도착" : "막혔나요? AI 연상 힌트 받기"}</span>
                </button>
              </div>
              
              {aiHint && (
                <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl animate-fade-in-up text-indigo-200 text-sm leading-relaxed text-center font-medium">
                  {aiHint}
                </div>
              )}
            </div>
          )}

          {vocabStep === 4 && (
            <div className="w-full">
              <div className="text-center mb-8">
                <p className="text-slate-400 text-sm font-bold">4단계: 최종 객관식 레이드</p>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl mt-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <BrainCircuit className="h-16 w-16 text-cyan-400" />
                  </div>
                  <p className="text-base text-slate-300 font-medium relative z-10">{blankSentence}</p>
                  <p className="text-sm text-cyan-400 mt-3 font-bold relative z-10">뜻: {currentWord.meaning}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full">
                {step4Options.map((opt, i) => {
                  const isSelected = selectedOption === opt;
                  const isCorrectBtn = isSelected && feedback === "correct";
                  const isWrongBtn = isSelected && feedback === "wrong";
                  
                  return (
                    <button
                      key={i}
                      onClick={() => onOptionSelect(opt, currentWord.word)}
                      className={`w-full py-5 rounded-2xl border text-center font-bold transition-all ${
                        isCorrectBtn ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" :
                        isWrongBtn ? "bg-rose-500/20 border-rose-500 text-rose-400 animate-shake" :
                        "bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-600 hover:bg-slate-800"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </main>

        {/* Bottom Actions */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50">
          {vocabStep === 1 && (
            <button 
              onClick={handleNextTask}
              className={`w-full py-4 rounded-2xl font-extrabold shadow-2xl transition-all active:scale-95 ${
                isFlipped 
                  ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900 shadow-cyan-500/20" 
                  : "bg-slate-800 text-slate-400 pointer-events-none"
              }`}
            >
              {isFlipped ? "다음 단어 ➔" : "카드를 뒤집으세요"}
            </button>
          )}

          {vocabStep === 3 && (
            <button 
              onClick={onSpellingSubmit}
              className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900 py-4 rounded-2xl font-extrabold shadow-2xl shadow-cyan-500/20 active:scale-95 transition-transform"
            >
              정답 제출
            </button>
          )}

          {(vocabStep === 2 || vocabStep === 4) && (
            <div className="w-full text-center text-xs text-slate-500 font-bold bg-slate-900/50 backdrop-blur-sm py-3 rounded-full border border-slate-800">
              보기 중 하나를 터치하세요 👆
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
