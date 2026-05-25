export type UserRole = "student" | "teacher" | "admin" | "parent";
export type AppMode = "teen" | "toeic";

export interface Academy {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  academy_id: string;
  name: string;
  teacher_id: string | null;
  class_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  role: UserRole;
  academy_id: string | null;
  name: string | null;
  email: string | null;
  app_mode: AppMode | null;
  parent_id: string | null;
  class_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  class_id: string | null;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface WordItemAI {
  word: string;
  meanings: string[];
  toeic_tip: string;
  collocation: string;
  paraphrasing: string;
  example_sentence: string;
  example_translation: string;
  tag: string;
}

export interface IncorrectNote {
  id: string;
  user_id: string;
  folder_id: string | null;
  class_id: string | null;
  subject: string;
  chapter: string;
  question: any;
  options: string[];
  correct_answer: number;
  ai_hint: string | null;
  image_url: string | null;
  wrong_count: number;
  words: WordItemAI[] | null;
  grammar_node_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrammarTreeNode {
  node_id: string;
  parent_id: string | null;
  node_name: string;
  level: number;
  created_at: string;
}

export interface CachedAIResponse {
  id: number;
  word_id: string;
  response_type: string;
  response_text: any;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      academies: {
        Row: Academy;
        Insert: Omit<Academy, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Academy, "id" | "created_at" | "updated_at">>;
      };
      classes: {
        Row: Class;
        Insert: Omit<Class, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Class, "id" | "created_at" | "updated_at">>;
      };
      users: {
        Row: User;
        Insert: Omit<User, "created_at" | "updated_at">;
        Update: Partial<Omit<User, "id" | "created_at" | "updated_at">>;
      };
      folders: {
        Row: Folder;
        Insert: Omit<Folder, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Folder, "id" | "created_at" | "updated_at">>;
      };
      incorrect_notes: {
        Row: IncorrectNote;
        Insert: Omit<IncorrectNote, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<IncorrectNote, "id" | "created_at" | "updated_at">>;
      };
      grammar_tree_nodes: {
        Row: GrammarTreeNode;
        Insert: Omit<GrammarTreeNode, "created_at">;
        Update: Partial<Omit<GrammarTreeNode, "created_at">>;
      };
      cached_ai_responses: {
        Row: CachedAIResponse;
        Insert: Omit<CachedAIResponse, "id" | "created_at">;
        Update: Partial<Omit<CachedAIResponse, "id" | "created_at">>;
      };
    };
  };
}
