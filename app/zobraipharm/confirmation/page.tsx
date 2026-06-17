"use client";

import React, { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Package,
  Truck,
  Clock,
  MapPin,
  Phone,
  User,
  CreditCard,
  ChevronLeft,
  ShoppingBag,
  HeartPulse,
  Printer,
  Loader2,
} from "lucide-react";
interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  product_price: number;
  quantity: number;
}

interface OrderEvent {
  id: string;
  order_id: string;
  status: string;
  note: string | null;
  timestamp: string;
}

interface StoreOrder {
  id: string;
  user_id?: string;
  tracking_id: string;
  customer_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  pincode?: string;
  status: string;
  total: number;
  estimated_delivery?: string;
  created_at: string;
  updated_at?: string;
  items?: OrderItem[];
  events?: OrderEvent[];
}

const STATUS_ORDER = ["PENDING", "CONFIRMED", "PREPARING", "DISPATCHED", "DELIVERED"] as const;

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  PENDING: {
    label: "Order Placed",
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: "text-slate-400",
  },
  CONFIRMED: {
    label: "Confirmed",
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: "text-blue-500",
  },
  PREPARING: {
    label: "Preparing",
    icon: <Package className="h-5 w-5" />,
    color: "text-amber-500",
  },
  DISPATCHED: {
    label: "Dispatched",
    icon: <Truck className="h-5 w-5" />,
    color: "text-emerald-500",
  },
  DELIVERED: {
    label: "Delivered",
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: "text-emerald-600",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: "text-red-500",
  },
};

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [allOrders, setAllOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all user orders for sidebar
        const listRes = await fetch("/api/store/orders");
        if (listRes.ok) {
          const list = await listRes.json();
          setAllOrders(list);
        }

        // Fetch specific order
        if (orderId) {
          const res = await fetch(`/api/store/orders?id=${orderId}`);
          if (res.ok) {
            const data = await res.json();
            setOrder(data);
          }
        }
      } catch (err) {
        console.error("[confirmation] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <Package className="mb-4 h-16 w-16 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-700">Order Not Found</h2>
        <p className="mt-2 text-sm text-slate-500">
          We could not find this order. It may have been cleared or the link is invalid.
        </p>
        <Link
          href="/zobraipharm"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Store
        </Link>
      </div>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(order.status as any);

  const fallbackDate = new Date(new Date(order.created_at).getTime() + 2 * 24 * 60 * 60 * 1000);
  const estDate = new Date(
    order.estimated_delivery || fallbackDate.toISOString()
  ).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 lg:px-8">
      {/* Success Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Order Placed Successfully!</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your order will be delivered by{" "}
          <span className="font-semibold text-emerald-700">{estDate}</span>
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm">
          <HeartPulse className="h-4 w-4 text-emerald-600" />
          <span className="font-medium text-emerald-800">Tracking ID: {order.tracking_id}</span>
        </div>
      </div>

      {/* Order Details Card */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">Order Summary</h2>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </div>

        <div className="mb-4 space-y-2">
          {(order.items || []).map((item) => (
            <div
              key={item.id || item.product_id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-slate-600">
                {item.product_name} x{item.quantity}
              </span>
              <span className="font-medium text-slate-800">
                ₹{item.product_price * item.quantity}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t pt-3">
          <div className="flex justify-between text-sm font-bold text-slate-800">
            <span>Total Paid</span>
            <span className="text-lg text-emerald-800">₹{order.total}</span>
          </div>
        </div>
      </div>

      {/* Delivery Info */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <MapPin className="h-4 w-4 text-emerald-600" />
            Delivery Address
          </h3>
          <p className="text-sm leading-relaxed text-slate-600">
            {order.customer_name}
            <br />
            {order.address}, {order.city} - {order.pincode}
            <br />
            {order.phone}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            Payment
          </h3>
          <p className="text-sm text-slate-600">Cash on Delivery</p>
          <p className="mt-1 text-xs text-slate-400">Pay when your order arrives</p>
        </div>
      </div>

      {/* Tracking Timeline */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-700">
          <Truck className="h-4 w-4 text-emerald-600" />
          Order Tracking
        </h2>
        <div className="relative">
          {STATUS_ORDER.map((status, idx) => {
            const isDone = idx <= currentIndex;
            const isLast = idx === STATUS_ORDER.length - 1;
            const meta = STATUS_META[status];

            return (
              <div key={status} className="flex gap-4 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                      isDone
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                        : "border-slate-200 bg-white text-slate-300"
                    }`}
                  >
                    <div className={isDone ? meta.color : "text-slate-300"}>{meta.icon}</div>
                  </div>
                  {!isLast && (
                    <div
                      className={`mt-1 w-0.5 flex-1 ${
                        idx < currentIndex ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
                <div className="pb-4">
                  <p
                    className={`text-sm font-semibold ${
                      isDone ? "text-slate-800" : "text-slate-400"
                    }`}
                  >
                    {meta.label}
                    {isDone && idx === currentIndex && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        Current
                      </span>
                    )}
                  </p>
                  {idx === 0 && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {new Date(order.created_at).toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/zobraipharm"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
        >
          <ShoppingBag className="h-4 w-4" />
          Continue Shopping
        </Link>
        <Link
          href="/zobraipharm/checkout"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-700"
        >
          <Package className="h-4 w-4" />
          Track Order Status
        </Link>
      </div>

      {/* Previous Orders */}
      {allOrders.length > 1 && (
        <div className="mt-12">
          <h2 className="mb-4 text-sm font-bold text-slate-700">Previous Orders</h2>
          <div className="space-y-2">
            {allOrders
              .filter((o) => o.id !== order.id)
              .slice(0, 3)
              .map((prev) => (
                <Link
                  key={prev.id}
                  href={`/zobraipharm/confirmation?id=${prev.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-emerald-200"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">{prev.tracking_id}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(prev.created_at).toLocaleDateString("en-IN")} &bull; ₹{prev.total}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      prev.status === "DELIVERED"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {prev.status}
                  </span>
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
