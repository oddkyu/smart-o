"use client";

import React from "react";

export default function PrintPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-250">
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-24 pb-8 flex items-center justify-center animate-fade-in-up">
        <div className="w-full flex flex-col items-center justify-center py-20 text-center bg-secondary/30 rounded-3xl border border-border/50 border-dashed">
          <div className="text-6xl mb-6 drop-shadow-md hover:scale-110 transition-transform cursor-pointer">🐹</div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-4">
            페이스메이커 나롱이: "프리미엄 인쇄실은 열심히 공사 중이야! 뚝딱뚝딱! 🛠️"
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            아직 페이지가 준비되지 않았어. 조만간 멋진 기능으로 업데이트될 예정이니 조금만 기다려줘!
          </p>
        </div>
      </main>
    </div>
  );
}
