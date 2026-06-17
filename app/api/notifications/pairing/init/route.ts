import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const admin = getAdminClient();
    let code = "";
    let attempts = 0;
    while (attempts < 5) {
      code = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
      const { data: existing } = await admin
        .from("pairing_codes")
        .select("id")
        .eq("code", code)
        .is("claimed_at", null)
        .maybeSingle();
      if (!existing) break;
      attempts++;
    }
    if (attempts >= 5) {
      return NextResponse.json({ error: "Failed to generate unique code" }, { status: 500 });
    }

    await admin.from("pairing_codes").insert({
      code,
      user_id: auth.user.id,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    return NextResponse.json({ code, expires_in: 600 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
