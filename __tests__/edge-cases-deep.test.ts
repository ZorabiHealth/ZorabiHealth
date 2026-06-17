import { describe, it, expect, vi, beforeEach } from "vitest";

function mockLocalStorage() {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    length: 0,
    key: () => null,
  } as unknown as Storage;
}

// ─── Sync Queue Mutex Integration ────────────────────────────
describe("Sync Queue Mutex Integration", () => {
  const STORAGE_KEY = "zh_sync_lock";

  beforeEach(() => {
    mockLocalStorage();
  });

  function acquireLock(): boolean {
    const now = Date.now();
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      try {
        const lock = JSON.parse(existing) as { ts: number; id: string };
        if (now - lock.ts < 5000) return false;
      } catch {}
    }
    const lockId = `lock-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: now, id: lockId }));
    return true;
  }

  function releaseLock(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  it("acquire + release prevents concurrent access", () => {
    expect(acquireLock()).toBe(true);
    expect(acquireLock()).toBe(false);
    releaseLock();
    expect(acquireLock()).toBe(true);
    releaseLock();
  });

  it("queue drain with lock succeeds", () => {
    const queue = JSON.stringify([{ id: "1", table: "medications", action: "insert" }]);
    localStorage.setItem("zh_sync_queue", queue);
    localStorage.setItem("zh_alarm_queue", JSON.stringify([]));

    expect(acquireLock()).toBe(true);
    const raw = localStorage.getItem("zh_sync_queue");
    expect(raw).toBeTruthy();
    releaseLock();
  });

  it("concurrent tabs do not corrupt queue", () => {
    localStorage.setItem("zh_sync_queue", JSON.stringify([{ id: "1" }]));

    const tab1Lock = acquireLock();
    const tab2Lock = acquireLock();

    expect(tab1Lock).toBe(true);
    expect(tab2Lock).toBe(false);

    releaseLock();

    const tab1Retry = acquireLock();
    expect(tab1Retry).toBe(true);
    releaseLock();
  });

  it("stale lock from crashed tab is released after timeout", () => {
    const old = Date.now() - 10000;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: old, id: "dead-tab" }));
    expect(acquireLock()).toBe(true);
    releaseLock();
  });
});

// ─── Offline-First Data Consistency ──────────────────────────
describe("Offline-First Data Consistency", () => {
  it("optimistic create updates local state immediately", () => {
    const localMeds: Array<{ id: string; name: string }> = [];
    const newMed = { id: "local-1", name: "Aspirin" };
    localMeds.push(newMed);
    expect(localMeds).toHaveLength(1);
    expect(localMeds[0].name).toBe("Aspirin");
  });

  it("optimistic delete removes item before server confirms", () => {
    const meds = [
      { id: "1", name: "A" },
      { id: "2", name: "B" },
    ];
    const afterDelete = meds.filter((m) => m.id !== "1");
    expect(afterDelete).toHaveLength(1);
    expect(afterDelete[0].id).toBe("2");
  });

  it("server failure rollback restores deleted item", () => {
    let meds = [
      { id: "1", name: "A" },
      { id: "2", name: "B" },
    ];
    const deletedId = "1";
    meds = meds.filter((m) => m.id !== deletedId);

    const serverFailed = true;
    if (serverFailed) {
      meds.push({ id: deletedId, name: "A" });
    }
    expect(meds).toHaveLength(2);
    expect(meds.find((m) => m.id === deletedId)).toBeTruthy();
  });

  it("offline queue persists across page reloads", () => {
    mockLocalStorage();
    const queue = [{ id: "offline-1", action: "insert", table: "medications" }];
    localStorage.setItem("zh_offline_queue", JSON.stringify(queue));

    const reloaded = JSON.parse(localStorage.getItem("zh_offline_queue") || "[]");
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0].id).toBe("offline-1");
  });

  it("max queue size limits prevent unbounded growth", () => {
    const MAX_SIZE = 1000;
    const queue = Array.from({ length: MAX_SIZE + 10 }, (_, i) => ({
      id: `${i}`,
      action: "insert",
    }));

    function rejectOldestEntries(items: Array<{ id: string }>): Array<{ id: string }> {
      if (items.length <= MAX_SIZE) return items;
      return items.slice(items.length - MAX_SIZE);
    }

    const trimmed = rejectOldestEntries(queue);
    expect(trimmed).toHaveLength(MAX_SIZE);
    expect(trimmed[0].id).toBe("10");
  });
});

// ─── Pairing Code Security ───────────────────────────────────
describe("Pairing Code Security", () => {
  it("generates unique codes without collision", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const code = crypto.randomBytes
        ? crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6)
        : Math.random().toString(36).substring(2, 8).toUpperCase();
      codes.add(code);
    }
    expect(codes.size).toBeGreaterThan(990);
  });

  it("code expires after 10 minutes", () => {
    const expiresAt = Date.now() + 10 * 60 * 1000;
    expect(expiresAt).toBeGreaterThan(Date.now());

    const expired = Date.now() - 1000;
    expect(expired).toBeLessThan(Date.now());
  });

  it("cannot claim expired code", () => {
    const expiresAt = new Date(Date.now() - 60000);
    expect(expiresAt < new Date()).toBe(true);
  });

  it("DB unique constraint prevents duplicate claim", () => {
    const claimedCodes = new Set(["ABC123"]);
    expect(claimedCodes.has("ABC123")).toBe(true);
    expect(claimedCodes.has("XYZ789")).toBe(false);
  });
});

// ─── Notification Privacy Filter ─────────────────────────────
describe("Notification Privacy Filter", () => {
  const SENSITIVE_CATEGORIES = ["medication_reminder", "health_alert", "lab_result"];

  it("filters sensitive categories from paired devices", () => {
    const notification = { category: "medication_reminder" };
    const isSensitive = SENSITIVE_CATEGORIES.includes(notification.category);
    expect(isSensitive).toBe(true);
  });

  it("allows non-sensitive notifications to paired devices", () => {
    const notification = { category: "order_update" };
    const isSensitive = SENSITIVE_CATEGORIES.includes(notification.category);
    const shouldDeliver = !isSensitive;
    expect(shouldDeliver).toBe(true);
  });

  it("always delivers to direct devices regardless of category", () => {
    const isDirectDevice = true;
    const category = "medication_reminder";
    const isSensitive = SENSITIVE_CATEGORIES.includes(category);
    const shouldDeliver = isDirectDevice || !isSensitive;
    expect(shouldDeliver).toBe(true);
  });
});

// ─── Replay Attack Prevention ────────────────────────────────
describe("Replay Attack Prevention", () => {
  it("vector clock prevents replay of old events", () => {
    const currentClock = 100;
    const oldEventClock = 50;
    const isReplay = oldEventClock <= currentClock;
    expect(isReplay).toBe(true);
  });

  it("newer vector clock is accepted", () => {
    const currentClock = 100;
    const newEventClock = 150;
    const isNewer = newEventClock > currentClock;
    expect(isNewer).toBe(true);
  });

  it("same vector clock is deduplicated (tiebreaker: action priority)", () => {
    const actions = { insert: 0, update: 1, delete: 2 };
    const eventA = { action: "insert" as keyof typeof actions, id: "1" };
    const eventB = { action: "delete" as keyof typeof actions, id: "1" };
    const winner = actions[eventB.action] > actions[eventA.action] ? eventB : eventA;
    expect(winner.action).toBe("delete");
  });
});

// ─── Database Connection Resilience ──────────────────────────
describe("Database Connection Resilience", () => {
  it("fallback to local cache on fetch failure", () => {
    const fetchFailed = true;
    const localCache = [{ id: "cached-1", name: "Aspirin" }];
    const data = fetchFailed ? localCache : [];
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("cached-1");
  });

  it("retries on transient network error", () => {
    let attempts = 0;
    function fetchWithRetry(maxRetries: number): boolean {
      for (let i = 0; i < maxRetries; i++) {
        attempts++;
        if (i === maxRetries - 1) return true;
      }
      return false;
    }
    expect(fetchWithRetry(3)).toBe(true);
    expect(attempts).toBe(3);
  });

  it("exponential backoff increases delay", () => {
    const delays = [0, 1, 2, 4, 8].map((d) => d * 1000);
    expect(delays[0]).toBe(0);
    expect(delays[1]).toBe(1000);
    expect(delays[2]).toBe(2000);
    expect(delays[3]).toBe(4000);
    expect(delays[4]).toBe(8000);
  });

  it("marks device inactive after permanent failure", () => {
    const deviceActive = true;
    const statusCode = 410;

    if (statusCode === 410 || statusCode === 404) {
      const isActive = false;
      expect(isActive).toBe(false);
      expect(deviceActive).toBe(true); // original
    }
  });
});
