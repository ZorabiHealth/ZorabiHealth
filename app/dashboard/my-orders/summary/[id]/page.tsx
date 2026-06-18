"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  CheckCircle2,
  Truck,
  Pill,
  MapPin,
  Phone,
  CreditCard,
  Calendar,
  ShoppingBag,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface OrderSummary {
  order_type: "refill" | "store";
  tracking_id: string;
  status: string;
  medication_name?: string;
  dosage?: string;
  quantity?: number;
  frequency?: string;
  total_price?: number;
  total?: number;
  estimated_delivery?: string;
  delivery_address?: string;
  patient_phone?: string;
  payment_method?: string;
  vendor_name?: string;
  product_id?: string | null;
  created_at: string;
  updated_at?: string;
  items?: { product_name: string; quantity: number; product_price: number }[];
  events?: { status: string; timestamp: string; note?: string }[];
  timeline?: { status: string; timestamp: string; note?: string }[];
}

const REFILL_STATUS_ORDER = ["PENDING", "CONFIRMED", "PREPARING", "DISPATCHED", "DELIVERED"];
const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-amber-100 text-amber-800 border-amber-200" },
  CONFIRMED: { label: "Confirmed", color: "bg-blue-100 text-blue-800 border-blue-200" },
  PREPARING: { label: "Preparing", color: "bg-violet-100 text-violet-800 border-violet-200" },
  DISPATCHED: { label: "Dispatched", color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  DELIVERED: { label: "Delivered", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200" },
};

export default function OrderSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const trackingId = params.id as string;
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchOrder = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

        const res = await fetch(`/api/orders/status?tracking_id=${trackingId}`, { headers });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Order not found");
        }
        const data = await res.json();
        if (!cancelled) {
          setOrder(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load order");
          setLoading(false);
        }
      }
    };

    fetchOrder();
    return () => {
      cancelled = true;
    };
  }, [trackingId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50/30 to-emerald-50/20">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
          <p className="mt-3 text-sm text-slate-500">Loading order summary...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50/30 to-emerald-50/20">
        <div className="mx-4 max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-lg font-bold text-slate-800">Order Not Found</h1>
          <p className="mt-2 text-sm text-slate-500">
            {error || "This order could not be loaded."}
          </p>
          <button
            onClick={() => router.push("/dashboard/my-orders")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Orders
          </button>
        </div>
      </div>
    );
  }

  const badge = STATUS_BADGE[order.status] || STATUS_BADGE.PENDING;
  const isRefill = order.order_type === "refill";
  const orderEvents = order.events || order.timeline || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-emerald-50/20 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/my-orders"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-purple-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Orders
          </Link>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          {/* Order Type & Tracking */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    isRefill
                      ? "bg-purple-100 text-purple-700 border-purple-200"
                      : "bg-emerald-100 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {isRefill ? "Refill Order" : "Store Order"}
                </span>
              </div>
              <h1 className="mt-2 text-xl font-bold text-slate-900">
                {isRefill ? order.medication_name : "Store Order"}
              </h1>
              <p className="mt-1 font-mono text-sm text-slate-500">{order.tracking_id}</p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${badge.color}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  order.status === "DELIVERED"
                    ? "bg-emerald-500"
                    : order.status === "CANCELLED"
                      ? "bg-red-500"
                      : order.status === "DISPATCHED"
                        ? "bg-cyan-500"
                        : order.status === "PREPARING"
                          ? "bg-violet-500"
                          : order.status === "CONFIRMED"
                            ? "bg-blue-500"
                            : "bg-amber-500"
                }`}
              />
              {badge.label}
            </span>
          </div>

          {/* Medication / Items */}
          {isRefill ? (
            <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl bg-purple-50/50 p-4">
              <div>
                <p className="text-xs text-slate-500">Dosage</p>
                <p className="text-sm font-semibold text-slate-700">
                  {order.dosage || "As prescribed"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Quantity</p>
                <p className="text-sm font-semibold text-slate-700">{order.quantity}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Frequency</p>
                <p className="text-sm font-semibold text-slate-700">
                  {order.frequency || "Monthly"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-sm font-semibold text-emerald-700">
                  ₹{(order.total_price || 0).toFixed(2)}
                </p>
              </div>
            </div>
          ) : order.items && order.items.length > 0 ? (
            <div className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Items
              </h3>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-slate-800">
                      {item.product_name} × {item.quantity}
                    </span>
                    <span className="font-medium text-slate-700">
                      ₹{(item.product_price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 text-sm font-bold">
                  <span className="text-slate-800">Total</span>
                  <span className="text-emerald-700">₹{(order.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Order Info Grid */}
          <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-[10px] text-slate-500">Ordered</p>
                <p className="text-sm font-semibold text-slate-700">
                  {new Date(order.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            {order.estimated_delivery && (
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-[10px] text-slate-500">Est. Delivery</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {new Date(order.estimated_delivery).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-[10px] text-slate-500">Payment</p>
                <p className="text-sm font-semibold text-slate-700">
                  {order.payment_method || "COD"}
                </p>
              </div>
            </div>
            {order.vendor_name && (
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-[10px] text-slate-500">Vendor</p>
                  <p className="text-sm font-semibold text-slate-700">{order.vendor_name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Delivery Address */}
          {order.delivery_address && (
            <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <MapPin className="h-4 w-4 text-purple-600" />
                Delivery Address
              </h3>
              <p className="text-sm text-slate-600">{order.delivery_address}</p>
              {order.patient_phone && (
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <Phone className="h-3 w-3" />
                  {order.patient_phone}
                </p>
              )}
            </div>
          )}

          {/* Timeline */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Order Timeline</h3>
            <div className="space-y-0">
              {REFILL_STATUS_ORDER.map((status, idx) => {
                const event = orderEvents.find((e) => e.status === status);
                const isDone = !!event;
                const isLast = idx === REFILL_STATUS_ORDER.length - 1;
                const badgeInfo = STATUS_BADGE[status];
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
                        {badgeInfo?.label || status}
                      </p>
                      {event && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {new Date(event.timestamp).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      {event?.note && (
                        <p className="mt-0.5 text-xs text-slate-500 italic">{event.note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* View in Store */}
          {order.product_id && (
            <Link
              href={`/zobraipharm/product/${order.product_id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-50 px-4 py-2.5 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100"
            >
              <ShoppingBag className="h-4 w-4" />
              View in Store
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
