import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { endpoint, device_id } = await req.json();
    if (!endpoint && !device_id) {
      return NextResponse.json({ error: "Provide endpoint or device_id" }, { status: 400 });
    }

    const admin = getAdminClient();

    const query = admin
      .from("notification_devices")
      .update({
        is_active: false,
        last_active_at: new Date().toISOString(),
      })
      .eq("user_id", auth.user.id);

    if (device_id) query.eq("id", device_id);
    else query.eq("push_endpoint", endpoint);

    const { error: updateError } = await query;
    if (updateError) {
      return NextResponse.json({ error: "Failed to unregister device" }, { status: 500 });
    }

    return NextResponse.json({ unregistered: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
