import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const admin = getAdminClient();
    const userId = auth.user.id;

    const { data: existing } = await admin
      .from("user_pairings")
      .select("id")
      .eq("web_user_id", userId)
      .eq("mobile_user_id", userId)
      .maybeSingle();

    if (existing) {
      await admin.from("user_pairings").update({ is_active: true }).eq("id", existing.id);
      return NextResponse.json({ pairing_id: existing.id, paired: true });
    }

    const { data: inserted, error: insertError } = await admin
      .from("user_pairings")
      .insert({
        web_user_id: userId,
        mobile_user_id: userId,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json({ error: "Failed to create pairing" }, { status: 500 });
    }

    return NextResponse.json({ pairing_id: inserted.id, paired: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
