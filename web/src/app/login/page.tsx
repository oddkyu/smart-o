"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (isLoginMode) {
        // 로그인 로직
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/"); // 로그인 성공 시 메인으로 이동
      } else {
        // 회원가입 로직
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        // Supabase 기본 설정상 이메일 확인이 필요할 수 있습니다.
        if (data?.user?.identities?.length === 0) {
          setErrorMsg("이미 가입된 이메일입니다.");
        } else {
          alert("가입이 완료되었습니다! 로그인해 주세요.");
          setIsLoginMode(true);
        }
      }
    } catch (error: any) {
      setErrorMsg(error.message || "오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 animate-fade-in px-4">
      <div className="glass-panel w-full max-w-md p-8 sm:p-10 flex flex-col items-center relative overflow-hidden">
        {/* 장식용 글로우 효과 */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary-cyan/20 blur-[60px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary-purple/20 blur-[60px] rounded-full pointer-events-none" />

        <div className="relative z-10 w-full text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold text-white tracking-wide">
            {isLoginMode ? "Welcome Back" : "Join Notefit"}
          </h1>
          <p className="text-slate-400 text-sm">
            {isLoginMode 
              ? "당신의 약점을 파괴할 준비가 되셨나요?" 
              : "지금 가입하고 AI 맞춤형 솔루션을 경험하세요"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="relative z-10 w-full space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 ml-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hello@notefit.com"
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary-cyan/50 focus:ring-1 focus:ring-primary-cyan/50 transition-all duration-300"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 ml-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary-purple/50 focus:ring-1 focus:ring-primary-purple/50 transition-all duration-300"
            />
          </div>

          {errorMsg && (
            <p className="text-red-400 text-xs text-center font-medium bg-red-400/10 py-2 rounded-lg border border-red-400/20">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-[linear-gradient(135deg,#00F2FE_0%,#4FACFE_100%)] text-white font-bold py-3.5 rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:shadow-[0_0_25px_rgba(0,242,254,0.5)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {loading ? "처리 중..." : isLoginMode ? "로그인" : "회원가입"}
          </button>
        </form>

        <div className="relative z-10 mt-8 text-sm text-slate-400">
          {isLoginMode ? "아직 계정이 없으신가요?" : "이미 계정이 있으신가요?"}
          <button
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setErrorMsg("");
            }}
            className="ml-2 text-primary-cyan hover:text-white font-semibold transition-colors"
          >
            {isLoginMode ? "회원가입" : "로그인"}
          </button>
        </div>
      </div>
    </div>
  );
}
