import { createClient } from '@supabase/supabase-js';

// RLS를 우회하여 마스터 단어장을 안전하게 삽입하기 위해 Service Role Key를 사용합니다.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ 환경 변수 SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// public.vocabulary_master 테이블 스키마에 맞춘 데이터 타입 정의
interface VocabularySeed {
  target_score: number;
  word: string;
  meaning: string;
  part_of_speech: string;
  example_sentence: string;
  example_translation: string;
  metadata: Record<string, any>; // JSONB 확장을 위한 빈 객체
}

// 1,000제 토익 필수 어휘 중 점수대별 명품 샘플 3개
const seedData: VocabularySeed[] = [
  {
    target_score: 500, // 입문 단어 (비즈니스 이메일 필수)
    word: 'attach',
    meaning: '첨부하다',
    part_of_speech: 'Verb',
    example_sentence: 'Please attach your updated resume and cover letter to the application email.',
    example_translation: '지원 이메일에 최신 이력서와 자기소개서를 첨부해 주시기 바랍니다.',
    metadata: {} 
  },
  {
    target_score: 700, // 핵심 단어 (계약/비즈니스 실무)
    word: 'amend',
    meaning: '(계약서, 법안 등을) 수정하다, 개정하다',
    part_of_speech: 'Verb',
    example_sentence: 'The legal team strongly requested to amend the terms of the contract before signing.',
    example_translation: '법무팀은 서명하기 전에 계약 조건들을 수정해달라고 강력히 요청했습니다.',
    metadata: {}
  },
  {
    target_score: 850, // 고득점 함정 단어 (고급 부사)
    word: 'subsequently',
    meaning: '그 이후에, 이어서',
    part_of_speech: 'Adverb',
    example_sentence: 'The construction project was delayed by a month, and the grand opening was subsequently pushed back.',
    example_translation: '건설 프로젝트가 한 달 지연되었고, 그 이후에 그랜드 오픈 날짜도 뒤로 미뤄졌습니다.',
    metadata: {}
  }
];

async function seedVocabulary() {
  console.log('🌱 마스터 단어장(vocabulary_master) 프리시딩(Pre-seeding)을 시작합니다...');

  const { data, error } = await supabase
    .from('vocabulary_master')
    .insert(seedData)
    .select();

  if (error) {
    console.error('❌ 데이터 삽입 중 에러가 발생했습니다:', error.message);
    process.exit(1);
  }

  console.log(`✅ 프리시딩 완료! 총 ${data.length}개의 마스터 단어가 DB에 성공적으로 적재되었습니다.`);
}

// 스크립트 실행
seedVocabulary();
