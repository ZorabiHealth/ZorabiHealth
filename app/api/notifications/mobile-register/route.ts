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
    const { transport, fcm_token, apns_token, platform, device_name, device_os, app_version } =
      body;

    if (!transport || !["web_push", "fcm", "apns"].includes(transport)) {
      return NextResponse.json(
        { error: "Invalid transport. Must be web_push, fcm, or apns" },
        { status: 400 }
      );
    }

    if (transport === "fcm" && !fcm_token) {
      return NextResponse.json(
        { error: "fcm_token is required for fcm transport" },
        { status: 400 }
      );
    }

    if (transport === "apns" && !apns_token) {
      return NextResponse.json(
        { error: "apns_token is required for apns transport" },
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

    // Check for existing device with same transport token
    let lookupField: string;
    let lookupValue: string;
    if (transport === "fcm") {
      lookupField = "fcm_token";
      lookupValue = fcm_token;
    } else if (transport === "apns") {
      lookupField = "apns_token";
      lookupValue = apns_token;
    } else {
      lookupField = "push_endpoint";
      lookupValue = body.push_endpoint;
    }

    const { data: existing } = await admin
      .from("notification_devices")
      .select("id")
      .eq("user_id", user.id)
      .eq(lookupField, lookupValue)
      .maybeSingle();

    const payload: Record<string, any> = {
      device_name: device_name || req.headers.get("User-Agent") || "Mobile App",
      device_os: device_os || null,
      app_version: app_version || null,
      transport,
      platform: platform || "android",
      is_active: true,
      last_active_at: new Date().toISOString(),
    };

    if (transport === "fcm") payload.fcm_token = fcm_token;
    else if (transport === "apns") payload.apns_token = apns_token;
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
