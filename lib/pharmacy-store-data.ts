// ─────────────────────────────────────────────────────────
// ZorabiPharm — Standalone Pharmacy Store Product Data
// ─────────────────────────────────────────────────────────

export interface PharmProduct {
  id: string;
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  price: number;
  mrp: number;
  image: string;
  description: string;
  composition: string;
  dosage: string;
  usage: string;
  sideEffects: string;
  storage: string;
  safety: string[];
  inStock: boolean;
  isPinned?: boolean;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLED";

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface PharmOrder {
  id: string;
  trackingId: string;
  items: { productId: string; name: string; quantity: number; price: number }[];
  total: number;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  status: OrderStatus;
  timeline: { status: OrderStatus; timestamp: string; note?: string }[];
  createdAt: string;
  estimatedDelivery: string;
}

export const CATEGORIES = [
  { id: "all", label: "All Products" },
  { id: "Analgesic", label: "Pain Relief" },
  { id: "Antidiabetic", label: "Diabetes Care" },
  { id: "Statin", label: "Cholesterol" },
  { id: "ACE Inhibitor", label: "Blood Pressure" },
  { id: "Calcium Channel Blocker", label: "Heart Health" },
  { id: "ARB", label: "Hypertension" },
  { id: "Proton Pump Inhibitor", label: "Digestive Health" },
  { id: "Antibiotic", label: "Antibiotics" },
  { id: "Antihistamine", label: "Allergy Relief" },
  { id: "NSAID", label: "Anti-inflammatory" },
  { id: "Supplement", label: "Supplements" },
] as const;

export const PRODUCTS: PharmProduct[] = [
  {
    id: "dolo-650mg",
    name: "Dolo 650mg",
    genericName: "Paracetamol",
    category: "Analgesic",
    manufacturer: "Micro Labs",
    price: 32,
    mrp: 35,
    image: "/images/pharmacy/dolo-650mg.png",
    description:
      "Dolo 650mg is a trusted analgesic and antipyretic used for relief of fever, headache, body aches, and mild to moderate pain. It is one of the most widely prescribed pain relief medications in India.",
    composition: "Each tablet contains Paracetamol IP 650mg",
    dosage: "1 tablet every 6 hours as needed. Max 4 tablets (2600mg) in 24 hours.",
    usage: "Fever, Headache, Toothache, Menstrual cramps, Muscular aches, Cold & flu symptoms",
    sideEffects: "Nausea, rash, liver damage with overdose (>4000mg/day)",
    storage: "Store below 30°C, protect from light and moisture",
    safety: [
      "Do not exceed 4 tablets in 24 hours",
      "Avoid alcohol while taking this medication",
      "Consult doctor if symptoms persist beyond 3 days",
      "Not recommended in severe hepatic impairment",
    ],
    inStock: true,
    isPinned: true,
  },
  {
    id: "metformin-500mg",
    name: "Metformin 500mg",
    genericName: "Metformin Hydrochloride",
    category: "Antidiabetic",
    manufacturer: "USV",
    price: 45,
    mrp: 52,
    image: "/images/pharmacy/metformin-500mg.png",
    description:
      "Metformin 500mg is a first-line oral antidiabetic medication for management of type 2 diabetes mellitus. It works by decreasing glucose production in the liver and improving insulin sensitivity.",
    composition: "Each tablet contains Metformin Hydrochloride IP 500mg",
    dosage: "1 tablet 1-2 times daily with meals. Max 2000mg/day as prescribed.",
    usage: "Type 2 diabetes mellitus, Insulin resistance, PCOS (off-label)",
    sideEffects: "Diarrhea, nausea, metallic taste, vitamin B12 deficiency with long-term use",
    storage: "Store below 25°C, protect from moisture",
    safety: [
      "Take with food to reduce GI side effects",
      "Monitor renal function regularly",
      "Discontinue before contrast imaging procedures",
      "Regular blood sugar monitoring essential",
    ],
    inStock: true,
  },
  {
    id: "atorvastatin-10mg",
    name: "Atorvastatin 10mg",
    genericName: "Atorvastatin Calcium",
    category: "Statin",
    manufacturer: "Pfizer",
    price: 78,
    mrp: 95,
    image: "/images/pharmacy/atorvastatin-10mg.png",
    description:
      "Atorvastatin 10mg is a statin medication used to lower LDL cholesterol and triglycerides while raising HDL cholesterol. It reduces the risk of cardiovascular events in at-risk patients.",
    composition: "Each tablet contains Atorvastatin Calcium IP 10mg",
    dosage: "1 tablet once daily, preferably at the same time each day",
    usage: "Hypercholesterolemia, Mixed dyslipidemia, Cardiovascular risk reduction",
    sideEffects: "Muscle pain, joint pain, elevated liver enzymes, rare rhabdomyolysis",
    storage: "Store below 30°C, protect from light and moisture",
    safety: [
      "Regular liver function tests required",
      "Report unexplained muscle pain to doctor immediately",
      "Avoid grapefruit juice as it increases drug levels",
      "Not recommended during pregnancy or breastfeeding",
    ],
    inStock: true,
  },
  {
    id: "lisinopril-5mg",
    name: "Lisinopril 5mg",
    genericName: "Lisinopril",
    category: "ACE Inhibitor",
    manufacturer: "AstraZeneca",
    price: 55,
    mrp: 65,
    image: "/images/pharmacy/lisinopril-5mg.png",
    description:
      "Lisinopril 5mg is an ACE inhibitor used for treating hypertension and heart failure. It works by relaxing blood vessels, making it easier for the heart to pump blood.",
    composition: "Each tablet contains Lisinopril IP 5mg",
    dosage: "1 tablet once daily. Can be increased up to 40mg/day based on response.",
    usage: "Essential hypertension, Heart failure, Post-myocardial infarction",
    sideEffects: "Dry cough, dizziness, hyperkalemia, angioedema (rare)",
    storage: "Store below 25°C in a dry place",
    safety: [
      "Monitor blood pressure and potassium levels regularly",
      "May cause dizziness — avoid driving initially",
      "Not safe during pregnancy — discontinue immediately if pregnant",
      "Avoid potassium supplements and salt substitutes",
    ],
    inStock: true,
  },
  {
    id: "amlodipine-5mg",
    name: "Amlodipine 5mg",
    genericName: "Amlodipine Besylate",
    category: "Calcium Channel Blocker",
    manufacturer: "Pfizer",
    price: 42,
    mrp: 50,
    image: "/images/pharmacy/amlodipine-5mg.png",
    description:
      "Amlodipine 5mg is a calcium channel blocker used for hypertension and coronary artery disease. It relaxes blood vessels and improves blood flow to the heart.",
    composition: "Each tablet contains Amlodipine Besylate IP 5mg",
    dosage: "1 tablet once daily. Max 10mg/day.",
    usage: "Hypertension, Chronic stable angina, Vasospastic angina",
    sideEffects: "Ankle swelling, headache, flushing, palpitations, dizziness",
    storage: "Store below 30°C, protect from light",
    safety: [
      "Monitor for peripheral edema",
      "Maintain good oral hygiene (gum overgrowth rare)",
      "Do not stop abruptly — taper under medical supervision",
      "Alcohol may worsen dizziness",
    ],
    inStock: true,
  },
  {
    id: "omeprazole-20mg",
    name: "Omeprazole 20mg",
    genericName: "Omeprazole",
    category: "Proton Pump Inhibitor",
    manufacturer: "AstraZeneca",
    price: 38,
    mrp: 45,
    image: "/images/pharmacy/omeprazole-20mg.png",
    description:
      "Omeprazole 20mg is a proton pump inhibitor (PPI) that reduces stomach acid production. It is used to treat GERD, acid reflux, peptic ulcers, and Zollinger-Ellison syndrome.",
    composition: "Each capsule contains Omeprazole IP 20mg (enteric-coated)",
    dosage: "1 capsule once daily before breakfast. Max 40mg/day.",
    usage: "GERD, Peptic ulcer disease, H. pylori eradication (combination therapy), Acid reflux",
    sideEffects: "Headache, nausea, diarrhea, long-term risk of B12 deficiency and osteoporosis",
    storage: "Store below 25°C, protect from moisture",
    safety: [
      "Take on empty stomach 30-60 minutes before meals",
      "Do not crush/chew the capsule — swallow whole",
      "Long-term use beyond 14 days requires medical supervision",
      "May mask gastric malignancy symptoms",
    ],
    inStock: true,
  },
  {
    id: "vitamin-d3-60k",
    name: "Vitamin D3 60K",
    genericName: "Cholecalciferol",
    category: "Supplement",
    manufacturer: "Sun Pharma",
    price: 120,
    mrp: 145,
    image: "/images/pharmacy/vitamin-d3-60k.png",
    description:
      "Vitamin D3 60K IU is a high-potency vitamin D supplement used to treat and prevent vitamin D deficiency. Essential for calcium absorption and bone health.",
    composition: "Each softgel contains Cholecalciferol IP 60000 IU",
    dosage: "1 capsule once weekly as prescribed. Not for daily consumption.",
    usage: "Vitamin D deficiency, Osteoporosis prevention, Bone health, Immune support",
    sideEffects: "Rare at prescribed doses — hypercalcemia with overdose",
    storage: "Store below 25°C, protect from light and moisture",
    safety: [
      "Do not take more than prescribed — weekly dosing only",
      "Monitor serum calcium and vitamin D levels",
      "Ensure adequate calcium intake during therapy",
      "Not a substitute for daily low-dose D3 supplementation",
    ],
    inStock: true,
  },
  {
    id: "azithromycin-500mg",
    name: "Azithromycin 500mg",
    genericName: "Azithromycin",
    category: "Antibiotic",
    manufacturer: "Pfizer",
    price: 95,
    mrp: 115,
    image: "/images/pharmacy/azithromycin-500mg.png",
    description:
      "Azithromycin 500mg is a macrolide antibiotic used for respiratory tract infections, skin infections, and sexually transmitted infections. A 3-day course is typically prescribed.",
    composition: "Each tablet contains Azithromycin IP 500mg",
    dosage: "1 tablet once daily for 3 days, or as prescribed by physician",
    usage: "Respiratory infections, Skin & soft tissue infections, UTI, STDs, Typhoid",
    sideEffects: "GI upset, diarrhea, headache, QT prolongation (rare), pseudomembranous colitis",
    storage: "Store below 30°C, protect from moisture",
    safety: [
      "Complete the full course — do not stop early",
      "Report persistent diarrhea to doctor",
      "Avoid alcohol during treatment",
      "Use with caution in patients with cardiac arrhythmias",
    ],
    inStock: true,
  },
  {
    id: "amoxicillin-500mg",
    name: "Amoxicillin 500mg",
    genericName: "Amoxicillin Trihydrate",
    category: "Antibiotic",
    manufacturer: "GSK",
    price: 65,
    mrp: 78,
    image: "/images/pharmacy/amoxicillin-500mg.png",
    description:
      "Amoxicillin 500mg is a broad-spectrum penicillin antibiotic for bacterial infections including respiratory tract, ear, throat, and urinary tract infections.",
    composition: "Each capsule contains Amoxicillin Trihydrate IP 500mg",
    dosage: "1 capsule 3 times daily for 5-7 days, or as prescribed",
    usage: "Respiratory infections, Otitis media, Sinusitis, UTI, Dental infections",
    sideEffects: "Diarrhea, rash, nausea, allergic reactions, antibiotic-associated colitis",
    storage: "Store below 25°C, protect from moisture",
    safety: [
      "Do not use if allergic to penicillin antibiotics",
      "Complete the full prescribed course",
      "Use effective contraception (reduces OCP efficacy)",
      "Report any skin rash immediately",
    ],
    inStock: true,
  },
  {
    id: "cetirizine-10mg",
    name: "Cetirizine 10mg",
    genericName: "Cetirizine Hydrochloride",
    category: "Antihistamine",
    manufacturer: "Dr. Reddy's",
    price: 28,
    mrp: 35,
    image: "/images/pharmacy/cetirizine-10mg.png",
    description:
      "Cetirizine 10mg is a second-generation antihistamine for relief of allergic symptoms including hay fever, urticaria, and allergic rhinitis with minimal sedation.",
    composition: "Each tablet contains Cetirizine Hydrochloride IP 10mg",
    dosage: "1 tablet once daily in the evening. Max 10mg/day.",
    usage: "Allergic rhinitis, Urticaria, Hay fever, Seasonal allergies, Dust allergy",
    sideEffects:
      "Mild drowsiness, dry mouth, headache, fatigue (less than first-gen antihistamines)",
    storage: "Store below 25°C, protect from light",
    safety: [
      "May cause drowsiness — avoid driving if affected",
      "Avoid alcohol as it intensifies sedation",
      "Use caution in elderly and renal impairment",
      "Not recommended during pregnancy without consultation",
    ],
    inStock: true,
  },
  {
    id: "ibuprofen-400mg",
    name: "Ibuprofen 400mg",
    genericName: "Ibuprofen",
    category: "NSAID",
    manufacturer: "Abbott",
    price: 35,
    mrp: 42,
    image: "/images/pharmacy/ibuprofen-400mg.png",
    description:
      "Ibuprofen 400mg is a non-steroidal anti-inflammatory drug (NSAID) used for pain, inflammation, and fever. Effective for musculoskeletal conditions, arthritis, and dental pain.",
    composition: "Each tablet contains Ibuprofen IP 400mg",
    dosage:
      "1 tablet 3 times daily after meals. Max 1200mg/day (OTC) or up to 2400mg/day (prescription).",
    usage: "Arthritis, Musculoskeletal pain, Dysmenorrhea, Dental pain, Fever, Gout",
    sideEffects: "Gastric irritation, heartburn, GI bleeding, renal impairment, increased BP",
    storage: "Store below 25°C, protect from moisture",
    safety: [
      "Take with food or milk to reduce stomach irritation",
      "Avoid alcohol while taking ibuprofen",
      "Do not exceed 10 days of use without medical advice",
      "Not recommended in pregnancy (especially 3rd trimester)",
      "Avoid in patients with history of peptic ulcer or asthma",
    ],
    inStock: true,
  },
  {
    id: "losartan-50mg",
    name: "Losartan 50mg",
    genericName: "Losartan Potassium",
    category: "ARB",
    manufacturer: "Merck",
    price: 48,
    mrp: 58,
    image: "/images/pharmacy/losartan-50mg.png",
    description:
      "Losartan 50mg is an angiotensin receptor blocker (ARB) for hypertension management. It protects the kidneys in type 2 diabetes patients with proteinuria.",
    composition: "Each tablet contains Losartan Potassium IP 50mg",
    dosage: "1 tablet once daily. Max 100mg/day.",
    usage: "Essential hypertension, Diabetic nephropathy, Stroke prevention",
    sideEffects: "Dizziness, hyperkalemia, renal impairment, angioedema (rare)",
    storage: "Store below 25°C in a dry place",
    safety: [
      "Monitor BP, renal function, and potassium levels",
      "Avoid potassium supplements",
      "Not safe during pregnancy — stop immediately if pregnant",
      "May cause dizziness — caution while driving",
      "Do not use with aliskiren in diabetic patients",
    ],
    inStock: true,
  },
];

// ─── Store helpers ─────────────────────────────────────────

export function generateTrackingId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ZH-${y}${m}${d}-${rand}`;
}

export function getProductBySlug(slug: string): PharmProduct | undefined {
  return PRODUCTS.find((p) => p.id === slug);
}

export function getProductsByCategory(category: string): PharmProduct[] {
  if (category === "all") return PRODUCTS;
  return PRODUCTS.filter((p) => p.category === category);
}

const STORAGE_KEY_CART = "zobraipharm_cart";
const STORAGE_KEY_CART_PREFIX = "zobraipharm_cart_";
const STORAGE_KEY_ORDERS = "zobraipharm_orders";

function cartKey(userId?: string): string {
  return userId ? `${STORAGE_KEY_CART_PREFIX}${userId}` : STORAGE_KEY_CART;
}

export function loadCart(userId?: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(cartKey(userId));
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[], userId?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(cartKey(userId), JSON.stringify(items));
}

export async function syncCartToSupabase(userId: string): Promise<void> {
  const items = loadCart(userId);
  try {
    await fetch("/api/store/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, items }),
    });
  } catch (err) {
    console.warn("[cart] Supabase sync failed:", err);
  }
}

export async function loadCartFromSupabase(userId: string): Promise<CartItem[]> {
  try {
    const {
      data: { session },
    } = await import("@/lib/supabase").then((m) => m.supabase.auth.getSession());
    const token = session?.access_token;
    const res = await fetch(`/api/store/cart?userId=${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      const items = data?.items || [];
      saveCart(items, userId);
      return items;
    }
  } catch {}
  return loadCart(userId);
}

export function loadOrders(): PharmOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDERS);
    return raw ? (JSON.parse(raw) as PharmOrder[]) : [];
  } catch {
    return [];
  }
}

export function saveOrders(orders: PharmOrder[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
}

export function STORAGE_KEYS() {
  return { CART: STORAGE_KEY_CART, ORDERS: STORAGE_KEY_ORDERS };
}
