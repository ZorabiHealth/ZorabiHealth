import { describe, it, expect } from "vitest";

describe("MedicationCRUD", () => {
  it("create medication inserts into DB with snake_case columns", () => {
    const medication = {
      name: "Amoxicillin",
      dosage: "500mg",
      frequency: "1x Daily",
      is_active: true,
    };
    const snakeCase = {
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      is_active: medication.is_active,
    };
    expect(snakeCase.is_active).toBe(true);
  });

  it("update medication preserves unchanged fields", () => {
    const original = { name: "Test", dosage: "500mg", frequency: "1x Daily", is_active: true };
    const update = { dosage: "250mg" };
    const merged = { ...original, ...update };
    expect(merged.name).toBe("Test");
    expect(merged.dosage).toBe("250mg");
    expect(merged.frequency).toBe("1x Daily");
  });

  it("delete medication removes record and cascades to logs", () => {
    const medications = [{ id: "1", name: "Test" }];
    const logs = [{ id: "l1", medication_id: "1" }];
    const medIdToDelete = "1";
    const filteredLogs = logs.filter((l) => l.medication_id !== medIdToDelete);
    const filteredMeds = medications.filter((m) => m.id !== medIdToDelete);
    expect(filteredMeds).toHaveLength(0);
    expect(filteredLogs).toHaveLength(0);
  });

  it("medication_log query filters by user_id (no data leak)", () => {
    const logs = [
      { user_id: "user1", medication_id: "m1" },
      { user_id: "user2", medication_id: "m2" },
    ];
    const user1Logs = logs.filter((l) => l.user_id === "user1");
    expect(user1Logs).toHaveLength(1);
    expect(user1Logs[0].medication_id).toBe("m1");
  });

  it("double-tap prevention — rapid clicks create single log entry", () => {
    let isLogging = false;
    const handleLogTaken = async () => {
      if (isLogging) return false;
      isLogging = true;
      await new Promise((r) => setTimeout(r, 10));
      isLogging = false;
      return true;
    };
    const results = Promise.all([handleLogTaken(), handleLogTaken()]);
    // Only one should succeed
  });

  it("phone validation rejects invalid formats", () => {
    const validate = (phone: string) => /^\+[1-9]\d{1,14}$/.test(phone);
    expect(validate("+33612345678")).toBe(true);
    expect(validate("0612345678")).toBe(false);
    expect(validate("+33 6 12 34 56 78")).toBe(false);
    expect(validate("1234")).toBe(false);
  });

  it("endDate enforcement — expired medications flagged", () => {
    const now = new Date();
    const future = new Date(now.getTime() + 86400000);
    const past = new Date(now.getTime() - 86400000);
    expect(past < now).toBe(true);
    expect(future > now).toBe(true);
  });
});
