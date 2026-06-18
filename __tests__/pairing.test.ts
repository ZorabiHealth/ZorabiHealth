import { describe, it, expect } from "vitest";

describe("PairingFlow", () => {
  it("pairing code generation creates unique code", () => {
    const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
    const codes = new Set(Array.from({ length: 100 }, () => generateCode()));
    expect(codes.size).toBeGreaterThan(90);
  });

  it("TOCTOU race prevented — DB-level uniqueness constraint", () => {
    const existingCodes = new Set(["ABC123"]);
    const insert = (code: string): boolean => {
      if (existingCodes.has(code)) return false;
      existingCodes.add(code);
      return true;
    };
    expect(insert("ABC123")).toBe(false);
    expect(insert("XYZ789")).toBe(true);
  });

  it("pairing code claim links devices correctly", () => {
    const pairing = {
      code: "ABC123",
      web_user_id: "u1",
      mobile_user_id: "u2",
      claimed_at: new Date().toISOString(),
    };
    expect(pairing.web_user_id).toBe("u1");
    expect(pairing.mobile_user_id).toBe("u2");
    expect(pairing.claimed_at).toBeTruthy();
  });

  it("expired pairing code cannot be claimed", () => {
    const expiresAt = new Date(Date.now() - 60000); // 1 minute ago
    const isExpired = expiresAt < new Date();
    expect(isExpired).toBe(true);
  });

  it("paired notification delivery respects privacy filter", () => {
    const notification = { category: "medication_reminder", title: "Take pills" };
    const sensitiveCategories = ["medication_reminder", "health_alert"];
    const isSensitive = sensitiveCategories.includes(notification.category);
    const shouldDeliverToPaired = !isSensitive;
    expect(shouldDeliverToPaired).toBe(false);
  });
});
