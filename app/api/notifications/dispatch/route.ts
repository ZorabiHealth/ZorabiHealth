import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { sendToDevice } from "@/lib/notifications-transport";
import type { PushDevice } from "@/lib/notifications";

export const dynamic = "force-dynamic";

function verifyCronAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret && !process.env.VERCEL) return true; // dev mode: allow
  const header = req.headers.get("x-vercel-cron") || req.headers.get("x-cron-secret") || "";
  if (header === "true" && cronSecret) return true;
  if (cronSecret && header === cronSecret) return true;
  if (cronSecret) {
    const signature = req.headers.get("x-cron-signature") || "";
    const expected = crypto.createHmac("sha256", cronSecret).update(req.url).digest("hex");
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ dispatched: 0, error: "Unauthorized" }, { status: 401 });
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!serviceKey) {
    return NextResponse.json({ dispatched: 0, error: "No service role key" });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Fetch unscheduled notifications AND past-due scheduled ones
  const now = new Date().toISOString();
  const { data: pendingNotifications, error: fetchError } = await admin
    .from("notifications")
    .select(
      "id, user_id, title, body, data, category, priority, sent_via, expires_at, scheduled_for"
    )
    .or(`scheduled_for.is.null,scheduled_for.lte.${now}`);

  if (fetchError) {
    return NextResponse.json({ dispatched: 0, error: fetchError.message });
  }

  if (!pendingNotifications || pendingNotifications.length === 0) {
    return NextResponse.json({ dispatched: 0 });
  }

  let totalDispatched = 0;

  for (const notif of pendingNotifications) {
    if (notif.expires_at && new Date(notif.expires_at) < new Date()) {
      continue;
    }

    // Skip if already sent via all available transports
    const sent = notif.sent_via || [];
    if (sent.includes("expo_push") && sent.includes("web_push")) {
      continue;
    }

    // Direct devices (web push, Expo push)
    const { data: directDevices } = await admin
      .from("notification_devices")
      .select("*")
      .eq("user_id", notif.user_id)
      .eq("is_active", true);

    // Also find devices linked via user_pairings (cross-account pairing)
    const { data: pairings } = await admin
      .from("user_pairings")
      .select("mobile_user_id")
      .eq("web_user_id", notif.user_id)
      .eq("is_active", true);

    const pairedUserIds = (pairings || []).map((p) => p.mobile_user_id);
    let pairedDeviceRows: any[] = [];
    if (pairedUserIds.length > 0) {
      const { data: pd } = await admin
        .from("notification_devices")
        .select("*")
        .in("user_id", pairedUserIds)
        .eq("is_active", true);
      pairedDeviceRows = pd || [];
    }

    // Merge and deduplicate by id
    const deviceMap = new Map<string, PushDevice>();
    for (const d of (directDevices || []) as PushDevice[]) deviceMap.set(d.id, d);
    for (const d of (pairedDeviceRows || []) as PushDevice[]) deviceMap.set(d.id, d);
    const devices = Array.from(deviceMap.values());

    if (!devices || devices.length === 0) continue;

    const sentTransports = new Set<string>(
      Array.isArray(notif.sent_via) ? notif.sent_via.filter(Boolean) : []
    );

    for (const device of devices as PushDevice[]) {
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

      const result = await sendToDevice(device, {
        title: notif.title,
        body: notif.body,
        data: (notif.data || {}) as Record<string, unknown>,
        category: notif.category,
        priority: notif.priority,
      });

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
        const finalStatus = failedCount >= 3 ? "failed" : "failed_retryable";

        await admin.from("notification_delivery").upsert(
          {
            notification_id: notif.id,
            device_id: device.id,
            transport: device.transport,
            status: finalStatus,
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

  return NextResponse.json({ dispatched: totalDispatched });
}
