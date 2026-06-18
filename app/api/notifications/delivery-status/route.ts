import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { notification_id, status } = body;

    if (!notification_id || !["delivered", "clicked"].includes(status)) {
      return NextResponse.json(
        { error: "notification_id and status (delivered|clicked) required" },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    const field = status === "clicked" ? "clicked_at" : "delivered_at";

    const { error: updateError } = await admin
      .from("notification_delivery")
      .update({
        status,
        [field]: new Date().toISOString(),
      })
      .eq("notification_id", notification_id)
      .eq("status", "sent");

    if (updateError) {
      return NextResponse.json({ error: "Failed to update delivery status" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
