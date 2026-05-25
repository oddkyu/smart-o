import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "이미지 데이터가 누락되었습니다." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // 만약 API Key가 지정되지 않은 경우, 프론트에 키가 없다는 알림과 함께 데모용 풍부한 Mock 토익 데이터를 제공합니다.
    if (!apiKey) {
      console.warn("GEMINI_API_KEY가 .env.local에 설정되지 않았습니다. 데모 데이터를 반환합니다.");
      
      // 데모용 정교한 Mock 데이터 생성
      const mockResult = {
        subject: "TOEIC Part 5 - 문법",
        chapter: "관계대명사",
        question: "Candidates ------- are interested in the managerial position must submit their application by Friday.",
        options: [
          "① who",
          "② whom",
          "③ whose",
          "④ which"
        ],
        correctAnswer: 1,
        original_translation: "관리직에 관심 있는 지원자들은 금요일까지 지원서를 제출해야 합니다.",
        fine_grained_concept: "주격 관계대명사 뒤 동사 수일치 및 선행사 사람/사물 구별",
        aiHint: "★ 핵심 단어:\n- candidate: 후보자, 지원자\n- managerial: 관리의, 경영의\n- submit: 제출하다\n\n★ 해설:\n빈칸 뒤에 바로 동사 'are'가 이어지므로 주격 관계대명사 자리입니다. 선행사인 'Candidates'가 사람이므로 주격 관계대명사 'who'가 정답입니다. (② whom은 목적격, ③ whose는 소유격, ④ which는 사물 선행사에 쓰임)",
        grammar_node_id: "RELATIVE_CLAUSE"
      };

      return NextResponse.json({
        success: true,
        isMock: true,
        data: mockResult,
        warning: "GEMINI_API_KEY가 없습니다. .env.local 파일에 GEMINI_API_KEY를 입력하면 진짜 제미나이 AI가 작동합니다!"
      });
    }

    // Base64 프리픽스 제거 (data:image/jpeg;base64, 등)
    let base64Data = image;
    if (image.includes("base64,")) {
      base64Data = image.split("base64,")[1];
    }

    // Google Gemini API Request Payload 구축
    const prompt = `너는 토익(TOEIC) 오답 복원 및 가공 전문가야. 이미지 속 수험생의 빨간 펜 채점 자국, 연필 밑줄, 필기 흔적은 화이트아웃 처럼 완벽히 무시해라. 오직 처음 인쇄되었을 원본 문항의 [영어 지문/본문, 1~4번 보기, 정답, 핵심 문법/독해 해설]만 깨끗하고 정확한 구조화된 JSON 데이터로 추출해야 해.

한국어 해설 블록은 절대로 길게 쓰지 말고, 정답인 이유와 오답인 이유를 핵심만 짚어 최대 2~3문장 이내로 콤팩트하게 요약해서 출력해라. 불필요한 수식어나 미사여구를 완전히 배제해라.
또한 해당 토익 지문 및 문제에서 수험생이 반드시 알아야 하는 핵심 빈출 어휘를 최소 3개에서 최대 5개까지 엄선하여 words 배열에 포함해라.

반드시 다음 JSON 스키마를 따르는 하나의 JSON 오브젝트만 반환해야 해. 마크다운 따옴표(\`\`\`) 등을 절대 사용하지 말고 순수 JSON 문자열로만 응답해라:
{
  "subject": "TOEIC Part 5 - 문법" 또는 "TOEIC Part 7 - 단문 독해" 또는 "비즈니스 - 토익" 또는 "TOEIC Vocabulary" 중 가장 어울리는 것 하나,
  "chapter": "문항 유형 (예: 전치사/접속사, 동사의 시제, 주격 관계대명사 등)",
  "passage": "문제의 배경이 되는 영문 지문 전체 (독해 지문이 없을 경우 빈 문자열)",
  "question": "실제 질문 내용 (예: 101. 빈칸에 알맞은 단어는?, What is the main purpose... 등)",
  "options": ["① 보기1", "② 보기2", "③ 보기3", "④ 보기4"],
  "correctAnswer": 정답 번호 (1~4 정수),
  "original_translation": "영어 지문 전체를 자연스럽게 번역한 완벽한 한글 해석",
  "fine_grained_concept": "토익/내신 빈출 초정밀 유형 코드 (예: 제안/요구 동사 뒤 should 생략 동사원형, 전치사 vs 접속사 구별, 감정 형용사의 분사 구별 등) 한국어 명칭",
  "aiHint": "★ 해설:\\n[문법 및 독해 해설 내용을 상세히 작성]",
  "grammar_node_id": "문법 오답의 원인이 되는 핵심 카테고리 ID. 다음 중 하나만 정확히 선택해라: [VERB_TENSE, VERB_AGREEMENT, VERB_VOICE, ADJ_ADV, RELATIVE_CLAUSE, PARTICIPLE, PREPOSITION, CONJUNCTION, NOUN_PRONOUN, ROOT]. 만약 문법 문제가 아니라면 null로 설정해라.",
  "words": [
    {
      "word": "영어 단어 원형 (예: implement)",
      "meanings": ["[동사] 타협하다", "[명사] 절충안"],
      "toeic_tip": "해당 단어의 시험용 짧은 팁 한 줄",
      "collocation": "토익 빈출 전치사/접속사 짝꿍 (예: comply with)",
      "paraphrasing": "시험 보기 변환 대비용 핵심 동의어 1~2개",
      "example_sentence": "유저가 업로드한 원본 지문에서 해당 단어가 포함된 문장을 그대로 추출한 것 (문장이 부적절할 경우 10단어 내외의 실전형 가상 토익 예문)",
      "example_translation": "해당 예문의 깔끔한 한글 번역",
      "tag": "추천 태그 (예: Part 5 빈출, 비즈니스 어휘 등)"
    }
  ]
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Response Error: ${response.status} - ${errorText}`);
    }

    const geminiData = await response.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("Gemini가 유효한 분석 텍스트를 반환하지 않았습니다.");
    }

    // JSON 파싱 수행
    let parsedResult;
    try {
      parsedResult = JSON.parse(generatedText.trim());
    } catch (parseErr) {
      console.error("Gemini 반환 텍스트 JSON 파싱 실패:", generatedText);
      throw new Error("Gemini의 응답을 JSON으로 변환하는 데 실패했습니다. 응답 텍스트: " + generatedText.substring(0, 100));
    }

    return NextResponse.json({
      success: true,
      isMock: false,
      data: parsedResult
    });

  } catch (err: any) {
    console.error("Gemini 비전 API 호출 에러:", err);
    return NextResponse.json(
      { error: err.message || "서버 내부 분석 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}
