import { NextRequest, NextResponse } from "next/server";
import { getAiProvider } from "@/lib/ai/providers";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Auth check — prevent unauthenticated AI usage
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { doubt, topic, subject } = body;

    if (!doubt) {
      return NextResponse.json({ error: "Doubt is required" }, { status: 400 });
    }

    const prompt = `Explain this concept briefly for a student:
Doubt: "${doubt}"
Topic: ${topic || "General"}
Subject: ${subject || "General"}

Keep the explanation under 100 words. Be clear, concise, and helpful. Use simple language.`;

    try {
      const provider = getAiProvider();
      const response = await provider.generateSuggestions(prompt);
      const cleaned = response.replace(/^["']|["']$/g, "").trim();
      return NextResponse.json({ explanation: cleaned });
    } catch {
      return NextResponse.json({
        explanation: `This concept relates to ${topic || "your subject"}. Try reviewing your class notes on this topic, or search for "${doubt}" in your textbook for a detailed explanation.`
      });
    }
  } catch {
    return NextResponse.json({ explanation: "Unable to generate explanation right now. Try again later." });
  }
}

