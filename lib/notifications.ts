export type Transport = "web_push" | "expo_push";
export type Platform = "web" | "android" | "ios";
export type NotificationCategory =
  | "medication"
  | "vital"
  | "appointment"
  | "system"
  | "refill"
  | "workout";
export type NotificationPriority = "low" | "normal" | "high" | "critical";
export type DeliveryStatus = "pending" | "sent" | "delivered" | "clicked" | "failed" | "expired";

export interface PushDevice {
  id: string;
  user_id: string;
  device_name: string;
  platform: Platform;
  transport: Transport;
  push_endpoint: string | null;
  push_keys: { p256dh: string; auth: string } | null;
  expo_push_token: string | null;
  is_active: boolean;
  last_active_at: string;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  category: NotificationCategory;
  priority: NotificationPriority;
  scheduled_for: string | null;
  expires_at: string | null;
  sent_via: Transport[];
  read_at: string | null;
  created_at: string;
}

export interface NotificationDelivery {
  id: string;
  notification_id: string;
  device_id: string;
  transport: Transport;
  status: DeliveryStatus;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  clicked_at: string | null;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  title: string;
  body: string;
  category: string;
  channel: string;
  read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  medication_reminders: boolean;
  vital_alerts: boolean;
  refill_alerts: boolean;
  workout_reminders: boolean;
  app_notifications: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  updated_at: string;
}

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  "medication",
  "vital",
  "appointment",
  "system",
  "refill",
  "workout",
];
export const NOTIFICATION_PRIORITIES: NotificationPriority[] = [
  "low",
  "normal",
  "high",
  "critical",
];
export const DELIVERY_STATUSES: DeliveryStatus[] = [
  "pending",
  "sent",
  "delivered",
  "clicked",
  "failed",
  "expired",
];
export const TRANSPORTS: Transport[] = ["web_push", "expo_push"];

export function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output.buffer;
}
