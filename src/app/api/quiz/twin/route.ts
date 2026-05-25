import { NextResponse } from "next/server";
import { getOrGenerateAIResponse } from "@/lib/ai_gateway";

export async function POST(request: Request) {
  try {
    const { originalNotes, grammarNodeId } = await request.json();

    if (!originalNotes || originalNotes.length === 0) {
      return NextResponse.json(
        { error: "원본 오답 노트 데이터가 누락되었습니다." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn("GEMINI_API_KEY가 설정되지 않았습니다. 데모 쌍둥이 문제를 반환합니다.");
      
      const mockResult = [
        {
          question: "The CEO ------- the new company policy during the annual meeting yesterday.",
          options: ["① announce", "② announced", "③ will announce", "④ is announcing"],
          correct_answer: 2,
          translation: "어제 연례 회의에서 CEO가 새로운 회사 정책을 발표했다.",
          explanation: "출제 공식 [시제]: 문장 끝에 명백한 과거 시점 부사 'yesterday'가 있으므로 과거 동사인 'announced'가 정답입니다."
        },
        {
          question: "All supervisors are required to ------- their shift reports before leaving the office.",
          options: ["① submits", "② submitted", "③ submit", "④ submitting"],
          correct_answer: 3,
          translation: "모든 관리자는 퇴근하기 전에 교대 근무 보고서를 제출해야 합니다.",
          explanation: "출제 공식 [동사원형]: 'be required to + 동사원형' 구문이므로 'submit'이 정답입니다."
        },
        {
          question: "The software update will be installed ------- the server maintenance window tonight.",
          options: ["① during", "② while", "③ when", "④ as"],
          correct_answer: 1,
          translation: "오늘 밤 서버 유지보수 시간 동안 소프트웨어 업데이트가 설치될 것입니다.",
          explanation: "출제 공식 [전치사 vs 접속사]: 뒤에 명사구(the server maintenance window)가 오므로 전치사인 'during'이 정답입니다."
        }
      ];

      // 인위적 지연 (로딩 UI 확인용) - 속도 개선을 위해 300ms로 단축
      await new Promise((resolve) => setTimeout(resolve, 300));

      return NextResponse.json({
        success: true,
        isMock: true,
        data: mockResult,
      });
    }

    const prompt = `원본 오답 데이터(Grammar Node: ${grammarNodeId}): ${JSON.stringify(originalNotes)}
위 문제의 출제 의도와 문법 구조를 완벽히 복제한 '새로운 토익 객관식 문제 3개'를 만들어줘.
반드시 아래 JSON 스키마를 따르는 순수 JSON 배열만 반환해:
[{"question": "빈칸 포함 문제문장","options": ["① 보기1", "② 보기2", "③ 보기3", "④ 보기4"],"correct_answer": 1,"translation": "문제의 빈칸을 정답으로 채워 완성된 문장을 자연스럽게 한글로 번역","explanation": "정답인 이유 짧게 1문장"}]`;

    const noteId = originalNotes[0]?.id || `unknown-${Date.now()}`;
    const parsedResult = await getOrGenerateAIResponse(noteId, "TWIN_QUIZ", prompt);

    return NextResponse.json({
      success: true,
      data: parsedResult
    });

  } catch (error: any) {
    console.error("Twin Quiz Generation Error:", error);
    return NextResponse.json(
      { error: error.message || "문제 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
