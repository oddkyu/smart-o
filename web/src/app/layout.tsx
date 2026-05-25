import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 가독성 최강의 폰트
const inter = Inter({ subsets: ["latin"], display: 'swap' });

export const metadata: Metadata = {
  title: "Notefit | 당신만의 프리미엄 토익 솔루션",
  description: "AI가 분석하고 생성하는 1:1 맞춤형 토익 학습 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className={`${inter.className} min-h-screen bg-background text-foreground relative overflow-x-hidden selection:bg-primary-cyan/30`}>
        {/* 미드나잇 다크모드 전용 배경 오로라(Aurora) 블러 효과 */}
        <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-purple/10 blur-[150px] pointer-events-none -z-10" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary-cyan/10 blur-[120px] pointer-events-none -z-10" />
        
        {/* 메인 레이아웃 뼈대 */}
        <main className="relative z-10 w-full max-w-6xl mx-auto px-6 py-12 md:py-20 min-h-screen flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
