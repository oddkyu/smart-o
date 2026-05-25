import { NextResponse } from "next/server";
import { getOrGenerateAIResponse, AIResponseType } from "@/lib/ai_gateway";

export async function POST(request: Request) {
  try {
    const { wordId, responseType, prompt } = await request.json();

    if (!wordId || !responseType || !prompt) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const aiResponse = await getOrGenerateAIResponse(
      wordId,
      responseType as AIResponseType,
      prompt
    );

    return NextResponse.json({ success: true, data: aiResponse });
  } catch (error: any) {
    console.error("AI Gateway Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate AI response" },
      { status: 500 }
    );
  }
}
