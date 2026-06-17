import type { PushDevice } from "./notifications";

interface PushPayload {
  title: string;
  body: string;
  data: Record<string, unknown>;
  category: string;
  priority: string;
}

interface SendResult {
  ok: boolean;
  statusCode?: number;
  error?: string;
}

export async function sendToDevice(device: PushDevice, payload: PushPayload): Promise<SendResult> {
  switch (device.transport) {
    case "web_push":
      return sendWebPush(device, payload);
    case "expo_push":
      return sendExpoPush(device, payload);
    default:
      return { ok: false, error: `Unknown transport: ${device.transport}` };
  }
}

async function sendWebPush(device: PushDevice, payload: PushPayload): Promise<SendResult> {
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidPrivateKey || !vapidPublicKey || !device.push_endpoint) {
    return { ok: false, error: "VAPID keys or push endpoint not configured" };
  }

  if (!device.push_keys?.p256dh || !device.push_keys?.auth) {
    return { ok: false, error: "Missing push keys" };
  }

  try {
    const webpush = await import("web-push");
    webpush.setVapidDetails(
      "mailto:notifications@zorabihealth.com",
      vapidPublicKey,
      vapidPrivateKey
    );

    const result = await webpush.sendNotification(
      {
        endpoint: device.push_endpoint,
        keys: { p256dh: device.push_keys.p256dh, auth: device.push_keys.auth },
      },
      JSON.stringify(payload),
      { TTL: 86400 }
    );

    return { ok: true, statusCode: result.statusCode };
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { ok: false, statusCode: err.statusCode, error: "Endpoint expired" };
    }
    return { ok: false, error: err.message || "Web push failed" };
  }
}

async function sendExpoPush(device: PushDevice, payload: PushPayload): Promise<SendResult> {
  if (!device.expo_push_token) {
    return { ok: false, error: "No Expo push token" };
  }

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: device.expo_push_token,
        title: payload.title,
        body: payload.body,
        data: {
          ...Object.fromEntries(Object.entries(payload.data).map(([k, v]) => [k, String(v)])),
          category: payload.category,
          priority: payload.priority,
        },
        channelId: `zorabihealth_${payload.category}`,
        priority:
          payload.priority === "critical" || payload.priority === "high" ? "high" : "normal",
      }),
    });

    const result = await response.json();
    if (result.data?.status === "error") {
      const errorMsg = result.data.message || "";
      if (errorMsg.includes("DeviceNotRegistered") || errorMsg.includes("InvalidCredentials")) {
        console.warn(`[ExpoPush] Token expired for device ${device.id}: ${errorMsg}`);
        return { ok: false, statusCode: 410, error: "DeviceNotRegistered" };
      }
      return { ok: false, statusCode: 400, error: errorMsg || "Expo push failed" };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Expo push request failed" };
  }
}

export async function deactivateExpiredToken(token: string): Promise<void> {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!serviceKey || !supabaseUrl) return;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    await admin
      .from("notification_devices")
      .update({ is_active: false, last_active_at: new Date().toISOString() })
      .eq("expo_push_token", token);

    console.log(`[ExpoPush] Deactivated expired token: ${token.slice(0, 16)}...`);
  } catch (e) {
    console.error("[ExpoPush] Failed to deactivate token:", e);
  }
}
