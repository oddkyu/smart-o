"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type UserStatus = "guest" | "free" | "premium";

interface UserContextType {
  status: UserStatus;
  setStatus: (status: UserStatus) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<UserStatus>("guest");
  const router = useRouter();
  const pathname = usePathname();

  // Load from local storage if needed, or simply initialize as guest
  useEffect(() => {
    const stored = localStorage.getItem("smart-o-user-status") as UserStatus;
    if (stored && ["guest", "free", "premium"].includes(stored)) {
      setStatus(stored);
    }
  }, []);

  // [3단계] 인증 상태 전역 감시 및 토큰 만료/로그아웃 처리
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // 세션이 만료되어 튕기거나(TOKEN_REFRESH_FAILED 등 내부 처리), 명시적 로그아웃 시
      if (event === "SIGNED_OUT" || event === "USER_DELETED") {
        alert("인증 세션이 만료되었습니다. 다시 로그인해 주세요.");
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // [3단계] 보호된 라우트(Protected Route) 방어 로직 (입구 컷)
  useEffect(() => {
    const protectedRoutes = ["/dashboard", "/notes", "/vocab", "/tree", "/rc", "/lc", "/print"];
    const isProtected = pathname && protectedRoutes.some(route => pathname.startsWith(route));

    const checkAuthGuard = async () => {
      // 로컬 fallback 모드가 아니고 실제 Supabase가 연동된 상태일 때만 라우트 가드 작동
      if (isProtected && isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.getSession();
        
        // 401 에러(토큰 만료 등)가 발생하거나 활성 세션이 없는 경우 로그인 페이지로 리다이렉트
        if (error || !data.session) {
          alert("로그인이 필요한 서비스입니다. 로그인 페이지로 이동합니다.");
          router.push("/login");
        }
      }
    };
    
    checkAuthGuard();
  }, [pathname, router]);

  const handleSetStatus = (newStatus: UserStatus) => {
    setStatus(newStatus);
    localStorage.setItem("smart-o-user-status", newStatus);
  };

  return (
    <UserContext.Provider value={{ status, setStatus: handleSetStatus }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserStatus() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUserStatus must be used within a UserProvider");
  }
  return context;
}
