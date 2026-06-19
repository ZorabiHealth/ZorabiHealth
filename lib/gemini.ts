import type { GeminiResponse } from "@/types";
import fs from "fs";
import path from "path";

// Dynamically load .env.local at runtime if the process was started before it was added
if (!process.env.GROQ_API_KEY) {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      content.split("\n").forEach((line) => {
        const parts = line.split("=");
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join("=").trim();
          if (key === "GROQ_API_KEY") {
            process.env.GROQ_API_KEY = val;
          }
        }
      });
    }
  } catch (e) {
    console.error("Failed to load .env.local dynamically:", e);
  }
}

interface GeminiOptions {
  model?: string;
  maxTokens?: number;
}

export async function callGemini(
  prompt: string,
  options: GeminiOptions = {}
): Promise<GeminiResponse> {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const isJsonRequested = prompt.toLowerCase().includes("json");
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: options.maxTokens ?? 1024,
          temperature: 0.1,
          response_format: isJsonRequested ? { type: "json_object" } : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      return { text, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown Groq error";
      return { text: null, error: message };
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      text: null,
      error: "Neither GROQ_API_KEY nor GEMINI_API_KEY is set in environment variables",
    };
  }

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: options.model ?? "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: options.maxTokens ?? 1024,
      },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return { text, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Gemini error";
    return { text: null, error: message };
  }
}
