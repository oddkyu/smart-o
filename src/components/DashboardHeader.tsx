"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, User, Crown, Flame, Menu, X, Sun, Moon, PlayCircle } from "lucide-react";
import { useUserStatus, UserStatus } from "@/contexts/UserContext";

export default function DashboardHeader() {
  const { status, setStatus } = useUserStatus();
  const [greeting, setGreeting] = useState("오늘도 열공하세요!");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("light");

  // Sync theme with localStorage and DOM on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("smart-o-theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      // Default to Light Theme
      document.documentElement.classList.remove("dark");
    }

    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting("기분 좋은 아침 자습 시간입니다! ☀️");
    } else if (hour >= 12 && hour < 18) {
      setGreeting("집중이 잘 되는 오후 학습 시간입니다! ✍️");
    } else if (hour >= 18 && hour < 23) {
      setGreeting("끝까지 집중하는 저녁 독서실 시간입니다! 🌙");
    } else {
      setGreeting("조용한 새벽 자습 시간입니다. 힘내세요! ✨");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("smart-o-theme", nextTheme);
    
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <header className="no-print sticky top-0 z-50 w-full border-b border-border bg-card/85 backdrop-blur-md transition-colors duration-250">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition cursor-pointer">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-600 p-0.5 shadow-md shadow-indigo-500/5">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-card">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Smart <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">O</span>
            </h1>
            <p className="text-[10px] font-semibold text-muted-foreground">TOEIC 스마트 오답노트</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted-foreground">
          <Link href="/" className="text-foreground transition hover:text-primary">대시보드</Link>
          <a href="#folders" className="transition hover:text-primary">Part별 폴더</a>
          {status === "premium" && (
            <>
              <Link href="/folders/vocabulary" className="transition hover:text-primary">스마트 단어장</Link>
              <Link href="/print" className="transition hover:text-primary">인쇄실</Link>
            </>
          )}
          <Link href="/solve" className="flex items-center gap-1.5 transition text-indigo-500 hover:text-indigo-400 font-extrabold">
            <PlayCircle className="h-4 w-4" />
            실전 오답 풀기
          </Link>
        </nav>

        {/* User Info & Actions */}
        <div className="hidden md:flex items-center gap-4">
          {/* Streak */}
          <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 border border-border">
            <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
            <span className="text-xs font-bold text-foreground">5일 연속 학습 중</span>
          </div>

          {/* User Status Toggle (Temp for testing) */}
          <button
            onClick={() => {
              const next: Record<UserStatus, UserStatus> = { guest: "free", free: "premium", premium: "guest" };
              setStatus(next[status]);
            }}
            className={`flex items-center gap-1 rounded-full px-3 py-1 border text-xs font-bold transition cursor-pointer hover:opacity-80 ${
              status === "premium" ? "bg-primary/10 border-primary/20 text-primary" : 
              status === "free" ? "bg-blue-500/10 border-blue-500/20 text-blue-500 dark:text-blue-400" :
              "bg-secondary border-border text-muted-foreground"
            }`}
            title="클릭하여 등급 변경 테스트"
          >
            {status === "premium" && <Crown className="h-3.5 w-3.5 fill-primary/10" />}
            {status === "free" && <User className="h-3.5 w-3.5" />}
            {status === "guest" && <User className="h-3.5 w-3.5 opacity-50" />}
            <span className="capitalize">{status}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition cursor-pointer"
            title={theme === "light" ? "학습용 어두운 모드로 전환" : "학습용 밝은 모드로 전환"}
          >
            {theme === "light" ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
          </button>

          {/* Profile Button */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary border border-border cursor-pointer transition">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Mobile Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          {/* Mobile Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary border border-border text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            {theme === "light" ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
          </button>

          {/* Mobile Streak Icon */}
          <div className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 border border-border">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-bold text-foreground">5일</span>
          </div>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-4 animate-fade-in-up">
          <nav className="flex flex-col gap-4 text-sm font-semibold text-muted-foreground">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-foreground py-1.5 hover:text-primary">대시보드</Link>
            <a href="#folders" onClick={() => setMobileMenuOpen(false)} className="py-1.5 hover:text-primary">Part별 폴더</a>
            {status === "premium" && (
              <>
                <Link href="/folders/vocabulary" onClick={() => setMobileMenuOpen(false)} className="py-1.5 hover:text-primary">스마트 단어장</Link>
                <Link href="/print" onClick={() => setMobileMenuOpen(false)} className="py-1.5 hover:text-primary">인쇄실</Link>
              </>
            )}
            <Link href="/solve" onClick={() => setMobileMenuOpen(false)} className="py-1.5 flex items-center gap-1.5 text-indigo-500 hover:text-indigo-400 font-extrabold">
              <PlayCircle className="h-4 w-4" />
              실전 오답 풀기
            </Link>
            <hr className="border-border" />
              <div className="flex items-center justify-between py-1">
                <button
                  onClick={() => {
                    const next: Record<UserStatus, UserStatus> = { guest: "free", free: "premium", premium: "guest" };
                    setStatus(next[status]);
                  }}
                  className={`flex items-center gap-1 text-xs font-bold cursor-pointer transition ${
                    status === "premium" ? "text-primary" : 
                    status === "free" ? "text-blue-500 dark:text-blue-400" :
                    "text-muted-foreground"
                  }`}
                >
                  {status === "premium" && <Crown className="h-3.5 w-3.5 fill-primary/10" />}
                  {status === "free" && <User className="h-3.5 w-3.5" />}
                  {status === "guest" && <User className="h-3.5 w-3.5 opacity-50" />}
                  <span className="capitalize">{status} 회원 이용 중</span>
                </button>
              </div>
          </nav>
        </div>
      )}

      {/* Motivational Sub-Bar */}
      <div className="w-full bg-secondary/50 py-2 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-xs text-muted-foreground font-semibold text-center">{greeting} 오늘도 TOEIC 오답을 정복해 볼까요? 🔥</span>
        </div>
      </div>
    </header>
  );
}
