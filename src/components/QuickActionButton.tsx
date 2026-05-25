"use client";

import React from "react";
import { Camera } from "lucide-react";
import Link from "next/link";

export default function QuickActionButton() {
  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 mx-auto flex w-fit justify-center px-4 sm:left-auto sm:right-6 sm:bottom-8 sm:mx-0">
      
      {/* Neo-Glow Pulsing Backdrop Wrapper */}
      <Link href="/capture" className="relative group">
        
        {/* Pulsing glow ring background */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary via-indigo-500 to-accent opacity-50 blur-md group-hover:opacity-75 group-hover:blur-lg transition duration-500 animate-pulse"></div>
        
        {/* Floating Button Container */}
        <button
          className="relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-primary to-indigo-600 px-6 py-3.5 text-white font-extrabold text-sm shadow-xl transition duration-300 transform active:scale-95 group-hover:-translate-y-0.5 cursor-pointer border border-primary/10"
        >
          {/* Icon */}
          <div className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-white/25 text-white shadow-inner">
            <Camera className="h-3.5 w-3.5" />
          </div>

          {/* Text */}
          <span className="tracking-wide">
            오답 추가하기
          </span>
          
          {/* Mini pulse dot badge */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>

        </button>

      </Link>
    </div>
  );
}
