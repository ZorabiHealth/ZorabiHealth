"use client";

import {
  buildScheduleFromRemote as sharedBuildScheduleFromRemote,
  syncOfflineQueue as sharedSyncOfflineQueue,
  rejectOldestEntries,
  resolveConflicts,
} from "@zorabihealth/shared";
import type { RemoteMedication, MedicationLog, SyncQueueItem } from "@zorabihealth/shared";

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
  medications: RemoteMedication[],
  existingLogs: MedicationLog[]
): AlarmEntry[] {
  return sharedBuildScheduleFromRemote(medications, existingLogs) as AlarmEntry[];
}

// ─── Lock Utility ─────────────────────────────────────────────
const ALARM_LOCK_KEY = "zh_alarm_lock";
const ALARM_LOCK_TIMEOUT = 5000;

function acquireAlarmLock(): boolean {
  const now = Date.now();
  const existing = localStorage.getItem(ALARM_LOCK_KEY);
  if (existing) {
    try {
      const lock = JSON.parse(existing) as { ts: number; id: string };
      if (now - lock.ts < ALARM_LOCK_TIMEOUT && lock.id !== globalThis.__alarm_lock_id)
        return false;
    } catch {}
  }
  const lockId = `alock-${Math.random().toString(36).substring(2, 9)}`;
  globalThis.__alarm_lock_id = lockId;
  localStorage.setItem(ALARM_LOCK_KEY, JSON.stringify({ ts: now, id: lockId }));
  return true;
}

declare global {
  interface Window {
    __alarm_lock_id?: string;
  }
}

function releaseAlarmLock(): void {
  localStorage.removeItem(ALARM_LOCK_KEY);
}

// ─── Offline Queue ────────────────────────────────────────────

const DEVICE_ID = typeof window !== "undefined" ? "web" : "unknown";

export function queueOfflineAction(action: Omit<OfflineAction, "id" | "created_at">) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUEUE) || "[]";
    const queue: SyncQueueItem[] = JSON.parse(raw);
    const newItem: SyncQueueItem = {
      ...action,
      id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      vector_clock: Date.now(),
      device_id: DEVICE_ID,
      retry_count: 0,
      created_at: new Date().toISOString(),
    };
    const merged = resolveConflicts(queue, newItem);
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(rejectOldestEntries(merged)));
  } catch (e) {
    console.warn("[AlarmQueue] Failed to queue offline action:", e);
  }
}

export async function syncOfflineQueue(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!acquireAlarmLock()) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUEUE) || "[]";
    const queue: SyncQueueItem[] = JSON.parse(raw);
    if (queue.length === 0) return;

    const { supabase } = await dynamicImportSupabase();
    const remaining = await sharedSyncOfflineQueue(queue, supabase);
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(rejectOldestEntries(remaining)));

    if (remaining.length < queue.length) {
      try {
        const channel = supabase.channel("sync-broadcast");
        channel.send({
          type: "broadcast",
          event: "sync_complete",
          payload: { device_id: DEVICE_ID, timestamp: new Date().toISOString() },
        });
        channel.unsubscribe();
      } catch (e) {
        console.warn("[AlarmQueue] Broadcast failed:", e);
      }
    }
  } catch (e) {
    console.warn("[AlarmQueue] Sync failed:", e);
  } finally {
    releaseAlarmLock();
  }
}

let _supabaseModule: { supabase: typeof import("@/lib/supabase").supabase } | null = null;

async function dynamicImportSupabase() {
  if (!_supabaseModule) {
    _supabaseModule = await import("@/lib/supabase");
  }
  return _supabaseModule;
}
