import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_SUB = "mailto:notifications@zorabihealth.com";

interface PushDevice {
  id: string;
  user_id: string;
  device_name: string;
  platform: string;
  transport: string;
  push_endpoint: string | null;
  push_keys: { p256dh: string; auth: string } | null;
  expo_push_token: string | null;
  is_active: boolean;
  last_active_at: string;
  created_at: string;
}

interface SendResult {
  ok: boolean;
  statusCode?: number;
  error?: string;
}

interface Notif {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  category: string;
  priority: string;
  sent_via: string[];
  expires_at: string | null;
  scheduled_for: string | null;
}

interface PushPayload {
  title: string;
  body: string;
  data: Record<string, unknown>;
  category: string;
  priority: string;
}

async function sendWebPush(
  device: PushDevice,
  vapidPrivateKey: string,
  vapidPublicKey: string,
  payload: PushPayload
): Promise<SendResult> {
  if (!device.push_endpoint) {
    return { ok: false, error: "No push endpoint" };
  }

  if (!device.push_keys?.p256dh || !device.push_keys?.auth) {
    return { ok: false, error: "Missing push keys" };
  }

  try {
    webpush.setVapidDetails(VAPID_SUB, vapidPublicKey, vapidPrivateKey);
    const result = await webpush.sendNotification(
      {
        endpoint: device.push_endpoint,
        keys: {
          p256dh: device.push_keys.p256dh,
          auth: device.push_keys.auth,
        },
      },
      JSON.stringify(payload),
      { TTL: 86400 }
    );

    return { ok: true, statusCode: result.statusCode };
  } catch (err) {
    const pushError = err as { statusCode?: number; message?: string };
    if (pushError.statusCode === 410 || pushError.statusCode === 404) {
      return { ok: false, statusCode: pushError.statusCode, error: "Endpoint expired" };
    }
    return {
      ok: false,
      error: pushError.message || "Web push request failed",
    };
  }
}

