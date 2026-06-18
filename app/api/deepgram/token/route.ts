import { NextRequest, NextResponse } from "next/server";
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

  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabase = createClient(supabaseUrl, anonKey);

  const { data: tokenData, error: tokenError } = await supabase.functions.invoke("deepgram-token", {
    body: { userId: auth.user.id },
  });

  if (tokenError || !tokenData?.token) {
    return NextResponse.json({ error: "Failed to generate Deepgram token" }, { status: 500 });
  }

  return NextResponse.json({ key: tokenData.token });
}
