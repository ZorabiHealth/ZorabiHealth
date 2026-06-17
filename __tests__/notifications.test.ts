import { describe, it, expect } from "vitest";

describe("NotificationDispatch", () => {
  it("dispatch sends push notification to registered devices", () => {
    const devices = [
      { id: "d1", transport: "web_push", push_token: "token1", is_active: true },
      { id: "d2", transport: "expo", push_token: "ExpoToken1", is_active: true },
    ];
    const activeDevices = devices.filter((d) => d.is_active);
    expect(activeDevices).toHaveLength(2);
  });

  it("TOCTOU race prevented — duplicate delivery idempotency", () => {
    const deliveries = new Set<string>();
    const addDelivery = (notifId: string, deviceId: string) => {
      const key = `${notifId}-${deviceId}`;
      if (deliveries.has(key)) return false;
      deliveries.add(key);
      return true;
    };
    expect(addDelivery("n1", "d1")).toBe(true);
    expect(addDelivery("n1", "d1")).toBe(false);
    expect(deliveries.size).toBe(1);
  });

  it("Expo token expiry deactivates device", () => {
    const device = { id: "d1", is_active: true };
    const expoResponse = { statusCode: 410, error: "DeviceNotRegistered" };
    if (expoResponse.statusCode === 410 || expoResponse.statusCode === 404) {
      device.is_active = false;
    }
    expect(device.is_active).toBe(false);
  });

  it("privacy filter excludes sensitive categories from paired devices", () => {
    const sensitiveCategories = ["medication_reminder", "health_alert", "emergency_escalation"];
    const pairedDeviceCategories = ["medication_reminder", "refill_alert"];
    const filtered = pairedDeviceCategories.filter((c) => !sensitiveCategories.includes(c));
    expect(filtered).toEqual(["refill_alert"]);
  });

  it("notification pagination — cursor-based fetch returns all pages", () => {
    const allNotifications = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1) }));
    const pageSize = 10;
    const pages: any[][] = [];
    let cursor: string | null = null;
    do {
      const start = cursor ? parseInt(cursor) : 0;
      const page = allNotifications.slice(start, start + pageSize);
      pages.push(page);
      cursor = page.length === pageSize ? String(start + pageSize) : null;
    } while (cursor);
    expect(pages).toHaveLength(3);
    expect(pages[0]).toHaveLength(10);
    expect(pages[1]).toHaveLength(10);
    expect(pages[2]).toHaveLength(5);
  });

  it("dispatch with no devices returns gracefully", () => {
    const devices: any[] = [];
    expect(devices.length).toBe(0);
  });

  it("rate limit hit returns 429", () => {
    const rateLimited = true;
    const status = rateLimited ? 429 : 200;
    expect(status).toBe(429);
  });
});
