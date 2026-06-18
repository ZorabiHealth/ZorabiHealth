import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const user = auth.user;

    const { endpoint, keys, platform } = await req.json();
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Missing push subscription fields" }, { status: 400 });
    }

    const deviceName = req.headers.get("User-Agent") || "Unknown";

    const admin = getAdminClient();

    const { data: existing } = await admin
      .from("notification_devices")
      .select("id")
      .eq("user_id", user.id)
      .eq("push_endpoint", endpoint)
      .maybeSingle();

    if (existing) {
      await admin
        .from("notification_devices")
        .update({
          transport: "web_push",
          push_keys: keys,
          device_name: deviceName,
          platform: platform || "web",
          is_active: true,
          last_active_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      return NextResponse.json({ device_id: existing.id, registered: true, updated: true });
    }

    const { data: inserted, error: insertError } = await admin
      .from("notification_devices")
      .insert({
        user_id: user.id,
        transport: "web_push",
        device_name: deviceName,
        platform: platform || "web",
        push_endpoint: endpoint,
        push_keys: keys,
        is_active: true,
        last_active_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Failed to register device" }, { status: 500 });
    }

    return NextResponse.json({ device_id: inserted.id, registered: true, updated: false });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
