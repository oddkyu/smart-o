import { createClient } from '@supabase/supabase-js';

// 환경 변수 로드 체크 (누락 시 빠른 에러 파악을 위함)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "❌ 환경 변수 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다. web/.env.local 파일을 확인해주세요."
  );
}

// Supabase 클라이언트 단일 인스턴스 생성
// 브라우저(Client Components) 및 단순 서버 렌더링(Server Components) 환경에서 공용으로 사용되는 가장 기본적이고 튼튼한 다리입니다.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
