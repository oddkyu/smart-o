import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("환경 변수 누락");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log("🔍 Supabase [auth.users] 테이블을 직접 스캔합니다...");
  const { data, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error("조회 실패:", error.message);
    return;
  }
  
  if (data.users.length === 0) {
    console.log("⚠️ 현재 Supabase에 가입된 유저가 한 명도 없습니다!");
  } else {
    console.log(`✅ 총 ${data.users.length}명의 유저가 발견되었습니다:`);
    data.users.forEach((u, i) => {
      console.log(`  ${i + 1}. 이메일: ${u.email} (가입일시: ${new Date(u.created_at).toLocaleString()})`);
    });
  }
}

check();
