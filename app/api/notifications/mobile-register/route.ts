import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const user = auth.user;

    const body = await req.json();
    const { transport, expo_push_token, platform, device_name, device_os, app_version } = body;

    if (!transport || !["web_push", "expo_push"].includes(transport)) {
      return NextResponse.json(
        { error: "Invalid transport. Must be web_push or expo_push" },
        { status: 400 }
      );
    }

    if (transport === "expo_push" && !expo_push_token) {
      return NextResponse.json(
        { error: "expo_push_token is required for expo_push transport" },
        { status: 400 }
      );
    }

    if (transport === "web_push" && !body.push_endpoint) {
      return NextResponse.json(
        { error: "push_endpoint is required for web_push transport" },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    const lookupField = transport === "web_push" ? "push_endpoint" : "expo_push_token";
    const lookupValue = transport === "web_push" ? body.push_endpoint : expo_push_token;

    const { data: existing } = await admin
      .from("notification_devices")
      .select("id")
      .eq("user_id", user.id)
      .eq(lookupField, lookupValue)
      .maybeSingle();

    const payload: Record<string, string | null | boolean | Record<string, unknown>> = {
      device_name: device_name || req.headers.get("User-Agent") || "Mobile App",
      device_os: device_os || null,
      app_version: app_version || null,
      transport,
      platform: platform || "android",
      is_active: true,
      last_active_at: new Date().toISOString(),
    };

    if (transport === "expo_push") payload.expo_push_token = expo_push_token;
    else {
      payload.push_endpoint = body.push_endpoint;
      payload.push_keys = body.push_keys || {};
    }

    if (existing) {
      await admin.from("notification_devices").update(payload).eq("id", existing.id);
      return NextResponse.json({ device_id: existing.id, registered: true, updated: true });
    }

    payload.user_id = user.id;

    const { data: inserted, error: insertError } = await admin
      .from("notification_devices")
      .insert(payload)
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
