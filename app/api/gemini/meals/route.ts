import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";

const MEAL_SYSTEM_PROMPT = `You are ZorabiHealth's clinical nutrition AI. 
Given a list of symptoms and active medications, suggest meal recommendations.
Return a JSON array of meal suggestions. Each suggestion must have:
- title: short name
- description: 1 sentence
- foods: array of recommended foods
- avoid: array of foods to avoid
- severity: "info", "warning", or "critical"

Return ONLY valid JSON, no markdown.`;

interface MealSuggestion {
  id: string;
  title: string;
  description: string;
  foods: string[];
  avoid: string[];
  severity: "info" | "warning" | "critical";
}

interface MealsRequestBody {
  symptoms?: string[];
  medications?: string[];
}

const fallbackSuggestions: MealSuggestion[] = [
  {
    id: "fallback-1",
    title: "Balanced Nutrition",
    description: "Focus on whole foods, lean proteins, and plenty of vegetables.",
    foods: ["Leafy greens", "Lean chicken", "Brown rice", "Berries", "Nuts"],
    avoid: ["Processed foods", "Excess sugar", "Fried items"],
    severity: "info",
  },
];

function parseSuggestions(text: string): MealSuggestion[] {
  try {
    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item: Record<string, unknown>, index: number) => ({
        id: `meal-${index + 1}`,
        title: String(item.title ?? ""),
        description: String(item.description ?? ""),
        foods: Array.isArray(item.foods) ? item.foods.map(String) : [],
        avoid: Array.isArray(item.avoid) ? item.avoid.map(String) : [],
        severity: (["info", "warning", "critical"].includes(String(item.severity))
          ? String(item.severity)
          : "info") as "info" | "warning" | "critical",
      }));
    }
  } catch {
    // fall through to fallback
  }
  return [
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

export async function POST(req: Request) {
  try {
    const body: MealsRequestBody = (await req.json()) as MealsRequestBody;
    const { symptoms = [], medications = [] } = body;

    if (!Array.isArray(symptoms) || !Array.isArray(medications)) {
      return NextResponse.json({ suggestions: fallbackSuggestions }, { status: 200 });
    }

    const result = await callGemini(
      `${MEAL_SYSTEM_PROMPT}\n\nSymptoms: ${JSON.stringify(symptoms)}\nActive medications: ${JSON.stringify(medications)}\n\nGenerate 2-3 meal suggestions:`,
      { model: "gemini-1.5-flash", maxTokens: 500 }
    );

    if (result.error || !result.text) {
      return NextResponse.json({ suggestions: fallbackSuggestions }, { status: 200 });
    }

    const suggestions = parseSuggestions(result.text);
    return NextResponse.json({ suggestions }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        suggestions: [
          {
            id: "error-1",
            title: "Basic Healthy Eating",
            description: "Stick to whole foods and stay hydrated.",
            foods: ["Fruits", "Vegetables", "Lean meats", "Water"],
            avoid: ["Junk food", "Sugary drinks"],
            severity: "info" as const,
          },
        ],
      },
      { status: 200 }
    );
  }
}
