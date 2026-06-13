import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { code, device_name } = await req.json();
    if (!code) {
      return NextResponse.json({ error: "Missing pairing code" }, { status: 400 });
    }

    const admin = getAdminClient();
    const normalizedCode = code.trim().toUpperCase();

    const { data: pairing, error: lookupError } = await admin
      .from("pairing_codes")
      .select("id, user_id, expires_at, claimed_at")
      .eq("code", normalizedCode)
      .single();

    if (lookupError || !pairing) {
      return NextResponse.json({ error: "Invalid pairing code" }, { status: 404 });
    }

    if (pairing.claimed_at) {
      return NextResponse.json({ error: "Pairing code already used" }, { status: 409 });
    }

    if (new Date(pairing.expires_at) < new Date()) {
      return NextResponse.json({ error: "Pairing code has expired" }, { status: 410 });
    }

    const webUserId = pairing.user_id;
    const mobileUserId = auth.user.id;

    const { data: existing } = await admin
      .from("user_pairings")
      .select("id")
      .eq("web_user_id", webUserId)
      .eq("mobile_user_id", mobileUserId)
      .maybeSingle();

    if (existing) {
      await admin
        .from("user_pairings")
        .update({ is_active: true, device_name: device_name || "Mobile Device" })
        .eq("id", existing.id);

      await admin
        .from("pairing_codes")
        .update({ claimed_at: new Date().toISOString() })
        .eq("id", pairing.id);

      return NextResponse.json({ paired: true, pairing_id: existing.id });
    }

    const { data: inserted, error: insertError } = await admin
      .from("user_pairings")
      .insert({
        web_user_id: webUserId,
        mobile_user_id: mobileUserId,
        device_name: device_name || "Mobile Device",
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json({ error: "Failed to create pairing" }, { status: 500 });
    }

    await admin
      .from("pairing_codes")
      .update({ claimed_at: new Date().toISOString() })
      .eq("id", pairing.id);

    return NextResponse.json({ paired: true, pairing_id: inserted.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
