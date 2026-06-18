import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const admin = getAdminClient();

    const { data: pairings, error } = await admin
      .from("user_pairings")
      .select("id, is_active, paired_at, web_user_id, mobile_user_id, device_name")
      .eq("web_user_id", auth.user.id)
      .order("paired_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch pairings", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      devices: (pairings || []).map((p) => ({
        id: p.id,
        device_name:
          p.device_name || (p.web_user_id === p.mobile_user_id ? "Same Account" : "Paired Device"),
        platform: "android",
        is_active: p.is_active,
        last_active_at: p.paired_at,
        paired_at: p.paired_at,
        is_same_account: p.web_user_id === p.mobile_user_id,
      })),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
