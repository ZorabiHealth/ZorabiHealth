"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/lib/supabase";
import {
  Package,
  ShoppingBag,
  ChevronRight,
  Truck,
  MapPin,
  CheckCircle2,
  Loader2,
  Search,
  ExternalLink,
  Pill,
  AlertTriangle,
  RefreshCw,
  Plus,
  Check,
  AlertCircle,
  ClipboardList,
} from "lucide-react";

interface StoreOrder {
  id: string;
  tracking_id: string;
  status: string;
  total: number;
  created_at: string;
  estimated_delivery?: string;
  customer_name?: string;
  address?: string;
  city?: string;
  pincode?: string;
  items?: { id: string; product_name: string; quantity: number; product_price: number }[];
  events?: { id: string; status: string; timestamp: string; note?: string }[];
}

interface RefillOrder {
  id: string;
  tracking_id: string;
  medication_id: string;
  medication_name: string;
  dosage: string | null;
  quantity: number;
  frequency: string;
  status: string;
  created_at: string;
  product_id?: string | null;
  estimated_delivery?: string;
  payment_method?: string;
  delivery_address?: string;
  patient_phone?: string;
  events?: { id: string; status: string; timestamp: string; note?: string }[];
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  scheduled_times: string[];
  current_stock: number;
  refill_at: number;
  category: string;
  is_active: boolean;
  color: string;
  prescribed_by?: string;
  product_id?: string | null;
}

interface StoreProduct {
  id: string;
  name: string;
  price: number;
  mrp: number;
  dosage: string;
  generic_name: string;
  manufacturer: string;
}

type Tab = "orders" | "refill";

type OrderItem = (StoreOrder | RefillOrder) & { _type: "store" | "refill" };

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "Pending", color: "text-yellow-800", bg: "bg-yellow-100" },
  CONFIRMED: { label: "Confirmed", color: "text-blue-800", bg: "bg-blue-100" },
  PREPARING: { label: "Preparing", color: "text-amber-800", bg: "bg-amber-100" },
  DISPATCHED: { label: "Dispatched", color: "text-emerald-800", bg: "bg-emerald-100" },
  DELIVERED: { label: "Delivered", color: "text-green-800", bg: "bg-green-100" },
  CANCELLED: { label: "Cancelled", color: "text-red-800", bg: "bg-red-100" },
};

const STATUS_ORDER = ["PENDING", "CONFIRMED", "PREPARING", "DISPATCHED", "DELIVERED"];

const MED_COLORS: Record<string, string> = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

const TAB_STYLES: Record<Tab, { active: string; inactive: string }> = {
  orders: {
    active: "bg-emerald-600 text-white shadow-md shadow-emerald-200",
    inactive:
      "bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200",
  },
  refill: {
    active: "bg-purple-600 text-white shadow-md shadow-purple-200",
    inactive:
      "bg-white text-slate-600 hover:bg-purple-50 hover:text-purple-700 border border-slate-200",
  },
};

function isMedIncomplete(med: Medication): { incomplete: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!med.dosage || med.dosage.trim() === "") reasons.push("Dosage missing");
  if (!med.frequency || med.frequency.trim() === "") reasons.push("Frequency missing");
  if (!med.scheduled_times || med.scheduled_times.length === 0)
    reasons.push("Schedule times missing");
  return { incomplete: reasons.length > 0, reasons };
}

