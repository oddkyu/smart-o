export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 space-y-16 animate-fade-in">
      <div className="text-center space-y-6">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-[linear-gradient(135deg,#00F2FE_0%,#4FACFE_100%)] text-glow pb-2">
          Notefit
        </h1>
        <p className="text-lg md:text-xl text-slate-400 font-light tracking-wide max-w-xl mx-auto leading-relaxed">
          당신의 약점만 집요하게 파고드는<br className="md:hidden" /> 단 하나의 프리미엄 AI 토익 솔루션
        </p>
      </div>

      <div className="glass-panel w-full max-w-2xl p-10 md:p-14 flex flex-col items-center gap-6 text-center">
        <h2 className="text-2xl font-bold text-white">압도적인 인터페이스의 시작</h2>
        <p className="text-slate-300 leading-relaxed">
          현재 뒤편의 은은한 오로라 빛이 유리를 투과하듯 비치고 있습니다. 
          이 <span className="text-primary-cyan font-semibold">글래스모피즘(Glassmorphism)</span> 디자인은 수험생에게 시각적 안정감과 몰입도를 선사합니다.
        </p>
        <button className="mt-6 px-10 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold tracking-wide transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,242,254,0.3)] hover:-translate-y-1">
          학습 시작하기
        </button>
      </div>
    </div>
  );
}
