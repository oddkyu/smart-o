"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { Camera, Image as ImageIcon, Sparkles, ArrowLeft, RefreshCw, Upload, Shield } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import GoogleAdDummy from "@/components/GoogleAdDummy";
import { useUserStatus } from "@/contexts/UserContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

import { useSearchParams } from "next/navigation";

// Helper to convert base64 to Blob for storage upload
function base64ToBlob(base64: string, mimeType: string) {
  try {
    const byteCharacters = atob(base64.split(",")[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  } catch (err) {
    console.error("Failed to parse base64 to blob", err);
    return null;
  }
}

function CaptureContent() {
  const { status } = useUserStatus();
  const searchParams = useSearchParams();
  const defaultSubject = searchParams.get("defaultSubject");
  const [image, setImage] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulatively compress image to max 1200px width on client side (Canvas API logic mockup)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // Max boundary
        const MAX_WIDTH = 1000;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        // Compress quality 0.65
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.65);
        
        // Artificial delay for premium loading experience
        setTimeout(() => {
          setImage(compressedBase64);
          setCompressing(false);
        }, 800);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleStartAnalysis = async () => {
    if (!image) return;
    setAnalyzing(true);
    setAnalysisProgress(15);

    // clear previous session storages
    sessionStorage.removeItem("smart-o-captured-url");
    sessionStorage.removeItem("smart-o-captured-base64");
    sessionStorage.removeItem("smart-o-extracted-data");
    
    if (defaultSubject) {
      sessionStorage.setItem("smart-o-default-subject", defaultSubject);
    } else {
      sessionStorage.removeItem("smart-o-default-subject");
    }

    // 1. Supabase가 활성화된 경우 스토리지로 비동기 업로드 진행
    if (isSupabaseConfigured && supabase) {
      try {
        const blob = base64ToBlob(image, "image/jpeg");
        if (blob) {
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.jpg`;
          const filePath = `wrong_${fileName}`;
          
          const { error } = await supabase.storage
            .from("wrong-images")
            .upload(filePath, blob, {
              contentType: "image/jpeg",
              upsert: true
            });
          
          if (error) throw error;
          
          const { data: publicUrlData } = supabase.storage
            .from("wrong-images")
            .getPublicUrl(filePath);
          
          if (publicUrlData && publicUrlData.publicUrl) {
            sessionStorage.setItem("smart-o-captured-url", publicUrlData.publicUrl);
          }
        }
      } catch (err) {
        console.error("Failed to upload image to Supabase Storage, using sessionStorage fallback", err);
        sessionStorage.setItem("smart-o-captured-base64", image);
      }
    } else {
      // 로컬 모드에서는 SessionStorage에 Base64 형태로 임시 보관
      sessionStorage.setItem("smart-o-captured-base64", image);
    }

    setAnalysisProgress(35);

    // 진행 상태를 자연스럽게 올리기 위한 인공 프로그레스 타이머
    const progressInterval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 85) {
          clearInterval(progressInterval);
          return 85;
        }
        return prev + 10;
      });
    }, 400);

    // 2. 백엔드 제미나이 API 호출 진행
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ image })
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error("서버와의 통신에 실패했습니다.");
      }

      const resData = await response.json();
      
      if (!resData.success) {
        throw new Error(resData.error || "분석 결과를 가져오는 데 실패했습니다.");
      }

      // API Key 미지정 경고가 있는 경우
      if (resData.warning) {
        console.warn("[Smart O Warning]:", resData.warning);
      }

      // 파싱된 제미나이 데이터 저장
      sessionStorage.setItem("smart-o-extracted-data", JSON.stringify(resData.data));
      
      setAnalysisProgress(100);
      
      setTimeout(() => {
        window.location.href = "/review";
      }, 500);

    } catch (err: any) {
      clearInterval(progressInterval);
      console.error("오답 분석 실패:", err);
      alert(err.message || "오답 분석에 실패했습니다. 다시 시도해 주세요.");
      setAnalyzing(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative pb-12 transition-colors duration-250">
      {/* Decorative Aura */}
      <div className="absolute top-0 right-1/4 h-[300px] sm:h-[500px] w-[300px] sm:w-[500px] -translate-y-64 rounded-full bg-primary/5 dark:bg-primary/10 blur-[100px] pointer-events-none"></div>

      <DashboardHeader />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6 animate-fade-in-up">
        
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>대시보드로 돌아가기</span>
        </Link>

        {/* Page Title */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <span>오답 찰칵 촬영 및 추가</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            문제를 바르게 정렬해 촬영해 주세요. AI가 문제 본문과 지문을 발라내고 낙서를 제거합니다.
          </p>
        </div>

        {/* 1. Camera Interface Frame Container */}
        {!analyzing ? (
          <div className="glass-panel rounded-2xl sm:rounded-3xl p-6 relative flex flex-col items-center justify-center min-h-[350px]">
            
            {/* Real environment camera hidden input */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            {image ? (
              // Image Preview state
              <div className="w-full space-y-5 animate-fade-in-up">
                <div className="relative rounded-2xl overflow-hidden border border-border bg-slate-900 aspect-[4/3] flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="Captured problem" className="max-h-full object-contain" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1 bg-black/80 px-2.5 py-1 rounded-full border border-zinc-800">
                      <Shield className="h-3.5 w-3.5 text-emerald-400" />
                      클라이언트 단에서 1000px 압축 완료
                    </span>
                    <span>JPEG 포맷</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={triggerFileInput}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary hover:bg-muted py-3 text-xs font-bold text-foreground transition cursor-pointer active:scale-95"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>재촬영 하기</span>
                  </button>
                  <button
                    onClick={handleStartAnalysis}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 py-3 text-xs font-bold text-white hover:opacity-90 shadow-md shadow-indigo-500/10 cursor-pointer transition active:scale-95"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>AI 분석 시작하기</span>
                  </button>
                </div>
              </div>
            ) : (
              // Empty selection state
              <div className="text-center py-8 space-y-6 max-w-sm animate-fade-in-up">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary border border-border text-muted-foreground shadow-sm">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-foreground">카메라 촬영 혹은 이미지 업로드</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    스마트폰으로 기출문제지를 촬영하거나 갤러리에서 오답 스크린샷을 선택해 주세요.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={triggerFileInput}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 py-3.5 text-xs font-bold text-white hover:opacity-90 shadow-md shadow-indigo-500/10 cursor-pointer transition active:scale-95"
                  >
                    <Camera className="h-4 w-4" />
                    <span>📷 지금 오답 촬영하기</span>
                  </button>
                  <button
                    onClick={triggerFileInput}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary hover:bg-muted py-3 text-xs font-bold text-foreground transition cursor-pointer active:scale-95"
                  >
                    <Upload className="h-4 w-4" />
                    <span>갤러리에서 업로드</span>
                  </button>
                </div>

                {compressing && (
                  <div className="text-xs text-primary font-medium flex items-center justify-center gap-1.5 animate-pulse pt-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Canvas API 초고속 이미지 압축 진행 중...
                  </div>
                )}
              </div>
            )}
          </div>
        ) : status === "free" ? (
          <div className="glass-panel rounded-2xl sm:rounded-3xl p-6 relative flex flex-col items-center justify-center min-h-[450px] animate-fade-in-up">
             <div className="w-full space-y-4">
               <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold px-2">
                 <span>분석을 진행하는 동안 잠시 광고가 표시됩니다...</span>
                 <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> {analysisProgress}%</span>
               </div>
               <GoogleAdDummy type="interstitial" />
             </div>
          </div>
        ) : (
          // 2. AI Skeleton Loading Animation Screen
          <div className="glass-panel rounded-2xl sm:rounded-3xl p-8 space-y-6 animate-fade-in-up">
            
            {/* Dynamic skeleton loader title */}
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary animate-spin-slow">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">AI가 오답을 깔끔하게 복원하는 중입니다...</h4>
                <p className="text-xs text-muted-foreground animate-pulse">
                  수험생의 빨간 볼펜 밑줄, 형광펜 채점 흔적을 무시하고 문제 원본만 도려내는 중
                </p>
              </div>
            </div>

            {/* Simulated progress percentage bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                <span>Vision OCR & 필기 흔적 노이즈 감쇠 모델 가동</span>
                <span>{analysisProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden border border-border">
                <div
                  style={{ width: `${analysisProgress}%` }}
                  className="h-full bg-gradient-to-r from-primary to-indigo-600 rounded-full transition-all duration-300"
                ></div>
              </div>
            </div>

            {/* Elegant Skeleton Boxes representing structural elements */}
            <div className="space-y-4 border border-border bg-secondary/30 p-5 rounded-2xl">
              {/* Question box skeleton */}
              <div className="space-y-2">
                <div className="h-3 w-12 bg-border rounded animate-pulse"></div>
                <div className="h-4.5 w-full bg-border/60 rounded animate-pulse"></div>
                <div className="h-4.5 w-3/4 bg-border/60 rounded animate-pulse"></div>
              </div>

              {/* 5 lines selection skeletons */}
              <div className="space-y-2.5 pt-2 border-t border-border">
                <div className="h-3.5 w-5/6 bg-border/40 rounded animate-pulse"></div>
                <div className="h-3.5 w-4/6 bg-border/40 rounded animate-pulse"></div>
                <div className="h-3.5 w-2/3 bg-border/40 rounded animate-pulse"></div>
              </div>

              {/* Tag skeletons */}
              <div className="flex gap-2 pt-2 border-t border-border">
                <div className="h-6 w-20 bg-border/30 rounded-full animate-pulse"></div>
                <div className="h-6 w-24 bg-border/30 rounded-full animate-pulse"></div>
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground text-center">
              분석이 끝나면 AI 편집 및 최종 검토 화면(/review)으로 실시간 자동 전환됩니다.
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

export default function CapturePage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
        <span className="text-xs font-semibold">카메라 로딩 중...</span>
      </div>
    }>
      <CaptureContent />
    </React.Suspense>
  );
}
