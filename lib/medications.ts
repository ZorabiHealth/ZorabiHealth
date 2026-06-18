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
  alertSent: boolean;
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
  audio_url?: string;
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

// ─── DB Column Mapping Utilities ──────────────────────────────
// Maps TypeScript camelCase to DB snake_case for Supabase writes.
// All insert/upsert/update payloads MUST go through these.

export function medicationToDb(med: Partial<Medication> & { id: string }) {
  return {
    id: med.id,
    name: med.name,
    generic_name: med.genericName || null,
    dosage: med.dosage,
    category: med.category,
    frequency: med.frequency,
    scheduled_times: med.scheduledTimes,
    start_date: med.startDate,
    end_date: med.endDate || null,
    current_stock: med.currentStock,
    refill_at: med.refillAt,
    prescribed_by: med.prescribedBy || null,
    phone_for_alerts: med.phoneForAlerts || null,
    emergency_contact_name: med.emergencyContact?.name || null,
    emergency_contact_phone: med.emergencyContact?.phone || null,
    alert_after_misses: med.emergencyContact?.alertAfterMisses ?? 2,
    vendor_preference: med.vendorPreference || null,
    is_active: med.isActive ?? true,
    color: med.color || "blue",
    notes: med.notes || null,
    updated_at: med.updatedAt || new Date().toISOString(),
  };
}

export function vendorToDb(vendor: Partial<Vendor> & { id: string }) {
  return {
    id: vendor.id,
    business_name: vendor.businessName,
    license_no: vendor.licenseNo,
    email: vendor.email,
    phone: vendor.phone || null,
    address: vendor.address,
    pincode: vendor.pincode,
    lat: vendor.lat,
    lng: vendor.lng,
    service_radius_km: vendor.serviceRadiusKm,
    operating_hours: vendor.operatingHours,
    is_active: vendor.isActive ?? true,
    is_verified: vendor.isVerified ?? false,
    rating: vendor.rating ?? 4.5,
    inventory: vendor.inventory || {},
  };
}

export function refillOrderToDb(order: Partial<RefillOrder> & { id: string }) {
  return {
    id: order.id,
    tracking_id: order.trackingId,
    medication_id: order.medicationId,
    medication_name: order.medicationName,
    dosage: order.dosage,
    quantity: order.quantity,
    vendor_id: order.vendorId,
    vendor_name: order.vendorName,
    vendor_email: order.vendorEmail,
    vendor_phone: order.vendorPhone || null,
    patient_email: order.patientEmail,
    patient_phone: order.patientPhone || null,
    delivery_address: order.deliveryAddress,
    status: order.status,
    total_price: order.totalPrice,
    estimated_delivery: order.estimatedDelivery || null,
    idempotency_key: order.idempotencyKey || null,
  };
}

export function refillOrderEventToDb(event: {
  orderId: string;
  status: OrderStatus;
  timestamp: string;
  note?: string;
}) {
  return {
    order_id: event.orderId,
    status: event.status,
    timestamp: event.timestamp,
    note: event.note || null,
  };
}

export function medicationLogToDb(log: Partial<MedicationLog> & { id: string }) {
  return {
    id: log.id,
    medication_id: log.medicationId,
    medication_name: log.medicationName,
    scheduled_at: log.scheduledAt,
    taken_at: log.takenAt || null,
    status: log.status,
    dose: log.dose,
    note: log.note || null,
    alert_sent: log.alertSent ?? false,
    snoozed_until: log.snoozedUntil || null,
  };
}

