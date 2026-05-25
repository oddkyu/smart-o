"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// 💡 [Day 10 고도화] UX를 극대화하는 카테고리 한국어 매핑 딕셔너리
const CATEGORY_MAP: Record<string, string> = {
  "V_GERUND_01": "동명사 (전치사 목적어)",
  "V_PARTICIPLE_02": "분사 (능동/수동 수식)",
  "TENSE_MATCH_03": "시제 일치 (미래완료)",
  "CONJ_SUB_04": "부사절 접속사 (조건)",
  "PREP_TIME_05": "전치사 (시간/장소)",
  "N_AGREEMENT_06": "수 일치 (단수/복수)",
  "PRON_REL_07": "관계대명사 (주격/목적격)",
  "ADJ_COMPARATIVE_08": "비교급/최상급 형용사",
};

const ERROR_MAP: Record<string, string> = {
  "ERR_V_GERUND_01_WRONG": "동명사 형태 오류",
  "ERR_V_PARTICIPLE_02_WRONG": "분사 태(능동/수동) 오류",
  "ERR_TENSE_MATCH_03_WRONG": "시제 불일치 오류",
  "ERR_CONJ_SUB_04_WRONG": "접속사/전치사 혼동",
  "ERR_PREP_TIME_05_WRONG": "전치사 오용",
  "ERR_N_AGREEMENT_06_WRONG": "수 일치 오류",
  "ERR_PRON_REL_07_WRONG": "관계사 격 오류",
  "ERR_ADJ_COMPARATIVE_08_WRONG": "비교급 원급 혼동",
  "ERR_TIMEOUT": "시간 초과 (Time Over)",
};

