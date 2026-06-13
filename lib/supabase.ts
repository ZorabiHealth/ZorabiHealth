import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "placeholder-anon-key";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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
  try {
    const raw = localStorage.getItem("zh_sync_queue");
    if (!raw) return;
    const queue: SyncItem[] = JSON.parse(raw);
    if (queue.length === 0) return;

    const remaining: SyncItem[] = [];

    for (const item of queue) {
      try {
        let error = null;
        if (item.action === "insert" || item.action === "update") {
          const { error: err } = await supabase.from(item.table).upsert(item.payload);
          error = err;
        } else if (item.action === "delete") {
          const { error: err } = await supabase.from(item.table).delete().eq("id", item.payload.id);
          error = err;
        }
        if (error) throw error;
      } catch (e) {
        console.error(`[Sync Queue] Failed item ${item.id}:`, e);
        remaining.push(item); // Keep in queue to retry later
      }
    }

    localStorage.setItem("zh_sync_queue", JSON.stringify(remaining));
  } catch (e) {
    console.error("[Sync Queue] Drain loop failed:", e);
  }
}

// ─── Online Listener ─────────────────────────────────────────
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    drainSyncQueue();
  });
}
