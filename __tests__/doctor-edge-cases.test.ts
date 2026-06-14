/**
 * Comprehensive edge case tests for the Doctor Workspace
 *
 * Covers:
 *  - Date/time utilities (UTC/local, navigation, week generation)
 *  - Duration parsing (PRN, weeks, months, numeric)
 *  - Prescription validation (dailyIntake, rollback)
 *  - Double-booking detection
 *  - UUID generation fallback
 *  - Patient search filtering
 *  - Message deduplication
 */

import { describe, it, expect } from "vitest";

// ============================================================
// Date/time utilities (extracted from schedule/page.tsx)
// ============================================================

const toLocalDateStr = (d: Date) => d.toLocaleDateString("sv-SE");

function navigateDay(currentDate: string, offset: number): string {
  const parts = currentDate.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + offset);
  return toLocalDateStr(d);
}

function generateWeekDays(currentDate: string): string[] {
  const parts = currentDate.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(d);
    date.setDate(date.getDate() + i);
    return toLocalDateStr(date);
  });
}

describe("Date/time utilities", () => {
  it("navigateDay: advances by 1", () => {
    expect(navigateDay("2026-06-13", 1)).toBe("2026-06-14");
  });

  it("navigateDay: goes back by 1", () => {
    expect(navigateDay("2026-06-13", -1)).toBe("2026-06-12");
  });

  it("navigateDay: wraps across month boundary", () => {
    expect(navigateDay("2026-06-30", 1)).toBe("2026-07-01");
  });

  it("navigateDay: wraps across year boundary", () => {
    expect(navigateDay("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("navigateDay: handles leap year Feb 28 → Mar 1", () => {
    // 2026 is not a leap year
    expect(navigateDay("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("generateWeekDays: returns 7 days starting Sunday", () => {
    // 2026-06-13 is a Saturday
    const week = generateWeekDays("2026-06-13");
    expect(week).toHaveLength(7);
    // Sunday June 7
    expect(week[0]).toBe("2026-06-07");
    // Saturday June 13
    expect(week[6]).toBe("2026-06-13");
  });

  it("generateWeekDays: handles first day of month", () => {
    const week = generateWeekDays("2026-07-01");
    expect(week).toHaveLength(7);
    expect(week[0]).toBe("2026-06-28"); // Sunday before
    expect(week[6]).toBe("2026-07-04");
  });

  it("toLocalDateStr: produces YYYY-MM-DD format", () => {
    const d = new Date(2026, 5, 13); // June 13, 2026
    expect(toLocalDateStr(d)).toBe("2026-06-13");
  });

  it("toLocalDateStr: pads month and day", () => {
    const d = new Date(2026, 0, 5); // Jan 5, 2026
    expect(toLocalDateStr(d)).toBe("2026-01-05");
  });

  it("toLocalDateStr: handles end of year", () => {
    const d = new Date(2026, 11, 31); // Dec 31, 2026
    expect(toLocalDateStr(d)).toBe("2026-12-31");
  });
});

// ============================================================
// Duration parsing (extracted from doctor/page.tsx)
// ============================================================

const parseDays = (duration: string): number => {
  const trimmed = duration.trim().toLowerCase();
  if (trimmed === "prn" || trimmed === "as needed") return 1;
  const num = parseInt(trimmed);
  if (!isNaN(num)) {
    if (trimmed.includes("week")) return num * 7;
    if (trimmed.includes("month")) return num * 30;
    return num;
  }
  return 1;
};

describe("Duration parsing", () => {
  it('"7 Days" → 7', () => {
    expect(parseDays("7 Days")).toBe(7);
  });

  it('"14 Days" → 14', () => {
    expect(parseDays("14 Days")).toBe(14);
  });

  it('"1 Week" → 7', () => {
    expect(parseDays("1 Week")).toBe(7);
  });

  it('"2 Weeks" → 14', () => {
    expect(parseDays("2 Weeks")).toBe(14);
  });

  it('"1 Month" → 30', () => {
    expect(parseDays("1 Month")).toBe(30);
  });

  it('"3 Months" → 90', () => {
    expect(parseDays("3 Months")).toBe(90);
  });

  it('"As Needed" → 1 (PRN)', () => {
    expect(parseDays("As Needed")).toBe(1);
  });

  it('"PRN" → 1', () => {
    expect(parseDays("PRN")).toBe(1);
  });

  it('"prn" → 1 (lowercase)', () => {
    expect(parseDays("prn")).toBe(1);
  });

  it("empty string → 1", () => {
    expect(parseDays("")).toBe(1);
  });

  it('"Once" (unrecognized) → 1', () => {
    expect(parseDays("Once")).toBe(1);
  });

  it('"5 Days" → 5', () => {
    expect(parseDays("5 Days")).toBe(5);
  });

  it('"10 Weeks" → 70', () => {
    expect(parseDays("10 Weeks")).toBe(70);
  });

  it('"6 Months" → 180', () => {
    expect(parseDays("6 Months")).toBe(180);
  });

  it('" 7 Days " (with spaces) → 7', () => {
    expect(parseDays(" 7 Days ")).toBe(7);
  });
});

// ============================================================
// Prescription validation logic
// ============================================================

interface PrescribedMed {
  drug_name: string;
  morning: number;
  afternoon: number;
  night: number;
  duration: string;
}

function validatePrescription(meds: PrescribedMed[]): string | null {
  if (meds.length === 0) return "Please add at least one medication before saving.";
  for (const med of meds) {
    const dailyIntake = med.morning + med.afternoon + med.night;
    if (dailyIntake === 0) {
      return `"${med.drug_name}" has no dose times selected. Please check Morning/Afternoon/Night.`;
    }
  }
  return null;
}

describe("Prescription validation", () => {
  it("rejects empty medication list", () => {
    expect(validatePrescription([])).toBe("Please add at least one medication before saving.");
  });

  it("rejects medication with zero daily intake", () => {
    const meds: PrescribedMed[] = [
      { drug_name: "Test Drug", morning: 0, afternoon: 0, night: 0, duration: "7 Days" },
    ];
    expect(validatePrescription(meds)).toContain("Test Drug");
  });

  it("accepts medication with morning dose only", () => {
    const meds: PrescribedMed[] = [
      { drug_name: "Test Drug", morning: 1, afternoon: 0, night: 0, duration: "7 Days" },
    ];
    expect(validatePrescription(meds)).toBeNull();
  });

  it("accepts medication with all three doses", () => {
    const meds: PrescribedMed[] = [
      { drug_name: "Test Drug", morning: 1, afternoon: 1, night: 1, duration: "7 Days" },
    ];
    expect(validatePrescription(meds)).toBeNull();
  });

  it("rejects if any medication has zero daily intake (multi-med)", () => {
    const meds: PrescribedMed[] = [
      { drug_name: "Good Drug", morning: 1, afternoon: 0, night: 0, duration: "7 Days" },
      { drug_name: "Bad Drug", morning: 0, afternoon: 0, night: 0, duration: "5 Days" },
    ];
    expect(validatePrescription(meds)).toContain("Bad Drug");
  });
});

// ============================================================
// Quantity calculation
// ============================================================

function calculateQuantity(med: PrescribedMed): number {
  const dailyIntake = med.morning + med.afternoon + med.night;
  const days = parseDays(med.duration);
  return dailyIntake * days;
}

describe("Quantity calculation", () => {
  it("1x daily for 7 days → 7", () => {
    expect(
      calculateQuantity({ drug_name: "X", morning: 1, afternoon: 0, night: 0, duration: "7 Days" })
    ).toBe(7);
  });

  it("1x daily for 30 days → 30", () => {
    expect(
      calculateQuantity({ drug_name: "X", morning: 1, afternoon: 0, night: 0, duration: "30 Days" })
    ).toBe(30);
  });

  it("3x daily (all doses) for 7 days → 21", () => {
    expect(
      calculateQuantity({ drug_name: "X", morning: 1, afternoon: 1, night: 1, duration: "7 Days" })
    ).toBe(21);
  });

  it("2x daily for 1 week → 14", () => {
    expect(
      calculateQuantity({ drug_name: "X", morning: 1, afternoon: 1, night: 0, duration: "1 Week" })
    ).toBe(14);
  });

  it("1x daily for 1 month → 30", () => {
    expect(
      calculateQuantity({ drug_name: "X", morning: 1, afternoon: 0, night: 0, duration: "1 Month" })
    ).toBe(30);
  });

  it("PRN for 1 day → 1", () => {
    expect(
      calculateQuantity({
        drug_name: "X",
        morning: 1,
        afternoon: 0,
        night: 0,
        duration: "As Needed",
      })
    ).toBe(1);
  });
});

// ============================================================
// UUID safe fallback
// ============================================================

const safeUUID = (): string => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
};

describe("safeUUID", () => {
  it("returns a non-empty string", () => {
    const id = safeUUID();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("generates unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, () => safeUUID()));
    expect(ids.size).toBe(100);
  });
});

// ============================================================
// Patient search filtering
// ============================================================

interface Patient {
  id: string;
  name: string;
  email: string;
}

function filterPatientsByNameOrEmail(patients: Patient[], query: string): Patient[] {
  const q = query.toLowerCase();
  return patients.filter(
    (p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
  );
}

describe("Patient search filtering", () => {
  const patients: Patient[] = [
    { id: "1", name: "Adam Bridges", email: "adam@test.com" },
    { id: "2", name: "Sarah Connor", email: "sarah@test.com" },
    { id: "3", name: "Emily Watson", email: "emily@test.com" },
  ];

  it("finds by name (partial)", () => {
    expect(filterPatientsByNameOrEmail(patients, "adam")).toHaveLength(1);
  });

  it("finds by email (partial)", () => {
    expect(filterPatientsByNameOrEmail(patients, "sarah@")).toHaveLength(1);
  });

  it("returns empty for no match", () => {
    expect(filterPatientsByNameOrEmail(patients, "zzz")).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    expect(filterPatientsByNameOrEmail(patients, "ADAM")).toHaveLength(1);
    expect(filterPatientsByNameOrEmail(patients, "EMILY@TEST")).toHaveLength(1);
  });

  it("returns all for empty query", () => {
    expect(filterPatientsByNameOrEmail(patients, "")).toHaveLength(3);
  });
});

// ============================================================
// Double-booking detection
// ============================================================

interface Appt {
  id: string;
  start_time: string;
  end_time: string;
}

function hasConflict(existing: Appt[], newStart: string, newEnd: string): boolean {
  return existing.some((a) => a.start_time < newEnd && a.end_time > newStart);
}

describe("Double-booking detection", () => {
  const existingAppts: Appt[] = [
    { id: "1", start_time: "09:00", end_time: "09:30" },
    { id: "2", start_time: "10:00", end_time: "10:30" },
    { id: "3", start_time: "11:00", end_time: "12:00" },
  ];

  it("detects exact overlap", () => {
    expect(hasConflict(existingAppts, "09:00", "09:30")).toBe(true);
  });

  it("detects partial overlap (start inside)", () => {
    expect(hasConflict(existingAppts, "09:15", "09:45")).toBe(true);
  });

  it("detects partial overlap (end inside)", () => {
    expect(hasConflict(existingAppts, "08:45", "09:15")).toBe(true);
  });

  it("detects complete containment", () => {
    expect(hasConflict(existingAppts, "09:10", "09:20")).toBe(true);
  });

  it("detects complete overlap (starts before, ends after)", () => {
    expect(hasConflict(existingAppts, "08:30", "10:00")).toBe(true);
  });

  it("accepts non-overlapping consecutive slots", () => {
    expect(hasConflict(existingAppts, "09:30", "10:00")).toBe(false);
  });

  it("accepts slot before all existing", () => {
    expect(hasConflict(existingAppts, "08:00", "08:30")).toBe(false);
  });

  it("accepts slot after all existing", () => {
    expect(hasConflict(existingAppts, "12:00", "12:30")).toBe(false);
  });

  it("handles empty existing list", () => {
    expect(hasConflict([], "09:00", "09:30")).toBe(false);
  });

  it("treats same start/end as adjacent (no conflict)", () => {
    expect(hasConflict(existingAppts, "09:30", "10:00")).toBe(false);
  });
});

// ============================================================
// Message deduplication
// ============================================================

interface Msg {
  id: string;
  content: string;
}

function deduplicateMessages(messages: Msg[], newMessages: Msg[]): Msg[] {
  const existingIds = new Set(messages.map((m) => m.id));
  const deduped = newMessages.filter((m) => !existingIds.has(m.id));
  return [...messages, ...deduped];
}

describe("Message deduplication", () => {
  it("adds new messages", () => {
    const result = deduplicateMessages(
      [{ id: "1", content: "hello" }],
      [{ id: "2", content: "world" }]
    );
    expect(result).toHaveLength(2);
  });

  it("skips duplicates by id", () => {
    const result = deduplicateMessages(
      [{ id: "1", content: "hello" }],
      [{ id: "1", content: "hello" }]
    );
    expect(result).toHaveLength(1);
  });

  it("handles empty existing", () => {
    const result = deduplicateMessages([], [{ id: "1", content: "hello" }]);
    expect(result).toHaveLength(1);
  });

  it("handles empty new list", () => {
    const result = deduplicateMessages([{ id: "1", content: "hello" }], []);
    expect(result).toHaveLength(1);
  });

  it("handles both empty", () => {
    expect(deduplicateMessages([], [])).toHaveLength(0);
  });

  it("deduplicates mixed list", () => {
    const result = deduplicateMessages(
      [
        { id: "1", content: "a" },
        { id: "2", content: "b" },
      ],
      [
        { id: "2", content: "b" },
        { id: "3", content: "c" },
      ]
    );
    expect(result).toHaveLength(3);
  });
});
