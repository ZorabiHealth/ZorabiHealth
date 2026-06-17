export interface RemoteMedication {
  id: string;
  name: string;
  dosage: string;
  current_stock: number;
  scheduled_times: string[];
}

export interface MedicationLog {
  medication_id: string;
  status: string;
  scheduled_at: string;
  snoozed_until: string | null;
  id: string;
}

export type ScheduleStatus = "pending" | "scheduled" | "taken" | "snoozed" | "missed";

export interface ScheduleItem {
  medication_id: string;
  medication_name: string;
  dosage: string;
  current_stock: number;
  scheduled_time: string;
  scheduled_date: string;
  status: ScheduleStatus;
  log_id: string | null;
  snoozed_until: string | null;
}

export interface SyncQueueItem {
  id: string;
  table: string;
  action: "insert" | "update" | "delete";
  payload: Record<string, unknown>;
  vector_clock: number;
  device_id: string;
  retry_count: number;
  created_at: string;
}

export interface VectorClockEntry {
  device_id: string;
  clock: number;
}
