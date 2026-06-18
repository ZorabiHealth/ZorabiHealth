import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import type { GeminiResponse } from "@/types";

const apiKey = process.env.GEMINI_API_KEY;

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

interface GeminiOptions {
  model?: string;
  maxTokens?: number;
}

export async function callGemini(
  prompt: string,
  options: GeminiOptions = {}
): Promise<GeminiResponse> {
  if (!genAI) {
    return { text: null, error: "GEMINI_API_KEY is not set in environment variables" };
  }

  try {
    const model: GenerativeModel = genAI.getGenerativeModel({
      model: options.model ?? "gemini-1.5-flash",
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
