"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Layers, Printer, Eye, EyeOff, Check, AlertCircle, RefreshCw, Image as ImageIcon, Trash2, PlusCircle, Network, X, Play, Loader2, PartyPopper } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface Note {
  id: string;
  subject: string;
  chapter: string;
  question: string;
  options: string[];
  correctAnswer: number;
  aiHint: string;
  wrongCount: number;
  imageUrl?: string;
  grammarNodeId?: string;
  createdAt?: string;
}

const INITIAL_NOTES: Note[] = [
  {
    id: "n-1",
    subject: "TOEIC Part 5 - 문법",
    chapter: "전치사/접속사",
    question: "All employees must submit their expense reports ------- the end of each month.",
    options: ["① by", "② until", "③ since", "④ during"],
    correctAnswer: 1,
    aiHint: "'by the end of'는 기한을 나타내는 전치사 관용 표현이며, 동작의 완료 기한을 뜻하므로 'by'가 정답입니다. 'until'은 상태의 지속을 나타낼 때 사용합니다.",
    wrongCount: 2,
    grammarNodeId: "PREPOSITION"
  },
  {
    id: "n-2",
    subject: "TOEIC Part 6 - 장문",
    chapter: "동사 시세/태",
    question: "We are pleased to announce that Ms. Kim ------- to the position of Senior Director next week.",
    options: ["① was promoted", "② is promoting", "③ will be promoted", "④ has promoted"],
    correctAnswer: 3,
    aiHint: "Ms. Kim이 승진을 '당하는'(수동태) 주체이고, 미래 시점 지표인 'next week'가 있으므로 미래 수동태 'will be promoted'가 정답입니다.",
    wrongCount: 1,
    grammarNodeId: "VERB_VOICE"
  },
  {
    id: "n-3",
    subject: "TOEIC Part 7 - 독해",
    chapter: "공지/이메일 독해",
    question: "What is indicated about the new corporate policy?",
    options: [
      "① It will take effect immediately.",
      "② It applies only to full-time employees.",
      "③ It was approved by the board last week.",
      "④ It mandates daily feedback reports."
    ],
    correctAnswer: 3,
    aiHint: "이메일 본문에서 'The policy, approved at last Tuesday's board meeting'이 핵심 근거입니다. 즉시 시행이 아닌 1월 1일부터 적용되므로 ①은 오답입니다.",
    wrongCount: 3,
    grammarNodeId: "ROOT"
  }
];

// Grammar Tree Taxonomy Definition
const GRAMMAR_NODES: Record<string, { id: string, label: string, children: string[] }> = {
  ROOT: { id: "ROOT", label: "토익 문법 (Root)", children: ["VERB", "MODIFIER", "CONNECTOR", "NOUN_PRONOUN"] },
  VERB: { id: "VERB", label: "동사", children: ["VERB_TENSE", "VERB_AGREEMENT", "VERB_VOICE"] },
  MODIFIER: { id: "MODIFIER", label: "수식어", children: ["ADJ_ADV", "RELATIVE_CLAUSE", "PARTICIPLE"] },
  CONNECTOR: { id: "CONNECTOR", label: "연결어", children: ["PREPOSITION", "CONJUNCTION"] },
  NOUN_PRONOUN: { id: "NOUN_PRONOUN", label: "명사/대명사", children: [] },
  VERB_TENSE: { id: "VERB_TENSE", label: "시제", children: [] },
  VERB_AGREEMENT: { id: "VERB_AGREEMENT", label: "수일치", children: [] },
  VERB_VOICE: { id: "VERB_VOICE", label: "태", children: [] },
  ADJ_ADV: { id: "ADJ_ADV", label: "형용사/부사", children: [] },
  RELATIVE_CLAUSE: { id: "RELATIVE_CLAUSE", label: "관계사", children: [] },
  PARTICIPLE: { id: "PARTICIPLE", label: "분사", children: [] },
  PREPOSITION: { id: "PREPOSITION", label: "전치사", children: [] },
  CONJUNCTION: { id: "CONJUNCTION", label: "접속사", children: [] },
};

