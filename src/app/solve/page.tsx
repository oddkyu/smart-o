"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, PlayCircle, Layers, CheckCircle2, XCircle, HelpCircle, Shuffle, Sparkles, BookOpen, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface Note {
  id: string;
  subject: string;
  chapter: string;
  question: string;
  options: string[];
  correctAnswer: number;
  aiHint: string;
  wrongCount: number;
  imageUrl?: string;
}

export default function SolvePage() {
  const [phase, setPhase] = useState<"setup" | "quiz" | "result" | "review">("setup");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Setup State
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [isRandomMode, setIsRandomMode] = useState<boolean>(false);
  
  // Quiz & Review State
  const [quizQueue, setQuizQueue] = useState<Note[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    async function loadNotes() {
      setLoading(true);
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          const userId = authData.user?.id;
          
          if (userId) {
            const { data, error } = await supabase
              .from("incorrect_notes")
              .select("*")
              .eq("user_id", userId)
              .order("created_at", { ascending: false });
            
            if (!error && data) {
              const formatted = data.map((n: any) => ({
                id: n.id,
                subject: n.subject,
                chapter: n.chapter,
                question: n.question,
                options: n.options,
                correctAnswer: n.correct_answer ?? n.correctAnswer,
                aiHint: n.ai_hint ?? n.aiHint,
                wrongCount: n.wrong_count ?? n.wrongCount,
                imageUrl: n.image_url ?? n.imageUrl,
              }));
              setNotes(formatted);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error("Supabase fetch failed", err);
        }
      }

      // LocalStorage Fallback
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("smart-o-notes");
        if (stored) {
          try {
            setNotes(JSON.parse(stored));
          } catch (e) {
            console.error("Parse error", e);
          }
        }
        
        // [2단계: 새로고침 방어선] - Hydration
        const savedSolveState = localStorage.getItem("smart-o-solve-state");
        if (savedSolveState) {
          try {
            const parsedState = JSON.parse(savedSolveState);
            if (parsedState && parsedState.quizQueue && parsedState.quizQueue.length > 0) {
              setQuizQueue(parsedState.quizQueue);
              setPhase(parsedState.phase || "quiz");
              setCurrentIndex(parsedState.currentIndex || 0);
              setUserAnswers(parsedState.userAnswers || []);
              setScore(parsedState.score || 0);
            }
          } catch (e) {
            console.warn("Failed to parse saved solve state", e);
          }
        }
      }
      setLoading(false);
    }
    loadNotes();
  }, []);

  // [2단계: 새로고침 방어선] - Realtime Sync
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (phase === "setup") {
        // 학습 루프 종료 시 상태 청소
        localStorage.removeItem("smart-o-solve-state");
      } else if (quizQueue.length > 0) {
        // 학습 중 상태 즉시 저장
        localStorage.setItem("smart-o-solve-state", JSON.stringify({
          phase,
          quizQueue,
          currentIndex,
          userAnswers,
          score
        }));
      }
    }
  }, [phase, quizQueue, currentIndex, userAnswers, score]);

  const subjects = ["all", ...Array.from(new Set(notes.map((n) => n.subject)))];

  const handleStartQuiz = () => {
    let pool = notes;
    if (!isRandomMode && selectedSubject !== "all") {
      pool = notes.filter(n => n.subject === selectedSubject);
    }
    
    if (pool.length === 0) {
      alert("조건에 맞는 오답 노트가 없습니다. 다른 파트를 선택해주세요.");
      return;
    }

    // Shuffle and pick 10
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = isRandomMode ? shuffled.slice(0, 10) : shuffled.slice(0, 10); // always up to 10
    
    setQuizQueue(selected);
    setUserAnswers(new Array(selected.length).fill(null));
    setCurrentIndex(0);
    setScore(0);
    setPhase("quiz");
  };

  const handleOptionClick = (idx: number) => {
    const updatedAnswers = [...userAnswers];
    updatedAnswers[currentIndex] = idx + 1;
    setUserAnswers(updatedAnswers);
    
    // Auto advance to next question smoothly
    if (currentIndex < quizQueue.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 300); // 300ms delay for UI feedback
    }
  };

  const submitQuiz = () => {
    // Calculate Score
    let currentScore = 0;
    quizQueue.forEach((note, i) => {
      if (userAnswers[i] === note.correctAnswer) {
        currentScore += 1;
      }
    });
    setScore(currentScore);
    setPhase("result");
  };

  const startReview = () => {
    setCurrentIndex(0);
    setPhase("review");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
        <span className="text-xs font-semibold">문제 데이터를 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative pb-16 transition-colors duration-250">
      <div className="absolute top-0 right-1/4 h-[300px] sm:h-[500px] w-[300px] sm:w-[500px] -translate-y-64 rounded-full bg-primary/5 dark:bg-primary/10 blur-[100px] pointer-events-none"></div>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-24 pb-8 space-y-6 animate-fade-in-up">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => setPhase("setup")} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>종료하고 나가기</span>
          </button>
          
          {(phase === "quiz" || phase === "review") && (
            <div className={`text-xs font-bold border px-3 py-1.5 rounded-full ${phase === "review" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" : "bg-primary/10 text-primary border-primary/20"}`}>
              {phase === "review" ? "리뷰 모드" : "테스트 진행 중"} : {currentIndex + 1} / {quizQueue.length}
            </div>
          )}
        </div>

        {/* Phase 1: Setup */}
        {phase === "setup" && (
          <div className="glass-panel rounded-2xl p-6 sm:p-10 space-y-8 animate-fade-in-up">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-sm mb-4">
                <PlayCircle className="h-7 w-7" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">실전 오답 풀기</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">실제 시험장처럼 환경을 세팅하고 약점을 완벽하게 보완하세요.</p>
            </div>

            {(notes ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-secondary/30 rounded-2xl border border-border/50 border-dashed animate-fade-in-up">
                <div className="text-5xl mb-4 drop-shadow-md">🐹</div>
                <p className="text-sm sm:text-base font-extrabold text-foreground bg-primary/10 text-primary px-4 py-2 rounded-full mb-3">
                  페이스메이커 나롱이: "아직 풀 오답이 하나도 없어! 완벽해!"
                </p>
                <p className="text-xs text-muted-foreground">대시보드에서 새로운 오답을 추가하고 다시 찾아와!</p>
              </div>
            ) : (
            <div className="space-y-6 max-w-md mx-auto">
              <div className="space-y-3">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary" />
                  학습 모드 선택
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setIsRandomMode(false)}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition ${!isRandomMode ? "bg-primary/5 border-primary text-primary" : "bg-secondary border-border text-muted-foreground hover:border-border/80"}`}
                  >
                    <BookOpen className="h-5 w-5" />
                    <span className="text-xs font-bold">파트별 풀기</span>
                  </button>
                  <button
                    onClick={() => setIsRandomMode(true)}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition ${isRandomMode ? "bg-primary/5 border-primary text-primary" : "bg-secondary border-border text-muted-foreground hover:border-border/80"}`}
                  >
                    <Shuffle className="h-5 w-5" />
                    <span className="text-xs font-bold">랜덤 10제 풀기</span>
                  </button>
                </div>
              </div>

              {!isRandomMode && (
                <div className="space-y-3 animate-fade-in-up">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" />
                    집중 공략할 파트
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map(subj => (
                      <button
                        key={subj}
                        onClick={() => setSelectedSubject(subj)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          selectedSubject === subj
                            ? "bg-primary text-white shadow-md"
                            : "bg-secondary border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        {subj === "all" ? "전체 보기" : subj}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleStartQuiz}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 py-3.5 text-sm font-bold text-white hover:opacity-90 shadow-lg shadow-indigo-500/20 transition active:scale-95 mt-4"
              >
                <PlayCircle className="h-5 w-5" />
                <span>테스트 시작하기</span>
              </button>
            </div>
            )}
          </div>
        )}

        {/* Phase 2: Quiz */}
        {phase === "quiz" && quizQueue.length > 0 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <span className="rounded-full bg-secondary border border-border px-3 py-1 text-[10px] font-bold text-primary">
                  {quizQueue[currentIndex].subject}
                </span>
              </div>

              <div className="space-y-5">
                <div className="space-y-4">
                  {(() => {
                    let passage = "";
                    let text = quizQueue[currentIndex].question;
                    try {
                      if (text.startsWith("{")) {
                        const parsed = JSON.parse(text);
                        passage = parsed.passage || "";
                        text = parsed.text || "";
                      }
                    } catch (e) {}
                    
                    return (
                      <>
                        {passage && (
                          <div className="bg-secondary/30 border border-border/60 rounded-xl p-5">
                            <p className="text-sm sm:text-base font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                              {passage}
                            </p>
                          </div>
                        )}
                        {text && (
                          <p className="text-sm sm:text-base font-bold text-foreground leading-relaxed whitespace-pre-wrap">
                            {text}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
                {/* Note: Image block removed intentionally for the clean test flow! */}

                <div className="space-y-3 pt-2">
                  {(quizQueue[currentIndex]?.options ?? []).map((opt, optIdx) => {
                    const isSelected = userAnswers[currentIndex] === optIdx + 1;
                    
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleOptionClick(optIdx)}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all duration-200 flex items-center justify-between ${
                          isSelected 
                            ? "bg-primary/10 border-primary text-primary font-bold" 
                            : "bg-secondary border-border text-foreground hover:border-primary/40 hover:bg-muted"
                        }`}
                      >
                        <span className="leading-relaxed">{opt}</span>
                        {isSelected && <div className="h-3 w-3 rounded-full bg-primary shrink-0"></div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prev / Next / Submit Controls */}
              <div className="pt-6 mt-6 border-t border-border flex items-center justify-between">
                <button 
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition ${currentIndex === 0 ? "opacity-30 cursor-not-allowed text-muted-foreground bg-secondary" : "bg-secondary hover:bg-muted text-foreground border border-border"}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>이전 문제</span>
                </button>
                
                {currentIndex < quizQueue.length - 1 ? (
                  <button 
                    onClick={() => setCurrentIndex(prev => Math.min(quizQueue.length - 1, prev + 1))}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-secondary hover:bg-muted border border-border text-xs font-bold text-foreground transition"
                  >
                    <span>다음 문제</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button 
                    onClick={submitQuiz}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold transition hover:opacity-90 shadow-md shadow-emerald-500/20"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    <span>최종 채점 하기</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Phase 3: Result */}
        {phase === "result" && (
          <div className="glass-panel rounded-2xl p-8 sm:p-12 text-center space-y-8 animate-fade-in-up">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-500 shadow-xl shadow-emerald-500/10">
              <ClipboardCheck className="h-10 w-10" />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">수고하셨습니다!</h1>
              <p className="text-sm text-muted-foreground">오늘의 실전 모의고사를 성공적으로 마쳤습니다.</p>
            </div>

            <div className="bg-secondary/50 border border-border rounded-2xl p-6 max-w-sm mx-auto space-y-2">
              <p className="text-xs font-bold text-muted-foreground">최종 채점 결과</p>
              <div className="text-4xl font-extrabold text-primary">
                {score} <span className="text-xl text-muted-foreground">/ {quizQueue.length}</span>
              </div>
              <p className="text-xs font-bold text-foreground pt-1">
                ({Math.round((score / quizQueue.length) * 100)}%)
              </p>
            </div>

            <div className="pt-4 max-w-sm mx-auto flex flex-col sm:flex-row gap-3">
              <button
                onClick={startReview}
                className="flex-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 py-3.5 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <BookOpen className="h-4 w-4" />
                시험 리뷰 (해설)
              </button>
              <button onClick={() => setPhase("setup")} className="flex-1 rounded-xl bg-primary text-white hover:opacity-90 py-3.5 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/20">
                테스트 종료 (초기화)
              </button>
            </div>
          </div>
        )}

        {/* Phase 4: Review */}
        {phase === "review" && quizQueue.length > 0 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-secondary border border-border px-3 py-1 text-[10px] font-bold text-primary">
                    {quizQueue[currentIndex].subject}
                  </span>
                  {userAnswers[currentIndex] === quizQueue[currentIndex].correctAnswer ? (
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> 정답
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-500/10 border border-red-500/20 px-2 py-1 text-[10px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> 오답
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-4">
                  {(() => {
                    let passage = "";
                    let text = quizQueue[currentIndex].question;
                    try {
                      if (text.startsWith("{")) {
                        const parsed = JSON.parse(text);
                        passage = parsed.passage || "";
                        text = parsed.text || "";
                      }
                    } catch (e) {}
                    
                    return (
                      <>
                        {passage && (
                          <div className="bg-secondary/30 border border-border/60 rounded-xl p-5">
                            <p className="text-sm sm:text-base font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                              {passage}
                            </p>
                          </div>
                        )}
                        {text && (
                          <p className="text-sm sm:text-base font-bold text-foreground leading-relaxed whitespace-pre-wrap">
                            {text}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div className="space-y-3 pt-2">
                  {(quizQueue[currentIndex]?.options ?? []).map((opt, optIdx) => {
                    const isCorrectOption = optIdx + 1 === quizQueue[currentIndex].correctAnswer;
                    const isUserSelected = optIdx + 1 === userAnswers[currentIndex];
                    
                    let buttonStyle = "bg-secondary border-border text-foreground";
                    
                    if (isCorrectOption) {
                      buttonStyle = "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold";
                    } else if (isUserSelected && !isCorrectOption) {
                      buttonStyle = "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400";
                    } else {
                      buttonStyle = "bg-secondary/50 border-border/50 text-muted-foreground opacity-50";
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between ${buttonStyle}`}
                      >
                        <span className="leading-relaxed">{opt}</span>
                        {isCorrectOption && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                        {isUserSelected && !isCorrectOption && <XCircle className="h-4 w-4 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Hint Block Always Revealed in Review Phase */}
              <div className="glass-panel rounded-2xl p-6 space-y-4 border border-primary/20 bg-primary/5 mt-6">
                <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span>AI 개념 요약 및 해설</span>
                </div>
                <div className="text-xs sm:text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap bg-background/50 p-4 rounded-xl border border-border">
                  {quizQueue[currentIndex].aiHint}
                </div>
              </div>

              {/* Prev / Next Controls for Review */}
              <div className="pt-6 mt-6 border-t border-border flex items-center justify-between">
                <button 
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition ${currentIndex === 0 ? "opacity-30 cursor-not-allowed text-muted-foreground bg-secondary" : "bg-secondary hover:bg-muted text-foreground border border-border"}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>이전 해설</span>
                </button>
                
                {currentIndex < quizQueue.length - 1 ? (
                  <button 
                    onClick={() => setCurrentIndex(prev => Math.min(quizQueue.length - 1, prev + 1))}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-secondary hover:bg-muted border border-border text-xs font-bold text-foreground transition"
                  >
                    <span>다음 해설</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button 
                    onClick={() => setPhase("result")}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold transition hover:opacity-90 shadow-md shadow-indigo-500/20"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>성적표로 돌아가기</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
