import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Supabase가 실제 프로젝트 URL과 익명 키로 기입되었는지 유효성 검사 수행
export const isSupabaseConfigured =
  supabaseUrl.length > 0 &&
  supabaseAnonKey.length > 0 &&
  supabaseUrl !== "your_supabase_project_url_here" &&
  supabaseAnonKey !== "your_supabase_anon_key_here";

// 설정이 정상적일 때만 클라이언트 인스턴스 생성, 그렇지 않으면 null 반환하여 localStorage 폴백 지원
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!isSupabaseConfigured && typeof window !== "undefined") {
  console.warn(
    "⚠️ [Smart O] Supabase 연결 설정이 완료되지 않았습니다. .env.local 파일에 실제 접속 정보를 기입하기 전까지는 브라우저 내부의 localStorage 모드로 자동 전환되어 빌드 및 구동을 온전히 유지합니다."
  );
}
