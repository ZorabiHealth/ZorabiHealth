import { createClient } from "@supabase/supabase-js";
import { syncOfflineQueue, rejectOldestEntries } from "@zorabihealth/shared";
import type { SyncQueueItem } from "@zorabihealth/shared";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[ZorabiHealth] Missing Supabase env vars. App will run with limited functionality."
  );
}

// Client-side Anon client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Service Role client
export const supabaseAdmin =
  typeof window === "undefined" && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

// ─── Sync Queue Schema ───────────────────────────────────────
export interface SyncItem {
  id: string;
  table:
    | "medications"
    | "medication_logs"
    | "vendors"
    | "refill_orders"
    | "refill_order_events"
    | "voice_messages"
    | "workouts"
    | "workout_schedule"
    | "nutrition_logs";
  action: "insert" | "update" | "delete";
  payload: Record<string, unknown>;
  timestamp: string;
}

// ─── LocalStorage Mutex ───────────────────────────────────────
const LOCK_KEY = "zh_sync_lock";
const LOCK_TIMEOUT = 5000;

function acquireLock(): boolean {
  const now = Date.now();
  const existing = localStorage.getItem(LOCK_KEY);
  if (existing) {
    try {
      const lock = JSON.parse(existing) as { ts: number; id: string };
      if (now - lock.ts < LOCK_TIMEOUT && lock.id !== globalThis.__sync_lock_id) return false;
    } catch {}
  }
  const lockId = `lock-${Math.random().toString(36).substring(2, 9)}`;
  globalThis.__sync_lock_id = lockId;
  localStorage.setItem(LOCK_KEY, JSON.stringify({ ts: now, id: lockId }));
  return true;
}

declare global {
  interface Window {
    __sync_lock_id?: string;
  }
}

function releaseLock(): void {
  localStorage.removeItem(LOCK_KEY);
}

// ─── Sync Utilities ──────────────────────────────────────────
export function queueSyncItem(item: Omit<SyncItem, "id" | "timestamp">) {
  if (typeof window === "undefined") return;
  try {
    const queue = JSON.parse(localStorage.getItem("zh_sync_queue") || "[]") as SyncItem[];
    const newItem: SyncItem = {
      ...item,
      id: `sync-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    queue.push(newItem);
    localStorage.setItem("zh_sync_queue", JSON.stringify(queue));
  } catch (e) {
    console.error("[Sync Queue] Failed to queue sync item:", e);
  }
}

export async function drainSyncQueue(): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) return;
  if (!acquireLock()) return;
  try {
    const raw = localStorage.getItem("zh_sync_queue");
    if (!raw) return;
    const queue: SyncQueueItem[] = JSON.parse(raw);
    if (queue.length === 0) return;

    const remaining = await syncOfflineQueue(queue, supabase);
    localStorage.setItem("zh_sync_queue", JSON.stringify(rejectOldestEntries(remaining)));
  } catch (e) {
    console.error("[Sync Queue] Drain loop failed:", e);
  } finally {
    releaseLock();
  }
}

// ─── Online Listener ─────────────────────────────────────────
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    drainSyncQueue().catch((e) => console.error("[Sync Queue] Online sync failed:", e));
  });
}
