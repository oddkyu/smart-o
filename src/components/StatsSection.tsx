"use client";

import React from "react";
import { TrendingUp, AlertCircle, CheckCircle2, PieChart, Activity, Diamond } from "lucide-react";
import { useUserStatus } from "@/contexts/UserContext";

interface Folder {
  id: string;
  name: string;
  color: string;
  wrongCount: number;
}

interface StatsSectionProps {
  folders: Folder[];
}

export default function StatsSection({ folders }: StatsSectionProps) {
  const totalWrong = folders.reduce((acc, f) => acc + f.wrongCount, 0);
  
  const sortedFolders = [...folders].sort((a, b) => b.wrongCount - a.wrongCount);
  const weakestSubject = sortedFolders[0]?.name || "기록 없음";
  const weakestPercentage = totalWrong > 0 
    ? Math.round((sortedFolders[0]?.wrongCount / totalWrong) * 100) 
    : 0;

  const reviewProgress = totalWrong > 0 
    ? Math.min(Math.round(((totalWrong * 1.5) / (totalWrong + 15)) * 40), 92)
    : 0;

  const { status } = useUserStatus();

  return (
    <section id="stats" className="w-full py-2 sm:py-6">
      <div className="grid gap-3.5 sm:gap-6 grid-cols-1">
        {/* Card 1: Weekly Added Wrong Answers */}
        <div className="glass-panel glass-card-hover rounded-xl sm:rounded-2xl p-4 sm:p-6 relative overflow-hidden max-w-sm">
          <div className="absolute top-0 right-0 h-16 w-16 sm:h-24 sm:w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10 blur-lg"></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-muted-foreground">
                이번 주 등록 오답 {status === "free" && <span className="text-[10px] text-red-500 font-bold ml-1">(17/20개 제한)</span>}
              </span>
              {status === "free" && (
                <button className="flex items-center gap-1 rounded bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-extrabold text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition cursor-pointer">
                  <Diamond className="h-2.5 w-2.5 fill-purple-500/20" />
                  무제한 해제
                </button>
              )}
            </div>
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-primary">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-4 flex items-baseline gap-1">
            <span className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">{totalWrong}</span>
            <span className="text-xs sm:text-sm font-bold text-muted-foreground">개</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[10px] sm:text-xs text-indigo-600 dark:text-emerald-400 font-bold bg-indigo-500/10 dark:bg-emerald-500/10 w-fit px-2 py-0.5 rounded-full">
            <TrendingUp className="h-3 w-3" />
            <span>지난 주 대비 +12%</span>
          </div>
        </div>
      </div>
    </section>
  );
}
