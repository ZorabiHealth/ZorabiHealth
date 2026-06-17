"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList,
  Search,
  X,
  Package,
  AlertCircle,
  RefreshCw,
  Check,
  Loader2,
  Truck,
  Clock,
  ExternalLink,
  ShoppingBag,
  Pill,
  FileText,
  MapPin,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Ban,
  Send,
  Eye,
} from "lucide-react";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderEvent {
  status: string;
  timestamp: string;
  note?: string;
}

interface UnifiedOrder {
  id: string;
  type: "store" | "refill" | "prescription";
  typeLabel: string;
  trackingId: string;
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  pincode: string;
  status: string;
  total: number;
  items: OrderItem[];
  events: OrderEvent[];
  createdAt: string;
  estimatedDelivery?: string;
  sourceTable: string;
  sourceId: string;
}

type StatusFilter = "all" | "new" | "active" | "history";
const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "DISPATCHED"];
const STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PREPARING: 2,
  DISPATCHED: 3,
  DELIVERED: 4,
  CANCELLED: 5,
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  PREPARING: "bg-violet-100 text-violet-800 border-violet-200",
  DISPATCHED: "bg-cyan-100 text-cyan-800 border-cyan-200",
  DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-amber-500",
  CONFIRMED: "bg-blue-500",
  PREPARING: "bg-violet-500",
  DISPATCHED: "bg-cyan-500",
  DELIVERED: "bg-emerald-500",
  CANCELLED: "bg-red-500",
};

const NEXT_STATUS: Record<string, { status: string; label: string; icon: React.ReactNode } | null> =
  {
    PENDING: { status: "CONFIRMED", label: "Confirm", icon: <Check className="h-3.5 w-3.5" /> },
    CONFIRMED: { status: "PREPARING", label: "Prepare", icon: <Package className="h-3.5 w-3.5" /> },
    PREPARING: { status: "DISPATCHED", label: "Dispatch", icon: <Truck className="h-3.5 w-3.5" /> },
    DISPATCHED: { status: "DELIVERED", label: "Deliver", icon: <Check className="h-3.5 w-3.5" /> },
    DELIVERED: null,
    CANCELLED: null,
  };

const TYPE_COLORS: Record<string, string> = {
  store: "bg-emerald-100 text-emerald-800 border-emerald-200",
  refill: "bg-blue-100 text-blue-800 border-blue-200",
  prescription: "bg-violet-100 text-violet-800 border-violet-200",
};

