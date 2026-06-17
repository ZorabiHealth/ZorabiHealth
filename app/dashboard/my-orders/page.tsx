"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Package,
  ShoppingBag,
  ChevronRight,
  Truck,
  Clock,
  MapPin,
  CreditCard,
  CheckCircle2,
  Loader2,
  Search,
  ArrowLeft,
  ExternalLink,
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

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "Pending", color: "text-yellow-800", bg: "bg-yellow-100" },
  CONFIRMED: { label: "Confirmed", color: "text-blue-800", bg: "bg-blue-100" },
  PREPARING: { label: "Preparing", color: "text-amber-800", bg: "bg-amber-100" },
  DISPATCHED: { label: "Dispatched", color: "text-emerald-800", bg: "bg-emerald-100" },
  DELIVERED: { label: "Delivered", color: "text-green-800", bg: "bg-green-100" },
  CANCELLED: { label: "Cancelled", color: "text-red-800", bg: "bg-red-100" },
};

const STATUS_ORDER = ["PENDING", "CONFIRMED", "PREPARING", "DISPATCHED", "DELIVERED"];

function MyOrdersContent() {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/store/orders");
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
          if (data.length > 0) {
            // Fetch details for first order
            const detailRes = await fetch(`/api/store/orders?id=${data[0].id}`);
            if (detailRes.ok) setSelectedOrder(await detailRes.json());
          }
        }
      } catch (err) {
        console.error("[my-orders] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filtered = searchQuery.trim()
    ? orders.filter(
        (o) =>
          o.tracking_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.status.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : orders;

  const handleSelectOrder = async (order: StoreOrder) => {
    try {
      const res = await fetch(`/api/store/orders?id=${order.id}`);
      if (res.ok) setSelectedOrder(await res.json());
    } catch {
      setSelectedOrder(order);
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">My Orders</h1>
          <p className="text-sm text-slate-500">
            {orders.length} order{orders.length !== 1 ? "s" : ""} placed from ZorabiPharm
          </p>
        </div>
        <Link
          href="/zobraipharm"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          <ShoppingBag className="h-4 w-4" />
          Shop More
        </Link>
      </div>

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
          {/* Order List */}
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
                return (
                  <button
                    key={order.id}
                    onClick={() => handleSelectOrder(order)}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      selectedOrder?.id === order.id
                        ? "border-emerald-400 bg-emerald-50 shadow-sm"
                        : "border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-bold text-slate-800">{order.tracking_id}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.bg} ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(order.created_at).toLocaleDateString("en-IN")}
                    </p>
                    <p className="text-xs font-medium text-emerald-700">₹{order.total}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Order Detail */}
          <div className="lg:col-span-2">
            {selectedOrder ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Tracking ID</p>
                    <p className="text-lg font-bold text-slate-800">{selectedOrder.tracking_id}</p>
                  </div>
                  {selectedOrder.status !== "DELIVERED" && selectedOrder.status !== "CANCELLED" && (
                    <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
                      <Truck className="h-3.5 w-3.5" />
                      Est.{" "}
                      {selectedOrder.estimated_delivery
                        ? new Date(selectedOrder.estimated_delivery).toLocaleDateString("en-IN")
                        : "2 days"}
                    </div>
                  )}
                </div>

                {/* Timeline */}
                {selectedOrder.events && selectedOrder.events.length > 0 && (
                  <div className="mb-6">
                    <h3 className="mb-3 text-sm font-semibold text-slate-700">Order Timeline</h3>
                    <div className="space-y-0">
                      {STATUS_ORDER.map((status, idx) => {
                        const event = selectedOrder.events?.find((e) => e.status === status);
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
                                className={`text-sm font-medium ${
                                  isDone ? "text-slate-800" : "text-slate-400"
                                }`}
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

                {/* Items */}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div className="mb-6">
                    <h3 className="mb-3 text-sm font-semibold text-slate-700">Items</h3>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item) => (
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
                        ₹{selectedOrder.total}
                      </span>
                    </div>
                  </div>
                )}

                {/* Delivery Address */}
                {selectedOrder.customer_name && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <MapPin className="h-4 w-4 text-emerald-600" />
                      Delivery Address
                    </h3>
                    <p className="text-sm text-slate-600">
                      {selectedOrder.customer_name}
                      <br />
                      {selectedOrder.address}, {selectedOrder.city} - {selectedOrder.pincode}
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
