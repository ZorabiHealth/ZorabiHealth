import { NextResponse } from "next/server";

// GET /api/deepgram/token
// Returns the Deepgram API key for browser-side WebSocket connections.
export async function GET() {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Deepgram API key not configured" }, { status: 500 });
  }

  return NextResponse.json({ key: apiKey });
}