function MyOrdersContent() {
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Refill tab state
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medsLoading, setMedsLoading] = useState(true);
  const [refillingId, setRefillingId] = useState<string | null>(null);
  const [refillResult, setRefillResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [selectingProductFor, setSelectingProductFor] = useState<string | null>(null);

  useEffect(() => {
    let channel: { unsubscribe: () => void } | null = null;
    let cancelled = false;

    const fetchOrders = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const [storeRes, refillRes] = await Promise.all([
          fetch("/api/store/orders", { headers }),
          fetch("/api/store/refill", { headers }),
        ]);

        const storeOrders: StoreOrder[] = storeRes.ok ? await storeRes.json() : [];
        const refillOrders: RefillOrder[] = refillRes.ok ? await refillRes.json() : [];

        const merged: OrderItem[] = [
          ...storeOrders.map((o) => ({ ...o, _type: "store" as const })),
          ...refillOrders.map((o) => ({ ...o, _type: "refill" as const })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        if (cancelled) return;
        setOrders(merged);
        if (merged.length > 0 && !selectedOrder) {
          setSelectedOrder(merged[0]);
        }
      } catch (err) {
        console.error("[my-orders] Fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const fetchMeds = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        const { data } = await supabase
          .from("medications")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("is_active", true)
          .order("name");
        if (cancelled) return;
        setMedications(data || []);
      } catch {
        // silent
      } finally {
        if (!cancelled) setMedsLoading(false);
      }
    };

    fetchOrders();
    fetchMeds();

    // Fetch store products for linking
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
        const res = await fetch("/api/store/products", { headers });
        if (res.ok) {
          const json = await res.json();
          const products = json.products || json.data || [];
          if (!cancelled)
            setStoreProducts(
              Array.isArray(products)
                ? products.map((p: Record<string, unknown>) => ({
                    id: p.id as string,
                    name: p.name as string,
                    price: Number(p.price) || 0,
                    mrp: Number(p.mrp) || 0,
                    dosage: (p.dosage as string) || "",
                    generic_name: (p.generic_name as string) || "",
                    manufacturer: (p.manufacturer as string) || "",
                  }))
                : []
            );
        }
      } catch {
        // silent
      }
    })();

    const setupRealtime = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id || cancelled) return;

      channel = supabase
        .channel(`my-orders-${session.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "store_orders",
            filter: `user_id=eq.${session.user.id}`,
          },
          () => fetchOrders()
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      cancelled = true;
      channel?.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = searchQuery.trim()
    ? orders.filter((o) => {
        const query = searchQuery.toLowerCase();
        const tracking = (o as StoreOrder).tracking_id || "";
        const name = (o as RefillOrder).medication_name || "";
        return (
          tracking.toLowerCase().includes(query) ||
          name.toLowerCase().includes(query) ||
          o.status.toLowerCase().includes(query)
        );
      })
    : orders;

  const handleSelectOrder = async (order: OrderItem) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      if (order._type === "store") {
        const res = await fetch(`/api/store/orders?id=${order.id}`, { headers });
        if (res.ok) setSelectedOrder(await res.json());
      } else {
        const res = await fetch(`/api/store/refill?id=${order.id}`, { headers });
        if (res.ok) setSelectedOrder(await res.json());
        else setSelectedOrder(order);
      }
    } catch {
      setSelectedOrder(order);
    }
  };

  const handleRefill = async (med: Medication) => {
    setRefillingId(med.id);
    setRefillResult(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const res = await fetch("/api/store/refill", {
        method: "POST",
        headers,
        body: JSON.stringify({
          medicationId: med.id,
          medicationName: med.name,
          dosage: med.dosage,
          quantity: med.refill_at > 0 ? med.refill_at * 2 : 30,
        }),
      });

      if (res.ok) {
        setRefillResult({ ok: true, msg: `Refill requested for ${med.name}` });
        // Refresh refill orders
        const {
          data: { session: s },
        } = await supabase.auth.getSession();
        const h: Record<string, string> = {};
        if (s?.access_token) h.Authorization = `Bearer ${s.access_token}`;
        const refillRes = await fetch("/api/store/refill", { headers: h });
        const refillOrders: RefillOrder[] = refillRes.ok ? await refillRes.json() : [];
        const storeOrders = orders.filter((o) => o._type === "store") as StoreOrder[];
        const merged: OrderItem[] = [
          ...storeOrders.map((o) => ({ ...o, _type: "store" as const })),
          ...refillOrders.map((o) => ({ ...o, _type: "refill" as const })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setOrders(merged);
      } else {
        const err = await res.json();
        setRefillResult({ ok: false, msg: err.error || "Refill failed" });
      }
    } catch (err) {
      setRefillResult({ ok: false, msg: err instanceof Error ? err.message : "Network error" });
    } finally {
      setRefillingId(null);
    }
  };

  const handleLinkProduct = async (medicationId: string, productId: string) => {
    setLinkingId(medicationId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const res = await fetch(`/api/medications/${medicationId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ product_id: productId }),
      });

      if (res.ok) {
        setMedications((prev) =>
          prev.map((m) => (m.id === medicationId ? { ...m, product_id: productId } : m))
        );
        setSelectingProductFor(null);
      }
    } catch {
      // silent
    } finally {
      setLinkingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 lg:px-8">
      {/* Header + Tabs */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">My Orders</h1>
          <p className="text-sm text-slate-500">
            {tab === "orders"
              ? `${orders.filter((o) => o._type === "store").length} store orders`
              : `${medications.length} active medications`}
          </p>
        </div>
        <div className="flex gap-2">
          {(["orders", "refill"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === t ? TAB_STYLES[t].active : TAB_STYLES[t].inactive
              }`}
            >
              {t === "orders" ? (
                <ClipboardList className="w-4 h-4" />
              ) : (
                <Pill className="w-4 h-4" />
              )}
              {t === "orders" ? "Orders" : "Request Refill"}
            </button>
          ))}
          <Link
            href="/zobraipharm"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <ShoppingBag className="w-4 h-4" />
            Shop Store
          </Link>
        </div>
      </div>

      {/* ═══ ORDERS TAB ═══════════════════════════════════════ */}
      {tab === "orders" && (
        <>
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package className="mb-4 h-16 w-16 text-slate-300" />
              <h2 className="text-lg font-bold text-slate-700">No orders yet</h2>
              <p className="mt-2 text-sm text-slate-500">
                Visit ZorabiPharm to place your first order.
              </p>
              <Link
                href="/zobraipharm"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <ShoppingBag className="h-4 w-4" />
                Browse Store
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <div className="mb-3 relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by tracking ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {filtered.map((order) => {
                    const badge = STATUS_BADGE[order.status] || STATUS_BADGE.PENDING;
                    const isRefill = order._type === "refill";
                    const refillOrder = order as OrderItem & RefillOrder;
                    return (
                      <button
                        key={`${order._type}-${order.id}`}
                        onClick={() => handleSelectOrder(order)}
                        className={`w-full rounded-xl border p-3 text-left transition-all ${
                          selectedOrder?.id === order.id
                            ? "border-emerald-400 bg-emerald-50 shadow-sm"
                            : isRefill
                              ? "border-purple-100 bg-white hover:border-purple-200 hover:bg-purple-50/50"
                              : "border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <p
                            className={`text-sm font-bold ${isRefill ? "text-purple-800" : "text-slate-800"}`}
                          >
                            {isRefill
                              ? refillOrder.medication_name
                              : (order as StoreOrder).tracking_id}
                          </p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isRefill
                                ? "bg-purple-100 text-purple-800"
                                : `${badge.bg} ${badge.color}`
                            }`}
                          >
                            {isRefill ? "Refill" : badge.label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(order.created_at).toLocaleDateString("en-IN")}
                        </p>
                        {isRefill ? (
                          <p className="text-xs text-purple-600">
                            {refillOrder.dosage || ""} &bull; Qty: {refillOrder.quantity}
                          </p>
                        ) : (
                          <p className="text-xs font-medium text-emerald-700">
                            ₹{(order as StoreOrder).total}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-2">
                {selectedOrder ? (
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    {selectedOrder._type === "refill" ? (
                      (() => {
                        const refill = selectedOrder as RefillOrder;
                        const REFILL_STATUS_ORDER = [
                          "PENDING",
                          "CONFIRMED",
                          "PREPARING",
                          "DISPATCHED",
                          "DELIVERED",
                        ];
                        return (
                          <>
                            <div className="mb-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-xs text-purple-500 font-semibold uppercase tracking-wider">
                                    Refill Order
                                  </p>
                                  <p className="text-lg font-bold text-purple-800">
                                    {refill.medication_name}
                                  </p>
                                </div>
                                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                                  Refill
                                </span>
                              </div>
                              {refill.tracking_id && (
                                <p className="mt-1 text-sm text-slate-500">
                                  Tracking:{" "}
                                  <span className="font-mono font-bold text-slate-700">
                                    {refill.tracking_id}
                                  </span>
                                </p>
                              )}
                            </div>

                            {refill.events && refill.events.length > 0 && (
                              <div className="mb-6">
                                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                                  Order Timeline
                                </h3>
                                <div className="space-y-0">
                                  {REFILL_STATUS_ORDER.map((status, idx) => {
                                    const event = refill.events?.find((e) => e.status === status);
                                    const isDone = !!event;
                                    const isLast = idx === REFILL_STATUS_ORDER.length - 1;
                                    return (
                                      <div key={status} className="flex gap-3 pb-4 last:pb-0">
                                        <div className="flex flex-col items-center">
                                          <div
                                            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                                              isDone
                                                ? "border-purple-500 bg-purple-50 text-purple-600"
                                                : "border-slate-200 bg-white text-slate-300"
                                            }`}
                                          >
                                            {isDone ? (
                                              <CheckCircle2 className="h-3.5 w-3.5" />
                                            ) : (
                                              <div className="h-2 w-2 rounded-full bg-slate-300" />
                                            )}
                                          </div>
                                          {!isLast && (
                                            <div
                                              className={`mt-1 w-0.5 flex-1 ${isDone ? "bg-purple-500" : "bg-slate-200"}`}
                                            />
                                          )}
                                        </div>
                                        <div className="pb-2">
                                          <p
                                            className={`text-sm font-medium ${isDone ? "text-slate-800" : "text-slate-400"}`}
                                          >
                                            {(STATUS_BADGE[status] || STATUS_BADGE.PENDING).label}
                                          </p>
                                          {event && (
                                            <p className="mt-0.5 text-xs text-slate-400">
                                              {new Date(event.timestamp).toLocaleString("en-IN")}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 rounded-xl bg-purple-50/50 p-4">
                              <div>
                                <p className="text-xs text-slate-500">Dosage</p>
                                <p className="text-sm font-semibold text-slate-700">
                                  {refill.dosage || "As prescribed"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Quantity</p>
                                <p className="text-sm font-semibold text-slate-700">
                                  {refill.quantity}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Frequency</p>
                                <p className="text-sm font-semibold text-slate-700">
                                  {refill.frequency || "Monthly"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Started</p>
                                <p className="text-sm font-semibold text-slate-700">
                                  {new Date(refill.created_at).toLocaleDateString("en-IN")}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Payment</p>
                                <p className="text-sm font-semibold text-slate-700">
                                  {refill.payment_method || "COD"}
                                </p>
                              </div>
                              {refill.estimated_delivery && (
                                <div>
                                  <p className="text-xs text-slate-500">Est. Delivery</p>
                                  <p className="text-sm font-semibold text-slate-700">
                                    {new Date(refill.estimated_delivery).toLocaleDateString(
                                      "en-IN"
                                    )}
                                  </p>
                                </div>
                              )}
                            </div>

                            {refill.delivery_address && (
                              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                  <MapPin className="h-4 w-4 text-purple-600" />
                                  Delivery Address
                                </h3>
                                <p className="text-sm text-slate-600">{refill.delivery_address}</p>
                                {refill.patient_phone && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    Phone: {refill.patient_phone}
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="mt-4 flex flex-wrap gap-3">
                              <Link
                                href={`/dashboard/my-orders/summary/${refill.tracking_id}`}
                                className="inline-flex items-center gap-2 rounded-xl bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100"
                              >
                                <ClipboardList className="h-4 w-4" />
                                View Summary
                              </Link>
                              {refill.product_id && (
                                <Link
                                  href={`/zobraipharm/product/${refill.product_id}`}
                                  className="inline-flex items-center gap-2 rounded-xl bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100"
                                >
                                  <ShoppingBag className="h-4 w-4" />
                                  View in Store
                                  <ChevronRight className="h-4 w-4" />
                                </Link>
                              )}
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      <>
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500">Tracking ID</p>
                            <p className="text-lg font-bold text-slate-800">
                              {(selectedOrder as StoreOrder).tracking_id}
                            </p>
                          </div>
                          {(selectedOrder as StoreOrder).status !== "DELIVERED" &&
                            (selectedOrder as StoreOrder).status !== "CANCELLED" && (
                              <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
                                <Truck className="h-3.5 w-3.5" />
                                Est.{" "}
                                {(selectedOrder as StoreOrder).estimated_delivery
                                  ? new Date(
                                      (selectedOrder as StoreOrder).estimated_delivery!
                                    ).toLocaleDateString("en-IN")
                                  : "2 days"}
                              </div>
                            )}
                        </div>

                        {(selectedOrder as StoreOrder).events &&
                          (selectedOrder as StoreOrder).events!.length > 0 && (
                            <div className="mb-6">
                              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                                Order Timeline
                              </h3>
                              <div className="space-y-0">
                                {STATUS_ORDER.map((status, idx) => {
                                  const event = (selectedOrder as StoreOrder).events?.find(
                                    (e) => e.status === status
                                  );
                                  const isDone = !!event;
                                  const isLast = idx === STATUS_ORDER.length - 1;
                                  return (
                                    <div key={status} className="flex gap-3 pb-4 last:pb-0">
                                      <div className="flex flex-col items-center">
                                        <div
                                          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                                            isDone
                                              ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                                              : "border-slate-200 bg-white text-slate-300"
                                          }`}
                                        >
                                          {isDone ? (
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                          ) : (
                                            <div className="h-2 w-2 rounded-full bg-slate-300" />
                                          )}
                                        </div>
                                        {!isLast && (
                                          <div
                                            className={`mt-1 w-0.5 flex-1 ${isDone ? "bg-emerald-500" : "bg-slate-200"}`}
                                          />
                                        )}
                                      </div>
                                      <div className="pb-2">
                                        <p
                                          className={`text-sm font-medium ${isDone ? "text-slate-800" : "text-slate-400"}`}
                                        >
                                          {(STATUS_BADGE[status] || STATUS_BADGE.PENDING).label}
                                        </p>
                                        {event && (
                                          <p className="mt-0.5 text-xs text-slate-400">
                                            {new Date(event.timestamp).toLocaleString("en-IN")}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                        {(selectedOrder as StoreOrder).items &&
                          (selectedOrder as StoreOrder).items!.length > 0 && (
                            <div className="mb-6">
                              <h3 className="mb-3 text-sm font-semibold text-slate-700">Items</h3>
                              <div className="space-y-2">
                                {(selectedOrder as StoreOrder).items!.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5"
                                  >
                                    <span className="text-sm text-slate-700">
                                      {item.product_name} x{item.quantity}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-800">
                                      ₹{item.product_price * item.quantity}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 flex justify-between border-t pt-3">
                                <span className="text-sm font-bold text-slate-700">Total</span>
                                <span className="text-lg font-bold text-emerald-800">
                                  ₹{(selectedOrder as StoreOrder).total}
                                </span>
                              </div>
                            </div>
                          )}

                        {(selectedOrder as StoreOrder).customer_name && (
                          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <MapPin className="h-4 w-4 text-emerald-600" />
                              Delivery Address
                            </h3>
                            <p className="text-sm text-slate-600">
                              {(selectedOrder as StoreOrder).customer_name}
                              <br />
                              {(selectedOrder as StoreOrder).address},{" "}
                              {(selectedOrder as StoreOrder).city} -{" "}
                              {(selectedOrder as StoreOrder).pincode}
                            </p>
                          </div>
                        )}

                        <div className="mt-4">
                          <Link
                            href={`/zobraipharm/confirmation?id=${selectedOrder.id}`}
                            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Full Details
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-[30vh] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
                    <div className="text-center">
                      <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      <p className="text-sm text-slate-500">Select an order to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ REQUEST REFILL TAB ════════════════════════════════ */}
      {tab === "refill" && (
        <div className="space-y-4">
          {refillResult && (
            <div
              className={`rounded-2xl px-5 py-4 text-sm font-semibold border ${
                refillResult.ok
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {refillResult.ok ? (
                <Check className="w-4 h-4 inline mr-2" />
              ) : (
                <AlertCircle className="w-4 h-4 inline mr-2" />
              )}
              {refillResult.msg}
            </div>
          )}

          {medsLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : medications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Pill className="mb-4 h-16 w-16 text-slate-300" />
              <h2 className="text-lg font-bold text-slate-700">No active medications</h2>
              <p className="mt-2 text-sm text-slate-500 max-w-md">
                Your active medications will appear here. Visit the store to purchase medicines and
                they will be added automatically, or ask your doctor to prescribe.
              </p>
              <div className="flex gap-3 mt-6">
                <Link
                  href="/zobraipharm"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Browse Store
                </Link>
                <Link
                  href="/dashboard/medications"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Pill className="h-4 w-4" />
                  Manage Medications
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {medications.map((med) => {
                const { incomplete, reasons } = isMedIncomplete(med);
                const needsRefill = med.current_stock <= med.refill_at;
                return (
                  <div
                    key={med.id}
                    className={`rounded-2xl border p-5 bg-white shadow-sm transition-all hover:shadow-md ${
                      incomplete
                        ? "border-amber-200"
                        : needsRefill
                          ? "border-red-200"
                          : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                            incomplete ? "bg-amber-400" : MED_COLORS[med.color] || "bg-blue-500"
                          }`}
                        >
                          {med.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{med.name}</p>
                          <p className="text-xs text-slate-500">{med.category || "General"}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {incomplete && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Incomplete
                          </span>
                        )}
                        {needsRefill && !incomplete && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                            Low Stock
                          </span>
                        )}
                      </div>
                    </div>

                    {incomplete && (
                      <div className="mb-3 bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1">
                        <p className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Missing details:
                        </p>
                        {reasons.map((r) => (
                          <p key={r} className="text-[10px] text-amber-600 pl-3">
                            &bull; {r}
                          </p>
                        ))}
                        <Link
                          href="/dashboard/medications"
                          className="text-[10px] font-bold text-blue-600 hover:underline inline-block mt-1"
                        >
                          Update now →
                        </Link>
                      </div>
                    )}

                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Dosage</span>
                        <span className="font-semibold text-slate-700">{med.dosage || "—"}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Stock</span>
                        <span
                          className={`font-semibold ${needsRefill ? "text-red-600" : "text-emerald-600"}`}
                        >
                          {med.current_stock} pills
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Frequency</span>
                        <span className="font-semibold text-slate-700">{med.frequency || "—"}</span>
                      </div>
                      <div className="flex justify-between text-xs items-center">
                        <span className="text-slate-500">Product</span>
                        {(() => {
                          const linked = med.product_id
                            ? storeProducts.find((p) => p.id === med.product_id)
                            : null;
                          if (linked) {
                            return (
                              <span className="font-semibold text-emerald-700 text-[11px] text-right leading-tight">
                                {linked.name}
                                <br />
                                <span className="text-[10px] text-emerald-500">
                                  ₹{linked.price}
                                </span>
                              </span>
                            );
                          }
                          if (selectingProductFor === med.id) {
                            return (
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) handleLinkProduct(med.id, e.target.value);
                                }}
                                disabled={linkingId === med.id}
                                className="text-[11px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 outline-none focus:border-emerald-400 max-w-[140px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="">Select...</option>
                                {storeProducts.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} — ₹{p.price}
                                  </option>
                                ))}
                              </select>
                            );
                          }
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectingProductFor(med.id);
                              }}
                              className="text-[10px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg transition-colors"
                            >
                              + Link Product
                            </button>
                          );
                        })()}
                      </div>
                    </div>

                    {!incomplete && (
                      <button
                        onClick={() => handleRefill(med)}
                        disabled={refillingId === med.id}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-xs font-bold py-2.5 px-4 transition-all shadow-sm"
                      >
                        {refillingId === med.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        {refillingId === med.id ? "Requesting..." : "Request Refill"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent purchases from store — prompt to add as medication */}
          {orders.filter((o) => o._type === "store" && o.status === "DELIVERED").length > 0 && (
            <div className="mt-8 bg-gradient-to-r from-emerald-50 to-purple-50 rounded-2xl border border-emerald-100 p-5">
              <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2 mb-3">
                <ShoppingBag className="w-4 h-4" />
                Recently Delivered — Add to Medications
              </h3>
              <div className="space-y-2">
                {orders
                  .filter((o) => o._type === "store" && o.status === "DELIVERED")
                  .slice(0, 3)
                  .map((order) => {
                    const storeOrder = order as StoreOrder;
                    return (
                      <div
                        key={order.id}
                        className="flex items-center justify-between bg-white rounded-xl p-3 border border-emerald-50"
                      >
                        <div className="flex items-center gap-3">
                          <Package className="w-4 h-4 text-emerald-500" />
                          <div>
                            <p className="text-xs font-bold text-slate-700">
                              {storeOrder.tracking_id}
                            </p>
                            {storeOrder.items && (
                              <p className="text-[10px] text-slate-500">
                                {storeOrder.items.map((i) => i.product_name).join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                        <Link
                          href="/dashboard/medications"
                          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Plus className="w-3 h-3 inline mr-1" />
                          Add as Medication
                        </Link>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyOrdersPage() {
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (!roleLoading && role === null) {
      router.push("/dashboard/role-select");
    }
  }, [role, roleLoading, router]);

  if (roleLoading || role === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <MyOrdersContent />
    </Suspense>
  );
}
