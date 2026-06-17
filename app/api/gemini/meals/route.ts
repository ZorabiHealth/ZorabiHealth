import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MEAL_SYSTEM_PROMPT = `You are ZorabiHealth's clinical nutrition AI. 
Given a list of symptoms and active medications, suggest meal recommendations.
Return a JSON array of meal suggestions. Each suggestion must have:
- title: short name
- description: 1 sentence
- foods: array of recommended foods
- avoid: array of foods to avoid
- severity: "info", "warning", or "critical"

Return ONLY valid JSON, no markdown.`;

export async function POST(req: Request) {
  try {
    const { symptoms, medications } = await req.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        suggestions: [
          {
            id: "fallback-1",
            title: "Balanced Nutrition",
            description: "Focus on whole foods, lean proteins, and plenty of vegetables.",
            foods: ["Leafy greens", "Lean chicken", "Brown rice", "Berries", "Nuts"],
            avoid: ["Processed foods", "Excess sugar", "Fried items"],
            severity: "info",
          },
        ],
      });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${MEAL_SYSTEM_PROMPT}\n\nSymptoms: ${JSON.stringify(symptoms)}\nActive medications: ${JSON.stringify(medications)}\n\nGenerate 2-3 meal suggestions:`,
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
        }),
      }
    );

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    let suggestions;
    try {
      suggestions = JSON.parse(cleaned);
    } catch {
      suggestions = [
        {
          id: "parse-1",
          title: "Balanced Meal Plan",
          description: "Prioritise whole foods and adequate hydration.",
          foods: ["Vegetables", "Lean protein", "Whole grains"],
          avoid: ["Processed sugar", "Excess sodium"],
          severity: "info",
        },
      ];
    }

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[Gemini Meals Error]", err);
    return NextResponse.json(
      {
        suggestions: [
          {
            id: "error-1",
            title: "Basic Healthy Eating",
            description: "Stick to whole foods and stay hydrated.",
            foods: ["Fruits", "Vegetables", "Lean meats", "Water"],
            avoid: ["Junk food", "Sugary drinks"],
            severity: "info",
          },
        ],
      },
      { status: 200 }
    );
  }
}
