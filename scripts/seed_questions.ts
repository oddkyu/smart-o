import { createClient } from '@supabase/supabase-js';

// RLS를 우회하여 마스터 데이터를 안전하게 삽입하기 위해 Service Role Key를 사용합니다.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ 환경 변수 SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// public.questions 테이블 스키마에 맞춘 데이터 타입 정의
interface QuestionSeed {
  category_code: string;
  question_text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_option: string;
  explanation: string;
}

// 명품 300문항 중 샘플 3개 (출판사 퀄리티 기출 변형)
const seedData: QuestionSeed[] = [
  {
    category_code: 'V_GERUND_01',
    question_text: 'The management board strongly considered _______ the new marketing strategy to boost the falling sales figures this quarter.',
    options: {
      A: 'to implement',
      B: 'implementing',
      C: 'implementation',
      D: 'implemented'
    },
    correct_option: 'B',
    explanation: '동사 consider는 동명사(-ing)를 목적어로 취하는 대표적인 타동사입니다. 뒤에 목적어(the new marketing strategy)를 끌고 올 수 있는 동명사 (B) implementing이 정답입니다. 명사인 (C) implementation은 뒤에 목적어를 바로 취할 수 없으므로 오답입니다.'
  },
  {
    category_code: 'PREP_VS_CONJ_02',
    question_text: '_______ the unexpected heavy rain, the outdoor charity concert was postponed until next weekend.',
    options: {
      A: 'Because of',
      B: 'Although',
      C: 'Even if',
      D: 'Because'
    },
    correct_option: 'A',
    explanation: '빈칸 뒤에 주어+동사의 완전한 절이 아니라 명사구(the unexpected heavy rain)가 왔으므로 접속사가 아닌 전치사가 필요합니다. (B), (C), (D)는 모두 접속사이므로 문법상 불가하며, 전치사 역할을 하는 (A) Because of가 정답입니다.'
  },
  {
    category_code: 'TENSE_MATCH_03',
    question_text: 'By the time Mr. Henderson arrives at the conference center tomorrow morning, the keynote speaker _______ his presentation.',
    options: {
      A: 'will finish',
      B: 'has finished',
      C: 'will have finished',
      D: 'is finishing'
    },
    correct_option: 'C',
    explanation: '\'By the time + 주어 + 현재 시제\'는 미래의 특정 시점을 나타냅니다. 주절에는 그 미래 시점까지 완료될 동작을 나타내는 미래 완료 시제(will have p.p.)가 와야 하므로 (C) will have finished가 정답입니다.'
  }
];

async function seedDatabase() {
  console.log('🌱 마스터 문제(questions) 프리시딩(Pre-seeding)을 시작합니다...');

  const { data, error } = await supabase
    .from('questions')
    .insert(seedData)
    .select();

  if (error) {
    console.error('❌ 데이터 삽입 중 에러가 발생했습니다:', error.message);
    process.exit(1);
  }

  console.log(`✅ 프리시딩 완료! 총 ${data.length}개의 마스터 문제가 DB에 성공적으로 적재되었습니다.`);
}

// 스크립트 실행
seedDatabase();
