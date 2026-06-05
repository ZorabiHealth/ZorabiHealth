import { NextRequest, NextResponse } from "next/server";
import { DeepgramClient } from "@deepgram/sdk";

// GET /api/deepgram/token
// Returns a short-lived Deepgram API key for browser-side WebSocket connections.
export async function GET(req: NextRequest) {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Deepgram API key not configured. Add DEEPGRAM_API_KEY to .env.local" },
      { status: 500 }
    );
  }

  try {
    const client = new DeepgramClient({ apiKey });

    // List projects to get the first project ID
    const projectsResponse = await client.manage.v1.projects.list();
    const projectId = projectsResponse?.projects?.[0]?.project_id;

    if (!projectId) {
      // Fallback: return the main key (acceptable for dev)
      return NextResponse.json({ key: apiKey, type: "fallback" });
    }

    // Create a scoped short-lived API key (1-hour TTL)
    const keyResponse = await client.manage.v1.projects.keys.create(projectId, {
      comment: "zorabihealth-browser-temp",
      scopes: ["usage:write"],
      time_to_live_in_seconds: 3600,
    });

    if (!keyResponse?.key) {
      return NextResponse.json({ key: apiKey, type: "fallback" });
    }

    return NextResponse.json({
      key: keyResponse.key,
      type: "temporary",
      expiresIn: 3600,
    });
  } catch (error: unknown) {
    console.error("Deepgram token error:", error);
    return NextResponse.json({ key: apiKey, type: "fallback" });
  }
}