export default function PharmacyOrdersPage() {
  const { role, userId } = useUserRole();
  const router = useRouter();
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (role === null) return;
    if (role !== "pharmacy_vendor") {
      router.push("/dashboard");
      return;
    }
    fetchOrders();
  }, [role, userId, router]);

  const fetchOrders = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const { data: profile, error: profileErr } = await supabase
        .from("pharmacy_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (profileErr || !profile) {
        setLoading(false);
        return;
      }

      setPharmacyId(profile.id);

      const results = await Promise.allSettled([
        fetchStoreOrders(),
        fetchRefillOrders(),
        fetchPrescriptionOrders(profile.id),
      ]);

      const allOrders: UnifiedOrder[] = [];
      for (const result of results) {
        if (result.status === "fulfilled") allOrders.push(...result.value);
      }

      allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(allOrders);
    } catch (err: any) {
      console.error("[Orders] Failed:", err);
      setFetchError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchStoreOrders = async (): Promise<UnifiedOrder[]> => {
    try {
      const { data, error } = await supabase
        .from("store_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !data) return [];
      return data.map((o: Record<string, unknown>) => ({
        id: o.tracking_id as string,
        type: "store" as const,
        typeLabel: "Store Order",
        trackingId: o.tracking_id as string,
        customerName: o.customer_name as string,
        phone: o.phone as string,
        address: o.address as string,
        city: o.city as string,
        pincode: o.pincode as string,
        status: (o.status as string) || "PENDING",
        total: Number(o.total) || 0,
        items: [],
        events: [],
        createdAt: (o.created_at as string) || new Date().toISOString(),
        estimatedDelivery: o.estimated_delivery as string | undefined,
        sourceTable: "store_orders",
        sourceId: o.id as string,
      }));
    } catch {
      return [];
    }
  };

  const fetchRefillOrders = async (): Promise<UnifiedOrder[]> => {
    try {
      const { data, error } = await supabase
        .from("refill_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !data) return [];
      return data.map((o: Record<string, unknown>) => ({
        id: o.tracking_id as string,
        type: "refill" as const,
        typeLabel: "Refill Request",
        trackingId: o.tracking_id as string,
        customerName: (o.patient_email as string) || (o.vendor_name as string) || "Patient",
        phone: (o.patient_phone as string) || "",
        address: (o.delivery_address as string) || "",
        city: "",
        pincode: "",
        status: (o.status as string) || "PENDING",
        total: Number(o.total_price) || 0,
        items: [
          {
            name: (o.medication_name as string) || "Medication",
            quantity: Number(o.quantity) || 1,
            price: Number(o.total_price) || 0,
          },
        ],
        events: [],
        createdAt: (o.created_at as string) || new Date().toISOString(),
        estimatedDelivery: o.estimated_delivery as string | undefined,
        sourceTable: "refill_orders",
        sourceId: o.id as string,
      }));
    } catch {
      return [];
    }
  };

  const fetchPrescriptionOrders = async (pharmId: string): Promise<UnifiedOrder[]> => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("pharmacy_id", pharmId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !data) return [];
      return data.map((o: Record<string, unknown>) => ({
        id: o.tracking_id as string,
        type: "prescription" as const,
        typeLabel: "Prescription",
        trackingId: o.tracking_id as string,
        customerName: (o.delivery_address as string) || "Patient",
        phone: (o.patient_phone as string) || "",
        email: (o.patient_email as string) || "",
        address: (o.delivery_address as string) || "",
        city: (o.delivery_city as string) || "",
        pincode: (o.delivery_pincode as string) || "",
        status: (o.status as string) || "PENDING",
        total: Number(o.total_amount) || 0,
        items: [],
        events: [],
        createdAt: (o.created_at as string) || new Date().toISOString(),
        sourceTable: "orders",
        sourceId: o.id as string,
      }));
    } catch {
      return [];
    }
  };

  const updateOrderStatus = async (order: UnifiedOrder, newStatus: string) => {
    setUpdatingId(order.sourceId);
    try {
      const now = new Date().toISOString();
      const updatePayload: Record<string, unknown> = { status: newStatus, updated_at: now };

      if (order.sourceTable === "store_orders") {
        const { error } = await supabase
          .from("store_orders")
          .update(updatePayload)
          .eq("id", order.sourceId);
        if (error) throw error;
        await supabase
          .from("store_order_events")
          .insert({ order_id: order.sourceId, status: newStatus, timestamp: now });
      } else if (order.sourceTable === "refill_orders") {
        const { error } = await supabase
          .from("refill_orders")
          .update(updatePayload)
          .eq("id", order.sourceId);
        if (error) throw error;
        await supabase
          .from("refill_order_events")
          .insert({ order_id: order.sourceId, status: newStatus, timestamp: now });
      } else if (order.sourceTable === "orders") {
        const { error } = await supabase
          .from("orders")
          .update(updatePayload)
          .eq("id", order.sourceId);
        if (error) throw error;
        await supabase
          .from("order_events")
          .insert({ order_id: order.sourceId, status: newStatus, timestamp: now });
      }

      setOrders((prev) =>
        prev.map((o) => (o.sourceId === order.sourceId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder?.sourceId === order.sourceId)
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (err: any) {
      console.error("[Orders] Status update failed:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const fetchOrderEvents = async (order: UnifiedOrder): Promise<OrderEvent[]> => {
    try {
      let table = "";
      if (order.sourceTable === "store_orders") table = "store_order_events";
      else if (order.sourceTable === "refill_orders") table = "refill_order_events";
      else if (order.sourceTable === "orders") table = "order_events";
      if (!table) return [];

      const { data } = await supabase
        .from(table)
        .select("*")
        .eq("order_id", order.sourceId)
        .order("timestamp", { ascending: true });

      if (!data) return [];
      return data.map((e: Record<string, unknown>) => ({
        status: e.status as string,
        timestamp: e.timestamp as string,
        note: e.note as string | undefined,
      }));
    } catch {
      return [];
    }
  };

  const openOrderDetail = async (order: UnifiedOrder) => {
    const events = await fetchOrderEvents(order);
    setSelectedOrder({ ...order, events });
  };

  const filteredOrders = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return orders.filter((o) => {
      if (statusFilter === "new" && o.status !== "PENDING") return false;
      if (statusFilter === "active" && !ACTIVE_STATUSES.includes(o.status)) return false;
      if (statusFilter === "history" && o.status !== "DELIVERED" && o.status !== "CANCELLED")
        return false;
      if (
        q &&
        !o.trackingId.toLowerCase().includes(q) &&
        !o.customerName.toLowerCase().includes(q) &&
        !o.typeLabel.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [orders, statusFilter, searchTerm]);

  const counts = useMemo(
    () => ({
      all: orders.length,
      new: orders.filter((o) => o.status === "PENDING").length,
      active: orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
      history: orders.filter((o) => o.status === "DELIVERED" || o.status === "CANCELLED").length,
    }),
    [orders]
  );

  if (role === null) {
    return <div className="flex items-center justify-center h-full text-slate-500">Loading...</div>;
  }

  if (!pharmacyId && !loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
            <ClipboardList className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-700">No Pharmacy Profile</h2>
          <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
            Register your pharmacy first to receive and manage orders.
          </p>
          <button
            onClick={() => router.push("/dashboard/pharmacy/register")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700"
          >
            Register Pharmacy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            {counts.new > 0 ? (
              <span className="text-amber-600 font-semibold">{counts.new} new</span>
            ) : (
              "No new orders"
            )}{" "}
            · {counts.active} active · {orders.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { key: "all" as StatusFilter, label: "All", count: counts.all },
          { key: "new" as StatusFilter, label: "New", count: counts.new },
          { key: "active" as StatusFilter, label: "Active", count: counts.active },
          { key: "history" as StatusFilter, label: "History", count: counts.history },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === tab.key
                ? "bg-emerald-600 text-white shadow"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`text-xs font-bold ${statusFilter === tab.key ? "text-emerald-200" : "text-slate-400"}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by tracking ID, customer name, or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Error State */}
      {fetchError && !loading && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Failed to load orders</p>
            <p className="text-xs text-red-600 mt-0.5">{fetchError}</p>
          </div>
          <button
            onClick={fetchOrders}
            className="shrink-0 flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-white p-6">
              <div className="flex gap-4">
                <div className="h-12 w-12 rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
                <div className="h-8 w-20 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Orders List */}
      {!loading && filteredOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
            <ClipboardList className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            {searchTerm ? `No orders matching "${searchTerm}"` : "No orders yet"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {searchTerm
              ? "Try a different search term or filter"
              : "Orders from patients, store, and prescriptions will appear here"}
          </p>
        </div>
      )}

      {!loading && filteredOrders.length > 0 && (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const next = NEXT_STATUS[order.status];
            return (
              <div
                key={`${order.sourceTable}-${order.sourceId}`}
                className="group rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md"
              >
                {/* Main row */}
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Type icon */}
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${TYPE_COLORS[order.type] || "bg-slate-100 text-slate-600 border-slate-200"}`}
                    >
                      {order.type === "store" ? (
                        <ShoppingBag className="h-5 w-5" />
                      ) : order.type === "refill" ? (
                        <Pill className="h-5 w-5" />
                      ) : (
                        <FileText className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TYPE_COLORS[order.type] || "bg-slate-100 text-slate-600"}`}
                        >
                          {order.typeLabel}
                        </span>
                        <span className="text-xs font-mono text-slate-500">{order.trackingId}</span>
                      </div>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate">
                        {order.customerName}
                      </p>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                        {order.items.length > 0 && (
                          <span>
                            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {order.total > 0 && (
                          <span className="font-medium text-slate-700">
                            ₹{order.total.toFixed(2)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_COLORS[order.status] || "bg-slate-100 text-slate-600"}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[order.status] || "bg-slate-400"}`}
                      />
                      {order.status}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => openOrderDetail(order)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {next && (
                        <button
                          onClick={() => updateOrderStatus(order, next.status)}
                          disabled={updatingId === order.sourceId}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {updatingId === order.sourceId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            next.icon
                          )}
                          {next.label}
                        </button>
                      )}
                      {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                        <button
                          onClick={() => updateOrderStatus(order, "CANCELLED")}
                          disabled={updatingId === order.sourceId}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Cancel"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-start justify-center pt-10 pb-10 overflow-y-auto"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TYPE_COLORS[selectedOrder.type] || "bg-slate-100 text-slate-600"}`}
                  >
                    {selectedOrder.typeLabel}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    {selectedOrder.trackingId}
                  </span>
                </div>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  {selectedOrder.customerName}
                </h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Current Status */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${STATUS_COLORS[selectedOrder.status] || ""}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${STATUS_DOT[selectedOrder.status] || ""}`}
                  />
                  {selectedOrder.status}
                </span>
                <div className="flex gap-2">
                  {(() => {
                    const nxt = NEXT_STATUS[selectedOrder.status];
                    return nxt ? (
                      <button
                        onClick={() => {
                          updateOrderStatus(selectedOrder, nxt.status);
                        }}
                        disabled={updatingId === selectedOrder.sourceId}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {updatingId === selectedOrder.sourceId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          nxt.icon
                        )}
                        {nxt.label}
                      </button>
                    ) : null;
                  })()}
                  {selectedOrder.status !== "DELIVERED" && selectedOrder.status !== "CANCELLED" && (
                    <button
                      onClick={() => {
                        updateOrderStatus(selectedOrder, "CANCELLED");
                        setSelectedOrder(null);
                      }}
                      disabled={updatingId === selectedOrder.sourceId}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200"
                    >
                      <Ban className="h-4 w-4" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              <div className="rounded-xl bg-slate-50 p-4 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Customer Details
                </h3>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  {selectedOrder.phone && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {selectedOrder.phone}
                    </div>
                  )}
                  {selectedOrder.email && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {selectedOrder.email}
                    </div>
                  )}
                  {(selectedOrder.address || selectedOrder.city) && (
                    <div className="flex items-start gap-2 text-slate-700 sm:col-span-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span>
                        {selectedOrder.address}
                        {selectedOrder.city && `, ${selectedOrder.city}`}
                        {selectedOrder.pincode && ` - ${selectedOrder.pincode}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              {selectedOrder.items.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Items
                  </h3>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                    {selectedOrder.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-4 py-2.5 text-sm"
                      >
                        <span className="text-slate-800">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="font-medium text-slate-700">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {selectedOrder.total > 0 && (
                      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 text-sm font-bold">
                        <span className="text-slate-800">Total</span>
                        <span className="text-emerald-700">₹{selectedOrder.total.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Timeline
                </h3>
                {selectedOrder.events.length === 0 && !loading && (
                  <p className="text-xs text-slate-400 py-2">No events recorded yet</p>
                )}
                <div className="space-y-0">
                  {[
                    { status: "PENDING", timestamp: selectedOrder.createdAt, note: "Order placed" },
                    ...selectedOrder.events,
                  ]
                    .sort(
                      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    )
                    .map((event, i) => (
                      <div key={i} className="flex gap-3 pb-3 relative">
                        <div className="flex flex-col items-center">
                          <div
                            className={`h-2.5 w-2.5 rounded-full mt-1.5 ${STATUS_DOT[event.status] || "bg-slate-300"}`}
                          />
                          {i < selectedOrder.events.length && (
                            <div className="w-px flex-1 bg-slate-200 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-semibold ${STATUS_COLORS[event.status] ? "text-slate-800" : "text-slate-600"}`}
                            >
                              {event.status}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(event.timestamp).toLocaleString("en-IN", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {event.note && (
                            <p className="text-xs text-slate-500 mt-0.5">{event.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
