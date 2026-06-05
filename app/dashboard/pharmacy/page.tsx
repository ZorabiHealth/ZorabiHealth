"use client";

import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Plus,
  Truck,
  Check,
  Clock,
  X,
  Package,
  Phone,
  Mail,
  MapPin,
  Star,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Building2,
  Pill,
  Search,
  Database,
  Wifi,
  WifiOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Medication,
  Vendor,
  RefillOrder,
  OrderStatus,
  STORAGE_KEYS,
  DEMO_MEDICATIONS,
  loadFromStorage,
  saveToStorage,
  generateTrackingId,
  haversineDistance,
  OrderEvent,
} from "@/lib/medications";
import { supabase, queueSyncItem, drainSyncQueue } from "@/lib/supabase";

type PharmacyTab = "orders" | "request" | "vendors";

// ─── Demo vendor data ─────────────────────────────────────────
const DEMO_VENDORS: Vendor[] = [
  {
    id: "v-001",
    businessName: "City Pharma Pvt. Ltd.",
    licenseNo: "PH-KA-2024-11201",
    email: "orders@citypharma.in",
    phone: "+918028001234",
    address: "42, MG Road, Bengaluru",
    pincode: "560001",
    lat: 12.9757,
    lng: 77.6066,
    serviceRadiusKm: 10,
    operatingHours: "Mon-Sat 09:00-21:00",
    isActive: true,
    isVerified: true,
    rating: 4.7,
    inventory: {
      "Metformin 500mg": { stock: 200, pricePerUnit: 8 },
      "Atorvastatin 10mg": { stock: 150, pricePerUnit: 12 },
      "Lisinopril 5mg": { stock: 80, pricePerUnit: 6 },
    },
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "v-002",
    businessName: "Apollo Pharmacy — Koramangala",
    licenseNo: "PH-KA-2024-20890",
    email: "koramangala@apollopharmacy.in",
    phone: "+918022334455",
    address: "1st Block, Koramangala, Bengaluru",
    pincode: "560034",
    lat: 12.9347,
    lng: 77.6221,
    serviceRadiusKm: 7,
    operatingHours: "Daily 08:00-22:00",
    isActive: true,
    isVerified: true,
    rating: 4.9,
    inventory: {
      "Metformin 500mg": { stock: 500, pricePerUnit: 9 },
      "Atorvastatin 10mg": { stock: 300, pricePerUnit: 11 },
      "Lisinopril 5mg": { stock: 200, pricePerUnit: 7 },
    },
    createdAt: "2024-01-01T00:00:00Z",
  },
];

const ORDER_STEPS: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "DISPATCHED", "DELIVERED"];
const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "text-amber-600 bg-amber-50 border border-amber-100",
  CONFIRMED: "text-blue-600 bg-blue-50 border border-blue-100",
  PREPARING: "text-violet-600 bg-violet-50 border border-violet-100",
  DISPATCHED: "text-orange-600 bg-orange-50 border border-orange-100",
  DELIVERED: "text-emerald-600 bg-emerald-50 border border-emerald-100",
  CANCELLED: "text-red-600 bg-red-50 border border-red-100",
};

const BLANK_VENDOR_FORM = {
  businessName: "",
  licenseNo: "",
  email: "",
  phone: "",
  address: "",
  pincode: "",
  serviceRadiusKm: "7",
  operatingHours: "Mon-Sat 09:00-21:00",
};