export function voiceMessageToDb(msg: {
  id: string;
  userId?: string;
  sender: "user" | "assistant";
  text: string;
  intent?: string;
  actionTaken?: string;
}) {
  return {
    id: msg.id,
    user_id: msg.userId || null,
    sender: msg.sender,
    text: msg.text,
    intent: msg.intent || null,
    action_taken: msg.actionTaken || null,
  };
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

// ─────────────────────────────────────────────────────────────
// WORK-004 — Clinical Meal Suggestion Engine
// Extensions for macro nutrition models and symptom-based suggestions
// Cross-team: Developer C — if Lisinopril (Blood Pressure) is active,
//             auto-append strict low-sodium diet advice.
// Cross-team: Developer D — symptomStates from vitals dashboard
//             can be passed in as SymptomClassification[].
// ─────────────────────────────────────────────────────────────

export type SymptomClassification =
  | "fatigue"
  | "hypertension"
  | "hyperglycemia"
  | "high_cholesterol"
  | "inflammation"
  | "muscle_soreness"
  | "dehydration"
  | "low_energy"
  | "digestive_issues"
  | "anxiety";

export interface MealSuggestion {
  id: string;
  title: string;
  description: string;
  foods: string[];
  avoid: string[];
  severity: "info" | "warning" | "critical";
  triggerSymptoms: SymptomClassification[];
  medicationTrigger?: string; // medication name that triggered this rule
}

// Symptom-to-suggestion rule map
const SYMPTOM_RULES: Record<
  SymptomClassification,
  Omit<MealSuggestion, "id" | "triggerSymptoms">
> = {
  fatigue: {
    title: "Energy Recovery Nutrition",
    description: "Your fatigue levels suggest a need for slow-release energy and iron-rich foods.",
    foods: ["Oatmeal", "Spinach", "Lentils", "Bananas", "Brown rice", "Eggs"],
    avoid: ["Refined sugar", "Processed snacks", "Excessive caffeine"],
    severity: "info",
  },
  hypertension: {
    title: "Low-Sodium Protocol",
    description: "Elevated blood pressure detected. Strict sodium restriction is recommended.",
    foods: ["Leafy greens", "Berries", "Oats", "Garlic", "Olive oil", "Potassium-rich fruits"],
    avoid: ["Table salt", "Canned soups", "Processed meats", "Fast food", "Pickled foods"],
    severity: "warning",
  },
  hyperglycemia: {
    title: "Glycemic Control Diet",
    description: "Blood sugar is elevated. Prioritise low-GI foods and fibre-rich meals.",
    foods: ["Vegetables", "Legumes", "Whole grains", "Nuts", "Greek yogurt", "Cinnamon"],
    avoid: ["White bread", "Sugary drinks", "Pastries", "White rice", "Candy"],
    severity: "warning",
  },
  high_cholesterol: {
    title: "Cardio-Protective Nutrition",
    description: "Elevated cholesterol levels detected. Focus on heart-healthy fats and fibre.",
    foods: ["Oats", "Almonds", "Avocado", "Salmon", "Flaxseeds", "Olive oil"],
    avoid: ["Trans fats", "Fried foods", "Full-fat dairy", "Red meat", "Butter"],
    severity: "warning",
  },
  inflammation: {
    title: "Anti-Inflammatory Protocol",
    description: "Signs of inflammation present. Increase omega-3 and antioxidant intake.",
    foods: ["Turmeric", "Ginger", "Blueberries", "Salmon", "Walnuts", "Broccoli"],
    avoid: ["Refined carbs", "Margarine", "Alcohol", "Vegetable oils", "Processed meat"],
    severity: "info",
  },
  muscle_soreness: {
    title: "Muscle Recovery Nutrition",
    description:
      "Muscle soreness detected. Protein intake and anti-inflammatory foods are priority.",
    foods: ["Chicken breast", "Cottage cheese", "Tart cherry juice", "Sweet potato", "Eggs"],
    avoid: ["Alcohol", "High-sugar foods", "Excessive sodium"],
    severity: "info",
  },
  dehydration: {
    title: "Hydration & Electrolyte Balance",
    description: "Low hydration levels detected. Increase water and electrolyte-rich food intake.",
    foods: ["Water", "Cucumber", "Watermelon", "Coconut water", "Celery", "Oranges"],
    avoid: ["Caffeinated beverages", "Alcohol", "High-sodium snacks"],
    severity: "warning",
  },
  low_energy: {
    title: "Pre-Workout Energy Boost",
    description:
      "Low energy levels. Optimise your carbohydrate and B-vitamin intake before workouts.",
    foods: ["Banana", "Oats", "Peanut butter", "Whole grain toast", "Dates", "Greek yogurt"],
    avoid: ["Heavy fatty meals", "High-fibre foods before exercise", "Alcohol"],
    severity: "info",
  },
  digestive_issues: {
    title: "Gut-Friendly Nutrition",
    description: "Digestive discomfort logged. Switch to easily digestible, probiotic-rich foods.",
    foods: ["Yogurt", "Ginger tea", "Bananas", "Rice", "Boiled chicken", "Cooked vegetables"],
    avoid: ["Raw cruciferous vegetables", "Legumes", "Spicy food", "Dairy", "Caffeine"],
    severity: "info",
  },
  anxiety: {
    title: "Neuro-Calming Diet",
    description:
      "Elevated stress or anxiety markers. Magnesium and omega-3 rich foods are recommended.",
    foods: ["Dark chocolate", "Chamomile tea", "Almonds", "Salmon", "Blueberries", "Avocado"],
    avoid: ["Caffeine", "Alcohol", "Refined sugar", "Energy drinks"],
    severity: "info",
  },
};

// Medication-triggered diet rules (cross-team with Developer C)
const MEDICATION_DIET_RULES: Partial<Record<MedicationCategory, MealSuggestion>> = {
  "Blood Pressure": {
    id: "med-rule-bp",
    title: "Low-Sodium Required — Lisinopril Active",
    description:
      "You are currently prescribed a Blood Pressure medication (e.g. Lisinopril). A strict low-sodium diet is clinically required to maximise treatment effectiveness.",
    foods: ["Fresh vegetables", "Unsalted nuts", "Fruits", "Herbs and spices", "Unsalted grains"],
    avoid: [
      "Table salt",
      "Processed meats",
      "Canned goods",
      "Fast food",
      "Cheese",
      "Soy sauce",
      "Pickled foods",
    ],
    severity: "critical",
    triggerSymptoms: [],
    medicationTrigger: "Lisinopril / Blood Pressure medication",
  },
  Diabetes: {
    id: "med-rule-diabetes",
    title: "Glycemic Management — Metformin Active",
    description:
      "Metformin is active in your regimen. Consistent low-GI meals are required to avoid hypoglycemic episodes.",
    foods: ["Legumes", "Non-starchy vegetables", "Whole grains", "Lean proteins", "Berries"],
    avoid: ["Sugary drinks", "White rice", "White bread", "Pastries", "Fruit juice"],
    severity: "warning",
    triggerSymptoms: [],
    medicationTrigger: "Metformin / Diabetes medication",
  },
};

/**
 * WORK-004 — getSuggestionsBasedOnSymptoms
 *
 * Parses symptom classifications and active medications,
 * returns a ranked list of MealSuggestion objects.
 *
 * @param symptoms        Array of SymptomClassification (from vitals dashboard or local input)
 * @param activeMedications  Active medications (cross-reference with Developer C's data)
 * @returns               Sorted MealSuggestion[] — critical first, then warning, then info
 */
export function getSuggestionsBasedOnSymptoms(
  symptoms: SymptomClassification[],
  activeMedications: Medication[] = []
): MealSuggestion[] {
  const suggestions: MealSuggestion[] = [];

  // 1. Symptom-driven suggestions
  const seen = new Set<SymptomClassification>();
  for (const symptom of symptoms) {
    if (seen.has(symptom)) continue;
    seen.add(symptom);
    const rule = SYMPTOM_RULES[symptom];
    if (rule) {
      suggestions.push({
        id: `sym-${symptom}`,
        triggerSymptoms: [symptom],
        ...rule,
      });
    }
  }

  // 2. Medication-triggered rules (cross-team Developer C integration)
  const activeCategories = new Set(
    activeMedications.filter((m) => m.isActive).map((m) => m.category)
  );
  for (const [category, rule] of Object.entries(MEDICATION_DIET_RULES)) {
    if (activeCategories.has(category as MedicationCategory) && rule) {
      // Avoid duplicate if already added via symptom
      const alreadyPresent = suggestions.some((s) => s.id === rule.id);
      if (!alreadyPresent) {
        suggestions.push(rule);
      }
    }
  }

  // 3. Sort: critical → warning → info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return suggestions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

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
