import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const admin = getAdminClient();
    const mobileUserId = auth.user.id;

    const { data: updated, error } = await admin
      .from("user_pairings")
      .update({ is_active: false })
      .eq("mobile_user_id", mobileUserId)
      .eq("is_active", true)
      .select("id");

    if (error) {
      return NextResponse.json({ error: "Failed to unpair" }, { status: 500 });
    }

    return NextResponse.json({ unpaired: true, count: updated?.length || 0 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