function NotesContent() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get("subject") || "all";
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [studyMode, setStudyMode] = useState<"standard" | "clean">("standard");
  const [viewMode, setViewMode] = useState<"list" | "tree">("list");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ "ROOT": true });

  // Twin Quiz State Machine
  type QuizStatus = "idle" | "loading" | "playing" | "result";
  const [quizStatus, setQuizStatus] = useState<QuizStatus>("idle");
  const [twinQuestions, setTwinQuestions] = useState<any[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [kakaoPreviewId, setKakaoPreviewId] = useState<string | null>(null);
  const [kakaoPreviewText, setKakaoPreviewText] = useState<string>("");

  useEffect(() => {
    async function loadNotes() {
      setLoading(true);
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          const userId = authData.user?.id;
          
          if (userId) {
            const { data, error } = await supabase
              .from("incorrect_notes")
              .select("*")
              .eq("user_id", userId)
              .order("created_at", { ascending: false });
            
            if (!error && data) {
              const formattedNotes = data.map((note: any) => ({
                id: note.id,
                subject: note.subject,
                chapter: note.chapter,
                question: note.question,
                options: note.options,
                correctAnswer: note.correct_answer ?? note.correctAnswer,
                aiHint: note.ai_hint ?? note.aiHint,
                wrongCount: note.wrong_count ?? note.wrongCount,
                imageUrl: note.image_url ?? note.imageUrl,
                grammarNodeId: note.grammar_node_id ?? note.grammarNodeId,
                createdAt: note.created_at ?? note.createdAt
              }));
              setNotes(formattedNotes);
              localStorage.setItem("smart-o-notes", JSON.stringify(formattedNotes));
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error("Failed to fetch notes from Supabase, trying localStorage", err);
        }
      }

      // Local storage fallback
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("smart-o-notes");
        if (stored) {
          try {
            setNotes(JSON.parse(stored));
          } catch (e) {
            setNotes(INITIAL_NOTES);
          }
        } else {
          setNotes(INITIAL_NOTES);
          localStorage.setItem("smart-o-notes", JSON.stringify(INITIAL_NOTES));
        }
      }
      setLoading(false);
    }
    loadNotes();
  }, []);

  const subjects = ["all", ...Array.from(new Set(notes.map((n) => n.subject)))];
  const filteredNotes = selectedSubject === "all" ? notes : notes.filter((n) => n.subject === selectedSubject);

  const handlePrint = () => { if (typeof window !== "undefined") window.print(); };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm("정말 이 오답 노트를 삭제하시겠습니까?")) return;
    
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user?.id) {
          const { error } = await supabase.from("incorrect_notes").delete().eq("id", id);
          if (error) throw error;
        }
      } catch (err) {
        console.error("DB 삭제 실패", err);
      }
    }
    
    // 로컬 상태 및 로컬 스토리지에서 즉시 삭제 (게스트 유저 호환성)
    const updatedNotes = notes.filter((n) => n.id !== id);
    setNotes(updatedNotes);
    localStorage.setItem("smart-o-notes", JSON.stringify(updatedNotes));
  };

  // Grammar Tree Calculation Logic
  const notesByNode = useMemo(() => {
    return notes.reduce((acc, note) => {
      const nid = note.grammarNodeId || "ROOT";
      if (!acc[nid]) acc[nid] = [];
      acc[nid].push(note);
      return acc;
    }, {} as Record<string, Note[]>);
  }, [notes]);

  const getNodeCount = (nodeId: string): number => {
    const node = GRAMMAR_NODES[nodeId];
    if (!node) return 0;
    let count = (notesByNode[nodeId] || []).length;
    for (const child of node.children) {
      count += getNodeCount(child);
    }
    return count;
  };

  const getBorderColor = (count: number) => {
    const base = "transition-all duration-200 hover:-translate-y-0.5 cursor-pointer";
    if (count === 0) return `${base} border-slate-200 text-slate-500 bg-slate-50 opacity-60 hover:shadow-md`;
    if (count <= 2) return `${base} border-emerald-500 text-emerald-700 bg-emerald-50 shadow-sm hover:shadow-md`;
    if (count <= 4) return `${base} border-amber-400 text-amber-700 bg-amber-50 shadow-sm hover:shadow-md`;
    return `${base} border-rose-500 text-rose-700 bg-rose-50 shadow-[0_0_15px_rgba(244,63,94,0.4)] font-extrabold animate-pulse hover:shadow-[0_0_20px_rgba(244,63,94,0.6)]`;
  };

  const toggleNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleNodeClick = (nodeId: string, count: number) => {
    if (count > 0) setSelectedNodeId(nodeId);
  };

  // 1. Desktop: Premium Horizontal Tree (Hidden on Mobile)
  const renderDesktopTree = (nodeId: string) => {
    const node = GRAMMAR_NODES[nodeId];
    if (!node) return null;
    const count = getNodeCount(nodeId);
    const colorClass = getBorderColor(count);

    return (
      <div key={nodeId} className="flex items-center gap-8 relative my-2">
        <div 
          onClick={() => handleNodeClick(nodeId, count)}
          className={`shrink-0 w-44 p-3.5 rounded-xl border-2 z-10 bg-white ${colorClass}`}
        >
          <div className="text-sm font-bold">{node.label}</div>
          <div className="text-xs mt-1 font-semibold">발견된 약점 {count}건</div>
        </div>

        {node.children.length > 0 && (
          <div className="flex flex-col relative border-l-2 border-slate-200 py-4 pl-8 gap-4">
            <div className="absolute -left-8 top-1/2 w-8 h-px bg-slate-200 -translate-y-1/2 before:absolute before:-left-1 before:top-1/2 before:-translate-y-1/2 before:w-2 before:h-2 before:rounded-full before:bg-slate-300"></div>
            {node.children.map(childId => (
              <div key={childId} className="relative">
                <div className="absolute -left-8 top-1/2 w-8 h-px bg-slate-200 -translate-y-1/2 after:absolute after:-right-1 after:top-1/2 after:-translate-y-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-slate-300"></div>
                {renderDesktopTree(childId)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 2. Mobile: Vertical Accordion List (Hidden on Desktop)
  const renderMobileTree = (nodeId: string, depth = 0) => {
    const node = GRAMMAR_NODES[nodeId];
    if (!node) return null;
    const count = getNodeCount(nodeId);
    const colorClass = getBorderColor(count);
    const isExpanded = expandedNodes[nodeId];
    const hasChildren = node.children.length > 0;

    return (
      <div key={nodeId} className="flex flex-col w-full my-1" style={{ paddingLeft: depth === 0 ? 0 : '1.5rem' }}>
        <div 
          onClick={() => {
            if (count > 0 && !hasChildren) handleNodeClick(nodeId, count);
            else if (count > 0 && hasChildren) handleNodeClick(nodeId, count);
          }}
          className={`flex items-center justify-between w-full p-3.5 rounded-xl border-2 z-10 bg-white ${colorClass}`}
        >
          <div className="flex flex-col">
            <div className="text-sm font-bold">{node.label}</div>
            <div className="text-xs mt-1 font-semibold">발견된 약점 {count}건</div>
          </div>
          {hasChildren && (
            <button 
              onClick={(e) => toggleNode(nodeId, e)}
              className="p-2 -mr-2 text-slate-400 hover:text-slate-600 transition-transform active:scale-95"
            >
              <svg className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {hasChildren && (
          <div className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
            {node.children.map(childId => renderMobileTree(childId, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Node Notes Details
  const selectedNodeNotes = useMemo(() => {
    if (!selectedNodeId) return [];
    
    // Get notes for this node and all its children
    const getNotesRecursive = (nId: string): Note[] => {
      let res = [...(notesByNode[nId] || [])];
      const node = GRAMMAR_NODES[nId];
      if (node) {
        for (const child of node.children) {
          res = res.concat(getNotesRecursive(child));
        }
      }
      return res;
    };
    return getNotesRecursive(selectedNodeId);
  }, [selectedNodeId, notesByNode]);

  const handleHealNode = async () => {
    if (!selectedNodeId) return;
    const noteIds = selectedNodeNotes.map(n => n.id);
    if (noteIds.length === 0) return;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from("incorrect_notes").update({ wrong_count: 0 }).in("id", noteIds);
      } catch (e) {
        console.error("Failed to heal node in DB", e);
      }
    }
    
    setNotes(prev => prev.map(n => {
      if (noteIds.includes(n.id)) {
        return { ...n, wrongCount: 0 };
      }
      return n;
    }));
  };

  const handleStartQuiz = async (note: Note) => {
    setQuizStatus("loading");
    try {
      const res = await fetch("/api/quiz/twin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalNotes: [note],
          grammarNodeId: selectedNodeId
        })
      });
      const result = await res.json();
      if (result.success && result.data?.length > 0) {
        setTwinQuestions(result.data);
        setCurrentQuizIndex(0);
        setQuizScore(0);
        setSelectedOption(null);
        setShowExplanation(false);
        setQuizStatus("playing");
      } else {
        alert("문제 생성에 실패했습니다.");
        setQuizStatus("idle");
      }
    } catch (e) {
      alert("API 호출 오류");
      setQuizStatus("idle");
    }
  };

  const handleOptionClick = (idx: number) => {
    if (showExplanation) return;
    setSelectedOption(idx);
    setShowExplanation(true);
    if (idx + 1 === twinQuestions[currentQuizIndex].correct_answer) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuiz = async () => {
    if (currentQuizIndex < twinQuestions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setQuizStatus("result");
      const finalScore = quizScore + (selectedOption !== null && selectedOption + 1 === twinQuestions[currentQuizIndex].correct_answer ? 1 : 0);
      if (finalScore === twinQuestions.length) {
        await handleHealNode();
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
        <span className="text-xs font-semibold">오답 보관함 로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative pb-16 print:bg-white print:text-black transition-colors duration-250">
      <div className="absolute top-0 right-1/4 h-[500px] w-[500px] -translate-y-64 rounded-full bg-primary/5 blur-[100px] pointer-events-none print:hidden"></div>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-24 pb-8 space-y-6">
        
        {/* Navigation & Mode Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden no-print">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>대시보드로 돌아가기</span>
          </Link>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-secondary rounded-xl p-1 border border-border">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === "list" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>리스트 뷰</span>
              </button>
              <button
                onClick={() => setViewMode("tree")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === "tree" ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Network className="h-4 w-4" />
                <span>문법 나무 뷰</span>
              </button>
            </div>

            <div className="w-px h-6 bg-border mx-1"></div>

            <button
              onClick={() => setStudyMode(studyMode === "standard" ? "clean" : "standard")}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                studyMode === "clean" ? "bg-primary/10 border-primary text-primary" : "bg-secondary border-border text-foreground hover:bg-muted"
              }`}
            >
              {studyMode === "clean" ? <><EyeOff className="h-4 w-4" /> 다시 풀기 ON</> : <><Eye className="h-4 w-4" /> 해설 포함</>}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-transparent text-white px-3 py-1.5 text-xs font-bold cursor-pointer transition no-print"
            >
              <Printer className="h-4 w-4" />
              <span>📄 인쇄하기</span>
            </button>
          </div>
        </div>

        {viewMode === "tree" ? (
          /* GRAMMAR TREE VIEW */
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm min-h-[600px] md:overflow-x-auto print:hidden animate-fade-in-up">
            <div className="mb-8 md:mb-12 space-y-2 border-b border-slate-100 pb-4">
              <h2 className="text-xl md:text-2xl font-extrabold text-[#0B1B3D] flex items-center gap-2">
                <Network className="h-6 w-6 md:h-7 md:w-7 text-indigo-600" />
                문법 나무 진단 리포트
              </h2>
              <p className="text-xs md:text-sm text-slate-500 font-medium">AI가 추출한 약점 데이터를 기반으로 한 정석적인 영문법 구조도입니다. 색상이 붉을수록 취약한 파트입니다.</p>
            </div>
            
            {/* Desktop Horizontal Tree */}
            <div className="hidden md:flex pl-4 pb-12 justify-start">
               {renderDesktopTree("ROOT")}
            </div>
            
            {/* Mobile Vertical Accordion Tree */}
            <div className="md:hidden flex flex-col w-full pb-12">
               {renderMobileTree("ROOT")}
            </div>
          </div>
        ) : (
          /* LIST VIEW */
          <>
            <div className="hidden print:block text-center space-y-2 border-b-2 border-black pb-4 mb-8">
              <h1 className="text-3xl font-extrabold tracking-tight">Smart O - 나만의 오답 모의고사 시험지</h1>
              <p className="text-sm font-semibold">성명: ____________________ &nbsp;&nbsp;&nbsp;&nbsp; 수험번호: ____________________</p>
            </div>

            <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden no-print">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-muted-foreground">과목별 신속 필터</span>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {subjects.map((subj) => (
                  <button key={subj} onClick={() => setSelectedSubject(subj)} className={`rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer transition ${selectedSubject === subj ? "bg-primary text-white" : "bg-secondary border border-border text-muted-foreground hover:text-foreground"}`}>
                    {subj === "all" ? "전체 보기" : subj}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {filteredNotes.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center text-muted-foreground flex flex-col items-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-semibold">조건에 맞는 오답 노트가 존재하지 않습니다.</p>
                </div>
              ) : (
                filteredNotes.map((note, index) => {
                  const isClean = studyMode === "clean";
                  return (
                    <div key={note.id} className="glass-panel rounded-2xl p-6 md:p-8 space-y-5 transition relative overflow-hidden break-inside-avoid print:border-none print:shadow-none print:p-0 print:mb-8">
                      <div className="flex items-center justify-between print:border-b print:pb-1.5 print:mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-muted-foreground print:text-black">문제 {index + 1}</span>
                          <span className="rounded-full bg-secondary border border-border px-2.5 py-0.5 text-[9px] font-bold text-primary print:border-none print:text-zinc-600">{note.subject}</span>
                          {note.grammarNodeId && (
                            <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-[9px] font-bold text-indigo-600 print:hidden">
                              {GRAMMAR_NODES[note.grammarNodeId]?.label || note.grammarNodeId}
                            </span>
                          )}
                        </div>
                        {!isClean && (
                          <div className="flex items-center gap-2 print:hidden no-print">
                            <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 ml-1 sm:ml-2 text-muted-foreground hover:text-red-500 rounded-md"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-4">
                          {(() => {
                            let passage = "", text = note.question, translation = "";
                            try { if (text.startsWith("{")) { const parsed = JSON.parse(text); passage = parsed.passage || ""; text = parsed.text || ""; translation = parsed.translation || ""; } } catch (e) {}
                            return (
                              <>
                                {passage && <div className="bg-secondary/30 border border-border/60 rounded-xl p-5 print:border-zinc-300 print:bg-zinc-50 print:p-4"><p className="text-sm font-medium text-foreground whitespace-pre-wrap print:text-black">{passage}</p></div>}
                                {text && <p className="text-sm font-bold text-foreground whitespace-pre-wrap print:text-black">{text}</p>}
                                {translation && !isClean && (
                                  <div className="mt-2 bg-slate-50 border border-slate-100 rounded-lg p-3 print:bg-transparent print:border-none print:p-0 print:mt-1">
                                    <div className="text-[11px] font-bold text-slate-400 mb-1 print:text-black">지문 해석</div>
                                    <p className="text-xs text-slate-600 leading-relaxed print:text-black">{translation}</p>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <div className="pl-4 space-y-2 text-xs text-muted-foreground print:text-black">
                          {note.options.map((opt, optIdx) => {
                            const isCorrect = optIdx + 1 === note.correctAnswer;
                            const highlightCorrect = isCorrect && !isClean;
                            return (
                              <div key={optIdx} className={`flex items-start gap-2 p-1.5 rounded-lg ${highlightCorrect ? "bg-red-500/10 border border-red-500/20 text-red-650 font-semibold print:bg-transparent print:border-none print:text-black" : ""}`}>
                                {highlightCorrect && <Check className="h-4 w-4 text-red-500 shrink-0 mt-0.5 print:hidden" />}
                                <span>{opt}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {!isClean && (
                        <div className="mt-4 rounded-xl bg-secondary border border-border p-4 space-y-1.5 print:bg-zinc-100 print:border-zinc-300">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-primary print:text-black"><BookOpen className="h-3.5 w-3.5" /><span>AI 해설</span></div>
                          <p className="text-xs text-muted-foreground leading-relaxed print:text-zinc-700">{note.aiHint}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>

      {/* Slide-over Panel for Grammar Node */}
      {selectedNodeId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm animate-fade-in no-print">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 border-l border-slate-200 animate-slide-in-right relative">
            
            {/* IDLE STATE (Notes List) */}
            {quizStatus === "idle" && (
              <>
                <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <div>
                    <h3 className="text-lg font-extrabold text-[#0B1B3D] flex items-center gap-2">
                      <Network className="h-5 w-5 text-indigo-600" />
                      {GRAMMAR_NODES[selectedNodeId]?.label}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">총 {selectedNodeNotes.length}개의 취약 오답이 누적되었습니다.</p>
                  </div>
                  <button onClick={() => setSelectedNodeId(null)} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                  {selectedNodeNotes.map((note, i) => {
                    let text = note.question;
                    let translation = "";
                    let fineGrainedConcept = "";
                    try { if (text.startsWith("{")) { const parsed = JSON.parse(text); text = parsed.text || ""; translation = parsed.translation || ""; fineGrainedConcept = parsed.fine_grained_concept || ""; } } catch (e) {}

                    const isKakaoPreviewOpen = kakaoPreviewId === note.id;
                    const defaultMsg = `선생님 안녕하세요! 제가 이 문제를 풀다가 궁금한 점이 생겨서 질문드립니다.\n[원본 문장]\n${text}\n▶ 스마트 O AI 정밀 분석 결과: 저의 취약 유형은 '${fineGrainedConcept || GRAMMAR_NODES[selectedNodeId]?.label}' 관련인 것으로 진단되었습니다. 이 파트의 개념을 보충하고 싶은데, 제가 어떤 부분을 놓치고 있는지 힌트를 주실 수 있을까요?`;

                    const handleKakaoPreviewToggle = () => {
                      if (isKakaoPreviewOpen) {
                        setKakaoPreviewId(null);
                      } else {
                        setKakaoPreviewId(note.id);
                        setKakaoPreviewText(defaultMsg);
                      }
                    };

                    const handleKakaoCopy = () => {
                      navigator.clipboard.writeText(kakaoPreviewText).then(() => {
                        alert("질문 템플릿이 복사되었습니다. 카카오톡에 붙여넣기 하세요!");
                        setKakaoPreviewId(null);
                      });
                    };

                    return (
                      <div key={note.id} className="border border-slate-200 rounded-xl p-4 bg-white hover:border-indigo-400 hover:shadow-md transition">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="text-[10px] font-bold text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded-full">Issue #{i + 1}</div>
                            {fineGrainedConcept && (
                              <div className="text-[9px] font-bold text-rose-600 px-2 py-0.5 bg-rose-50 border border-rose-100 rounded-full truncate max-w-[150px]">{fineGrainedConcept}</div>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400">{note.createdAt ? new Date(note.createdAt).toLocaleDateString() : ""}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800 line-clamp-3 leading-relaxed mb-2">{text}</p>
                        {translation && (
                          <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 mb-3">
                            <div className="text-[10px] font-bold text-slate-400 mb-1">지문 해석</div>
                            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{translation}</p>
                          </div>
                        )}
                        
                        <div className="flex gap-2 mb-2">
                          <button onClick={() => handleStartQuiz(note)} className="flex-1 py-2 rounded-lg bg-[#0B1B3D] hover:bg-indigo-900 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition">
                            <Play className="h-3.5 w-3.5 fill-white" />
                            <span>이 문제 쌍둥이 풀기</span>
                          </button>
                        </div>
                        
                        <button onClick={handleKakaoPreviewToggle} className="w-full py-2 rounded-lg bg-[#FEE500] hover:bg-[#FEE500]/90 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.4 1.3 4.5 3.4 5.9l-1 3.7c-.1.3.2.6.5.4l4.2-2.8c.9.3 1.9.4 2.9.4 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"/></svg>
                          <span>{isKakaoPreviewOpen ? "미리보기 닫기" : "AI 선생님께 질문하기 (카톡 복사)"}</span>
                        </button>

                        {isKakaoPreviewOpen && (
                          <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 animate-fade-in-up">
                            <textarea
                              value={kakaoPreviewText}
                              onChange={(e) => setKakaoPreviewText(e.target.value)}
                              className="w-full h-32 text-xs text-slate-700 bg-white border border-slate-200 rounded-md p-2 focus:outline-none focus:border-indigo-400 resize-none mb-2"
                            />
                            <button onClick={handleKakaoCopy} className="w-full py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition">
                              수정 완료 및 복사하기
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {selectedNodeNotes.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm font-medium">해당 문법 유형에 등록된 오답이 없습니다.</div>
                  )}
                </div>
              </>
            )}

            {/* LOADING STATE */}
            {quizStatus === "loading" && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-6" />
                <h3 className="text-xl font-extrabold text-slate-800 mb-2">문제를 출제하고 있습니다...</h3>
              </div>
            )}

            {/* PLAYING STATE */}
            {quizStatus === "playing" && twinQuestions.length > 0 && (
              <div className="flex-1 flex flex-col h-full animate-fade-in">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                      Quiz {currentQuizIndex + 1} / {twinQuestions.length}
                    </span>
                  </div>
                  <button onClick={() => setQuizStatus("idle")} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                  <h3 className="text-base font-bold text-slate-800 leading-relaxed mb-6">
                    {twinQuestions[currentQuizIndex].question}
                  </h3>
                  <div className="space-y-3">
                    {twinQuestions[currentQuizIndex].options.map((opt: string, idx: number) => {
                      const isSelected = selectedOption === idx;
                      const isCorrectAnswer = idx + 1 === twinQuestions[currentQuizIndex].correct_answer;
                      let btnClass = "bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50";
                      
                      if (showExplanation) {
                        if (isCorrectAnswer) btnClass = "bg-emerald-50 border-emerald-400 text-emerald-700 font-bold";
                        else if (isSelected && !isCorrectAnswer) btnClass = "bg-rose-50 border-rose-400 text-rose-700";
                        else btnClass = "bg-slate-50 border-slate-100 text-slate-400 opacity-50";
                      } else if (isSelected) {
                        btnClass = "bg-indigo-50 border-indigo-500 text-indigo-700 font-bold";
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleOptionClick(idx)}
                          disabled={showExplanation}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${btnClass}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {showExplanation && (
                    <div className="mt-8 p-5 bg-indigo-50 border border-indigo-100 rounded-xl animate-fade-in-up">
                      {twinQuestions[currentQuizIndex].translation && (
                        <div className="mb-4 bg-white/60 rounded-lg p-3">
                          <div className="text-[11px] font-bold text-indigo-400 mb-1">지문 해석</div>
                          <p className="text-xs text-indigo-800 leading-relaxed">{twinQuestions[currentQuizIndex].translation}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-2">
                        <BookOpen className="h-4 w-4" /> AI 해설
                      </div>
                      <p className="text-sm text-indigo-900 leading-relaxed">
                        {twinQuestions[currentQuizIndex].explanation}
                      </p>
                    </div>
                  )}
                </div>

                {showExplanation && (
                  <div className="p-6 border-t border-slate-200 bg-white">
                    <button 
                      onClick={handleNextQuiz}
                      className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center justify-center shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                    >
                      {currentQuizIndex < twinQuestions.length - 1 ? "다음 문제" : "결과 확인"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* RESULT STATE */}
            {quizStatus === "result" && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in bg-slate-50">
                {quizScore === twinQuestions.length ? (
                  <>
                    <PartyPopper className="h-16 w-16 text-emerald-500 mb-4 animate-bounce" />
                    <h3 className="text-2xl font-extrabold text-slate-800 mb-2">완치되었습니다!</h3>
                    <p className="text-sm text-slate-500 font-medium mb-8">모든 문제를 완벽히 풀어내어<br/>문법 나무의 붉은 불빛이 초록색으로 치료되었습니다.</p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
                    <h3 className="text-2xl font-extrabold text-slate-800 mb-2">{quizScore} / {twinQuestions.length} 정답</h3>
                    <p className="text-sm text-slate-500 font-medium mb-8">아쉽습니다. 완치를 위해서는<br/>모든 문제를 맞춰야 합니다.</p>
                  </>
                )}
                
                <button 
                  onClick={() => setQuizStatus("idle")}
                  className="w-full py-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-sm transition-all"
                >
                  트리로 돌아가기
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
        <span className="text-xs font-semibold">로딩 중...</span>
      </div>
    }>
      <NotesContent />
    </Suspense>
  );
}
