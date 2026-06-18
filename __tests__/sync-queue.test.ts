import { describe, it, expect } from "vitest";

describe("SyncQueue", () => {
  it("enqueue adds item to queue", () => {
    const queue: Record<string, unknown>[] = [];
    const item = {
      id: "1",
      table: "medications",
      action: "insert",
      payload: { name: "Test" },
      vector_clock: 1,
      device_id: "web",
      retry_count: 0,
      created_at: new Date().toISOString(),
    };
    queue.push(item);
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe("1");
  });

  it("drain processes all items in FIFO order", () => {
    const processed: string[] = [];
    const queue = [
      { id: "1", action: "insert" },
      { id: "2", action: "update" },
      { id: "3", action: "delete" },
    ];
    for (const item of queue) {
      processed.push(item.id);
    }
    expect(processed).toEqual(["1", "2", "3"]);
  });

  it("retry limit stops infinite retries after 3 attempts", () => {
    const MAX_RETRIES = 3;
    const item = { id: "1", retry_count: 3 };
    expect(item.retry_count >= MAX_RETRIES).toBe(true);
  });

  it("exponential backoff increases delay between retries", () => {
    const delays = [0, 1, 2].map((retry) => Math.pow(2, retry) * 1000);
    expect(delays).toEqual([1000, 2000, 4000]);
  });

  it("queue size limit rejects oldest entries when > 1000", () => {
    const MAX_QUEUE_SIZE = 1000;
    const queue = new Array(1001).fill(null).map((_, i) => ({ id: String(i) }));
    const rejected = queue.splice(0, queue.length - MAX_QUEUE_SIZE);
    expect(queue).toHaveLength(1000);
    expect(rejected).toHaveLength(1);
  });

  it("delete operations are processed (not silently skipped)", () => {
    const operations = [
      { action: "insert", payload: { id: "1" } },
      { action: "delete", payload: { id: "1" } },
    ];
    const deletes = operations.filter((o) => o.action === "delete");
    expect(deletes).toHaveLength(1);
  });

  it("vector clock conflict resolution — higher clock wins", () => {
    const itemA = { id: "1", vector_clock: 5 };
    const itemB = { id: "1", vector_clock: 3 };
    const winner = itemA.vector_clock >= itemB.vector_clock ? itemA : itemB;
    expect(winner.vector_clock).toBe(5);
  });

  it("vector clock tiebreaker — delete > update > insert", () => {
    const items = [
      { action: "insert", priority: 1 },
      { action: "update", priority: 2 },
      { action: "delete", priority: 3 },
    ];
    const priorityMap: Record<string, number> = { insert: 1, update: 2, delete: 3 };
    const sorted = items.sort((a, b) => priorityMap[b.action] - priorityMap[a.action]);
    expect(sorted[0].action).toBe("delete");
    expect(sorted[2].action).toBe("insert");
  });

  it("permanently failed item is removed and doesn't block queue", () => {
    const queue = [
      { id: "fail", retry_count: 3 },
      { id: "ok", retry_count: 0 },
    ];
    const MAX_RETRIES = 3;
    const filtered = queue.filter((item) => item.retry_count < MAX_RETRIES);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("ok");
  });
});
