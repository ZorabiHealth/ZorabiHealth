import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `You are ZorabiHealth's "Diet Banner of the Day". Generate ONE diet/nutrition tip.

Rules:
- Output ONLY raw JSON — no markdown, no code fences, no backticks, no extra text.
- Format: {"emoji": "🍽️", "title": "Headline (max 8 words)", "description": "One sentence (max 15 words)"}
- Cover a different topic each day: meal prep, hydration, micronutrients, portion control, gut health, protein, healthy swaps, seasonal eating.
- Keep it practical, evidence-based, suitable for all fitness levels.
- Never give medical advice or specific calorie counts.`;

interface Banner {
  emoji: string;
  title: string;
  description: string;
}

const defaults: Banner[] = [
  {
    emoji: "🥗",
    title: "Fuel Your Day Right",
    description: "Start with a balanced breakfast — protein, fiber, and healthy fats.",
  },
  {
    emoji: "💧",
    title: "Hydration is Key",
    description: "Aim for 8 glasses of water daily to support metabolism.",
  },
  {
    emoji: "🥑",
    title: "Healthy Fat Fix",
    description: "Add avocado or nuts for sustained energy throughout the day.",
  },
  {
    emoji: "🌿",
    title: "Go Green",
    description: "Fill half your plate with colorful veggies at every meal.",
  },
  {
    emoji: "⏰",
    title: "Timing Matters",
    description: "Eat every 3-4 hours to keep energy and cravings in check.",
  },
  {
    emoji: "🐟",
    title: "Omega-3 Boost",
    description: "Add fatty fish or flaxseeds for brain and heart health.",
  },
  {
    emoji: "🥜",
    title: "Smart Snacking",
    description: "Choose nuts, seeds, or yogurt over processed snacks.",
  },
  {
    emoji: "🧂",
    title: "Watch the Sodium",
    description: "Season with herbs and spices instead of salt.",
  },
  {
    emoji: "🌾",
    title: "Go Whole Grain",
    description: "Swap white rice and bread for quinoa, oats, or brown rice.",
  },
  {
    emoji: "🍚",
    title: "Portion Control",
    description: "Use smaller plates to keep portions in check.",
  },
  {
    emoji: "🥤",
    title: "Skip the Sugar",
    description: "Replace soda with infused water or herbal tea.",
  },
  {
    emoji: "🍳",
    title: "Protein at Breakfast",
    description: "Eggs, Greek yogurt, or tofu keeps you full longer.",
  },
  {
    emoji: "🥦",
    title: "Eat the Rainbow",
    description: "Different colored veggies provide different nutrients.",
  },
  {
    emoji: "🫘",
    title: "Plant Protein",
    description: "Beans, lentils, and chickpeas are fiber-rich protein sources.",
  },
  {
    emoji: "🧊",
    title: "Meal Prep Sunday",
    description: "Prep ingredients ahead to make healthy weekdays easy.",
  },
  {
    emoji: "🍵",
    title: "Green Tea Boost",
    description: "Rich in antioxidants — swap one coffee for green tea.",
  },
  {
    emoji: "🫐",
    title: "Berry Good Choice",
    description: "Berries are packed with antioxidants and low in sugar.",
  },
  {
    emoji: "🥕",
    title: "Crunch Smart",
    description: "Dip carrot or cucumber sticks in hummus instead of chips.",
  },
  {
    emoji: "🧀",
    title: "Calcium Counts",
    description: "Include dairy or fortified plant milk for bone health.",
  },
  {
    emoji: "🌮",
    title: "Wrap It Right",
    description: "Use lettuce wraps or corn tortillas instead of flour.",
  },
];

function getDaySeed(): number {
  const start = new Date(new Date().getFullYear(), 0, 0).getTime();
  return Math.floor((Date.now() - start) / 86400000);
}

function getDefaultBanner(): Banner {
  return defaults[getDaySeed() % defaults.length];
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message: string | undefined = body?.message;

    if (!GEMINI_API_KEY) {
      return NextResponse.json(getDefaultBanner(), { headers: { "Cache-Control": "no-store" } });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const userPrompt = message?.trim()
      ? `Generate a diet banner tip related to: ${message}`
      : `Date: ${todayStr}. Generate a unique diet banner tip for today.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: { temperature: 1.0, maxOutputTokens: 150 },
        }),
        cache: "no-store",
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.warn("[Gemini API Error]", data?.error?.message || JSON.stringify(data));
      return NextResponse.json(getDefaultBanner());
    }

    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!raw) {
      console.warn("[Gemini] Empty response");
      return NextResponse.json(getDefaultBanner());
    }

    const parsed = tryParseJson(raw);
    if (parsed?.emoji && parsed?.title && parsed?.description) {
      return NextResponse.json(parsed, { headers: { "Cache-Control": "no-store" } });
    }

    console.warn("[Gemini] Parse failed for:", raw.slice(0, 300));
    return NextResponse.json(getDefaultBanner(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[Gemini Chat Error]", err);
    return NextResponse.json(getDefaultBanner(), { headers: { "Cache-Control": "no-store" } });
  }
}

function tryParseJson(text: string): Banner | null {
  try {
    const cleaned = text
      .replace(/```[a-z]*\s*/gi, "")
      .replace(/\s*```/g, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;

    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (!parsed || typeof parsed !== "object") return null;

    return {
      emoji: String(parsed.emoji ?? ""),
      title: String(parsed.title ?? ""),
      description: String(parsed.description ?? ""),
    };
  } catch {
    return null;
  }
}
