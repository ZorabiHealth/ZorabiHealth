import type { SyncQueueItem } from "../types";

const MAX_RETRIES = 3;
const MAX_QUEUE_SIZE = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export async function syncOfflineQueue(
  items: SyncQueueItem[],
  supabaseClient: SupabaseLike
): Promise<SyncQueueItem[]> {
  if (items.length === 0) return [];

  const remaining: SyncQueueItem[] = [];

  for (const item of items) {
    try {
      const delay = Math.pow(2, item.retry_count) * 1000;
      if (item.retry_count > 0) {
        await sleep(delay);
      }

      if (item.action === "delete") {
        const { error } = await supabaseClient
          .from(item.table)
          .delete()
          .eq("id", item.payload.id as string);
        if (error) throw error;
      } else if (item.action === "update") {
        const { error } = await supabaseClient
          .from(item.table)
          .update(item.payload)
          .eq("id", item.payload.id as string);
        if (error) throw error;
      } else {
        const { error } = await supabaseClient.from(item.table).insert(item.payload);
        if (error) throw error;
      }
    } catch (e) {
      const updatedItem: SyncQueueItem = {
        ...item,
        retry_count: item.retry_count + 1,
      };

      if (updatedItem.retry_count >= MAX_RETRIES) {
        console.error(`[SyncQueue] Item ${item.id} failed after ${MAX_RETRIES} retries:`, e);
        continue;
      }

      remaining.push(updatedItem);
    }
  }

  return remaining;
}

export function rejectOldestEntries(queue: SyncQueueItem[]): SyncQueueItem[] {
  if (queue.length <= MAX_QUEUE_SIZE) return queue;
  return queue.slice(queue.length - MAX_QUEUE_SIZE);
}

export function resolveConflicts(
  existing: SyncQueueItem[],
  incoming: SyncQueueItem
): SyncQueueItem[] {
  const idx = existing.findIndex(
    (e) => e.table === incoming.table && e.payload?.id === incoming.payload?.id
  );

  if (idx === -1) {
    return [...existing, incoming];
  }

  const current = existing[idx];
  if (incoming.vector_clock > current.vector_clock) {
    const updated = [...existing];
    updated[idx] = incoming;
    return updated;
  }
  if (incoming.vector_clock < current.vector_clock) {
    return existing;
  }

  const actionRank: Record<string, number> = { insert: 1, update: 2, delete: 3 };
  if ((actionRank[incoming.action] || 0) > (actionRank[current.action] || 0)) {
    const updated = [...existing];
    updated[idx] = incoming;
    return updated;
  }

  return existing;
}
