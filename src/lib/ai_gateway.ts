import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type AIResponseType = "HINT" | "TWIN_QUIZ";

/**
 * 실시간 AI 해설/쌍둥이 문제를 생성하고 캐싱하는 독립형 게이트웨이
 */
export async function getOrGenerateAIResponse(
  wordId: string,
  responseType: AIResponseType,
  prompt: string
) {
  // Step 1: 캐시 확인 (Supabase가 설정되어 있을 때만)
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: cached, error } = await supabase
        .from("cached_ai_responses")
        .select("*")
        .eq("word_id", wordId)
        .eq("response_type", responseType)
        .maybeSingle();

      if (!error && cached && cached.response_text) {
        // Step 2: 캐시 히트 - AI 호출 없이 즉시 반환 (비용 0원)
        console.log(`[AI Cache Hit] wordId: ${wordId}, type: ${responseType}`);
        return cached.response_text;
      }
    } catch (cacheError) {
      console.warn("캐시 조회 중 오류 발생, 새 응답을 생성합니다:", cacheError);
    }
  }

  console.log(`[AI Cache Miss] Generating new ${responseType} for wordId: ${wordId}...`);

  // Step 3: 캐시 미스 & AI 호출 (Google Gemini API)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API Error:", errorText);
    throw new Error(`Gemini API Error: ${response.statusText}`);
  }

  const data = await response.json();
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!generatedText) {
    throw new Error("Gemini API가 유효한 텍스트를 반환하지 않았습니다.");
  }

  let parsedResult;
  try {
    parsedResult = JSON.parse(generatedText.trim());
  } catch (e) {
    console.error("JSON Parsing Error:", generatedText);
    throw new Error("반환된 데이터가 올바른 JSON 형식이 아닙니다.");
  }

  // Step 4: 캐시 저장 (새로 생성한 따끈따끈한 응답을 DB에 Insert)
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from("cached_ai_responses")
        .insert({
          word_id: wordId,
          response_type: responseType,
          response_text: parsedResult,
        });
      console.log(`[AI Cache Saved] wordId: ${wordId}, type: ${responseType}`);
    } catch (saveError) {
      console.error("AI 응답 캐싱 저장 실패 (동작에는 문제 없음):", saveError);
    }
  }

  return parsedResult;
}
