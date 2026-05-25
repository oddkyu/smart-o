"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "대시보드", href: "/" },
  { name: "3D 단어장", href: "/vocab" },
  { name: "문법 스킬트리", href: "/tree" },
  { name: "RC 실전퀴즈", href: "/rc" },
  { name: "LC 블라인드", href: "/lc" },
  { name: "스마트 오답노트", href: "/notes" },
  { name: "프리미엄 인쇄실", href: "/print" },
];

export function GNB() {
  const pathname = usePathname() || "";

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-950/70 backdrop-blur-md border-b border-slate-800">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center flex-shrink-0 mr-4 lg:mr-8">
          <Link href="/" className="text-xl font-extrabold text-slate-100 tracking-wider">
            Smart<span className="text-cyan-400">-O</span>
          </Link>
        </div>

        <nav className="hidden lg:flex flex-1 items-center h-full gap-1 xl:gap-2 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`relative px-3 xl:px-4 h-full flex items-center text-sm font-semibold transition-colors duration-200 whitespace-nowrap ${
                  isActive
                    ? "text-cyan-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {item.name}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4 ml-auto">
          <div className="hidden sm:flex flex-col items-end justify-center">
            <span className="text-sm font-bold text-slate-200">김노트 러너</span>
            <span className="text-xs text-orange-400 font-bold tracking-wide">
              🔥 5일 연속 달성 중
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 border border-slate-700 flex items-center justify-center overflow-hidden hover:ring-2 ring-cyan-400/50 transition-all cursor-pointer shadow-lg shadow-cyan-900/20">
            <span className="text-white text-sm font-bold">김</span>
          </div>
        </div>
      </div>
    </header>
  );
}
