"use client";

export interface AlarmEntry {
  medication_id: string;
  medication_name: string;
  dosage: string;
  current_stock: number;
  scheduled_time: string;
  scheduled_date: string;
  status: "pending" | "scheduled" | "taken" | "snoozed" | "missed";
  log_id: string | null;
  snoozed_until: string | null;
}

interface OfflineAction {
  id: string;
  table: "medication_logs" | "medications";
  action: "insert" | "update";
  payload: Record<string, unknown>;
  created_at: string;
}

const STORAGE_KEY_SCHEDULE = "zh_alarm_schedule";
const STORAGE_KEY_QUEUE = "zh_offline_queue";

// ─── Schedule Persistence ─────────────────────────────────────

export function loadAlarmSchedule(): AlarmEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SCHEDULE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAlarmSchedule(entries: AlarmEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(entries));
  } catch (e) {
    console.warn("[AlarmQueue] Failed to save schedule:", e);
  }
}

// ─── Browser Notification Scheduling ──────────────────────────

export async function scheduleBrowserAlarm(
  entry: AlarmEntry,
  sessionUserId: string
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const [hours, minutes] = entry.scheduled_time.split(":").map(Number);
  const triggerDate = new Date(entry.scheduled_date);
  triggerDate.setHours(hours, minutes, 0, 0);

  const delayMs = triggerDate.getTime() - Date.now();
  if (delayMs <= 0) return;

  setTimeout(() => {
    if (document.visibilityState === "visible") return;

    const n = new Notification("Medication Reminder", {
      body: `Time to take ${entry.medication_name} (${entry.dosage})`,
      tag: `med-${entry.medication_id}-${entry.scheduled_time}`,
      data: {
        category: "medication",
        medication_id: entry.medication_id,
        scheduled_time: entry.scheduled_time,
        user_id: sessionUserId,
      },
      requireInteraction: true,
    });

    n.onclick = () => {
      window.focus();
      n.close();
    };
  }, delayMs);
}

// ─── Build schedule from remote data ──────────────────────────

export function buildScheduleFromRemote(
  medications: {
    id: string;
    name: string;
    dosage: string;
    current_stock: number;
    scheduled_times: string[];
  }[],
  existingLogs: {
    medication_id: string;
    status: string;
    scheduled_at: string;
    snoozed_until: string | null;
    id: string;
  }[]
): AlarmEntry[] {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const entries: AlarmEntry[] = [];

  for (const med of medications) {
    for (const timeStr of med.scheduled_times) {
      const [hours, minutes] = timeStr.split(":").map(Number);
      const scheduledDate = new Date();
      scheduledDate.setHours(hours, minutes, 0, 0);

      const matchingLog = existingLogs.find((log) => {
        if (log.medication_id !== med.id) return false;
        const logDate = new Date(log.scheduled_at);
        const hh = String(logDate.getHours()).padStart(2, "0");
        const mm = String(logDate.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}` === timeStr;
      });

      let status: AlarmEntry["status"] = "pending";
      let logId: string | null = null;
      let snoozedUntil: string | null = null;

      if (matchingLog) {
        logId = matchingLog.id;
        snoozedUntil = matchingLog.snoozed_until;

        if (matchingLog.status === "taken") {
          status = "taken";
        } else if (matchingLog.status === "snoozed") {
          if (matchingLog.snoozed_until && new Date(matchingLog.snoozed_until) > new Date()) {
            status = "snoozed";
          } else {
            status = "pending";
          }
        } else if (matchingLog.status === "missed" || matchingLog.status === "pending") {
          status = "pending";
        }
      } else if (scheduledDate.getTime() <= Date.now()) {
        status = "pending";
      } else {
        status = "scheduled";
      }

      entries.push({
        medication_id: med.id,
        medication_name: med.name,
        dosage: med.dosage,
        current_stock: med.current_stock,
        scheduled_time: timeStr,
        scheduled_date: todayStr,
        status,
        log_id: logId,
        snoozed_until: snoozedUntil,
      });
    }
  }

  return entries;
}

// ─── Offline Queue ────────────────────────────────────────────

export function queueOfflineAction(action: Omit<OfflineAction, "id" | "created_at">) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUEUE) || "[]";
    const queue: OfflineAction[] = JSON.parse(raw);
    queue.push({
      ...action,
      id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
  } catch (e) {
    console.warn("[AlarmQueue] Failed to queue offline action:", e);
  }
}

export async function syncOfflineQueue(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUEUE) || "[]";
    const queue: OfflineAction[] = JSON.parse(raw);
    if (queue.length === 0) return;

    const { supabase } = await import("@/lib/supabase");
    const remaining: OfflineAction[] = [];

    for (const item of queue) {
      try {
        if (item.action === "update") {
          const { error } = await supabase
            .from(item.table)
            .update(item.payload)
            .eq("id", item.payload.id);
          if (error) throw error;
        } else if (item.action === "insert") {
          const { error } = await supabase.from(item.table).insert(item.payload);
          if (error) throw error;
        }
      } catch (e) {
        console.warn(`[AlarmQueue] Failed to sync item ${item.id}:`, e);
        remaining.push(item);
      }
    }

    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(remaining));
  } catch (e) {
    console.warn("[AlarmQueue] Sync failed:", e);
  }
}