function generateUUID(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function PharmacyPage() {
  const [tab, setTab] = useState<PharmacyTab>("orders");
  const [meds, setMeds] = useState<Medication[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<RefillOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<RefillOrder | null>(null);

  // Refill request state
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [quantity, setQuantity] = useState("30");
  const [deliveryAddress, setDeliveryAddress] = useState("42, Baker Street, Bengaluru");
  const [patientEmail, setPatientEmail] = useState("patient@zorabihealth.com");
  const [requestStep, setRequestStep] = useState<"select_med" | "select_vendor" | "confirm">(
    "select_med"
  );
  const [isPlacing, setIsPlacing] = useState(false);
  const [placeResult, setPlaceResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Vendor registration state
  const [vendorForm, setVendorForm] = useState(BLANK_VENDOR_FORM);
  const [vendorSubmitted, setVendorSubmitted] = useState(false);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<"connected" | "offline" | "syncing">("connected");
  const [isLoading, setIsLoading] = useState(true);

  // Load from Supabase + Local Cache Fallback
  const loadData = async () => {
    setIsLoading(true);
    const isOnline = typeof window !== "undefined" && navigator.onLine;

    if (!isOnline) {
      setSyncStatus("offline");
      setMeds(loadFromStorage<Medication[]>(STORAGE_KEYS.MEDICATIONS, DEMO_MEDICATIONS));
      setVendors(loadFromStorage<Vendor[]>(STORAGE_KEYS.VENDORS, DEMO_VENDORS));
      setOrders(loadFromStorage<RefillOrder[]>(STORAGE_KEYS.REFILL_ORDERS, []));
      setIsLoading(false);
      return;
    }

    try {
      setSyncStatus("syncing");
      await drainSyncQueue();

      // Fetch active medications
      const { data: dbMeds, error: medsError } = await supabase
        .from("medications")
        .select("*")
        .eq("is_active", true);
      if (medsError) throw medsError;

      // Fetch vendors
      const { data: dbVendors, error: vendorsError } = await supabase.from("vendors").select("*");
      if (vendorsError) throw vendorsError;

      // Fetch orders + their timeline events
      const { data: dbOrders, error: ordersError } = await supabase
        .from("refill_orders")
        .select(
          `
          *,
          refill_order_events (*)
        `
        )
        .order("created_at", { ascending: false });
      if (ordersError) throw ordersError;

      // Map Medications
      const mappedMeds: Medication[] = (dbMeds || []).map((db) => ({
        id: db.id,
        name: db.name,
        genericName: db.generic_name || undefined,
        dosage: db.dosage,
        category: db.category,
        frequency: db.frequency,
        scheduledTimes: db.scheduled_times,
        startDate: db.start_date,
        currentStock: db.current_stock,
        refillAt: db.refill_at,
        prescribedBy: db.prescribed_by || "",
        phoneForAlerts: db.phone_for_alerts || "",
        isActive: db.is_active,
        color: db.color,
        createdAt: db.created_at,
        updatedAt: db.updated_at,
      }));

      // Map Vendors (ensure we fallback to seed demo vendors if database is fresh/empty)
      let mappedVendors: Vendor[] = (dbVendors || []).map((db) => ({
        id: db.id,
        businessName: db.business_name,
        licenseNo: db.license_no,
        email: db.email,
        phone: db.phone || "",
        address: db.address,
        pincode: db.pincode,
        lat: db.lat,
        lng: db.lng,
        serviceRadiusKm: db.service_radius_km,
        operatingHours: db.operating_hours,
        isActive: db.is_active,
        isVerified: db.is_verified,
        rating: db.rating,
        inventory: db.inventory,
        createdAt: db.created_at,
      }));

      if (mappedVendors.length === 0) {
        // Seed demo vendors locally and push them to database if online
        mappedVendors = DEMO_VENDORS;
        for (const dv of DEMO_VENDORS) {
          await supabase.from("vendors").upsert(dv);
        }
      }

      // Map Orders
      const mappedOrders: RefillOrder[] = (dbOrders || []).map((db) => {
        const events: OrderEvent[] = (db.refill_order_events || [])
          .map((e: any) => ({
            status: e.status as OrderStatus,
            timestamp: e.timestamp,
            note: e.note || undefined,
          }))
          .sort(
            (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

        return {
          id: db.id,
          trackingId: db.tracking_id,
          medicationId: db.medication_id,
          medicationName: db.medication_name,
          dosage: db.dosage,
          quantity: db.quantity,
          vendorId: db.vendor_id,
          vendorName: db.vendor_name,
          vendorEmail: db.vendor_email,
          vendorPhone: db.vendor_phone || "",
          patientEmail: db.patient_email,
          patientPhone: db.patient_phone || "",
          deliveryAddress: db.delivery_address,
          status: db.status as OrderStatus,
          totalPrice: parseFloat(db.total_price),
          timeline: events,
          createdAt: db.created_at,
          updatedAt: db.updated_at,
          estimatedDelivery: db.estimated_delivery || undefined,
          idempotencyKey: db.idempotency_key || "",
        };
      });

      setMeds(mappedMeds);
      setVendors(mappedVendors);
      setOrders(mappedOrders);

      // Sync local caches
      saveToStorage(STORAGE_KEYS.MEDICATIONS, mappedMeds);
      saveToStorage(STORAGE_KEYS.VENDORS, mappedVendors);
      saveToStorage(STORAGE_KEYS.REFILL_ORDERS, mappedOrders);
      setSyncStatus("connected");

      // Keep active order details current
      if (selectedOrder) {
        const currentSelected = mappedOrders.find((o) => o.id === selectedOrder.id);
        if (currentSelected) setSelectedOrder(currentSelected);
      }
    } catch (err) {
      console.error("[Pharmacy] Supabase sync failed. Falling back to local cache:", err);
      setSyncStatus("offline");
      setMeds(loadFromStorage<Medication[]>(STORAGE_KEYS.MEDICATIONS, DEMO_MEDICATIONS));
      setVendors(loadFromStorage<Vendor[]>(STORAGE_KEYS.VENDORS, DEMO_VENDORS));
      setOrders(loadFromStorage<RefillOrder[]>(STORAGE_KEYS.REFILL_ORDERS, []));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to network transitions
    const handleOnline = () => {
      setSyncStatus("syncing");
      loadData();
    };
    const handleOffline = () => setSyncStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Setup real-time updates on orders
    const channel = supabase
      .channel("realtime-refill-orders-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "refill_orders" }, () => {
        console.log("[Realtime] Order status update received, refreshing...");
        loadData();
      })
      .subscribe();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      supabase.removeChannel(channel);
    };
  }, []);

  const urgentMeds = meds.filter((m) => m.isActive && m.currentStock <= m.refillAt);
  const nearingMeds = meds.filter(
    (m) => m.isActive && m.currentStock > m.refillAt && m.currentStock <= m.refillAt * 2
  );

  // ─── Vendor Matching ─────────────────────────────────────
  const matchVendors = (med: Medication): Vendor[] => {
    const medKey = `${med.name} ${med.dosage}`;
    return vendors
      .filter((v) => v.isActive)
      .filter((v) => (v.inventory[medKey]?.stock ?? 0) > 0)
      .sort((a, b) => b.rating - a.rating);
  };

  // ─── Place Refill Order ──────────────────────────────────
  const placeOrder = async () => {
    if (!selectedMed || !selectedVendor) return;
    setIsPlacing(true);
    setPlaceResult(null);

    try {
      const orderId = generateUUID();
      const trackingId = generateTrackingId();
      const medKey = `${selectedMed.name} ${selectedMed.dosage}`;
      const pricePerUnit = selectedVendor.inventory[medKey]?.pricePerUnit ?? 10;
      const totalPrice = pricePerUnit * parseInt(quantity);
      const nowObj = new Date();
      const now = nowObj.toISOString();
      const estimatedDelivery = new Date(nowObj.getTime() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const idempotencyKey = `${selectedMed.id}-${nowObj.getTime()}`;

      const newOrder: RefillOrder = {
        id: orderId,
        trackingId,
        medicationId: selectedMed.id,
        medicationName: selectedMed.name,
        dosage: selectedMed.dosage,
        quantity: parseInt(quantity),
        vendorId: selectedVendor.id,
        vendorName: selectedVendor.businessName,
        vendorEmail: selectedVendor.email,
        vendorPhone: selectedVendor.phone,
        patientEmail,
        patientPhone: selectedMed.phoneForAlerts || "",
        deliveryAddress,
        status: "PENDING",
        totalPrice,
        timeline: [{ status: "PENDING", timestamp: now }],
        createdAt: now,
        updatedAt: now,
        estimatedDelivery,
        idempotencyKey,
      };

      // Optimistic UI updates
      const updatedOrders = [newOrder, ...orders];
      setOrders(updatedOrders);
      saveToStorage(STORAGE_KEYS.REFILL_ORDERS, updatedOrders);
      setSelectedOrder(newOrder);

      const dbOrderPayload = {
        id: newOrder.id,
        tracking_id: newOrder.trackingId,
        medication_id: newOrder.medicationId,
        medication_name: newOrder.medicationName,
        dosage: newOrder.dosage,
        quantity: newOrder.quantity,
        vendor_id: newOrder.vendorId,
        vendor_name: newOrder.vendorName,
        vendor_email: newOrder.vendorEmail,
        vendor_phone: newOrder.vendorPhone,
        patient_email: newOrder.patientEmail,
        patient_phone: newOrder.patientPhone,
        delivery_address: newOrder.deliveryAddress,
        status: newOrder.status,
        total_price: newOrder.totalPrice,
        estimated_delivery: newOrder.estimatedDelivery,
        idempotency_key: newOrder.idempotencyKey,
      };

      const dbEventPayload = {
        order_id: newOrder.id,
        status: "PENDING",
        timestamp: now,
      };

      if (navigator.onLine) {
        // Insert order
        const { error: orderErr } = await supabase.from("refill_orders").insert(dbOrderPayload);
        if (orderErr) throw orderErr;

        // Insert first event
        const { error: eventErr } = await supabase
          .from("refill_order_events")
          .insert(dbEventPayload);
        if (eventErr) throw eventErr;

        console.log("[Supabase] Refill order placed successfully.");
      } else {
        queueSyncItem({ table: "refill_orders", action: "insert", payload: dbOrderPayload });
        queueSyncItem({ table: "refill_order_events", action: "insert", payload: dbEventPayload });
        setSyncStatus("offline");
      }

      setPlaceResult({ ok: true, msg: `Order placed! Tracking ID: ${trackingId}` });

      // Clean up creation variables
      setSelectedMed(null);
      setSelectedVendor(null);
      setQuantity("30");
      setRequestStep("select_med");
      setTab("orders");

      // Auto-simulate vendor confirming order in 5 seconds
      setTimeout(() => {
        updateOrderStatus(orderId, "CONFIRMED");
      }, 5000);
    } catch (err) {
      console.error("[Pharmacy] Placement failed:", err);
      setPlaceResult({
        ok: false,
        msg: err instanceof Error ? err.message : "Failed to place order",
      });
    } finally {
      setIsPlacing(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const now = new Date().toISOString();

    // Update local state first
    setOrders((prev) => {
      const updated = prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status: newStatus,
          updatedAt: now,
          timeline: [...o.timeline, { status: newStatus, timestamp: now }],
        };
      });
      saveToStorage(STORAGE_KEYS.REFILL_ORDERS, updated);
      return updated;
    });

    const dbOrderUpdate = { status: newStatus, updated_at: now };
    const dbEventPayload = { order_id: orderId, status: newStatus, timestamp: now };

    if (navigator.onLine) {
      try {
        const { error: orderErr } = await supabase
          .from("refill_orders")
          .update(dbOrderUpdate)
          .eq("id", orderId);
        if (orderErr) throw orderErr;

        const { error: eventErr } = await supabase
          .from("refill_order_events")
          .insert(dbEventPayload);
        if (eventErr) throw eventErr;

        console.log(`[Supabase] Updated status to ${newStatus}`);
      } catch (err) {
        console.error("[Supabase] Failed to update status, queuing offline:", err);
        queueSyncItem({
          table: "refill_orders",
          action: "update",
          payload: { id: orderId, ...dbOrderUpdate },
        });
        queueSyncItem({ table: "refill_order_events", action: "insert", payload: dbEventPayload });
        setSyncStatus("offline");
      }
    } else {
      queueSyncItem({
        table: "refill_orders",
        action: "update",
        payload: { id: orderId, ...dbOrderUpdate },
      });
      queueSyncItem({ table: "refill_order_events", action: "insert", payload: dbEventPayload });
      setSyncStatus("offline");
    }
  };

  const cancelOrder = (orderId: string) => {
    updateOrderStatus(orderId, "CANCELLED");
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({
        ...selectedOrder,
        status: "CANCELLED",
        timeline: [
          ...selectedOrder.timeline,
          { status: "CANCELLED", timestamp: new Date().toISOString() },
        ],
      });
    }
  };

  // ─── Register Vendor ─────────────────────────────────────
  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vendorId = generateUUID();
    const newVendor: Vendor = {
      id: vendorId,
      businessName: vendorForm.businessName,
      licenseNo: vendorForm.licenseNo,
      email: vendorForm.email,
      phone: vendorForm.phone,
      address: vendorForm.address,
      pincode: vendorForm.pincode,
      lat: 12.97 + Math.random() * 0.1,
      lng: 77.59 + Math.random() * 0.1,
      serviceRadiusKm: parseFloat(vendorForm.serviceRadiusKm),
      operatingHours: vendorForm.operatingHours,
      isActive: false, // pending verification
      isVerified: false,
      rating: 4.5,
      inventory: {
        "Metformin 500mg": { stock: 100, pricePerUnit: 8 },
        "Atorvastatin 10mg": { stock: 100, pricePerUnit: 12 },
        "Lisinopril 5mg": { stock: 100, pricePerUnit: 6 },
      },
      createdAt: new Date().toISOString(),
    };

    // Update local state
    const updated = [...vendors, newVendor];
    setVendors(updated);
    saveToStorage(STORAGE_KEYS.VENDORS, updated);
    setVendorSubmitted(true);
    setVendorForm(BLANK_VENDOR_FORM);

    if (navigator.onLine) {
      try {
        const { error } = await supabase.from("vendors").insert({
          id: newVendor.id,
          business_name: newVendor.businessName,
          license_no: newVendor.licenseNo,
          email: newVendor.email,
          phone: newVendor.phone,
          address: newVendor.address,
          pincode: newVendor.pincode,
          lat: newVendor.lat,
          lng: newVendor.lng,
          service_radius_km: newVendor.serviceRadiusKm,
          operating_hours: newVendor.operatingHours,
          is_active: newVendor.isActive,
          is_verified: newVendor.isVerified,
          rating: newVendor.rating,
          inventory: newVendor.inventory,
        });
        if (error) throw error;
        console.log("[Supabase] Registered vendor successfully.");
      } catch (err) {
        console.error("[Supabase] Failed to register vendor, queuing:", err);
        queueSyncItem({
          table: "vendors",
          action: "insert",
          payload: newVendor as unknown as Record<string, unknown>,
        });
        setSyncStatus("offline");
      }
    } else {
      queueSyncItem({
        table: "vendors",
        action: "insert",
        payload: newVendor as unknown as Record<string, unknown>,
      });
      setSyncStatus("offline");
    }
  };

  const activeOrders = orders.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED");
  const historyOrders = orders.filter((o) => o.status === "DELIVERED" || o.status === "CANCELLED");

  return (
    <div className="w-full min-h-full bg-[#f0f5ff] p-6 md:p-8 flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-emerald-600 animate-pulse" /> Pharmacy & Refills
            </h1>

            {/* Sync Status Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-slate-100 shadow-sm">
              {syncStatus === "connected" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 absolute" />
                  <Database className="w-3.5 h-3.5 text-emerald-600 ml-1" />
                  <span className="text-emerald-700">Database Synced</span>
                </>
              )}
              {syncStatus === "offline" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-amber-500 absolute" />
                  <WifiOff className="w-3.5 h-3.5 text-amber-600 ml-1" />
                  <span className="text-amber-700">Offline Mode</span>
                </>
              )}
              {syncStatus === "syncing" && (
                <>
                  <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                  <span className="text-blue-700 ml-1">Syncing...</span>
                </>
              )}
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Automated refills matching nearest active vendors with status tracking
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["orders", "request", "vendors"] as PharmacyTab[]).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={tab === t ? "default" : "outline"}
              onClick={() => setTab(t)}
              className="text-xs capitalize rounded-xl shadow-sm"
            >
              {t === "orders"
                ? `Active Orders (${activeOrders.length})`
                : t === "request"
                  ? "Request Refill"
                  : "Pharmacy Registration"}
            </Button>
          ))}
        </div>
      </header>

      {/* ── Urgent Refill Banner ─────────────────────────────── */}
      <AnimatePresence>
        {urgentMeds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-2.5 text-red-700 text-sm font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
              <span>
                URGENT: {urgentMeds.map((m) => `${m.name} (${m.currentStock} left)`).join(", ")} —
                critical stock levels!
              </span>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setTab("request");
                setRequestStep("select_med");
              }}
              className="rounded-xl font-bold shadow-md"
            >
              Refill Immediately
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ ORDERS TAB ═══════════════════════════════════════════ */}
      {tab === "orders" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0">
          {/* Order list */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              Active Refills
            </h3>
            {isLoading ? (
              /* Skeleton Loader */
              <div className="space-y-3">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse h-24"
                  />
                ))}
              </div>
            ) : activeOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-100 shadow-sm py-16">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-500 animate-bounce" />
                <p className="font-bold text-slate-600">No active refill orders</p>
                <p className="text-xs text-slate-400 mt-1">
                  Submit a pharmacy refill request when you run low on medications.
                </p>
                <button
                  onClick={() => setTab("request")}
                  className="mt-4 text-xs text-blue-600 font-semibold hover:underline"
                >
                  Place order now →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    layoutId={`order-card-${order.id}`}
                    onClick={() => setSelectedOrder(order)}
                    className={`bg-white rounded-2xl p-4.5 border cursor-pointer transition-all hover:shadow-md ${selectedOrder?.id === order.id ? "border-blue-500 shadow-md scale-[1.01]" : "border-slate-100"}`}
                  >
                    <div className="flex items-start justify-between mb-2.5">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">
                          {order.trackingId}
                        </p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">
                          {order.medicationName} {order.dosage}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {order.quantity} units · ₹{order.totalPrice}
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 border-t border-slate-50 pt-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" /> {order.vendorName}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {historyOrders.length > 0 && !isLoading && (
              <>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider pt-4">
                  History
                </h3>
                <div className="space-y-2">
                  {historyOrders.slice(0, 3).map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="bg-white/60 rounded-2xl p-4 border border-slate-100 cursor-pointer opacity-70 hover:opacity-100 transition-all hover:shadow-sm"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-mono text-slate-400 font-semibold">
                            {order.trackingId}
                          </p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">
                            {order.medicationName} {order.dosage}
                          </p>
                        </div>
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Order detail / tracking timeline */}
          <div className="lg:col-span-3">
            {selectedOrder ? (
              <motion.div
                layoutId={`order-detail-${selectedOrder.id}`}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6"
              >
                <div className="flex justify-between items-start border-b border-slate-50 pb-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-mono font-bold tracking-wider">
                      REFILL TRACKER
                    </p>
                    <h3 className="text-xl font-black text-slate-800 mt-0.5">
                      {selectedOrder.trackingId}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">
                      {selectedOrder.medicationName} {selectedOrder.dosage} ×{" "}
                      {selectedOrder.quantity}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-black px-3.5 py-1.5 rounded-full border ${STATUS_COLORS[selectedOrder.status]}`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>

                {/* Timeline Progress */}
                {selectedOrder.status !== "CANCELLED" && (
                  <div className="relative py-2">
                    <div className="flex items-center justify-between">
                      {ORDER_STEPS.map((step, i) => {
                        const stepIndex = ORDER_STEPS.indexOf(selectedOrder.status);
                        const isDone = i <= stepIndex;
                        const isCurrent = i === stepIndex;
                        const stepEvent = selectedOrder.timeline.find((t) => t.status === step);

                        return (
                          <div key={step} className="flex flex-col items-center flex-1 relative">
                            <motion.div
                              initial={{ scale: 0.8 }}
                              animate={{ scale: isCurrent ? 1.15 : 1 }}
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 border-2 transition-colors ${
                                isDone
                                  ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                                  : "bg-white border-slate-200 text-slate-300"
                              } ${isCurrent ? "ring-4 ring-emerald-100" : ""}`}
                            >
                              {isDone ? <Check className="w-4 h-4" /> : i + 1}
                            </motion.div>
                            <span
                              className={`text-[10px] mt-2.5 font-bold text-center ${isDone ? "text-emerald-600" : "text-slate-400"}`}
                            >
                              {step}
                            </span>
                            {stepEvent && (
                              <span className="text-[8px] text-slate-400 font-semibold mt-0.5">
                                {new Date(stepEvent.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Progress track connector bar */}
                    <div className="absolute top-6 left-0 right-0 h-0.5 bg-slate-100 -z-10">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-700 ease-in-out"
                        style={{
                          width: `${(ORDER_STEPS.indexOf(selectedOrder.status) / (ORDER_STEPS.length - 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Delivery details panel */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3.5">
                  <div className="flex items-center gap-2.5 text-sm">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-slate-700">{selectedOrder.vendorName}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-slate-500 font-medium">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <a
                      href={`tel:${selectedOrder.vendorPhone}`}
                      className="hover:text-blue-600 transition-colors font-mono"
                    >
                      {selectedOrder.vendorPhone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-slate-500 font-medium">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <a
                      href={`mailto:${selectedOrder.vendorEmail}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {selectedOrder.vendorEmail}
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-slate-500 font-medium">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{selectedOrder.deliveryAddress}</span>
                  </div>
                  {selectedOrder.estimatedDelivery && (
                    <div className="flex items-center gap-2.5 text-sm text-slate-500 font-medium">
                      <Truck className="w-4 h-4 text-slate-400" />
                      <span>
                        Est. delivery: <strong>{selectedOrder.estimatedDelivery}</strong>
                      </span>
                    </div>
                  )}
                  <div className="text-sm font-bold text-slate-800 border-t border-slate-200 pt-3.5 mt-2.5 flex justify-between">
                    <span>Amount Charged:</span>
                    <span>₹{selectedOrder.totalPrice}</span>
                  </div>
                </div>

                {/* Developer Timeline Advancement Tools */}
                {selectedOrder.status !== "DELIVERED" && selectedOrder.status !== "CANCELLED" && (
                  <div className="border-t border-slate-100 pt-4.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Simulated Vendor Controls
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {ORDER_STEPS.filter(
                        (s) => ORDER_STEPS.indexOf(s) > ORDER_STEPS.indexOf(selectedOrder.status)
                      ).map((s) => (
                        <button
                          key={s}
                          onClick={() => updateOrderStatus(selectedOrder.id, s)}
                          className="text-[10px] px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-600 border border-slate-200 rounded-xl font-bold transition-all shadow-sm"
                        >
                          → Mark {s}
                        </button>
                      ))}
                      <button
                        onClick={() => cancelOrder(selectedOrder.id)}
                        className="text-[10px] px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 font-bold transition-all shadow-sm ml-auto"
                      >
                        Cancel Refill
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 py-24">
                <Truck className="w-16 h-16 mx-auto mb-4 opacity-20 text-blue-500 animate-bounce" />
                <p className="font-bold text-slate-600 text-lg">Select a Refill Order</p>
                <p className="text-sm text-slate-400 max-w-xs mx-auto mt-1">
                  Select an active request from the sidebar list to observe the delivery tracking
                  status and timing logs.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ REQUEST REFILL TAB ════════════════════════════════════ */}
      {tab === "request" && (
        <div className="max-w-2xl mx-auto w-full space-y-5">
          {placeResult && (
            <div
              className={`rounded-2xl px-5 py-4 text-sm font-semibold border ${placeResult.ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}
            >
              {placeResult.ok ? "✅" : "❌"} {placeResult.msg}
            </div>
          )}

          {/* Step 1: Select Medication */}
          <div
            className={`bg-white rounded-3xl border shadow-sm p-6 transition-all ${requestStep !== "select_med" ? "opacity-60 border-slate-100" : "border-blue-400"}`}
          >
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-3.5">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${requestStep !== "select_med" ? "bg-emerald-500 text-white" : "bg-blue-600 text-white"}`}
              >
                {requestStep !== "select_med" ? <Check className="w-4 h-4" /> : "1"}
              </span>
              Select Medication
            </h3>
            <div className="space-y-2">
              {meds
                .filter((m) => m.isActive)
                .map((med) => (
                  <button
                    key={med.id}
                    onClick={() => {
                      setSelectedMed(med);
                      setRequestStep("select_vendor");
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${selectedMed?.id === med.id ? "border-blue-500 bg-blue-50/50" : "border-slate-100 hover:border-blue-200 hover:bg-slate-50"}`}
                  >
                    <div className="flex items-center gap-3">
                      <Pill
                        className={`w-4 h-4 ${med.currentStock <= med.refillAt ? "text-red-500 animate-pulse" : "text-slate-400"}`}
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {med.name} {med.dosage}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {med.currentStock} pills remaining
                        </p>
                      </div>
                    </div>
                    {med.currentStock <= med.refillAt && (
                      <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                        URGENT
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400 ml-2" />
                  </button>
                ))}
            </div>
          </div>

          {/* Step 2: Choose Pharmacy */}
          {requestStep !== "select_med" && selectedMed && (
            <div
              className={`bg-white rounded-3xl border shadow-sm p-6 transition-all ${requestStep !== "select_vendor" ? "opacity-60 border-slate-100" : "border-blue-400"}`}
            >
              <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-3.5">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${requestStep === "confirm" ? "bg-emerald-500 text-white" : "bg-blue-600 text-white"}`}
                >
                  {requestStep === "confirm" ? <Check className="w-4 h-4" /> : "2"}
                </span>
                Choose Pharmacy
              </h3>
              <p className="text-xs text-slate-400 ml-10 mb-4">
                Nearest vendors carrying {selectedMed.name} {selectedMed.dosage}
              </p>
              <div className="space-y-2">
                {matchVendors(selectedMed).map((v) => {
                  const medKey = `${selectedMed.name} ${selectedMed.dosage}`;
                  const price = v.inventory[medKey]?.pricePerUnit ?? 10;
                  const stock = v.inventory[medKey]?.stock ?? 0;

                  return (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedVendor(v);
                        setRequestStep("confirm");
                      }}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${selectedVendor?.id === v.id ? "border-blue-500 bg-blue-50/50" : "border-slate-100 hover:border-blue-200 hover:bg-slate-50"}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-800">{v.businessName}</p>
                          <div className="flex items-center gap-0.5 text-[10px] text-amber-500 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {v.rating}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                          {v.address} · {v.operatingHours}
                        </p>
                        <p className="text-xs text-emerald-600 font-semibold">
                          ₹{price}/pill · {stock} in stock
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  );
                })}
                {matchVendors(selectedMed).length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4 font-semibold">
                    No active vendors found stocking this medicine.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Confirm Order */}
          {requestStep === "confirm" && selectedMed && selectedVendor && (
            <div className="bg-white rounded-3xl border border-blue-400 shadow-sm p-6 md:p-8 space-y-5">
              <h3 className="font-bold text-slate-800 flex items-center gap-3.5">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black bg-blue-600 text-white">
                  3
                </span>
                Confirm Order
              </h3>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Medication</span>
                  <span className="font-bold text-slate-800">
                    {selectedMed.name} {selectedMed.dosage}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Vendor</span>
                  <span className="font-bold text-slate-800">{selectedVendor.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Price per unit</span>
                  <span className="font-semibold">
                    ₹
                    {
                      selectedVendor.inventory[`${selectedMed.name} ${selectedMed.dosage}`]
                        ?.pricePerUnit
                    }
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                    Quantity (pills)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                    Total Price
                  </label>
                  <div className="h-10 flex items-center px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-slate-800">
                    ₹
                    {(selectedVendor.inventory[`${selectedMed.name} ${selectedMed.dosage}`]
                      ?.pricePerUnit ?? 0) * parseInt(quantity || "0")}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                  Delivery Address
                </label>
                <Input
                  placeholder="Enter patient home address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                  Recipient Notification Email
                </label>
                <Input
                  type="email"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-xl p-3.5 leading-relaxed font-medium">
                📧 Placing order sends a Gmail dispatch requisition to the vendor. A sequential
                tracking code (ZH-YYYYMMDD-XXXX) will be generated in the Supabase table.
              </div>
              <Button
                onClick={placeOrder}
                disabled={isPlacing || !deliveryAddress}
                className="w-full rounded-xl h-11 font-bold shadow-md shadow-blue-500/10"
              >
                {isPlacing ? "Placing Order..." : "Confirm & Send Refill Order"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ═══ VENDOR REGISTRATION TAB ══════════════════════════════ */}
      {tab === "vendors" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* Registration form */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" /> Pharmacy Vendor Onboarding
            </h3>
            {vendorSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12 text-emerald-700"
              >
                <Check className="w-12 h-12 mx-auto mb-4 bg-emerald-100 rounded-full p-2.5 border-4 border-emerald-50 text-emerald-600 animate-bounce" />
                <p className="font-black text-lg">Application Submitted</p>
                <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                  Our clinical onboarding team will review your pharmacy license and inventory stock
                  lists. Verification completes in 24 hours.
                </p>
                <button
                  onClick={() => setVendorSubmitted(false)}
                  className="mt-5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all"
                >
                  Register Another Location
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleVendorSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                      Business Name *
                    </label>
                    <Input
                      required
                      placeholder="e.g. City Pharmacy Koramangala"
                      value={vendorForm.businessName}
                      onChange={(e) =>
                        setVendorForm({ ...vendorForm, businessName: e.target.value })
                      }
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                      License Registry No. *
                    </label>
                    <Input
                      required
                      placeholder="PH-KA-2026-XXXXX"
                      value={vendorForm.licenseNo}
                      onChange={(e) => setVendorForm({ ...vendorForm, licenseNo: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                      Order Intake Email *
                    </label>
                    <Input
                      required
                      type="email"
                      placeholder="orders@pharmacy.in"
                      value={vendorForm.email}
                      onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                      Business Phone
                    </label>
                    <Input
                      placeholder="+91802XXXXXXXX"
                      value={vendorForm.phone}
                      onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                      Delivery Radius (km)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={vendorForm.serviceRadiusKm}
                      onChange={(e) =>
                        setVendorForm({ ...vendorForm, serviceRadiusKm: e.target.value })
                      }
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                      Store Street Address *
                    </label>
                    <Input
                      required
                      placeholder="42, MG Road, Bengaluru"
                      value={vendorForm.address}
                      onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">Pincode</label>
                    <Input
                      placeholder="560001"
                      value={vendorForm.pincode}
                      onChange={(e) => setVendorForm({ ...vendorForm, pincode: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                      Operating Hours
                    </label>
                    <Input
                      placeholder="Daily 08:00 - 22:00"
                      value={vendorForm.operatingHours}
                      onChange={(e) =>
                        setVendorForm({ ...vendorForm, operatingHours: e.target.value })
                      }
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-xl h-11 font-bold mt-2 shadow-md">
                  Register Location for Review
                </Button>
              </form>
            )}
          </div>

          {/* Verified vendors list */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 flex flex-col min-h-0">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" /> Active Pharmacy Directory (
              {vendors.length} registered)
            </h3>
            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {vendors.map((v) => (
                <div
                  key={v.id}
                  className="flex items-start justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-slate-100/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800">{v.businessName}</p>
                      {v.isVerified ? (
                        <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                          VERIFIED
                        </span>
                      ) : (
                        <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                          PENDING REVIEW
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-medium">{v.address}</p>
                    <p className="text-xs text-slate-500 font-semibold font-mono">
                      {v.phone} · {v.operatingHours}
                    </p>
                    {v.rating > 0 && (
                      <div className="flex items-center gap-0.5 mt-1 text-[10px] text-amber-500 font-black">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {v.rating}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
