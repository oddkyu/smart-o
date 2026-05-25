"use client";

import { useState, useEffect } from "react";
import { useUserStatus } from "@/contexts/UserContext";

// 오디오 겹침 방지용 전역 변수
let activeAudio: HTMLAudioElement | null = null;
const audioCache: Record<string, HTMLAudioElement> = {};

export function useAudioStream() {
  const { status } = useUserStatus();
  const [showTTSModal, setShowTTSModal] = useState(false);
  const [todayLCCount, setTodayLCCount] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const storedDataStr = localStorage.getItem("smart-o-tts-limit");
    if (storedDataStr) {
      try {
        const storedData = JSON.parse(storedDataStr);
        if (storedData.date === today) {
          setTodayLCCount(storedData.count);
        } else {
          setTodayLCCount(0);
          localStorage.setItem("smart-o-tts-limit", JSON.stringify({ date: today, count: 0 }));
        }
      } catch (e) {
        setTodayLCCount(0);
      }
    }
  }, []);

  const playPronunciation = (e: React.MouseEvent | null, text: string, accent: 'US' | 'UK') => {
    if (e) e.stopPropagation();

    // 프리미엄 유저가 아닐 경우 하루 20회 제한
    if (status !== "premium") {
      if (todayLCCount >= 20) {
        setShowTTSModal(true);
        return;
      }
      const nextCount = todayLCCount + 1;
      setTodayLCCount(nextCount);
      const today = new Date().toISOString().split("T")[0];
      localStorage.setItem("smart-o-tts-limit", JSON.stringify({ date: today, count: nextCount }));
    }

    const sanitizedText = text?.trim();
    if (!sanitizedText) {
      console.warn("⚠️ 재생할 단어 텍스트가 비어 있습니다.");
      return;
    }

    // 기존 재생 중인 오디오가 있다면 즉시 중지 (오디오 겹침 방지)
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }

    // Youdao 사전 API 활용 (1: UK, 2: US)
    const type = accent === 'US' ? 2 : 1;
    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(sanitizedText)}&type=${type}`;
    
    try {
      if (!audioCache[url]) {
        const audio = new Audio(url);
        audio.preload = "auto";
        audioCache[url] = audio;
      }
      activeAudio = audioCache[url];
      activeAudio.currentTime = 0;
      activeAudio.play().catch(error => {
        console.error("🚨 TTS 오디오 재생 중 에러 발생:", error);
      });
    } catch (e) {
      console.error("🚨 Audio 객체 생성 중 에러 발생:", e);
    }
  };

  const preloadAudio = (words: string[]) => {
    words.forEach(word => {
      if (!word) return;
      ['US', 'UK'].forEach(acc => {
         const type = acc === 'US' ? 2 : 1;
         const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`;
         if (!audioCache[url]) {
           const audio = new Audio(url);
           audio.preload = "auto";
           audioCache[url] = audio;
         }
      });
    });
  };

  return { playPronunciation, preloadAudio, showTTSModal, setShowTTSModal, todayLCCount };
}
