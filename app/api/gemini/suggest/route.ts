import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { message, symptoms, workout, calories } = await request.json();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ reply: "Gemini API key not configured." });
  }

  const systemContext = `You are a clinical fitness and nutrition assistant inside ZorabiHealth, a health dashboard app. 
Be concise (2-3 sentences max). Be specific and actionable.
User context: symptoms="${symptoms || "none"}", last workout="${workout || "none"}", calories burned today=${calories || 0} kcal.`;

  const prompt = `${systemContext}\n\nUser: ${message}`;

  try {
    const res = await fetch(
     `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
    const data = await res.json();
    console.log("[Gemini RAW]", JSON.stringify(data));
const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Stay hydrated and keep moving today.";
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ reply: "Stay hydrated and keep moving today." });
  }
}