async function sendExpoPush(
  device: PushDevice,
  title: string,
  body: string,
  data: Record<string, unknown>,
  category: string,
  priority: string
): Promise<SendResult> {
  if (!device.expo_push_token) {
    return { ok: false, error: "No Expo push token" };
  }

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: device.expo_push_token,
        title,
        body,
        data: {
          ...Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, String(v)])),
          category,
          priority,
        },
        channelId: `zorabihealth_${category}`,
        priority: priority === "critical" || priority === "high" ? "high" : "normal",
      }),
    });

    const result = await response.json();
    if (result.data?.status === "error") {
      const errorMsg = result.data.message || "";
      if (errorMsg.includes("DeviceNotRegistered") || errorMsg.includes("InvalidCredentials")) {
        return { ok: false, statusCode: 410, error: "DeviceNotRegistered" };
      }
      return { ok: false, statusCode: 400, error: errorMsg || "Expo push failed" };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Expo push request failed" };
  }
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidPublicKey = Deno.env.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ dispatched: 0, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  if (!vapidPrivateKey || !vapidPublicKey) {
    return new Response(JSON.stringify({ dispatched: 0, error: "Missing VAPID keys" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date().toISOString();
  const { data: pendingNotifications, error: fetchError } = await admin
    .from("notifications")
    .select(
      "id, user_id, title, body, data, category, priority, sent_via, expires_at, scheduled_for"
    )
    .or(`scheduled_for.is.null,scheduled_for.lte.${now}`);

  if (fetchError) {
    console.error("[Dispatch] Failed to fetch notifications:", fetchError);
    return new Response(JSON.stringify({ dispatched: 0, error: fetchError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!pendingNotifications || pendingNotifications.length === 0) {
    return new Response(JSON.stringify({ dispatched: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  let totalDispatched = 0;

  for (const notif of pendingNotifications as Notif[]) {
    if (notif.expires_at && new Date(notif.expires_at) < new Date()) continue;

    const sent = notif.sent_via || [];
    if (Array.isArray(sent) && sent.includes("expo_push") && sent.includes("web_push")) continue;

    const { data: directDevices } = await admin
      .from("notification_devices")
      .select("*")
      .eq("user_id", notif.user_id)
      .eq("is_active", true);

    const { data: pairings } = await admin
      .from("user_pairings")
      .select("mobile_user_id")
      .eq("web_user_id", notif.user_id)
      .eq("is_active", true);

    const pairedUserIds = (pairings || []).map((p: { mobile_user_id: string }) => p.mobile_user_id);
    let pairedDeviceRows: PushDevice[] = [];
    if (pairedUserIds.length > 0) {
      const { data: pd } = await admin
        .from("notification_devices")
        .select("*")
        .in("user_id", pairedUserIds)
        .eq("is_active", true);
      pairedDeviceRows = (pd || []) as PushDevice[];
    }

    const deviceMap = new Map<string, PushDevice>();
    for (const d of (directDevices || []) as PushDevice[]) deviceMap.set(d.id, d);
    for (const d of pairedDeviceRows) deviceMap.set(d.id, d);
    const devices = Array.from(deviceMap.values());
    if (devices.length === 0) continue;

    const sentTransports = new Set<string>(
      Array.isArray(notif.sent_via) ? notif.sent_via.filter(Boolean) : []
    );
    const payload = {
      title: notif.title,
      body: notif.body,
      data: (notif.data || {}) as Record<string, unknown>,
      category: notif.category,
      priority: notif.priority,
    };

    for (const device of devices) {
      const { data: existingDelivery } = await admin
        .from("notification_delivery")
        .select("id, status, retry_count")
        .eq("notification_id", notif.id)
        .eq("device_id", device.id)
        .eq("transport", device.transport)
        .maybeSingle();

      if (existingDelivery && ["sent", "delivered", "clicked"].includes(existingDelivery.status)) {
        sentTransports.add(device.transport);
        continue;
      }

      let result: SendResult;
      if (device.transport === "web_push") {
        result = await sendWebPush(device, vapidPrivateKey, vapidPublicKey, payload);
      } else if (device.transport === "expo_push") {
        result = await sendExpoPush(
          device,
          notif.title,
          notif.body,
          payload.data,
          notif.category,
          notif.priority
        );
      } else {
        result = { ok: false, error: `Unknown transport: ${device.transport}` };
      }

      if (result.ok) {
        await admin.from("notification_delivery").upsert(
          {
            notification_id: notif.id,
            device_id: device.id,
            transport: device.transport,
            status: "sent",
            sent_at: new Date().toISOString(),
          },
          { onConflict: "notification_id,device_id,transport" }
        );
        sentTransports.add(device.transport);
        totalDispatched++;
      } else if (result.statusCode === 410 || result.statusCode === 404) {
        console.warn(`[Dispatch] Expired device ${device.id} for notification ${notif.id}`);
        await admin
          .from("notification_devices")
          .update({ is_active: false, last_active_at: new Date().toISOString() })
          .eq("id", device.id);
        await admin.from("notification_delivery").upsert(
          {
            notification_id: notif.id,
            device_id: device.id,
            transport: device.transport,
            status: "failed",
            error_message: result.error || "Endpoint expired",
            sent_at: new Date().toISOString(),
          },
          { onConflict: "notification_id,device_id,transport" }
        );
      } else {
        const prevRetryCount = existingDelivery?.retry_count ?? 0;
        const failedCount = prevRetryCount + 1;
        console.error(
          `[Dispatch] Failed notification ${notif.id} device ${device.id} (${device.transport}): ${result.error || "Unknown error"}`
        );
        await admin.from("notification_delivery").upsert(
          {
            notification_id: notif.id,
            device_id: device.id,
            transport: device.transport,
            status: failedCount >= 3 ? "failed" : "failed_retryable",
            error_message: result.error || "Unknown error",
            retry_count: failedCount,
            sent_at: new Date().toISOString(),
          },
          { onConflict: "notification_id,device_id,transport" }
        );
      }
    }

    if (sentTransports.size > 0) {
      await admin.rpc("append_notification_sent_via", {
        p_notification_id: notif.id,
        p_transports: Array.from(sentTransports),
      });
    }
  }

  return new Response(JSON.stringify({ dispatched: totalDispatched }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
