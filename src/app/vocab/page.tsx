"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Check, X, RotateCcw, Trophy, Search, PlayCircle, Eye, EyeOff, BookOpen, SearchX, Type, Zap, CheckSquare, LogOut, Volume2, Crown, Printer } from "lucide-react";
import GoogleAdDummy from "@/components/GoogleAdDummy";
import { useUserStatus } from "@/contexts/UserContext";
import { TOEIC_DUMMY_WORDS } from "./dummyWords";
import { useAudioStream } from "@/hooks/useAudioStream";

interface WordItem {
  id: string;
  word: string;
  meaning: string;
  meanings?: string[];
  toeic_tip?: string;
  collocation?: string;
  paraphrasing?: string;
  example_sentence?: string;
  example_translation?: string;
  tag: string;
  pos?: string;
  status: "learning" | "memorized";
}

const FALLBACK_WORDS: WordItem[] = [
  { id: "w1", word: "implement", meaning: "실행하다, 이행하다", tag: "Part 5, 6 빈출", pos: "동사", status: "learning" },
  { id: "w2", word: "subsequently", meaning: "그 후에, 나중에", tag: "Part 5 빈출", pos: "부사", status: "learning" },
  { id: "w3", word: "compliant", meaning: "순응하는, 규정을 준수하는", tag: "Part 7 빈출", pos: "형용사", status: "learning" },
  { id: "w4", word: "delegate", meaning: "위임하다, 대표", tag: "Part 5 빈출", pos: "동사/명사", status: "learning" },
  { id: "w5", word: "unprecedented", meaning: "전례 없는", tag: "Part 6, 7 빈출", pos: "형용사", status: "learning" },
];

