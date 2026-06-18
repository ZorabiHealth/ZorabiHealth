import type { RemoteMedication, MedicationLog, ScheduleItem } from "../types";

export function buildScheduleFromRemote(
  medications: RemoteMedication[],
  existingLogs: MedicationLog[]
): ScheduleItem[] {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const entries: ScheduleItem[] = [];

  for (const med of medications) {
    for (const timeStr of med.scheduled_times) {
      const [hours, minutes] = timeStr.split(":").map(Number);
      const scheduledDate = new Date();
      scheduledDate.setHours(hours, minutes, 0, 0);

      const matchingLog = existingLogs.find((log) => {
        if (log.medication_id !== med.id) return false;
        const logDate = new Date(log.scheduled_at);
        const hh = String(logDate.getHours()).padStart(2, "0");
        const mm = String(logDate.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}` === timeStr;
      });

      let status: ScheduleItem["status"] = "pending";
      let logId: string | null = null;
      let snoozedUntil: string | null = null;

      if (matchingLog) {
        logId = matchingLog.id;
        snoozedUntil = matchingLog.snoozed_until;

        if (matchingLog.status === "taken") {
          status = "taken";
        } else if (matchingLog.status === "snoozed") {
          if (matchingLog.snoozed_until && new Date(matchingLog.snoozed_until) > new Date()) {
            status = "snoozed";
          } else {
            status = "pending";
          }
        } else if (matchingLog.status === "missed" || matchingLog.status === "pending") {
          status = "pending";
        }
      } else if (scheduledDate.getTime() <= Date.now()) {
        status = "pending";
      } else {
        status = "scheduled";
      }

      entries.push({
        medication_id: med.id,
        medication_name: med.name,
        dosage: med.dosage,
        current_stock: med.current_stock,
        scheduled_time: timeStr,
        scheduled_date: todayStr,
        status,
        log_id: logId,
        snoozed_until: snoozedUntil,
      });
    }
  }

  return entries;
}
