import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getAdminClient } from "@/lib/auth-utils";
import { sendToDevice } from "@/lib/notifications-transport";
import type { PushDevice } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { user_id, title, body: messageBody, category, priority, data } = body;

    if (!title || !messageBody) {
      return NextResponse.json({ error: "title and body are required" }, { status: 400 });
    }

    const targetUserId = user_id || auth.user.id;

    const admin = getAdminClient();

    const { data: notification, error: insertError } = await admin
      .from("notifications")
      .insert({
        user_id: targetUserId,
        title,
        body: messageBody,
        data: data || {},
        category: category || "system",
        priority: priority || "normal",
      })
      .select("id, user_id, title, body, data, category, priority, sent_via, expires_at")
      .single();

    if (insertError || !notification) {
      console.error("[Send] Insert error:", insertError);
      return NextResponse.json(
        {
          error: "Failed to create notification",
          detail: insertError?.message || insertError?.hint || "Unknown error",
        },
        { status: 500 }
      );
    }

    let dispatched = 0;
    let deliveryError: string | null = null;

    // Direct devices (web push, Expo push)
    const { data: directDevices } = await admin
      .from("notification_devices")
      .select("*")
      .eq("user_id", targetUserId)
      .eq("is_active", true);

    // Also find devices linked via user_pairings (cross-account pairing)
    const { data: pairings } = await admin
      .from("user_pairings")
      .select("mobile_user_id")
      .eq("web_user_id", targetUserId)
      .eq("is_active", true);

    const pairedUserIds = (pairings || []).map((p) => p.mobile_user_id);
    let pairedDevices: any[] = [];
    if (pairedUserIds.length > 0) {
      const { data: pd } = await admin
        .from("notification_devices")
        .select("*")
        .in("user_id", pairedUserIds)
        .eq("is_active", true);
      pairedDevices = pd || [];
    }

    // Merge and deduplicate by id
    const deviceMap = new Map<string, PushDevice>();
    for (const d of (directDevices || []) as PushDevice[]) deviceMap.set(d.id, d);
    for (const d of (pairedDevices || []) as PushDevice[]) deviceMap.set(d.id, d);
    const devices = Array.from(deviceMap.values());

    if (devices && devices.length > 0) {
      const sentTransports = new Set<string>();

      for (const device of devices as PushDevice[]) {
        const result = await sendToDevice(device, {
          title: notification.title,
          body: notification.body,
          data: (notification.data || {}) as Record<string, unknown>,
          category: notification.category,
          priority: notification.priority,
        });

        try {
          if (result.ok) {
            await admin.from("notification_delivery").upsert(
              {
                notification_id: notification.id,
                device_id: device.id,
                transport: device.transport,
                status: "sent",
                sent_at: new Date().toISOString(),
              },
              { onConflict: "notification_id,device_id,transport" }
            );

            sentTransports.add(device.transport);
            dispatched++;
          } else if (result.statusCode === 410 || result.statusCode === 404) {
            await admin
              .from("notification_devices")
              .update({ is_active: false, last_active_at: new Date().toISOString() })
              .eq("id", device.id);

            await admin.from("notification_delivery").upsert(
              {
                notification_id: notification.id,
                device_id: device.id,
                transport: device.transport,
                status: "failed",
                error_message: result.error || "Endpoint expired",
                sent_at: new Date().toISOString(),
              },
              { onConflict: "notification_id,device_id,transport" }
            );
          } else {
            await admin.from("notification_delivery").upsert(
              {
                notification_id: notification.id,
                device_id: device.id,
                transport: device.transport,
                status: "failed",
                error_message: result.error || "Unknown error",
                sent_at: new Date().toISOString(),
              },
              { onConflict: "notification_id,device_id,transport" }
            );
          }
        } catch (dbErr: any) {
          deliveryError = dbErr.message || "Delivery tracking failed";
          console.error("[Send] DB error:", dbErr);
        }
      }

      if (sentTransports.size > 0) {
        try {
          await admin
            .from("notifications")
            .update({ sent_via: Array.from(sentTransports) })
            .eq("id", notification.id);
        } catch (dbErr: any) {
          console.error("[Send] sent_via update error:", dbErr);
        }
      }
    }

    return NextResponse.json({
      notification_id: notification.id,
      dispatched,
      total_devices: devices?.length || 0,
      error: deliveryError,
      message:
        dispatched === 0 && devices?.length === 0
          ? "Notification created. No push devices registered — delivery via Realtime."
          : undefined,
    });
  } catch (err: any) {
    console.error("[Send] Unhandled error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
