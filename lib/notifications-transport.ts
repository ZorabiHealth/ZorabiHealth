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

/**
 * Sends a push notification to a device using its configured transport.
 * Currently supports web_push; fcm and apns require Firebase Admin SDK
 * and APNs certificates respectively (extensible in future).
 */
export async function sendToDevice(device: PushDevice, payload: PushPayload): Promise<SendResult> {
  switch (device.transport) {
    case "web_push":
      return sendWebPush(device, payload);
    case "fcm":
      return sendFCM(device, payload);
    case "apns":
      return sendAPNs(device);
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

/**
 * Firebase Cloud Messaging sender.
 * Requires Firebase Admin SDK setup:
 *   npm install firebase-admin
 *   FIREBASE_SERVICE_ACCOUNT_KEY env var with service account JSON
 */
async function sendFCM(device: PushDevice, payload: PushPayload): Promise<SendResult> {
  if (!device.fcm_token) {
    return { ok: false, error: "No FCM token" };
  }

  // Expo Go returns Expo push tokens — route through Expo's push API
  if (device.fcm_token.startsWith("ExponentPushToken")) {
    return sendExpoPush(device.fcm_token, payload);
  }

  try {
    // Lazy-init Firebase Admin if available
    const admin = await tryInitFirebaseAdmin();
    if (!admin) {
      return { ok: false, error: "Firebase Admin not configured" };
    }

    const message: any = {
      token: device.fcm_token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        ...Object.fromEntries(Object.entries(payload.data).map(([k, v]) => [k, String(v)])),
        category: payload.category,
        priority: payload.priority,
      },
      android: {
        priority:
          payload.priority === "critical" || payload.priority === "high" ? "high" : "normal",
        notification: {
          channelId: `zorabihealth_${payload.category}`,
          tag: (payload.data?.notification_id as string) || undefined,
        },
      },
    };

    await admin.messaging().send(message);
    return { ok: true };
  } catch (err: any) {
    if (err.code === "messaging/registration-token-not-registered") {
      return { ok: false, statusCode: 410, error: "FCM token expired" };
    }
    return { ok: false, error: err.message || "FCM send failed" };
  }
}

async function sendExpoPush(expoToken: string, payload: PushPayload): Promise<SendResult> {
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: expoToken,
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
      return { ok: false, statusCode: 400, error: result.data.message || "Expo push failed" };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Expo push request failed" };
  }
}

/**
 * Apple Push Notification Service sender.
 * Requires APNs key/certificate setup (extensible in future).
 */
async function sendAPNs(device: PushDevice): Promise<SendResult> {
  if (!device.apns_token) {
    return { ok: false, error: "No APNs token" };
  }

  return {
    ok: false,
    error: "APNs transport not yet implemented. Configure Firebase Cloud Messaging for iOS push.",
  };
}

let firebaseAdminInstance: any = null;

async function tryInitFirebaseAdmin(): Promise<any | null> {
  if (firebaseAdminInstance) return firebaseAdminInstance;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) return null;

  try {
    const mod = await import("firebase-admin");
    const admin: any = mod.default || mod;
    if (!admin.apps || !admin.apps.length) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    firebaseAdminInstance = admin;
    return admin;
  } catch (err: any) {
    console.error("[FirebaseAdmin] Init failed:", err?.message || err);
    return null;
  }
}
