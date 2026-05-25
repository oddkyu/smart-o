"use client";

import React, { useState } from "react";
import { Folder, Plus, Trash2, Edit3, FolderPlus, X, Check, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

interface FolderType {
  id: string;
  name: string;
  color: string;
  wrongCount: number;
}

interface FolderManagerProps {
  folders: FolderType[];
  onAddFolder: (name: string, color: string) => void;
  onUpdateFolder: (id: string, name: string, color: string) => void;
  onDeleteFolder: (id: string) => void;
}

const COLOR_PRESETS = [
  { label: "클래식 인디고", value: "from-indigo-500 to-indigo-600", bg: "bg-indigo-500" },
  { label: "학술용 블루", value: "from-blue-500 to-indigo-500", bg: "bg-blue-500" },
  { label: "포커스 에메랄드", value: "from-emerald-500 to-teal-600", bg: "bg-emerald-500" },
  { label: "마인드 오렌지", value: "from-amber-500 to-orange-600", bg: "bg-amber-500" },
  { label: "마일드 로즈", value: "from-rose-400 to-rose-600", bg: "bg-rose-500" },
];

export default function FolderManager({
  folders,
  onAddFolder,
  onUpdateFolder,
  onDeleteFolder,
}: FolderManagerProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0].value);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const openCreateModal = () => {
    setModalMode("create");
    setFolderName("");
    setSelectedColor(COLOR_PRESETS[0].value);
    setIsModalOpen(true);
  };

  const openEditModal = (folder: FolderType) => {
    setModalMode("edit");
    setSelectedFolderId(folder.id);
    setFolderName(folder.name);
    setSelectedColor(folder.color);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    if (modalMode === "create") {
      onAddFolder(folderName.trim(), selectedColor);
    } else if (modalMode === "edit" && selectedFolderId) {
      onUpdateFolder(selectedFolderId, folderName.trim(), selectedColor);
    }

    setIsModalOpen(false);
    setFolderName("");
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = (id: string) => {
    onDeleteFolder(id);
    setDeleteConfirmId(null);
  };

  return (
    <section id="folders" className="w-full py-4 sm:py-6">
      {/* Header with Title and Add Button */}
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-1.5">
          <Folder className="h-4.5 w-4.5 text-primary" />
          <h2 className="text-sm sm:text-lg font-bold text-foreground">학습 과목 폴더</h2>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-extrabold text-white hover:opacity-90 shadow-md shadow-indigo-500/10 cursor-pointer transition active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>새 과목 추가</span>
        </button>
      </div>

      {/* Folders Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {/* 고정: 스마트 단어장 폴더 */}
        <div
          onClick={() => { router.push(`/folders/vocabulary`); }}
          className="glass-panel group relative flex flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl p-3.5 sm:p-5 min-h-[120px] sm:min-h-[140px] cursor-pointer hover:border-indigo-500/50 transition-colors"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-indigo-600"></div>
          
          <div className="flex items-start justify-between">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-md shadow-indigo-500/20 group-hover:scale-110 transition-transform">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-bold text-indigo-500 border border-indigo-500/20">
              Free
            </span>
          </div>

          <div className="mt-3 sm:mt-4 z-10">
            <h3 className="text-xs sm:text-sm font-extrabold text-foreground tracking-wide group-hover:text-primary transition-colors">스마트 단어장</h3>
            <div className="mt-1 sm:mt-1.5 flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground font-medium">AI 오답 추출</span>
            </div>
          </div>
          
          <div className="absolute bottom-0 right-0 h-10 w-10 sm:h-14 sm:w-14 translate-x-4 translate-y-4 rounded-full bg-gradient-to-tr from-primary to-indigo-600 opacity-10 blur-md group-hover:opacity-20 transition-opacity"></div>
        </div>

        {folders.map((folder) => {
          const isConfirmingDelete = deleteConfirmId === folder.id;
          
          return (
            <div
              key={folder.id}
              onClick={() => { router.push(`/notes?subject=${encodeURIComponent(folder.name)}`); }}
              className="glass-panel glass-card-hover rounded-xl sm:rounded-2xl p-3.5 sm:p-5 relative group flex flex-col justify-between min-h-[120px] sm:min-h-[140px] overflow-hidden cursor-pointer"
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${folder.color}`}></div>

              {/* Icon & Mini CRUD buttons */}
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-secondary border border-border text-muted-foreground">
                  <Folder className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                
                {/* Clean, compact actions */}
                <div className="flex items-center gap-0.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(folder); }}
                    className="p-1 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title="수정"
                  >
                    <Edit3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(e, folder.id)}
                    className="p-1 hover:bg-red-500/10 rounded-md text-muted-foreground hover:text-red-500 transition cursor-pointer"
                    title="삭제"
                  >
                    <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </button>
                </div>
              </div>

              {/* Subject Info */}
              <div className="mt-3 sm:mt-4">
                <h3 className="text-xs sm:text-sm font-bold text-foreground tracking-wide truncate">{folder.name}</h3>
                <div className="mt-1 sm:mt-1.5 flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground font-bold uppercase">오답 수</span>
                  <span className="rounded-full bg-secondary border border-border px-1.5 py-0.5 text-[9px] sm:text-xs font-extrabold text-primary">
                    {folder.wrongCount}개
                  </span>
                </div>
              </div>

              {/* Decorative Background Aura */}
              <div className={`absolute bottom-0 right-0 h-10 w-10 sm:h-14 sm:w-14 translate-x-4 translate-y-4 rounded-full bg-gradient-to-tr ${folder.color} opacity-5 blur-md`}></div>

              {/* Delete Confirm inside card */}
              {isConfirmingDelete && (
                <div className="absolute inset-0 bg-card/98 backdrop-blur-sm flex flex-col items-center justify-center p-3 z-10">
                  <span className="text-[10px] sm:text-xs font-bold text-foreground text-center mb-2 leading-snug">
                    정말 삭제할까요?
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); confirmDelete(folder.id); }}
                      className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-extrabold text-white hover:bg-red-700 transition cursor-pointer"
                    >
                      삭제
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                      className="rounded-md bg-secondary px-2 py-1 text-[10px] font-extrabold text-muted-foreground hover:bg-border transition cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty Placeholder card */}
        <div
          onClick={openCreateModal}
          className="hidden sm:flex border border-dashed border-border hover:border-primary/50 bg-secondary/20 hover:bg-primary/5 hover:text-primary rounded-xl sm:rounded-2xl p-3.5 sm:p-5 flex-col items-center justify-center min-h-[120px] sm:min-h-[140px] text-muted-foreground transition duration-250 cursor-pointer group"
        >
          <FolderPlus className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/60 group-hover:text-primary group-hover:scale-105 transition duration-250 mb-1.5" />
          <span className="text-[11px] sm:text-xs font-bold text-foreground">과목 추가</span>
        </div>
      </div>

      {/* CRUD Modal dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl relative">
            
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5 mb-4">
              <FolderPlus className="h-4.5 w-4.5 text-primary" />
              <span>{modalMode === "create" ? "새 과목 폴더 만들기" : "과목 정보 수정"}</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold text-muted-foreground" htmlFor="folderName">
                  과목명
                </label>
                <input
                  id="folderName"
                  type="text"
                  placeholder="예: TOEIC Part 5 - 문법"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/80 px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder-muted-foreground/60 focus:border-primary focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold text-muted-foreground">
                  과목 컬러 선택
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {COLOR_PRESETS.map((preset) => {
                    const isSelected = selectedColor === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setSelectedColor(preset.value)}
                        className={`h-8 sm:h-9 rounded-lg relative overflow-hidden transition-transform border border-border/80 ${preset.bg} cursor-pointer hover:scale-105 active:scale-95`}
                        title={preset.label}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                            <Check className="h-3.5 w-3.5 text-white font-bold" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-1.5 pt-3 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border hover:bg-secondary px-3.5 py-1.5 text-[10px] sm:text-xs font-semibold text-muted-foreground transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-1.5 text-[10px] sm:text-xs font-bold text-white hover:opacity-90 shadow-md shadow-indigo-500/10 cursor-pointer transition active:scale-95"
                >
                  {modalMode === "create" ? "생성" : "수정"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </section>
  );
}