// 방어 코드: 딕셔너리에 없는 신규 코드가 추가되더라도 원래 코드값을 그대로 반환
const getCategoryName = (code: string) => CATEGORY_MAP[code] || code;
const getErrorName = (code: string) => ERROR_MAP[code] || code;

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // 통계 상태
  const [stats, setStats] = useState({ total: 0, accuracy: 0, weakest: "-" });
  const [weaknesses, setWeaknesses] = useState<any[]>([]);
  const [errorArchive, setErrorArchive] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      // 1. 보안 인증
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("로그인이 필요한 프리미엄 서비스입니다.");
        router.push("/login");
        return;
      }

      // 2. 유저가 푼 모든 문제 기록(마스터 및 쌍둥이 모두 포함)을 조인(Join)하여 긁어오기
      const { data, error } = await supabase
        .from('user_solved_questions')
        .select(`
          id,
          is_correct,
          user_answer,
          error_code,
          solved_at,
          questions:question_id ( id, category_code, question_text, correct_option, options ),
          question_bank:bank_question_id ( id, category_code, question_text, correct_option, options )
        `)
        .eq('user_id', session.user.id)
        .order('solved_at', { ascending: false });

      if (error || !data) {
        console.error("대시보드 데이터 로딩 실패:", error);
        setLoading(false);
        return;
      }

      // 3. 탑라인 통계 연산
      const total = data.length;
      const corrects = data.filter(d => d.is_correct).length;
      const accuracy = total > 0 ? Math.round((corrects / total) * 100) : 0;

      // 4. 오답 기반 약점 문법 트리 연산
      const errorCounts: Record<string, number> = {};
      const wrongList = [];

      for (const record of data) {
        // FK 조인된 객체 중 null이 아닌 쪽(마스터 원본 OR AI 쌍둥이)을 선택
        const qData = record.questions || record.question_bank;
        if (!qData) continue;
        
        if (!record.is_correct) {
          const cat = qData.category_code;
          errorCounts[cat] = (errorCounts[cat] || 0) + 1;
          wrongList.push({
            ...record,
            questionData: qData,
            isTwin: !!record.question_bank
          });
        }
      }

      let weakestCat = "-";
      let maxErrors = 0;
      const weakArray = [];
      
      for (const [cat, count] of Object.entries(errorCounts)) {
        if (count > maxErrors) {
          maxErrors = count;
          weakestCat = cat;
        }
        
        // 에러 개수에 따른 UI 인디케이터 상태 부여
        let status = "SAFE";
        let color = "bg-green-400";
        let glow = "shadow-[0_0_10px_rgba(74,222,128,0.5)]";
        
        if (count >= 4) { 
          status = "DANGER"; 
          color = "bg-red-500"; 
          glow = "shadow-[0_0_15px_rgba(239,68,68,0.6)]";
        } else if (count >= 2) { 
          status = "WARNING"; 
          color = "bg-yellow-400"; 
          glow = "shadow-[0_0_10px_rgba(250,204,21,0.5)]";
        }
        
        // UI 리스트용 배열 (한국어 매핑 적용)
        weakArray.push({ 
          category: getCategoryName(cat), 
          count, 
          status, 
          color, 
          glow 
        });
      }
      
      // 오답이 가장 많은 순으로 내림차순 정렬
      weakArray.sort((a, b) => b.count - a.count);

      // 상단 요약 카드용 세팅 (한국어 매핑 적용)
      setStats({ 
        total, 
        accuracy, 
        weakest: weakestCat !== "-" ? getCategoryName(weakestCat) : "-" 
      });
      setWeaknesses(weakArray);
      setErrorArchive(wrongList);
      setLoading(false);
    }
    
    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary-cyan border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,242,254,0.3)]"></div>
        <p className="mt-6 text-slate-400 font-medium animate-pulse tracking-wide">유저님의 누적 데이터를 딥러닝 분석 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center flex-1 w-full max-w-5xl mx-auto px-4 animate-fade-in py-10 relative">
      
      {/* 배경 오로라 블러 처리 */}
      <div className="absolute top-10 left-[-10%] w-60 h-60 bg-primary-cyan/10 blur-[80px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-40 right-[-10%] w-80 h-80 bg-primary-purple/10 blur-[100px] rounded-full pointer-events-none -z-10" />

      <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-[linear-gradient(135deg,#F8FAFC_0%,#94A3B8_100%)] mb-12 self-start tracking-tight">
        스마트 오답 분석 랩
      </h1>

      {/* 1. 상단 통계 요약 3대장 (Glass Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
        <div className="glass-panel p-8 flex flex-col relative overflow-hidden group hover:border-primary-cyan/30 transition-all">
          <div className="absolute -right-4 -top-4 text-6xl opacity-10 group-hover:scale-110 transition-transform">📚</div>
          <span className="text-slate-400 font-bold tracking-widest text-sm mb-2">총 푼 문제</span>
          <span className="text-4xl font-black text-white">{stats.total}<span className="text-lg text-slate-500 font-medium ml-1">제</span></span>
        </div>
        
        <div className="glass-panel p-8 flex flex-col relative overflow-hidden group hover:border-primary-cyan/30 transition-all">
          <div className="absolute -right-4 -top-4 text-6xl opacity-10 group-hover:scale-110 transition-transform">🎯</div>
          <span className="text-slate-400 font-bold tracking-widest text-sm mb-2">전체 정답률</span>
          <div className="flex items-baseline">
            <span className={`text-4xl font-black ${stats.accuracy >= 80 ? 'text-green-400' : stats.accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {stats.accuracy}
            </span>
            <span className="text-lg text-slate-500 font-medium ml-1">%</span>
          </div>
        </div>

        <div className="glass-panel p-8 flex flex-col relative overflow-hidden group hover:border-primary-cyan/30 transition-all">
          <div className="absolute -right-4 -top-4 text-6xl opacity-10 group-hover:scale-110 transition-transform">🚨</div>
          <span className="text-slate-400 font-bold tracking-widest text-sm mb-2">가장 취약한 파트</span>
          <span className="text-2xl font-black text-red-400 break-words leading-tight">{stats.weakest}</span>
        </div>
      </div>

      {/* 2. 약점 문법 트리 시각화 (Grammar Tree Bar) */}
      <div className="glass-panel w-full p-8 md:p-10 mb-12 relative overflow-hidden">
        <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
          <span className="text-primary-cyan text-glow">🧬</span> 카테고리별 위험도 스캐너
        </h2>
        
        <div className="space-y-7 relative z-10">
          {weaknesses.length === 0 ? (
            <div className="py-10 text-center bg-white/5 rounded-xl border border-white/10">
              <span className="text-4xl mb-4 block">✨</span>
              <p className="text-slate-300 font-medium tracking-wide">분석할 오답 데이터가 없습니다. 완벽합니다!</p>
            </div>
          ) : (
            weaknesses.map((w) => (
              <div key={w.category} className="flex flex-col gap-3 group">
                <div className="flex justify-between items-end">
                  <span className="text-white font-semibold tracking-wide text-lg">{w.category}</span>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-lg tracking-widest ${w.status === 'DANGER' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : w.status === 'WARNING' ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                    {w.status} ({w.count} 오답)
                  </span>
                </div>
                {/* 게이지 바 */}
                <div className="w-full h-2.5 bg-[#0B0F19]/50 rounded-full overflow-hidden shadow-inner border border-white/5 relative">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${w.color} ${w.glow}`}
                    style={{ width: `${Math.min((w.count / 5) * 100, 100)}%` }} // 5개를 100% 기준으로 렌더링
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. 나의 오답 아카이브 리스트 */}
      <div className="w-full">
        <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3 pl-2">
          <span className="text-primary-purple text-glow">📂</span> 오답 처형대 (Archive)
        </h2>
        
        <div className="grid grid-cols-1 gap-6">
          {errorArchive.map((item) => (
            <div key={item.id} className="glass-panel p-6 md:p-8 border-l-4 border-l-red-500/80 flex flex-col lg:flex-row justify-between gap-8 hover:bg-white/[0.04] transition-all group">
              
              <div className="flex-1 space-y-5">
                {/* 헤더 메타데이터 (한국어 매핑 적용) */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1.5 bg-[#0B0F19]/60 border border-white/10 text-xs font-bold rounded-lg text-slate-300 shadow-inner">
                    {getCategoryName(item.questionData.category_code)}
                  </span>
                  <span className="text-[11px] text-red-400 bg-red-400/10 px-2.5 py-1 rounded-md border border-red-400/20 font-bold tracking-wider">
                    {getErrorName(item.error_code)}
                  </span>
                  {item.isTwin && (
                    <span className="text-[11px] text-primary-purple font-bold bg-primary-purple/10 px-2.5 py-1 rounded-md border border-primary-purple/20 tracking-wider flex items-center gap-1">
                      🤖 AI 변형문제
                    </span>
                  )}
                  <span className="text-xs text-slate-500 font-medium ml-auto hidden md:block">
                    {new Date(item.solved_at).toLocaleDateString()}
                  </span>
                </div>
                
                {/* 틀린 문제 원문 */}
                <p className="text-white text-lg md:text-xl font-medium leading-relaxed tracking-wide">
                  {item.questionData.question_text.replace("_______", "______")}
                </p>
                
                {/* 정오답 비교 영역 */}
                <div className="flex items-center gap-8 mt-2 bg-[#0B0F19]/40 p-4 rounded-xl border border-white/5 inline-flex">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">나의 오답</span>
                    <span className="text-red-400 font-bold line-through opacity-90 text-lg">{item.user_answer}</span>
                  </div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-primary-cyan font-bold uppercase tracking-wider">정답</span>
                    <span className="text-primary-cyan font-bold text-lg text-glow">{item.correct_option || item.questionData.correct_option}</span>
                  </div>
                </div>
              </div>
              
              {/* 우측 CTA 영역 */}
              <div className="flex items-center justify-end lg:w-40 border-t border-white/5 pt-4 lg:border-t-0 lg:pt-0">
                <button 
                  onClick={() => router.push('/quiz')} 
                  className="w-full px-5 py-4 bg-white/5 hover:bg-primary-cyan/20 border border-white/10 hover:border-primary-cyan/50 rounded-xl font-bold text-slate-300 hover:text-white transition-all shadow-inner hover:shadow-[0_0_15px_rgba(0,242,254,0.3)] group-hover:-translate-y-1"
                >
                  다시 복수하기 &rarr;
                </button>
              </div>

            </div>
          ))}
          
          {errorArchive.length === 0 && (
            <div className="glass-panel p-16 text-center text-slate-400 font-medium flex flex-col items-center gap-4">
              <span className="text-5xl opacity-50">👻</span>
              <span>아카이브가 텅 비었습니다. 퀴즈를 풀고 오답 데이터를 채워보세요!</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
