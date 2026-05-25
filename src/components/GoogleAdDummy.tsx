import React from "react";
import { Megaphone } from "lucide-react";

interface GoogleAdDummyProps {
  type?: "banner" | "interstitial" | "rectangle";
  className?: string;
}

export default function GoogleAdDummy({ type = "banner", className = "" }: GoogleAdDummyProps) {
  const isBanner = type === "banner";
  const isInterstitial = type === "interstitial";

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden bg-secondary/80 border border-border/60 border-dashed rounded-xl ${
        isBanner ? "w-full py-6 sm:py-8" : 
        isInterstitial ? "w-full aspect-[3/4] sm:aspect-video" : 
        "w-full aspect-square max-w-sm mx-auto"
      } ${className}`}
    >
      <div className="absolute top-2 right-2 rounded bg-background/80 px-1.5 py-0.5 text-[8px] sm:text-[9px] text-muted-foreground font-bold border border-border/50">
        AdSense
      </div>
      <Megaphone className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/40 mb-2" />
      <p className="text-xs sm:text-sm font-bold text-muted-foreground/60 text-center px-4">
        {isInterstitial ? "전면 광고 대기 영역" : "구글 애드센스 광고 영역"}
      </p>
      {isInterstitial && (
        <p className="text-[10px] sm:text-xs text-muted-foreground/40 mt-1 text-center">
          무료 회원은 오답 분석 시 3~5초간 전면 광고에 노출됩니다.
        </p>
      )}
    </div>
  );
}
