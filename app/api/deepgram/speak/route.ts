import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify user authentication
    const auth = await verifyAuth(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const text = body.text;
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Deepgram API key not configured" }, { status: 500 });
    }

    // 3. Request speech synthesis from Deepgram Aura
    const deepgramResponse = await fetch(
      "https://api.deepgram.com/v1/speak?model=aura-asteria-en",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      }
    );

    if (!deepgramResponse.ok) {
      const errText = await deepgramResponse.text().catch(() => "");
      return NextResponse.json(
        { error: `Deepgram TTS error: ${deepgramResponse.status} - ${errText}` },
        { status: deepgramResponse.status }
      );
    }

    // 4. Return the audio stream back to the client
    const audioBuffer = await deepgramResponse.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