export default function VocabularyFlashcardPage() {
  const [words, setWords] = useState<WordItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { status } = useUserStatus();

  // View states
  type ViewMode = "list" | "flashcard" | "quiz-multiple" | "quiz-spelling" | "quiz-speed";
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  
  // Dashboard states
  const [searchQuery, setSearchQuery] = useState("");
  // Speed O/X Quiz states
  const [speedQuizMeaning, setSpeedQuizMeaning] = useState<string>("");
  const [speedQuizIsCorrect, setSpeedQuizIsCorrect] = useState<boolean>(true);
  const [speedQuizFeedback, setSpeedQuizFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showSpeedPreNotice, setShowSpeedPreNotice] = useState(false);

  // Pagination & Filtering
  const [filterTab, setFilterTab] = useState<"all" | "learning" | "memorized">("all");
  const [hideEnglish, setHideEnglish] = useState(false);
  const [hideMeaning, setHideMeaning] = useState(false);

  // Shared Quiz states
  const [quizQueue, setQuizQueue] = useState<WordItem[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Flashcard states
  const [showFlashcardPreNotice, setShowFlashcardPreNotice] = useState(false);
  const [flashcardAutoPlayAudio, setFlashcardAutoPlayAudio] = useState(true);

  // Session History for Quiz
  const [sessionMemorized, setSessionMemorized] = useState<WordItem[]>([]);
  const [sessionLearning, setSessionLearning] = useState<WordItem[]>([]);

  // 1. Multiple Choice specific
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showQuizPreNotice, setShowQuizPreNotice] = useState(false);
  const [quizPaddingCount, setQuizPaddingCount] = useState(0);
  const [userSelections, setUserSelections] = useState<{word: string; meaning: string; selected: string; isCorrect: boolean}[]>([]);
  const [pendingQuizMode, setPendingQuizMode] = useState<ViewMode | null>(null);

  // 2. Spelling specific
  const [spellingInput, setSpellingInput] = useState("");
  const [spellingFeedback, setSpellingFeedback] = useState<"correct" | "wrong" | null>(null);
  const [spellingDifficulty, setSpellingDifficulty] = useState<1 | 2 | 3>(1);
  const [showSpellingPreNotice, setShowSpellingPreNotice] = useState(false);
  const [revealedSpelling, setRevealedSpelling] = useState<string | null>(null);

  // 3. Flashcard specific
  const [isFlipped, setIsFlipped] = useState(false);

  // 4. Ad Popup
  const [showAdPopup, setShowAdPopup] = useState(false);

  // 5. TTS State & Logic (via Global Hook)
  const { playPronunciation, preloadAudio, showTTSModal, setShowTTSModal, todayLCCount } = useAudioStream();

  // 현재 퀴즈에서 곧 나올 단어들을 미리 로딩해두어 클릭 시 딜레이를 없앰
  useEffect(() => {
    if (viewMode !== 'list' && quizQueue.length > 0) {
      const preloadWords = [quizQueue[quizIndex]?.word];
      if (quizIndex + 1 < quizQueue.length) {
        preloadWords.push(quizQueue[quizIndex + 1]?.word);
      }
      preloadAudio(preloadWords.filter(Boolean) as string[]);
    }
  }, [quizIndex, quizQueue, viewMode, preloadAudio]);

  // 플래시카드 오디오 자동 재생
  useEffect(() => {
    if (viewMode === "flashcard" && flashcardAutoPlayAudio && quizQueue.length > 0) {
      const currentWord = quizQueue[quizIndex];
      if (currentWord) {
        // 단어가 바뀔 때마다 즉시 미국식 발음 재생
        playPronunciation(null, currentWord.word, 'US');
      }
    }
  }, [quizIndex, viewMode, flashcardAutoPlayAudio, quizQueue]);

  useEffect(() => {
    let loadedWords: WordItem[] = [];
    try {
      const storedNotes = localStorage.getItem("smart-o-notes");
      if (storedNotes) {
        const notes = JSON.parse(storedNotes);
        notes.forEach((note: any) => {
          if (note.words && Array.isArray(note.words)) {
            note.words.forEach((w: any) => {
              loadedWords.push({
                id: `w-${Date.now()}-${Math.random()}`,
                word: w.word,
                meaning: w.meanings ? w.meanings.join(", ") : (w.meaning || ""),
                meanings: w.meanings || [],
                toeic_tip: w.toeic_tip || "",
                collocation: w.collocation || "",
                paraphrasing: w.paraphrasing || "",
                example_sentence: w.example_sentence || "",
                example_translation: w.example_translation || "",
                tag: w.tag || "오답 추출",
                pos: w.pos || "품사 미기재",
                status: "learning"
              });
            });
          }
        });
      }
    } catch (e) {
      console.error("Failed to parse words from local storage", e);
    }

    // --- [START TEMPORARY DUMMY WORDS FOR TESTING] ---
    if (loadedWords.length === 0) {
      loadedWords = [...TOEIC_DUMMY_WORDS];
    }
    // --- [END TEMPORARY DUMMY WORDS FOR TESTING] ---
    
    // Restore memorization status from localStorage
    const savedStatusesStr = localStorage.getItem("smart-o-words-status");
    if (savedStatusesStr) {
      try {
        const savedStatuses = JSON.parse(savedStatusesStr);
        loadedWords = loadedWords.map(w => ({
          ...w,
          status: savedStatuses[w.word] || "learning"
        }));
      } catch(e) {}
    }

    setWords(loadedWords);
    setIsLoading(false);
  }, []);

  const toggleStatus = (wordStr: string) => {
    const updatedWords = words.map(w => {
      if (w.word === wordStr) {
        return { ...w, status: w.status === "learning" ? "memorized" as const : "learning" as const };
      }
      return w;
    });
    setWords(updatedWords);
    
    // Save to local storage for persistence
    const statuses = updatedWords.reduce((acc, curr) => {
      acc[curr.word] = curr.status;
      return acc;
    }, {} as Record<string, string>);
    localStorage.setItem("smart-o-words-status", JSON.stringify(statuses));
  };

  // Utility to shuffle array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const QUIZ_QUESTION_COUNT = 20;

  const startQuizMode = (mode: ViewMode) => {
    const learningWords = words.filter(w => w.status === "learning");
    
    if (learningWords.length === 0 && TOEIC_DUMMY_WORDS.length === 0) {
      alert("학습할 단어가 없습니다! 새 오답노트를 추가해 주세요. 🎉");
      return;
    }
    
    // 20문제 고정 및 더미 단어 패딩 로직 통일 (모든 퀴즈 공통)
    let quizWords = shuffleArray(learningWords).slice(0, QUIZ_QUESTION_COUNT);
    let paddingCount = 0;
    
    if (quizWords.length < QUIZ_QUESTION_COUNT) {
      const existingWordSet = new Set(quizWords.map(w => w.word));
      const availablePadding = TOEIC_DUMMY_WORDS.filter(w => !existingWordSet.has(w.word));
      const needed = QUIZ_QUESTION_COUNT - quizWords.length;
      const paddingWords = shuffleArray(availablePadding).slice(0, needed);
      paddingCount = paddingWords.length;
      quizWords = [...quizWords, ...paddingWords];
    }
    
    quizWords = shuffleArray(quizWords);
    
    // 상태 초기화
    setQuizPaddingCount(paddingCount);
    setQuizQueue(quizWords);
    setQuizIndex(0);
    setQuizScore(0);
    setIsQuizFinished(false);
    setIsAnimating(false);
    setSessionMemorized([]);
    setSessionLearning([]);
    setUserSelections([]);
    setPendingQuizMode(mode);

    // 각 퀴즈별 사전 공지 팝업 분기
    if (mode === "quiz-multiple") {
      setShowQuizPreNotice(true);
    } else if (mode === "quiz-spelling") {
      setShowSpellingPreNotice(true);
    } else if (mode === "quiz-speed") {
      setShowSpeedPreNotice(true);
    } else if (mode === "flashcard") {
      setShowFlashcardPreNotice(true);
    } else {
      setViewMode(mode);
    }
  };

  const confirmStartFlashcard = (autoPlay: boolean) => {
    setFlashcardAutoPlayAudio(autoPlay);
    setShowFlashcardPreNotice(false);
    setIsFlipped(false);
    setViewMode("flashcard");
  };

  const confirmStartSpellingQuiz = (level: 1 | 2 | 3) => {
    setSpellingDifficulty(level);
    setShowSpellingPreNotice(false);
    setSpellingInput("");
    setSpellingFeedback(null);
    setRevealedSpelling(null);
    setViewMode("quiz-spelling");
  };

  const confirmStartMultipleQuiz = () => {
    setShowQuizPreNotice(false);
    if (quizQueue.length > 0) {
      // allWords pool for generating options: combine user words + quiz words for diversity
      const allPool = [...words, ...TOEIC_DUMMY_WORDS];
      const uniquePool = allPool.filter((w, i, arr) => arr.findIndex(x => x.word === w.word) === i);
      generateMultipleOptions(quizQueue[0], uniquePool);
      setSelectedOption(null);
    }
    setViewMode("quiz-multiple");
  };

  const generateMultipleOptions = (currentWord: WordItem, allWords: WordItem[]) => {
    // Pick 3 random wrong meanings
    const wrongWords = allWords.filter(w => w.word !== currentWord.word);
    const shuffledWrong = shuffleArray(wrongWords);
    
    const options = [currentWord.meaning];
    for (let i = 0; i < Math.min(3, shuffledWrong.length); i++) {
      options.push(shuffledWrong[i].meaning);
    }
    
    // Fallback if not enough words
    while (options.length < 4) {
      options.push(`가짜 보기 ${options.length}`);
    }
    
    setCurrentOptions(shuffleArray(options));
  };

  const confirmStartSpeedQuiz = () => {
    setShowSpeedPreNotice(false);
    if (quizQueue.length > 0) {
      const allPool = [...words, ...TOEIC_DUMMY_WORDS];
      const uniquePool = allPool.filter((w, i, arr) => arr.findIndex(x => x.word === w.word) === i);
      generateSpeedQuizMeaning(quizQueue[0], uniquePool);
    }
    setViewMode("quiz-speed");
  };

  const generateSpeedQuizMeaning = (currentWord: WordItem, allWords: WordItem[]) => {
    // 50% chance to show correct meaning, 50% chance for wrong meaning
    const isCorrectMeaning = Math.random() > 0.5;
    
    if (isCorrectMeaning) {
      setSpeedQuizMeaning(currentWord.meaning);
      setSpeedQuizIsCorrect(true);
    } else {
      const wrongWords = allWords.filter(w => w.word !== currentWord.word);
      const randomWrong = wrongWords[Math.floor(Math.random() * wrongWords.length)];
      setSpeedQuizMeaning(randomWrong ? randomWrong.meaning : "틀린 가짜 뜻");
      setSpeedQuizIsCorrect(false);
    }
    setSpeedQuizFeedback(null);
  };

  const recordSessionWord = (word: WordItem, isCorrect: boolean) => {
    if (isCorrect) {
      setSessionMemorized(prev => prev.find(w => w.id === word.id) ? prev : [...prev, word]);
      setSessionLearning(prev => prev.filter(w => w.id !== word.id));
    } else {
      setSessionLearning(prev => prev.find(w => w.id === word.id) ? prev : [...prev, word]);
    }
  };

  const advanceQuiz = () => {
    let nextQueue = [...quizQueue];
    
    const nextIndex = quizIndex + 1;
    if (nextIndex >= nextQueue.length) {
      if (status === "free" && viewMode === "quiz-speed") {
        setShowAdPopup(true);
      } else {
        setIsQuizFinished(true);
      }
    } else {
      setQuizIndex(nextIndex);
      setIsAnimating(false);
      
      if (viewMode === "quiz-multiple") {
        const allPool = [...words, ...TOEIC_DUMMY_WORDS];
        const uniquePool = allPool.filter((w, i, arr) => arr.findIndex(x => x.word === w.word) === i);
        generateMultipleOptions(nextQueue[nextIndex], uniquePool);
        setSelectedOption(null);
      } else if (viewMode === "quiz-spelling") {
        setSpellingInput("");
        setSpellingFeedback(null);
        setRevealedSpelling(null);
      } else if (viewMode === "quiz-speed") {
        const allPool = [...words, ...TOEIC_DUMMY_WORDS];
        const uniquePool = allPool.filter((w, i, arr) => arr.findIndex(x => x.word === w.word) === i);
        generateSpeedQuizMeaning(nextQueue[nextIndex], uniquePool);
      } else if (viewMode === "flashcard") {
        setIsFlipped(false);
      }
    }
  };

  const handleMultipleSelect = (option: string) => {
    if (isAnimating) return;
    setSelectedOption(option);
    setIsAnimating(true);
    
    const currentWord = quizQueue[quizIndex];
    const isCorrect = option === currentWord.meaning;
    
    if (isCorrect) {
      setQuizScore(prev => prev + 1);
      toggleStatus(currentWord.word);
    }
    recordSessionWord(currentWord, isCorrect);
    
    // 사용자 선택 기록 저장
    setUserSelections(prev => [...prev, {
      word: currentWord.word,
      meaning: currentWord.meaning,
      selected: option,
      isCorrect
    }]);
    
    setTimeout(() => {
      advanceQuiz(); // 4지선다는 20문제 고정이므로 push-to-back 하지 않음
    }, 1000);
  };

  const handleSpellingSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isAnimating) return;
    
    const currentWord = quizQueue[quizIndex];
    
    if (!spellingInput.trim()) {
      // 빈칸 제출 (정답 확인)
      setRevealedSpelling(currentWord.word);
      setSpellingFeedback("wrong");
      setIsAnimating(true);
      recordSessionWord(currentWord, false);
      
      setTimeout(() => {
        advanceQuiz();
      }, 1500);
      return;
    }
    
    const isCorrect = spellingInput.trim().toLowerCase() === currentWord.word.toLowerCase();
    
    setSpellingFeedback(isCorrect ? "correct" : "wrong");
    setIsAnimating(true);
    
    if (isCorrect) {
      setQuizScore(prev => prev + 1);
      toggleStatus(currentWord.word);
      recordSessionWord(currentWord, true);
      setTimeout(() => {
        advanceQuiz();
      }, 1000);
    } else {
      setTimeout(() => {
        setSpellingFeedback(null);
        setSpellingInput("");
        setIsAnimating(false);
      }, 600); // Shake duration
    }
  };

  const handleSpellingSkip = () => {
    if (isAnimating) return;
    const currentWord = quizQueue[quizIndex];
    setRevealedSpelling(currentWord.word);
    setSpellingFeedback("wrong");
    setIsAnimating(true);
    recordSessionWord(currentWord, false);
    
    setTimeout(() => {
      advanceQuiz();
    }, 1500);
  };

  const getSpellingHint = (word: string) => {
    if (spellingDifficulty !== 1) return null;
    const length = word.length;
    const revealCount = length <= 4 ? 1 : 2;
    let hint = "";
    for (let i = 0; i < length; i++) {
      if (i < revealCount) {
        hint += word[i];
      } else {
        hint += "_";
      }
      if (i < length - 1) hint += " ";
    }
    return hint;
  };

  const handleSpeedAnswer = (answer: boolean) => {
    if (isAnimating) return;
    
    const isCorrect = (answer === speedQuizIsCorrect);
    setSpeedQuizFeedback(isCorrect ? "correct" : "wrong");
    setIsAnimating(true);
    
    const currentWord = quizQueue[quizIndex];
    recordSessionWord(currentWord, isCorrect);
    
    if (isCorrect) {
      setQuizScore(prev => prev + 1);
      toggleStatus(currentWord.word);
      setTimeout(() => {
        advanceQuiz();
      }, 800);
    } else {
      setTimeout(() => {
        advanceQuiz();
      }, 1000);
    }
  };

  const handleFlip = () => {
    if (isAnimating) return;
    setIsFlipped(!isFlipped);
  };

  const handleFlashcardNext = (memorized: boolean) => {
    if (quizQueue.length === 0 || isAnimating) return;
    setIsAnimating(true);
    
    setTimeout(() => {
      const currentWord = quizQueue[quizIndex];
      recordSessionWord(currentWord, memorized);
      if (memorized) {
        toggleStatus(currentWord.word);
        setQuizScore(prev => prev + 1);
      }
      advanceQuiz();
    }, 250);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
        <span className="text-xs font-semibold">스마트 단어장 로딩 중...</span>
      </div>
    );
  }

  // List View Rendering
  if (viewMode === "list") {
    const filteredWords = words.filter(w => {
      if (filterTab !== "all" && w.status !== filterTab) return false;
      if (searchQuery && !w.word.toLowerCase().includes(searchQuery.toLowerCase()) && !w.meaning.includes(searchQuery)) return false;
      return true;
    });

    const totalLearning = words.filter(w => w.status === "learning").length;

    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-250">
        
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-24 pb-8 sm:pt-32 flex flex-col animate-fade-in-up space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition group p-2 -ml-2 rounded-lg hover:bg-secondary">
                <ArrowLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
                  종합 단어장 <BookOpen className="h-5 w-5 text-primary" />
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  전체 {words.length}단어 중 {words.length - totalLearning}단어 암기 완료
                </p>
              </div>
            </div>

            {/* 인쇄 버튼 */}
            <button
              onClick={() => window.print()}
              className="no-print flex items-center justify-center gap-2 rounded-xl bg-secondary border border-border px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted active:scale-95 transition-all shadow-sm"
            >
              <Printer className="h-4 w-4" />
              <span>📄 A4 시험지 인쇄하기</span>
            </button>
          </div>

          {/* Study Modes Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button 
              onClick={() => startQuizMode("flashcard")}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 p-4 text-sm font-bold text-indigo-500 hover:bg-indigo-500 hover:text-white transition-colors active:scale-95"
            >
              <PlayCircle className="h-6 w-6" />
              <span>3D 플래시카드</span>
            </button>
            <button 
              onClick={() => startQuizMode("quiz-multiple")}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm font-bold text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors active:scale-95"
            >
              <CheckSquare className="h-6 w-6" />
              <span>4지선다 객관식</span>
            </button>
            <button 
              onClick={() => startQuizMode("quiz-spelling")}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-sm font-bold text-amber-500 hover:bg-amber-500 hover:text-white transition-colors active:scale-95"
            >
              <Type className="h-6 w-6" />
              <span>스펠링 매치</span>
            </button>
            <button 
              onClick={() => startQuizMode("quiz-speed")}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm font-bold text-rose-500 hover:bg-rose-500 hover:text-white transition-colors active:scale-95"
            >
              <Zap className="h-6 w-6" />
              <span>스피드 O/X</span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="glass-panel rounded-2xl p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="단어 또는 뜻으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Tabs */}
              <div className="flex bg-secondary/50 p-1 rounded-xl w-full sm:w-auto">
                <button
                  onClick={() => setFilterTab("all")}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterTab === "all" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  전체
                </button>
                <button
                  onClick={() => setFilterTab("learning")}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterTab === "learning" ? "bg-background shadow-sm text-red-500" : "text-muted-foreground hover:text-foreground"}`}
                >
                  미암기 ❌
                </button>
                <button
                  onClick={() => setFilterTab("memorized")}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterTab === "memorized" ? "bg-background shadow-sm text-emerald-500" : "text-muted-foreground hover:text-foreground"}`}
                >
                  암기 완료 ✅
                </button>
              </div>

              {/* Eye Toggles */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHideEnglish(!hideEnglish)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${hideEnglish ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-500" : "bg-secondary border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  {hideEnglish ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  영어 가리기
                </button>
                <button
                  onClick={() => setHideMeaning(!hideMeaning)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${hideMeaning ? "bg-rose-500/10 border-rose-500/30 text-rose-500" : "bg-secondary border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  {hideMeaning ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  뜻 가리기
                </button>
              </div>
            </div>
          </div>

          {/* Words List */}
          <div className="grid gap-3 sm:grid-cols-2">
            {(filteredWords ?? []).length === 0 ? (
              <div className="no-print col-span-full py-16 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-2xl animate-fade-in-up bg-secondary/30">
                <div className="text-5xl mb-4 drop-shadow-md">🐹</div>
                <p className="text-sm sm:text-base font-extrabold text-foreground bg-primary/10 text-primary px-4 py-2 rounded-full mb-3">
                  페이스메이커 나롱이: "오늘은 더 외울 단어가 없어! 완벽해!"
                </p>
                <p className="text-xs text-muted-foreground">새로운 단어를 추가하거나 검색 필터를 변경해보세요.</p>
              </div>
            ) : (
              <>
                {(filteredWords ?? []).map((w, index) => (
                  <div 
                    key={w.id} 
                    className={`glass-panel print-card p-5 rounded-2xl border transition-all hover:border-primary/30 flex flex-col justify-between min-h-[120px] ${w.status === "memorized" ? "opacity-60 bg-muted/50" : ""} ${status !== "premium" && index >= 5 ? "no-print" : ""}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 overflow-hidden pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`text-xl sm:text-2xl font-extrabold break-words transition-all duration-300 ${hideEnglish ? "blur-[6px] hover:blur-none opacity-40 hover:opacity-100 cursor-help" : "text-foreground"}`}>
                            {w.word}
                          </h3>
                          {!hideEnglish && (
                            <div className="no-print flex items-center gap-1">
                              <button onClick={(e) => playPronunciation(e, w.word, 'US')} className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-primary transition-colors" title="미국식 발음 듣기">
                                <Volume2 className="h-4 w-4" />
                              </button>
                              <button onClick={(e) => playPronunciation(e, w.word, 'UK')} className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border border-border hover:bg-secondary hover:text-primary text-muted-foreground transition-colors" title="영국식 발음 듣기">
                                UK
                              </button>
                            </div>
                          )}
                        </div>
                        <p className={`text-sm sm:text-base font-medium mt-1 transition-all duration-300 ${hideMeaning ? "blur-[5px] hover:blur-none opacity-40 hover:opacity-100 cursor-help" : "text-muted-foreground"}`}>
                          {w.meaning}
                        </p>
                      </div>
                      
                      {/* Status Toggle Button */}
                      <button
                        onClick={() => toggleStatus(w.word)}
                        className={`no-print shrink-0 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all active:scale-90 ${
                          w.status === "memorized" 
                            ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                            : "bg-transparent border-muted-foreground/30 text-transparent hover:border-emerald-500/50"
                        }`}
                        title="암기 상태 토글"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex gap-1.5 flex-wrap">
                      {w.pos && w.pos !== "품사 미기재" && (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/10">
                          {w.pos}
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/10">
                        {w.tag}
                      </span>
                    </div>
                    {w.example_sentence && (
                      <div className="mt-3 no-print">
                        <details className="group">
                          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/20 transition-colors w-max">
                            <span>🔑 토익 출제 공식</span>
                            <span className="transition group-open:rotate-180">▼</span>
                          </summary>
                          <div className="mt-2 space-y-2 p-3 bg-secondary/50 rounded-xl border border-border text-xs text-foreground/80 leading-relaxed overflow-hidden animate-in slide-in-from-top-2">
                            {w.toeic_tip && <p><strong className="text-primary">💡 팁:</strong> {w.toeic_tip}</p>}
                            {w.collocation && <p><strong className="text-indigo-500">🔗 짝꿍:</strong> {w.collocation}</p>}
                            {w.paraphrasing && <p><strong className="text-emerald-500">🔄 동의어:</strong> {w.paraphrasing}</p>}
                            {w.example_sentence && (
                              <div className="mt-1.5 pt-1.5 border-t border-border/50">
                                <p className="font-medium text-foreground">{w.example_sentence}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{w.example_translation}</p>
                              </div>
                            )}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
                
                {status !== "premium" && filteredWords.length > 5 && (
                  <div className="hidden print:block col-span-full py-8 text-center text-sm font-bold border-2 border-dashed border-gray-300 rounded-xl mt-4">
                    이후 단어들은 프리미엄 전용 기능으로 인쇄가 제한되었습니다.
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* Quiz Pre-Notice Modal (list view) */}
        {showQuizPreNotice && (
          <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-background w-full max-w-sm rounded-3xl p-6 text-center space-y-6 relative border border-border shadow-2xl">
              <div className="h-16 w-16 mx-auto bg-gradient-to-tr from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-2">
                <CheckSquare className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-xl text-foreground mb-2">4지선다 객관식 퀴즈</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  총 <span className="font-bold text-primary">{quizQueue.length}문제</span>로 진행됩니다.
                </p>
                {quizPaddingCount > 0 && (
                  <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mt-3 leading-relaxed">
                    ⚡ 단어장의 미암기 단어가 부족하여<br/>토익 필수 빈출 단어 <span className="font-bold">{quizPaddingCount}개</span>가 자동으로 추가되었습니다.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => setShowQuizPreNotice(false)} className="rounded-2xl bg-secondary py-3.5 font-bold text-muted-foreground hover:bg-muted active:scale-95 transition-all">
                  취소
                </button>
                <button onClick={confirmStartMultipleQuiz} className="rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 font-extrabold text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                  시험 시작 🚀
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Spelling Mode Pre-Notice Modal (list view) */}
        {showSpellingPreNotice && (
          <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-background w-full max-w-sm rounded-3xl p-6 text-center space-y-6 relative border border-border shadow-2xl">
              <div className="h-16 w-16 mx-auto bg-gradient-to-tr from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-2">
                <Type className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-xl text-foreground mb-2">스펠링 매치 난이도</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  총 <span className="font-bold text-primary">{quizQueue.length}문제</span>로 진행됩니다.<br/>
                  원하는 난이도를 선택해 주세요.
                </p>
                {quizPaddingCount > 0 && (
                  <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mt-3 mb-4 leading-relaxed">
                    ⚡ 단어장의 미암기 단어가 부족하여<br/>토익 필수 빈출 단어 <span className="font-bold">{quizPaddingCount}개</span>가 자동으로 추가되었습니다.
                  </p>
                )}
                
                <div className="space-y-3">
                  <button onClick={() => confirmStartSpellingQuiz(1)} className="w-full flex items-center gap-4 bg-secondary/50 hover:bg-secondary border border-border rounded-xl p-4 transition-all text-left group">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-110 transition-transform">Lv.1</div>
                    <div>
                      <div className="font-bold text-sm">초급 (가장 쉬움)</div>
                      <div className="text-xs text-muted-foreground mt-0.5">뜻 + 스펠링 힌트 + 원어민 듣기</div>
                    </div>
                  </button>
                  <button onClick={() => confirmStartSpellingQuiz(2)} className="w-full flex items-center gap-4 bg-secondary/50 hover:bg-secondary border border-border rounded-xl p-4 transition-all text-left group">
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-110 transition-transform">Lv.2</div>
                    <div>
                      <div className="font-bold text-sm">중급</div>
                      <div className="text-xs text-muted-foreground mt-0.5">뜻 + 원어민 듣기</div>
                    </div>
                  </button>
                  <button onClick={() => confirmStartSpellingQuiz(3)} className="w-full flex items-center gap-4 bg-secondary/50 hover:bg-secondary border border-border rounded-xl p-4 transition-all text-left group">
                    <div className="h-10 w-10 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-110 transition-transform">Lv.3</div>
                    <div>
                      <div className="font-bold text-sm">고급 (어려움)</div>
                      <div className="text-xs text-muted-foreground mt-0.5">오직 뜻만 제공됨</div>
                    </div>
                  </button>
                </div>
              </div>
              <button onClick={() => setShowSpellingPreNotice(false)} className="w-full rounded-2xl bg-secondary py-3.5 font-bold text-muted-foreground hover:bg-muted active:scale-95 transition-all">
                취소
              </button>
            </div>
          </div>
        )}

        {/* Speed Mode Pre-Notice Modal (list view) */}
        {showSpeedPreNotice && (
          <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-background w-full max-w-sm rounded-3xl p-6 text-center space-y-6 relative border border-border shadow-2xl">
              <div className="h-16 w-16 mx-auto bg-gradient-to-tr from-rose-400 to-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/20 mb-2">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-xl text-foreground mb-2">스피드 O/X 퀴즈</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  화면에 나오는 뜻이 영단어와 <span className="font-bold text-rose-500">맞는 뜻인지 틀린 뜻인지</span> 빠르게 맞춰보세요!<br/><br/>총 <span className="font-bold text-primary">{quizQueue.length}문제</span>로 진행됩니다.
                </p>
                {quizPaddingCount > 0 && (
                  <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mt-3 leading-relaxed">
                    ⚡ 단어장의 미암기 단어가 부족하여<br/>토익 필수 빈출 단어 <span className="font-bold">{quizPaddingCount}개</span>가 자동으로 추가되었습니다.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => setShowSpeedPreNotice(false)} className="rounded-2xl bg-secondary py-3.5 font-bold text-muted-foreground hover:bg-muted active:scale-95 transition-all">
                  취소
                </button>
                <button onClick={confirmStartSpeedQuiz} className="rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 py-3.5 font-extrabold text-white shadow-lg shadow-rose-500/20 active:scale-95 transition-all">
                  도전 시작 ⚡
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Flashcard Pre-Notice Modal (list view) */}
        {showFlashcardPreNotice && (
          <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-background w-full max-w-sm rounded-3xl p-6 text-center space-y-6 relative border border-border shadow-2xl">
              <div className="h-16 w-16 mx-auto bg-gradient-to-tr from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 mb-2">
                <Volume2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-xl text-foreground mb-2">플래시카드 학습</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  총 <span className="font-bold text-primary">{quizQueue.length}단어</span>로 진행됩니다.<br/>
                  단어가 표시될 때 <span className="font-bold text-blue-500">원어민 발음을 자동으로</span><br/>재생할까요?
                </p>
                {quizPaddingCount > 0 && (
                  <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mt-3 mb-4 leading-relaxed">
                    ⚡ 단어장의 미암기 단어가 부족하여<br/>토익 필수 빈출 단어 <span className="font-bold">{quizPaddingCount}개</span>가 자동으로 추가되었습니다.
                  </p>
                )}
                
                <div className="space-y-3">
                  <button onClick={() => confirmStartFlashcard(true)} className="w-full flex items-center gap-4 bg-secondary/50 hover:bg-secondary border border-border rounded-xl p-4 transition-all text-left group">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-110 transition-transform">ON</div>
                    <div>
                      <div className="font-bold text-sm">자동 재생 켬 (권장)</div>
                      <div className="text-xs text-muted-foreground mt-0.5">화면이 넘어갈 때마다 발음이 나옵니다.</div>
                    </div>
                  </button>
                  <button onClick={() => confirmStartFlashcard(false)} className="w-full flex items-center gap-4 bg-secondary/50 hover:bg-secondary border border-border rounded-xl p-4 transition-all text-left group">
                    <div className="h-10 w-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-110 transition-transform">OFF</div>
                    <div>
                      <div className="font-bold text-sm">자동 재생 끔</div>
                      <div className="text-xs text-muted-foreground mt-0.5">내가 원할 때만 발음 버튼을 누릅니다.</div>
                    </div>
                  </button>
                </div>
              </div>
              <button onClick={() => setShowFlashcardPreNotice(false)} className="w-full rounded-2xl bg-secondary py-3.5 font-bold text-muted-foreground hover:bg-muted active:scale-95 transition-all">
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Quiz Views Rendering
  const quizTotal = quizQueue.length;
  const progressPercentage = quizTotal > 0 ? (quizIndex / quizTotal) * 100 : 0;
  const currentCard = quizQueue[quizIndex];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-250 fixed inset-0 z-50 overflow-y-auto">

      {/* Fullscreen Ad Popup for Free Users */}
      {showAdPopup && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-up">
          <div className="bg-background w-full max-w-sm rounded-3xl p-6 text-center space-y-6 relative border border-border shadow-2xl">
            <h3 className="font-extrabold text-lg flex justify-center items-center gap-2 text-muted-foreground"><Zap className="text-yellow-500 h-5 w-5"/> 스폰서 광고 (Free 유저)</h3>
            <p className="text-xs text-muted-foreground">무료 버전에서는 테스트 종료 시 광고가 노출됩니다.</p>
            <div className="bg-secondary/50 rounded-2xl p-4 min-h-[150px] flex items-center justify-center border border-border">
              <GoogleAdDummy type="banner" />
            </div>
            <button 
              onClick={() => { setShowAdPopup(false); setIsQuizFinished(true); }} 
              className="w-full bg-foreground text-background hover:opacity-90 py-3.5 rounded-2xl font-extrabold transition-all"
            >
              광고 닫고 결과 확인하기
            </button>
          </div>
        </div>
      )}

      <main className={`flex-1 w-full mx-auto px-4 pt-24 pb-8 sm:pt-32 flex flex-col animate-fade-in-up ${isQuizFinished && viewMode === "quiz-multiple" ? "sm:max-w-4xl max-w-md" : "max-w-md"}`}>
        
        {/* Header & Back Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setViewMode("list")} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition group p-2 -ml-2 rounded-lg hover:bg-secondary">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>단어장 대시보드로</span>
          </button>
          <div className="text-xs font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            {viewMode === "flashcard" ? "플래시카드" : viewMode === "quiz-multiple" ? "객관식 퀴즈" : viewMode === "quiz-spelling" ? "스펠링 매치" : "스피드 O/X"}
          </div>
        </div>

        {isQuizFinished ? (
          /* Finished State */
          <div className="flex-1 flex flex-col items-center text-center space-y-6 animate-fade-in-up pb-8">
            <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-2">
              <Trophy className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight">
              {viewMode === "quiz-multiple" ? "채점 완료! 📝" : "학습 완료! 🔥"}
            </h2>
            <p className="text-sm text-muted-foreground">
              총 {viewMode === "quiz-multiple" ? userSelections.length : quizTotal}문제 중 <span className="text-primary font-bold">{quizScore}</span>개를 맞혔습니다.
            </p>

            {/* 4지선다 상세 결과 테이블 */}
            {viewMode === "quiz-multiple" && userSelections.length > 0 ? (
              <div className="w-full text-left mt-4">
                <div className="rounded-2xl border border-border overflow-hidden shadow-lg">
                  {/* Table Header */}
                  <div className="grid grid-cols-[40px_1fr_44px_1fr_1fr] sm:grid-cols-[60px_1.5fr_80px_1fr_1fr] gap-0 bg-secondary/80 text-[10px] sm:text-sm font-extrabold text-muted-foreground border-b border-border">
                    <div className="p-2.5 sm:p-5 text-center">#</div>
                    <div className="p-2.5 sm:p-5">단어</div>
                    <div className="p-2.5 sm:p-5 text-center">결과</div>
                    <div className="p-2.5 sm:p-5">정답</div>
                    <div className="p-2.5 sm:p-5">내 선택</div>
                  </div>
                  {/* Table Body */}
                  <div className="max-h-[55vh] overflow-y-auto">
                    {userSelections.map((sel, idx) => (
                      <div key={`result-${idx}`} className={`grid grid-cols-[40px_1fr_44px_1fr_1fr] sm:grid-cols-[60px_1.5fr_80px_1fr_1fr] gap-0 text-xs sm:text-base border-b border-border/50 last:border-b-0 ${sel.isCorrect ? "bg-emerald-500/5" : "bg-red-500/5"}`}>
                        <div className="p-2.5 sm:p-5 text-center font-bold text-muted-foreground">{idx + 1}</div>
                        <div className="p-2.5 sm:p-5 font-extrabold text-foreground truncate">{sel.word}</div>
                        <div className="p-2.5 sm:p-5 text-center flex items-center justify-center">
                          {sel.isCorrect 
                            ? <span className="inline-flex items-center justify-center h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-emerald-500/20 text-emerald-500"><Check className="h-3.5 w-3.5 sm:h-5 sm:w-5" /></span>
                            : <span className="inline-flex items-center justify-center h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-red-500/20 text-red-500"><X className="h-3.5 w-3.5 sm:h-5 sm:w-5" /></span>
                          }
                        </div>
                        <div className="p-2.5 sm:p-5 text-muted-foreground truncate">{sel.meaning}</div>
                        <div className={`p-2.5 sm:p-5 font-semibold truncate ${sel.isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{sel.selected}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* 다른 퀴즈 모드: 기존 결과 리스트 */
              <div className="w-full text-left space-y-4 max-h-[30vh] overflow-y-auto pr-2 mt-4 bg-secondary/30 p-4 rounded-2xl border border-border">
                {sessionMemorized.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> 외운 단어 ({sessionMemorized.length})
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {sessionMemorized.map(w => (
                        <span key={`fin-mem-${w.id}`} className="text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-md shadow-sm">
                          {w.word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {sessionLearning.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-red-500 flex items-center gap-1">
                      <X className="h-3.5 w-3.5" /> 아직 모르는 단어 ({sessionLearning.length})
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {sessionLearning.map(w => (
                        <span key={`fin-lrn-${w.id}`} className="text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-md shadow-sm">
                          {w.word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={() => setViewMode("list")}
              className="mt-8 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 px-8 py-4 text-sm sm:text-base font-extrabold text-white shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              대시보드로 돌아가기
            </button>
          </div>
        ) : (
          /* Active Quiz State */
          <div className="flex-1 flex flex-col">
            
            {/* Progress Bar */}
            <div className="space-y-2 mb-8">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-muted-foreground">진행도</span>
                <span className="text-sm font-extrabold text-foreground">{quizIndex} / {quizTotal}</span>
              </div>
              <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Flashcard Mode */}
            {viewMode === "flashcard" && (
              <>
                <div className="flex-1 flex items-center justify-center perspective-[1000px]">
                  <div 
                    onClick={handleFlip}
                    className={`relative w-full aspect-[4/5] max-h-[400px] cursor-pointer [transform-style:preserve-3d] transition-all duration-500 ${isFlipped ? '[transform:rotateY(180deg)]' : ''} ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                  >
                    {/* Front */}
                    <div className="absolute inset-0 [backface-visibility:hidden] glass-panel rounded-3xl border border-border shadow-xl flex flex-col items-center justify-center p-8 bg-card text-center hover:border-primary/50 transition-colors">
                      <div className="absolute top-6 right-6 flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                        <RotateCcw className="h-3 w-3" />
                        <span>터치하여 뒤집기</span>
                      </div>
                      <h3 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground break-words w-full">
                        {currentCard?.word}
                      </h3>
                      <div className="flex items-center justify-center gap-2 mt-6 relative z-10">
                        <button onClick={(e) => playPronunciation(e, currentCard?.word || '', 'US')} className="p-3 rounded-full bg-secondary text-foreground hover:bg-primary hover:text-white transition-colors shadow-sm" title="미국식 발음 듣기">
                          <Volume2 className="h-6 w-6" />
                        </button>
                        <button onClick={(e) => playPronunciation(e, currentCard?.word || '', 'UK')} className="text-xs font-extrabold px-3 py-1.5 rounded-lg border-2 border-border hover:bg-secondary hover:text-primary text-muted-foreground transition-colors shadow-sm" title="영국식 발음 듣기">
                          UK
                        </button>
                      </div>
                    </div>

                    {/* Back */}
                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] glass-panel rounded-3xl border border-primary/20 shadow-xl shadow-primary/5 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-card to-primary/5 text-center">
                      <div className="flex gap-2 mb-4">
                        {currentCard?.pos && currentCard.pos !== "품사 미기재" && (
                          <span className="text-xs font-bold text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">{currentCard.pos}</span>
                        )}
                      </div>
                      <h3 className="text-3xl sm:text-4xl font-extrabold text-foreground break-words w-full">
                        {currentCard?.meaning}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="mt-10 grid grid-cols-2 gap-4 pb-4">
                  <button onClick={() => handleFlashcardNext(false)} disabled={isAnimating} className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-secondary/80 border border-border hover:bg-red-500/10 hover:text-red-500 text-muted-foreground p-5 transition-all active:scale-95 disabled:opacity-50">
                    <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center shadow-sm"><X className="h-6 w-6" /></div>
                    <span className="text-sm font-extrabold">아직 모름</span>
                  </button>
                  <button onClick={() => handleFlashcardNext(true)} disabled={isAnimating} className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 hover:opacity-90 text-white shadow-lg p-5 transition-all active:scale-95 disabled:opacity-50">
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center"><Check className="h-6 w-6" /></div>
                    <span className="text-sm font-extrabold">외웠음</span>
                  </button>
                </div>

                {/* Session Mini List & Early Termination */}
                <div className="mt-2 pb-8 space-y-4 animate-fade-in-up">
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="text-sm font-bold text-muted-foreground">세션 내역 (총 {sessionMemorized.length + sessionLearning.length}개)</span>
                    <button onClick={() => setIsQuizFinished(true)} className="flex items-center gap-2 text-sm bg-secondary text-foreground border border-border hover:bg-foreground hover:text-background transition-all px-5 py-2.5 rounded-xl font-bold shadow-sm active:scale-95">
                      <LogOut className="h-4 w-4" /> 학습 종료
                    </button>
                  </div>
                  
                  {sessionMemorized.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                        <Check className="h-3 w-3" /> 외웠음 ({sessionMemorized.length})
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {sessionMemorized.map(w => (
                          <span key={`mem-${w.id}`} className="text-[10px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                            {w.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {sessionLearning.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" /> 아직 모름 ({sessionLearning.length})
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {sessionLearning.map(w => (
                          <span key={`lrn-${w.id}`} className="text-[10px] font-medium bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-md">
                            {w.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Multiple Choice Mode */}
            {viewMode === "quiz-multiple" && (
              <>
                <div className={`flex-1 flex flex-col transition-all duration-300 ${isAnimating ? "opacity-0 translate-x-10" : "opacity-100 translate-x-0"}`}>
                  <div className="glass-panel rounded-3xl p-8 mb-6 text-center border border-border shadow-xl bg-card flex flex-col items-center justify-center min-h-[200px]">
                    <h3 className="text-4xl sm:text-5xl font-extrabold text-foreground break-words">{currentCard?.word}</h3>
                    <div className="flex items-center justify-center gap-2 mt-4 relative z-10">
                      <button onClick={(e) => playPronunciation(e, currentCard?.word || '', 'US')} className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-primary transition-colors" title="미국식 발음 듣기">
                        <Volume2 className="h-5 w-5" />
                      </button>
                      <button onClick={(e) => playPronunciation(e, currentCard?.word || '', 'UK')} className="text-[10px] font-extrabold px-2 py-1 rounded-md border border-border hover:bg-secondary hover:text-primary text-muted-foreground transition-colors" title="영국식 발음 듣기">
                        UK
                      </button>
                    </div>
                    {currentCard?.pos && <span className="mt-4 text-xs font-bold text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-full">{currentCard.pos}</span>}
                  </div>
                  <div className="grid grid-cols-1 gap-3 pb-6">
                    {currentOptions.map((opt, idx) => {
                      let btnClass = "glass-panel p-4 rounded-xl text-left font-semibold text-sm sm:text-base border border-border hover:border-primary/50 transition-all active:scale-95 text-foreground";
                      if (selectedOption !== null) {
                        if (opt === currentCard?.meaning) {
                          btnClass = "p-4 rounded-xl text-left font-bold text-sm sm:text-base border-2 border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
                        } else if (opt === selectedOption) {
                          btnClass = "p-4 rounded-xl text-left font-bold text-sm sm:text-base border-2 border-red-500 bg-red-500/10 text-red-600 dark:text-red-400";
                        } else {
                          btnClass = "glass-panel p-4 rounded-xl text-left font-semibold text-sm sm:text-base border border-border opacity-50 text-foreground";
                        }
                      }
                      return (
                        <button key={idx} disabled={selectedOption !== null || isAnimating} onClick={() => handleMultipleSelect(opt)} className={btnClass}>
                          {idx + 1}. {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Session Mini List & Early Termination for Multiple Choice */}
                <div className="mt-2 pb-8 space-y-4 animate-fade-in-up">
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="text-sm font-bold text-muted-foreground">세션 내역 (총 {sessionMemorized.length + sessionLearning.length}개)</span>
                    <button onClick={() => setIsQuizFinished(true)} className="flex items-center gap-2 text-sm bg-secondary text-foreground border border-border hover:bg-foreground hover:text-background transition-all px-5 py-2.5 rounded-xl font-bold shadow-sm active:scale-95">
                      <LogOut className="h-4 w-4" /> 채점하기
                    </button>
                  </div>
                  
                  {sessionMemorized.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                        <Check className="h-3 w-3" /> 정답 ({sessionMemorized.length})
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {sessionMemorized.map(w => (
                          <span key={`mc-mem-${w.id}`} className="text-[10px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                            {w.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {sessionLearning.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" /> 오답 ({sessionLearning.length})
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {sessionLearning.map(w => (
                          <span key={`mc-lrn-${w.id}`} className="text-[10px] font-medium bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-md">
                            {w.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Spelling Match Mode */}
            {viewMode === "quiz-spelling" && (
              <div className="flex-1 flex flex-col">
                <div className="glass-panel rounded-3xl p-8 mb-6 text-center border border-border shadow-xl bg-card min-h-[220px] flex flex-col justify-center relative">
                  <div className="flex gap-2 mb-4 justify-center">
                    {currentCard?.pos && currentCard.pos !== "품사 미기재" && (
                      <span className="text-xs font-bold text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">{currentCard.pos}</span>
                    )}
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-extrabold text-foreground break-words w-full">
                    {currentCard?.meaning}
                  </h3>
                  
                  {/* TTS Button (Level 1, 2) */}
                  {(spellingDifficulty === 1 || spellingDifficulty === 2) && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button type="button" onClick={(e) => playPronunciation(e, currentCard?.word || '', 'US')} className="p-3 rounded-full bg-secondary text-foreground hover:bg-primary hover:text-white transition-colors shadow-sm" title="미국식 발음 듣기">
                        <Volume2 className="h-6 w-6" />
                      </button>
                      <button type="button" onClick={(e) => playPronunciation(e, currentCard?.word || '', 'UK')} className="text-xs font-extrabold px-3 py-1.5 rounded-lg border-2 border-border hover:bg-secondary hover:text-primary text-muted-foreground transition-colors shadow-sm" title="영국식 발음 듣기">
                        UK
                      </button>
                    </div>
                  )}

                  {/* Spelling Hint (Level 1) */}
                  {spellingDifficulty === 1 && currentCard && (
                    <div className="mt-4 text-xl sm:text-2xl font-mono font-bold tracking-widest text-primary/70">
                      {getSpellingHint(currentCard.word)}
                    </div>
                  )}
                </div>

                <form onSubmit={handleSpellingSubmit} className="flex-1 flex flex-col gap-4">
                  <div className={`relative transition-transform duration-100 ${spellingFeedback === 'wrong' ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
                    {revealedSpelling ? (
                      <div className="w-full bg-red-500/10 border-2 border-red-500 text-red-600 dark:text-red-400 rounded-2xl p-6 text-center text-3xl font-extrabold tracking-widest lowercase">
                        {revealedSpelling}
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={spellingInput}
                          onChange={(e) => setSpellingInput(e.target.value)}
                          placeholder="영단어를 입력하세요"
                          disabled={isAnimating || revealedSpelling !== null}
                          className={`w-full bg-card border-2 rounded-2xl p-6 text-center text-2xl font-extrabold tracking-widest lowercase transition-colors outline-none
                            ${spellingFeedback === 'correct' ? 'border-emerald-500 text-emerald-500' :
                              spellingFeedback === 'wrong' ? 'border-red-500 text-red-500' :
                                'border-border focus:border-primary text-foreground'}`}
                          autoFocus
                          autoComplete="off"
                        />
                        {spellingFeedback === 'correct' && (
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-emerald-500">
                            <Check className="h-8 w-8" />
                          </div>
                        )}
                        {spellingFeedback === 'wrong' && (
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-red-500">
                            <X className="h-8 w-8" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <button type="button" onClick={handleSpellingSkip} disabled={isAnimating} className="rounded-2xl bg-secondary/80 border border-border py-4 font-bold text-muted-foreground hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all active:scale-95 disabled:opacity-50">
                      건너뛰기
                    </button>
                    <button type="submit" disabled={isAnimating} className="rounded-2xl bg-gradient-to-r from-primary to-indigo-600 py-4 font-extrabold text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50">
                      정답 확인
                    </button>
                  </div>
                </form>

                {/* Session Mini List & Early Termination for Spelling */}
                <div className="mt-8 pb-8 space-y-4 animate-fade-in-up">
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="text-sm font-bold text-muted-foreground">세션 내역 (총 {sessionMemorized.length + sessionLearning.length}개)</span>
                    <button type="button" onClick={() => setIsQuizFinished(true)} className="flex items-center gap-2 text-sm bg-secondary text-foreground border border-border hover:bg-foreground hover:text-background transition-all px-5 py-2.5 rounded-xl font-bold shadow-sm active:scale-95">
                      <LogOut className="h-4 w-4" /> 학습 종료
                    </button>
                  </div>
                  
                  {sessionMemorized.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                        <Check className="h-3 w-3" /> 정답 ({sessionMemorized.length})
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {sessionMemorized.map(w => (
                          <span key={`sp-mem-${w.id}`} className="text-[10px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                            {w.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {sessionLearning.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" /> 오답 ({sessionLearning.length})
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {sessionLearning.map(w => (
                          <span key={`sp-lrn-${w.id}`} className="text-[10px] font-medium bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-md">
                            {w.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Speed O/X Mode */}
            {viewMode === "quiz-speed" && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className={`relative flex-1 flex items-center justify-center transition-transform duration-100 ${speedQuizFeedback === 'wrong' ? 'animate-[shake_0.5s_ease-in-out]' : speedQuizFeedback === 'correct' ? 'scale-105' : 'scale-100'}`}>
                  <div className={`w-full aspect-square max-h-[350px] glass-panel rounded-[2rem] border-2 shadow-2xl flex flex-col items-center justify-center p-8 bg-card text-center transition-colors
                    ${speedQuizFeedback === 'correct' ? 'border-emerald-500 bg-emerald-500/5' : 
                      speedQuizFeedback === 'wrong' ? 'border-red-500 bg-red-500/5' : 'border-border'}`}>
                    <h3 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-foreground break-words mb-4">{currentCard?.word}</h3>
                    <div className="flex items-center justify-center gap-2 mb-4 relative z-10">
                      <button onClick={(e) => playPronunciation(e, currentCard?.word || '', 'US')} className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-primary transition-colors" title="미국식 발음 듣기">
                        <Volume2 className="h-5 w-5" />
                      </button>
                      <button onClick={(e) => playPronunciation(e, currentCard?.word || '', 'UK')} className="text-[10px] font-extrabold px-2 py-1 rounded-md border border-border hover:bg-secondary hover:text-primary text-muted-foreground transition-colors" title="영국식 발음 듣기">
                        UK
                      </button>
                    </div>
                    <p className={`text-2xl sm:text-3xl font-bold transition-colors ${speedQuizFeedback === 'correct' ? 'text-emerald-500' : speedQuizFeedback === 'wrong' ? 'text-red-500' : 'text-primary'}`}>
                      {speedQuizMeaning}
                    </p>
                    
                    {speedQuizFeedback === 'correct' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-[2rem] z-20 animate-in fade-in zoom-in duration-300">
                        <Check className="h-24 w-24 text-emerald-500 drop-shadow-lg" />
                      </div>
                    )}
                    {speedQuizFeedback === 'wrong' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-[2rem] z-20 animate-in fade-in zoom-in duration-300">
                        <X className="h-24 w-24 text-red-500 drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4 pb-6">
                  <button onClick={() => handleSpeedAnswer(false)} disabled={isAnimating} className="flex flex-col items-center justify-center gap-2 rounded-[2rem] bg-secondary/80 border-2 border-transparent hover:border-red-500/50 hover:bg-red-500/5 text-muted-foreground py-6 transition-all active:scale-95">
                    <X className="h-10 w-10 text-red-500" />
                    <span className="text-sm font-extrabold">틀린 뜻 (X)</span>
                  </button>
                  <button onClick={() => handleSpeedAnswer(true)} disabled={isAnimating} className="flex flex-col items-center justify-center gap-2 rounded-[2rem] bg-secondary/80 border-2 border-transparent hover:border-emerald-500/50 hover:bg-emerald-500/5 text-muted-foreground py-6 transition-all active:scale-95">
                    <Check className="h-10 w-10 text-emerald-500" />
                    <span className="text-sm font-extrabold">맞는 뜻 (O)</span>
                  </button>
                </div>

                {/* Session Mini List & Early Termination for Speed O/X */}
                <div className="mt-2 pb-8 space-y-4 animate-fade-in-up">
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="text-sm font-bold text-muted-foreground">세션 내역 (총 {sessionMemorized.length + sessionLearning.length}개)</span>
                    <button type="button" onClick={() => setIsQuizFinished(true)} className="flex items-center gap-2 text-sm bg-secondary text-foreground border border-border hover:bg-foreground hover:text-background transition-all px-5 py-2.5 rounded-xl font-bold shadow-sm active:scale-95">
                      <LogOut className="h-4 w-4" /> 학습 종료
                    </button>
                  </div>
                  
                  {sessionMemorized.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                        <Check className="h-3 w-3" /> 정답 ({sessionMemorized.length})
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {sessionMemorized.map(w => (
                          <span key={`sp-mem-${w.id}`} className="text-[10px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                            {w.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {sessionLearning.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" /> 오답 ({sessionLearning.length})
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {sessionLearning.map(w => (
                          <span key={`sp-lrn-${w.id}`} className="text-[10px] font-medium bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-md">
                            {w.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      {/* Quiz Pre-Notice Modal */}
      {showQuizPreNotice && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4 animate-fade-in-up">
          <div className="bg-background w-full max-w-sm rounded-3xl p-6 text-center space-y-6 relative border border-border shadow-2xl">
            <div className="h-16 w-16 mx-auto bg-gradient-to-tr from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-2">
              <CheckSquare className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-foreground mb-2">4지선다 객관식 퀴즈</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                총 <span className="font-bold text-primary">{quizQueue.length}문제</span>로 진행됩니다.
              </p>
              {quizPaddingCount > 0 && (
                <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mt-3 leading-relaxed">
                  ⚡ 단어장의 미암기 단어가 부족하여<br/>토익 필수 빈출 단어 <span className="font-bold">{quizPaddingCount}개</span>가 자동으로 추가되었습니다.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => setShowQuizPreNotice(false)} className="rounded-2xl bg-secondary py-3.5 font-bold text-muted-foreground hover:bg-muted active:scale-95 transition-all">
                취소
              </button>
              <button onClick={confirmStartMultipleQuiz} className="rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 font-extrabold text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                시험 시작 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spelling Mode Pre-Notice Modal */}
      {showSpellingPreNotice && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4 animate-fade-in-up">
          <div className="bg-background w-full max-w-sm rounded-3xl p-6 text-center space-y-6 relative border border-border shadow-2xl">
            <div className="h-16 w-16 mx-auto bg-gradient-to-tr from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-2">
              <Type className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-foreground mb-2">스펠링 매치 난이도</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                총 <span className="font-bold text-primary">{quizQueue.length}문제</span>로 진행됩니다.<br/>
                원하는 난이도를 선택해 주세요.
              </p>
              {quizPaddingCount > 0 && (
                <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mt-3 mb-4 leading-relaxed">
                  ⚡ 단어장의 미암기 단어가 부족하여<br/>토익 필수 빈출 단어 <span className="font-bold">{quizPaddingCount}개</span>가 자동으로 추가되었습니다.
                </p>
              )}
              
              <div className="space-y-3">
                <button onClick={() => confirmStartSpellingQuiz(1)} className="w-full flex items-center gap-4 bg-secondary/50 hover:bg-secondary border border-border rounded-xl p-4 transition-all text-left group">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-110 transition-transform">Lv.1</div>
                  <div>
                    <div className="font-bold text-sm">초급 (가장 쉬움)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">뜻 + 스펠링 힌트 + 원어민 듣기</div>
                  </div>
                </button>
                <button onClick={() => confirmStartSpellingQuiz(2)} className="w-full flex items-center gap-4 bg-secondary/50 hover:bg-secondary border border-border rounded-xl p-4 transition-all text-left group">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-110 transition-transform">Lv.2</div>
                  <div>
                    <div className="font-bold text-sm">중급</div>
                    <div className="text-xs text-muted-foreground mt-0.5">뜻 + 원어민 듣기</div>
                  </div>
                </button>
                <button onClick={() => confirmStartSpellingQuiz(3)} className="w-full flex items-center gap-4 bg-secondary/50 hover:bg-secondary border border-border rounded-xl p-4 transition-all text-left group">
                  <div className="h-10 w-10 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-110 transition-transform">Lv.3</div>
                  <div>
                    <div className="font-bold text-sm">고급 (어려움)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">오직 뜻만 제공됨</div>
                  </div>
                </button>
              </div>
            </div>
            <button onClick={() => setShowSpellingPreNotice(false)} className="w-full rounded-2xl bg-secondary py-3.5 font-bold text-muted-foreground hover:bg-muted active:scale-95 transition-all">
              취소
            </button>
          </div>
        </div>
      )}

      {/* Speed Mode Pre-Notice Modal */}
      {showSpeedPreNotice && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4 animate-fade-in-up">
          <div className="bg-background w-full max-w-sm rounded-3xl p-6 text-center space-y-6 relative border border-border shadow-2xl">
            <div className="h-16 w-16 mx-auto bg-gradient-to-tr from-rose-400 to-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/20 mb-2">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-foreground mb-2">스피드 O/X 퀴즈</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                화면에 나오는 뜻이 영단어와 <span className="font-bold text-rose-500">맞는 뜻인지 틀린 뜻인지</span> 빠르게 맞춰보세요!<br/><br/>총 <span className="font-bold text-primary">{quizQueue.length}문제</span>로 진행됩니다.
              </p>
              {quizPaddingCount > 0 && (
                <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mt-3 leading-relaxed">
                  ⚡ 단어장의 미암기 단어가 부족하여<br/>토익 필수 빈출 단어 <span className="font-bold">{quizPaddingCount}개</span>가 자동으로 추가되었습니다.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => setShowSpeedPreNotice(false)} className="rounded-2xl bg-secondary py-3.5 font-bold text-muted-foreground hover:bg-muted active:scale-95 transition-all">
                취소
              </button>
              <button onClick={confirmStartSpeedQuiz} className="rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 py-3.5 font-extrabold text-white shadow-lg shadow-rose-500/20 active:scale-95 transition-all">
                도전 시작 ⚡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flashcard Pre-Notice Modal */}
      {showFlashcardPreNotice && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4 animate-fade-in-up">
          <div className="bg-background w-full max-w-sm rounded-3xl p-6 text-center space-y-6 relative border border-border shadow-2xl">
            <div className="h-16 w-16 mx-auto bg-gradient-to-tr from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 mb-2">
              <Volume2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-foreground mb-2">플래시카드 학습</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                총 <span className="font-bold text-primary">{quizQueue.length}단어</span>로 진행됩니다.<br/>
                단어가 표시될 때 <span className="font-bold text-blue-500">원어민 발음을 자동으로</span><br/>재생할까요?
              </p>
              {quizPaddingCount > 0 && (
                <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mt-3 mb-4 leading-relaxed">
                  ⚡ 단어장의 미암기 단어가 부족하여<br/>토익 필수 빈출 단어 <span className="font-bold">{quizPaddingCount}개</span>가 자동으로 추가되었습니다.
                </p>
              )}
              
              <div className="space-y-3">
                <button onClick={() => confirmStartFlashcard(true)} className="w-full flex items-center gap-4 bg-secondary/50 hover:bg-secondary border border-border rounded-xl p-4 transition-all text-left group">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-110 transition-transform">ON</div>
                  <div>
                    <div className="font-bold text-sm">자동 재생 켬 (권장)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">화면이 넘어갈 때마다 발음이 나옵니다.</div>
                  </div>
                </button>
                <button onClick={() => confirmStartFlashcard(false)} className="w-full flex items-center gap-4 bg-secondary/50 hover:bg-secondary border border-border rounded-xl p-4 transition-all text-left group">
                  <div className="h-10 w-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold flex-shrink-0 group-hover:scale-110 transition-transform">OFF</div>
                  <div>
                    <div className="font-bold text-sm">자동 재생 끔</div>
                    <div className="text-xs text-muted-foreground mt-0.5">내가 원할 때만 발음 버튼을 누릅니다.</div>
                  </div>
                </button>
              </div>
            </div>
            <button onClick={() => setShowFlashcardPreNotice(false)} className="w-full rounded-2xl bg-secondary py-3.5 font-bold text-muted-foreground hover:bg-muted active:scale-95 transition-all">
              취소
            </button>
          </div>
        </div>
      )}

      {/* TTS Limit Modal */}
      {showTTSModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-up">
          <div className="bg-background w-full max-w-sm rounded-3xl p-6 text-center space-y-6 relative border border-border shadow-2xl">
            <div className="h-16 w-16 mx-auto bg-gradient-to-tr from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20 mb-2">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-foreground mb-2">하루 듣기 제한(20회) 초과!</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                무료 버전에서는 원어민 발음을 하루 20회까지만 들을 수 있습니다.<br/><br/>
                <span className="font-bold text-foreground">월 4,900원</span>으로 미국/영국 성우 발음을 <span className="text-primary font-bold">무제한 청취</span>하세요!
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => setShowTTSModal(false)} className="rounded-2xl bg-secondary py-3.5 font-bold text-muted-foreground hover:bg-muted active:scale-95 transition-all">
                닫기
              </button>
              <button onClick={() => { setShowTTSModal(false); alert("프리미엄 결제 페이지로 이동합니다."); }} className="rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 font-extrabold text-white shadow-lg shadow-amber-500/20 active:scale-95 transition-all">
                프리미엄 가입
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
