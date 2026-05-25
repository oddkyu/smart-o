"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Question {
  id: string;
  is_twin?: boolean; // AI가 새로 생성한 쌍둥이 문제인지 식별
  category_code: string;
  question_text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_option: string;
  explanation: string;
}

export default function QuizPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // 퀴즈 상태
  const [question, setQuestion] = useState<Question | null>(null);
  const [sourceQuestionId, setSourceQuestionId] = useState<string | null>(null); // 원본 문제 ID (쌍둥이 파생용)
  const [loading, setLoading] = useState(true);
  const [noMoreQuestions, setNoMoreQuestions] = useState(false);
  
  // 진행 상태
  const [timeLeft, setTimeLeft] = useState(20);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // AI 연동 상태
  const [isGeneratingTwin, setIsGeneratingTwin] = useState(false);

  // 1. 초기 데이터 로딩 (안 푼 마스터 문제 가져오기)
  useEffect(() => {
    async function loadQuiz() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("로그인이 필요한 프리미엄 서비스입니다.");
        router.push("/login");
        return;
      }
      setUser(session.user);

      // 이미 푼 문제 ID 목록 스캔 (중복 출제 방지)
      const { data: solvedRecords } = await supabase
        .from('user_solved_questions')
        .select('question_id')
        .eq('user_id', session.user.id)
        .not('question_id', 'is', null);

      const solvedIds = solvedRecords?.map(record => record.question_id) || [];

      // 안 푼 문제 1개 가져오기
      let query = supabase.from('questions').select('*').limit(1);
      if (solvedIds.length > 0) {
        query = query.not('id', 'in', `(${solvedIds.join(',')})`);
      }
      
      const { data, error } = await query.maybeSingle();
        
      if (error) {
        console.error("문제 로딩 에러:", error);
      } else if (!data) {
        setNoMoreQuestions(true);
      } else {
        setQuestion(data);
        setSourceQuestionId(data.id); // 쌍둥이 문제 생성을 위해 원본 ID 기록
      }
      setLoading(false);
    }
    loadQuiz();
  }, [router]);

  // 2. 20초 타임어택 로직
  useEffect(() => {
    // 로딩중이거나 제출했거나 생성중이면 타이머 정지
    if (loading || isSubmitted || timeLeft <= 0 || noMoreQuestions || isGeneratingTwin) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          handleTimeOut(); 
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isSubmitted, timeLeft, noMoreQuestions, isGeneratingTwin]);

  const handleTimeOut = async () => {
    if (isSubmitted || !question || !user) return;
    setIsSubmitted(true);
    setIsCorrect(false);
    setSelectedOption("TIMEOUT");
    saveResult(false, "TIMEOUT", "ERR_TIMEOUT");
  };

  const handleOptionClick = async (key: string) => {
    if (isSubmitted || !question || !user) return;
    
    setIsSubmitted(true);
    setSelectedOption(key);
    
    const correct = key === question.correct_option;
    setIsCorrect(correct);
    
    const errorCode = correct ? null : `ERR_${question.category_code}_WRONG`;
    saveResult(correct, key, errorCode);
  };

  // 3. 풀이 결과 DB 저장 로직
  const saveResult = async (correct: boolean, answer: string, errorCode: string | null) => {
    setIsSaving(true);
    
    const insertPayload: any = {
      user_id: user.id,
      is_correct: correct,
      user_answer: answer,
      error_code: errorCode,
    };

    // 마스터 문제인지 AI 쌍둥이 문제인지에 따라 삽입할 컬럼 분기
    if (question!.is_twin) {
      insertPayload.bank_question_id = question!.id;
    } else {
      insertPayload.question_id = question!.id;
    }

    const { error } = await supabase
      .from('user_solved_questions')
      .insert(insertPayload);

    if (error && error.code !== '23505') {
       console.error("풀이 결과 저장 실패:", JSON.stringify(error, null, 2));
    }
    setIsSaving(false);
  };

  // 4. [Day 10 핵심] AI 쌍둥이 문제 호출 및 화면 전환 로직
  const handleGenerateTwin = async () => {
    if (!question || !user || !sourceQuestionId) return;
    setIsGeneratingTwin(true);

    try {
      const res = await fetch('/api/generate-twin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_question_id: sourceQuestionId,
          category_code: question.category_code,
          original_question_text: question.question_text,
          user_id: user.id
        })
      });

      const result = await res.json();
      
      if (!res.ok) throw new Error(result.error);
      
      // AI가 생성한(혹은 캐싱된) 새 문제 데이터로 교체
      const twinData = result.data;
      setQuestion({
        ...twinData,
        is_twin: true
      });
      
      // UI 상태 초기화 (다시 풀 수 있도록 세팅)
      setTimeLeft(20);
      setIsSubmitted(false);
      setSelectedOption(null);
      setIsCorrect(null);
      
    } catch (err: any) {
      alert("AI 쌍둥이 문제 생성에 실패했습니다: " + err.message);
    } finally {
      setIsGeneratingTwin(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary-cyan border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,242,254,0.3)]"></div>
        <p className="mt-6 text-slate-400 font-medium animate-pulse tracking-wide">수석 연구원들의 데이터를 가져오는 중...</p>
      </div>
    );
  }

  if (noMoreQuestions) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 animate-fade-in">
        <div className="glass-panel p-10 flex flex-col items-center text-center max-w-md">
          <span className="text-5xl mb-4">🏆</span>
          <h2 className="text-2xl font-bold text-white mb-2">모든 마스터 문제를 정복했습니다!</h2>
          <button onClick={() => router.push('/')} className="mt-8 w-full px-6 py-4 bg-white/5 rounded-xl font-semibold text-white">메인으로 돌아가기</button>
        </div>
      </div>
    );
  }

  if (!question) return null;

  const optionsArray = Object.entries(question.options);

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full max-w-3xl mx-auto px-4 animate-fade-in py-8">
      
      {/* 타임어택 게이지 바 */}
      <div className="w-full mb-8">
        <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 px-1 uppercase tracking-wider">
          <span>Time Limit</span>
          <span className={`${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-primary-cyan'}`}>{timeLeft}s</span>
        </div>
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-[linear-gradient(135deg,#00F2FE_0%,#4FACFE_100%)] shadow-[0_0_10px_rgba(0,242,254,0.5)]'}`}
            style={{ width: `${(timeLeft / 20) * 100}%` }}
          />
        </div>
      </div>

      {/* 메인 패널 */}
      <div className="glass-panel w-full p-8 md:p-12 relative overflow-hidden transition-all duration-500 min-h-[450px]">
        
        {/* AI 생성 중 로딩 스크린 (스켈레톤 느낌) */}
        {isGeneratingTwin ? (
          <div className="absolute inset-0 z-50 bg-[#0B0F19]/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className="w-16 h-16 border-4 border-primary-purple border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(79,172,254,0.4)] mb-8"></div>
            <h2 className="text-2xl font-bold text-white mb-4 text-glow">AI 쌍둥이 문제 생성 중...</h2>
            <p className="text-slate-300 leading-relaxed max-w-sm">
              유저님의 취약점 <span className="text-primary-cyan font-bold">({question.category_code})</span>을 완벽히 분석하여 새로운 변형 문제를 조립하고 있습니다.
            </p>
          </div>
        ) : (
          <>
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary-cyan/10 blur-[60px] rounded-full pointer-events-none" />
            
            <div className="mb-10 relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <span className="inline-block px-3 py-1 bg-white/10 text-primary-cyan text-xs font-bold rounded-lg tracking-wider uppercase shadow-inner">
                  {question.category_code}
                </span>
                {question.is_twin && (
                  <span className="inline-block px-3 py-1 bg-primary-purple/20 border border-primary-purple/30 text-primary-purple text-xs font-bold rounded-lg tracking-wider uppercase animate-pulse shadow-[0_0_10px_rgba(79,172,254,0.3)]">
                    🤖 AI Twin Generated
                  </span>
                )}
              </div>
              <h2 className="text-xl md:text-2xl text-white font-medium leading-relaxed tracking-wide">
                {question.question_text.split("_______").map((part, index, array) => (
                  <span key={index}>
                    {part}
                    {index < array.length - 1 && (
                      <span className="inline-block w-20 md:w-28 border-b-2 border-primary-cyan mx-2 -mb-1 opacity-70 shadow-[0_0_10px_rgba(0,242,254,0.3)]" />
                    )}
                  </span>
                ))}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              {optionsArray.map(([key, value]) => {
                let btnClass = "glass-card text-left px-6 py-5 flex items-center group relative overflow-hidden transition-all duration-300";
                let circleClass = "w-8 h-8 rounded-full border border-slate-500 flex items-center justify-center text-sm font-bold mr-4 text-slate-300 transition-colors duration-300";
                
                if (isSubmitted) {
                  if (key === question.correct_option) {
                    btnClass += " bg-primary-cyan/20 border-primary-cyan/50 shadow-[0_0_20px_rgba(0,242,254,0.2)]";
                    circleClass = "border-primary-cyan bg-primary-cyan text-slate-900 shadow-[0_0_10px_rgba(0,242,254,0.5)]";
                  } else if (key === selectedOption && !isCorrect) {
                    btnClass += " bg-red-500/20 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]";
                    circleClass = "border-red-500 bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]";
                  } else {
                    btnClass += " opacity-30 pointer-events-none";
                  }
                }

                return (
                  <button
                    key={key}
                    onClick={() => handleOptionClick(key)}
                    disabled={isSubmitted}
                    className={btnClass}
                  >
                    {!isSubmitted && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-cyan/0 to-primary-purple/0 group-hover:from-primary-cyan/10 group-hover:to-primary-purple/10 transition-all duration-300 opacity-0 group-hover:opacity-100" />
                    )}
                    <span className={circleClass}>{key}</span>
                    <span className={`text-base ${isSubmitted && key === question.correct_option ? 'text-white font-semibold' : 'text-slate-300 group-hover:text-white transition-colors duration-300'}`}>
                      {value as string}
                    </span>
                  </button>
                );
              })}
            </div>

            {isSubmitted && (
              <div className="mt-10 pt-8 border-t border-white/10 animate-fade-in relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-3">
                  <span className={`text-xl font-bold tracking-wide ${isCorrect ? 'text-primary-cyan text-glow' : 'text-red-400'}`}>
                    {selectedOption === 'TIMEOUT' ? '⏰ Time Over!' : isCorrect ? '🎉 Perfect!' : '❌ Incorrect'}
                  </span>
                  {isSaving ? (
                    <span className="text-xs text-slate-500 animate-pulse bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                      풀이 데이터 서버 저축 중...
                    </span>
                  ) : (
                    <span className="text-xs text-primary-purple bg-primary-purple/10 px-3 py-1.5 rounded-full border border-primary-purple/20">
                      DB 저장 완료
                    </span>
                  )}
                </div>
                
                <div className="bg-[#0B0F19]/60 rounded-2xl p-6 border border-white/5 shadow-inner">
                  <h3 className="text-sm font-bold text-primary-purple mb-3 flex items-center gap-2">
                    <span className="text-lg">💡</span> AI 심층 해설
                  </h3>
                  <p className="text-slate-300 leading-relaxed text-[15px]">
                    {question.explanation}
                  </p>
                </div>
                
                {/* AI 치료 인터랙티브 UI (핵심 연동 파트) */}
                <div className="mt-8 flex flex-col gap-4">
                  {!isCorrect ? (
                    <button 
                      onClick={handleGenerateTwin} 
                      className="w-full px-6 py-4 bg-[linear-gradient(135deg,#00F2FE_0%,#4FACFE_100%)] text-white font-bold rounded-xl shadow-[0_0_20px_rgba(0,242,254,0.3)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,242,254,0.6)] hover:-translate-y-1 flex items-center justify-center gap-2 text-lg group"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform">🤖</span> 
                      AI 쌍둥이 문제로 즉시 치료하기
                    </button>
                  ) : (
                    <div className="text-center bg-primary-cyan/10 border border-primary-cyan/20 rounded-xl p-4 flex flex-col items-center">
                      <p className="text-primary-cyan font-bold tracking-wide">정답입니다! 이 카테고리를 완벽히 마스터하셨습니다.</p>
                    </div>
                  )}
                  
                  <button 
                    onClick={() => window.location.reload()} 
                    className="w-full px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold text-white tracking-wide transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:-translate-y-1"
                  >
                    다음 마스터 문제로 넘어가기
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
