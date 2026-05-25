import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; 

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source_question_id, category_code, original_question_text, user_id } = body;

    if (!source_question_id || !category_code || !user_id) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    // =========================================================================
    // 💡 [초격차 마진 플라이휠] 1단계: DB 창고 캐싱 히트 확인
    // =========================================================================
    
    // 유저가 이미 푼 변형 문제(bank_question_id) 목록 추출
    const { data: solvedData } = await supabaseAdmin
      .from('user_solved_questions')
      .select('bank_question_id')
      .eq('user_id', user_id)
      .not('bank_question_id', 'is', null);
      
    const solvedBankIds = solvedData?.map(s => s.bank_question_id) || [];

    // 동일한 원본 문제(source)에서 파생된 변형 문제 중, 유저가 아직 안 푼 것 탐색
    let cacheQuery = supabaseAdmin
      .from('question_bank')
      .select('*')
      .eq('source_question_id', source_question_id)
      .limit(1);

    if (solvedBankIds.length > 0) {
      cacheQuery = cacheQuery.not('id', 'in', `(${solvedBankIds.join(',')})`);
    }

    const { data: cachedQuestion } = await cacheQuery.maybeSingle();

    if (cachedQuestion) {
      console.log("🔥 DB 캐싱 적중! AI 호출 없이 0원으로 즉시 반환 완료.");
      return NextResponse.json({
        success: true,
        message: "캐시된 문제 반환 (API 호출 비용 0원)",
        data: cachedQuestion
      });
    }

    // =========================================================================
    // 🧠 2단계: 캐시 미스 -> Gemini 2.0 Flash 실시간 생성
    // =========================================================================
    console.log("💡 창고에 남은 문제가 없습니다. Gemini 2.0 Flash를 가동합니다...");

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `
      당신은 10년 차 에듀테크 토익(TOEIC) 출제 위원입니다.
      아래 제공된 원본 문제의 문법적 카테고리 코드(${category_code})와 난이도를 완벽하게 계승하되, 
      어휘, 문장 구조, 상황을 완전히 다른 비즈니스 상황(이메일, 공지사항, 회의 등)으로 탈바꿈시킨 '새로운 변형 문제'를 창조해 주세요.

      [엄격한 제약조건]
      1. 원본 문제에 사용된 명사, 동사는 절대 재사용하지 마세요.
      2. 정답의 문법적 역할(예: 동명사, To부정사)은 동일해야 합니다.

      원본 문제 참고(난이도 및 문법 요소 파악용):
      "${original_question_text || '제공되지 않음'}"

      반드시 아래 JSON 스키마를 엄격하게 지켜서 응답해 주세요. (마크다운 백틱 없이 순수 JSON만 반환)
      {
        "question_text": "새로운 문제 내용 (빈칸은 반드시 _______ 7개의 언더스코어로 표시)",
        "options": {
          "A": "보기 A",
          "B": "보기 B",
          "C": "보기 C",
          "D": "보기 D"
        },
        "correct_option": "A, B, C, D 중 하나 (정답 알파벳 하나만 기재)",
        "explanation": "이 문제가 왜 정답이고 나머지가 왜 오답인지에 대한 친절하고 명쾌한 해설 (한국어)"
      }
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    // 마크다운 찌꺼기(백틱) 완벽 제거 (안전한 JSON 파싱을 위함)
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const generatedData = JSON.parse(responseText);

    // =========================================================================
    // 💾 3단계: 생성된 문제를 창고에 영구 저축 (다음 유저를 위한 Caching)
    // =========================================================================
    const { data: insertedData, error: dbError } = await supabaseAdmin
      .from('question_bank')
      .insert({
        source_question_id: source_question_id,
        category_code: category_code,
        question_text: generatedData.question_text,
        options: generatedData.options,
        correct_option: generatedData.correct_option,
        explanation: generatedData.explanation,
      })
      .select()
      .single();

    if (dbError) {
      console.error("문제 은행 저축 실패:", dbError);
      return NextResponse.json({ error: 'DB 저축 실패' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "AI 문제 창조 및 창고 저축 완료 (비용 발생: 약 0.2원)",
      data: insertedData
    });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
