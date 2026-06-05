// ─────────────────────────────────────────────────────────
// ZorabiHealth — Shared Medications Data Model & Utilities
// ─────────────────────────────────────────────────────────

export type FrequencyType = "daily" | "twice_daily" | "three_times_daily" | "weekly" | "as_needed";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLED";

export type LogStatus = "taken" | "missed" | "snoozed" | "pending";
export type AlertSeverity = "Mild" | "Moderate" | "Severe";

// ─── Core Medication ────────────────────────────────────────
export interface Medication {
  id: string;
  name: string;
  genericName?: string;
  dosage: string; // "500mg", "2 tablets"
  frequency: FrequencyType;
  scheduledTimes: string[]; // ["08:00", "20:00"] local 24h
  startDate: string; // ISO date
  endDate?: string;
  refillAt: number; // stock threshold to trigger alert
  currentStock: number;
  prescribedBy: string;
  phoneForAlerts: string; // E.164 format: +91XXXXXXXXXX
  emergencyContact?: {
    name: string;
    phone: string;
    alertAfterMisses: number; // consecutive misses before escalation
  };
  vendorPreference?: string; // vendor id
  isActive: boolean;
  color: string; // tailwind color token for UI
  category: MedicationCategory;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type MedicationCategory =
  | "Cardiovascular"
  | "Diabetes"
  | "Blood Pressure"
  | "Antibiotic"
  | "Pain Relief"
  | "Mental Health"
  | "Vitamin"
  | "Other";

// ─── Medication Log ─────────────────────────────────────────
export interface MedicationLog {
  id: string;
  medicationId: string;
  medicationName: string;
  scheduledAt: string; // ISO timestamp when it was DUE
  takenAt?: string; // ISO timestamp when ACTUALLY taken
  status: LogStatus;
  dose: string;
  note?: string;
  alertSent: boolean; // whether Vonage SMS was sent
  snoozedUntil?: string; // ISO timestamp if snoozed
}

// ─── Vendor ─────────────────────────────────────────────────
export interface Vendor {
  id: string;
  businessName: string;
  licenseNo: string;
  email: string;
  phone: string;
  address: string;
  pincode: string;
  lat: number;
  lng: number;
  serviceRadiusKm: number;
  operatingHours: string;
  isActive: boolean;
  isVerified: boolean;
  rating: number;
  inventory: Record<string, { stock: number; pricePerUnit: number }>;
  createdAt: string;
}

// ─── Refill Order ────────────────────────────────────────────
export interface RefillOrder {
  id: string; // UUID
  trackingId: string; // ZH-YYYYMMDD-XXXX
  medicationId: string;
  medicationName: string;
  dosage: string;
  quantity: number;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  vendorPhone: string;
  patientEmail: string;
  patientPhone: string;
  deliveryAddress: string;
  status: OrderStatus;
  totalPrice: number;
  timeline: OrderEvent[];
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  idempotencyKey: string;
}

export interface OrderEvent {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

// ─── Voice Session ───────────────────────────────────────────
export interface VoiceMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  intent?: string;
  actionTaken?: string;
}

// ─── localStorage Keys ───────────────────────────────────────
export const STORAGE_KEYS = {
  MEDICATIONS: "zh_medications",
  MEDICATION_LOGS: "zh_medication_logs",
  VENDORS: "zh_vendors",
  REFILL_ORDERS: "zh_refill_orders",
  VOICE_SESSIONS: "zh_voice_sessions",
  USER_SETTINGS: "zh_user_settings",
} as const;

// ─── Persistence Utilities ───────────────────────────────────
export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Storage write failed:", e);
  }
}

// ─── Tracking ID Generator ────────────────────────────────────
export function generateTrackingId(): string {
  const today = new Date();
  const date = today.toISOString().slice(0, 10).replace(/-/g, "");
  const orders = loadFromStorage<RefillOrder[]>(STORAGE_KEYS.REFILL_ORDERS, []);
  const todayOrders = orders.filter((o) => o.trackingId.startsWith(`ZH-${date}`));
  const seq = (todayOrders.length + 1).toString().padStart(4, "0");
  return `ZH-${date}-${seq}`;
}

// ─── Haversine Distance (km) ─────────────────────────────────
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Medication Defaults ──────────────────────────────────────
export const MEDICATION_COLORS: Record<MedicationCategory, string> = {
  Cardiovascular: "bg-red-100 text-red-700 border-red-200",
  Diabetes: "bg-blue-100 text-blue-700 border-blue-200",
  "Blood Pressure": "bg-purple-100 text-purple-700 border-purple-200",
  Antibiotic: "bg-amber-100 text-amber-700 border-amber-200",
  "Pain Relief": "bg-orange-100 text-orange-700 border-orange-200",
  "Mental Health": "bg-teal-100 text-teal-700 border-teal-200",
  Vitamin: "bg-green-100 text-green-700 border-green-200",
  Other: "bg-slate-100 text-slate-700 border-slate-200",
};

export const FREQUENCY_LABELS: Record<FrequencyType, string> = {
  daily: "Once daily",
  twice_daily: "Twice daily",
  three_times_daily: "3× daily",
  weekly: "Weekly",
  as_needed: "As needed",
};

// ─── Seed Demo Medications ────────────────────────────────────
export const DEMO_MEDICATIONS: Medication[] = [
  {
    id: "med-001",
    name: "Metformin",
    genericName: "Metformin HCl",
    dosage: "500mg",
    frequency: "twice_daily",
    scheduledTimes: ["08:00", "20:00"],
    startDate: "2026-01-15",
    refillAt: 10,
    currentStock: 12,
    prescribedBy: "Dr. Arun Kumar",
    phoneForAlerts: "",
    isActive: true,
    color: "blue",
    category: "Diabetes",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "med-002",
    name: "Atorvastatin",
    genericName: "Atorvastatin Calcium",
    dosage: "10mg",
    frequency: "daily",
    scheduledTimes: ["21:00"],
    startDate: "2026-02-01",
    refillAt: 7,
    currentStock: 45,
    prescribedBy: "Dr. Arun Kumar",
    phoneForAlerts: "",
    isActive: true,
    color: "green",
    category: "Cardiovascular",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "med-003",
    name: "Lisinopril",
    genericName: "Lisinopril",
    dosage: "5mg",
    frequency: "daily",
    scheduledTimes: ["08:00"],
    startDate: "2026-03-10",
    refillAt: 5,
    currentStock: 3,
    prescribedBy: "Dr. Meena Rao",
    phoneForAlerts: "",
    isActive: true,
    color: "purple",
    category: "Blood Pressure",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
