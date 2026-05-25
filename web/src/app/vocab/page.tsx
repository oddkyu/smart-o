"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Vocabulary {
  id: string;
  target_score: number;
  word: string;
  meaning: string;
  part_of_speech: string;
  example_sentence: string;
  example_translation: string;
  metadata: any;
}

export default function VocabPage() {
  const router = useRouter();
  const [vocabList, setVocabList] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    async function loadVocab() {
      // 세션 확인 (Auth Guard)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("로그인이 필요한 프리미엄 서비스입니다.");
        router.push("/login");
        return;
      }

      // 단어장 마스터 데이터 패치 (Day 1 프리시딩 데이터)
      const { data, error } = await supabase
        .from('vocabulary_master')
        .select('*')
        .order('id', { ascending: true }); // 실무에서는 안 외운 단어 위주로 알고리즘 정렬 가능

      if (error) {
        console.error("단어장 로딩 실패:", error);
      } else if (data && data.length > 0) {
        setVocabList(data);
      } else {
        setFinished(true);
      }
      setLoading(false);
    }
    loadVocab();
  }, [router]);

  const handleNext = () => {
    setFlipped(false);
    // 카드가 다시 앞으로 돌아오는 애니메이션 시간(약 150ms)을 벌어준 뒤 데이터를 바꿉니다.
    setTimeout(() => {
      if (currentIndex < vocabList.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setFinished(true);
      }
    }, 150);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setFlipped(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
      }, 150);
    }
  };

  // 1. 로딩 화면 UI
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary-purple border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(79,172,254,0.3)]"></div>
        <p className="mt-6 text-slate-400 font-medium animate-pulse tracking-wide">수석 연구원들의 단어장을 엮는 중...</p>
      </div>
    );
  }

  // 2. 학습 완료 성취감 리포트 화면 UI
  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 animate-fade-in px-4">
        <div className="glass-panel p-10 flex flex-col items-center text-center max-w-md w-full relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-20%] w-40 h-40 bg-primary-cyan/20 blur-[60px] rounded-full pointer-events-none" />
          <span className="text-6xl mb-6">🎯</span>
          <h2 className="text-3xl font-bold text-white mb-3 text-glow">마스터 완료!</h2>
          <p className="text-slate-300 leading-relaxed">
            오늘 할당된 프리미엄 단어 세트를 모두 정복하셨습니다. <br/> 꾸준함이 점수를 만듭니다.
          </p>
          <button 
              onClick={() => router.push('/')} 
              className="mt-10 w-full px-6 py-4 bg-[linear-gradient(135deg,#00F2FE_0%,#4FACFE_100%)] text-white font-bold rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,242,254,0.5)] hover:-translate-y-1"
            >
              대시보드로 복귀
          </button>
        </div>
      </div>
    );
  }

  const currentVocab = vocabList[currentIndex];

  /* 
   * 💡 [향후 확장성 가이드] metadata 필드 활용법
   * 만약 currentVocab.metadata 내부에 TTS 음성 파일 URL(audio_url)이나 파생어 배열이 있다면,
   * 언제든지 JSON 객체로 파싱해서 아래 화면에 <audio> 태그나 추가 뱃지로 즉시 꽂아넣을 수 있습니다!
   */

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto px-4 animate-fade-in py-8">
      
      {/* 상단 진행도 표시 */}
      <div className="w-full max-w-md mb-8 flex justify-between items-center text-slate-400 font-bold tracking-widest text-sm">
        <span>VOCABULARY</span>
        <span className="bg-white/10 px-4 py-1.5 rounded-full text-primary-cyan border border-white/5 shadow-inner">
          {currentIndex + 1} / {vocabList.length}
        </span>
      </div>

      {/* 3. 3D 플래시카드 컨테이너 */}
      {/* Tailwind v4의 Arbitrary Properties 기능을 활용해 완벽한 CSS 3D 엔진 구축 */}
      <div 
        className="w-full max-w-md h-[400px] [perspective:1000px] mb-10 group cursor-pointer" 
        onClick={() => setFlipped(!flipped)}
      >
        <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}>
          
          {/* 카드 앞면 (단어 & 배지) */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] glass-panel flex flex-col justify-center items-center p-8 border border-white/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] group-hover:border-primary-cyan/30 transition-colors">
            
            {/* 좌상단: 품사 배지 */}
            <span className="absolute top-6 left-6 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-primary-cyan text-xs font-bold tracking-wider uppercase shadow-inner">
              {currentVocab.part_of_speech}
            </span>
            
            {/* 우상단: 타겟 점수 배지 */}
            <span className="absolute top-6 right-6 px-3 py-1.5 bg-primary-purple/10 border border-primary-purple/20 rounded-lg text-primary-purple text-xs font-bold tracking-wider shadow-inner">
              {currentVocab.target_score}점 목표
            </span>
            
            <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              {currentVocab.word}
            </h2>
            
            <p className="mt-10 text-sm text-slate-500 font-medium tracking-widest uppercase flex items-center gap-3">
              <span className="w-8 h-px bg-slate-600"></span>
              Tap to Flip
              <span className="w-8 h-px bg-slate-600"></span>
            </p>
          </div>

          {/* 카드 뒷면 (뜻 & 예문) - 180도 뒤집혀서 대기 중 */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] glass-panel flex flex-col justify-center items-center p-8 border border-primary-purple/30 shadow-[0_0_30px_rgba(79,172,254,0.15)] bg-[#0B0F19]/90">
            
            <h3 className="text-3xl font-bold text-primary-cyan mb-8 text-glow text-center">
              {currentVocab.meaning}
            </h3>
            
            <div className="w-full bg-white/5 rounded-2xl p-5 md:p-6 border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[linear-gradient(to_bottom,#00F2FE,#4FACFE)]" />
              <p className="text-white text-base md:text-lg font-medium leading-relaxed mb-3 pl-3 italic opacity-90">
                "{currentVocab.example_sentence}"
              </p>
              <p className="text-slate-400 text-sm pl-3 leading-relaxed">
                {currentVocab.example_translation}
              </p>
            </div>

          </div>

        </div>
      </div>

      {/* 4. 내비게이션 컨트롤 버튼 (Glassmorphism) */}
      <div className="flex items-center justify-between w-full max-w-md gap-3">
        <button 
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex-1 py-4 glass-card font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:text-white hover:border-white/20 transition-all shadow-inner"
        >
          ← Prev
        </button>
        
        <button 
          onClick={() => setFlipped(!flipped)}
          className="flex-[1.2] py-4 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl font-bold text-white transition-all shadow-inner"
        >
          {flipped ? '단어 다시보기' : '뜻 확인하기'}
        </button>
        
        <button 
          onClick={handleNext}
          className="flex-1 py-4 bg-primary-cyan/10 hover:bg-primary-cyan/20 border border-primary-cyan/30 rounded-xl font-bold text-primary-cyan transition-all shadow-[0_0_15px_rgba(0,242,254,0.1)] hover:shadow-[0_0_20px_rgba(0,242,254,0.3)]"
        >
          {currentIndex === vocabList.length - 1 ? 'Finish 🎉' : 'Next →'}
        </button>
      </div>

    </div>
  );
}
