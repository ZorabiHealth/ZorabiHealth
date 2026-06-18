import { NextRequest, NextResponse } from "next/server";
import { DeepgramClient } from "@deepgram/sdk";
import { verifyAuth } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Deepgram API key not configured" }, { status: 500 });
  }

  try {
    const deepgram = new DeepgramClient({ apiKey });
    const tokenResponse = await deepgram.auth.v1.tokens.grant({ ttl_seconds: 300 });

    return NextResponse.json({
      key: tokenResponse.access_token,
      expiresIn: tokenResponse.expires_in ?? 300,
    });
  } catch (error) {
    console.error("[Deepgram Token] Failed to create access token:", error);
    return NextResponse.json({ error: "Failed to generate Deepgram token" }, { status: 500 });
  }
}
