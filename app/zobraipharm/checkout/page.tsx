"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  Minus,
  Package,
  MapPin,
  Phone,
  User,
  CreditCard,
  Check,
  Shield,
  Truck,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cleanAndValidatePhone } from "@/lib/validation";
import { loadCart, saveCart, type PharmProduct, type CartItem } from "@/lib/pharmacy-store-data";
import { fetchStoreProducts } from "@/lib/store-products";

type Step = "cart" | "details" | "payment" | "review";

interface FormData {
  name: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
}

const STEPS: { key: Step; label: string }[] = [
  { key: "cart", label: "Cart" },
  { key: "details", label: "Details" },
  { key: "payment", label: "Payment" },
  { key: "review", label: "Review" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("cart");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<PharmProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [form, setForm] = useState<FormData>({
    name: "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCartItems(loadCart());
    fetchStoreProducts().then((data) => {
      setProducts(data);
      setLoadingProducts(false);
    });
  }, []);

  const productMap = useMemo(() => {
    const map: Record<string, PharmProduct> = {};
    products.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [products]);

  const enrichedItems = cartItems
    .map((ci) => {
      const p = productMap[ci.productId];
      return p ? { ...ci, product: p } : null;
    })
    .filter(Boolean) as (CartItem & { product: PharmProduct })[];

  const subtotal = enrichedItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const deliveryFee = subtotal >= 299 ? 0 : 40;
  const total = subtotal + deliveryFee;

  const updateQuantity = (productId: string, delta: number) => {
    const next = cartItems
      .map((ci) => {
        if (ci.productId !== productId) return ci;
        const nq = ci.quantity + delta;
        return nq > 0 ? { ...ci, quantity: nq } : null;
      })
      .filter(Boolean) as CartItem[];
    setCartItems(next);
    saveCart(next);
  };

  const removeItem = (productId: string) => {
    const next = cartItems.filter((ci) => ci.productId !== productId);
    setCartItems(next);
    saveCart(next);
  };

  const validateForm = (): boolean => {
    const err: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) err.name = "Name is required";
    if (form.phone.trim()) {
      const phoneVal = cleanAndValidatePhone(form.phone);
      if (!phoneVal.isValid) {
        err.phone = phoneVal.error || "Valid phone number required";
      }
    } else {
      err.phone = "Phone number is required";
    }
    if (!form.address.trim()) err.address = "Address is required";
    if (!form.city.trim()) err.city = "City is required";
    if (!form.pincode.trim() || !/^\d{6}$/.test(form.pincode.trim()))
      err.pincode = "Valid 6-digit pincode required";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handlePlaceOrder = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: enrichedItems.map((i) => ({
            productId: i.productId,
            productName: i.product.name,
            productPrice: i.product.price,
            quantity: i.quantity,
          })),
          total,
          customerName: form.name,
          phone: form.phone,
          address: form.address,
          city: form.city,
          pincode: form.pincode,
          trackingId: "",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to place order");
      }

      const data = await res.json();

      // clear cart
      saveCart([]);
      setCartItems([]);

      router.push(`/zobraipharm/confirmation?id=${data.id}`);
    } catch (err) {
      console.error("[checkout] Place order error:", err);
      const { showToast } = await import("@/components/ui/toast");
      showToast("Failed to place order. Please try again.", "error");
      setSubmitting(false);
    }
  };

  // Loading state
  if (loadingProducts) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-500">Loading cart...</p>
      </div>
    );
  }

  // Empty cart state
  if (cartItems.length === 0 && step === "cart") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
        <ShoppingCart className="mb-4 h-16 w-16 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-700">Your Cart is Empty</h2>
        <p className="mt-2 text-sm text-slate-500">Add some medications to get started.</p>
        <Link
          href="/zobraipharm"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 lg:px-8">
      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-0">
          {STEPS.map((s, i) => {
            const current = s.key === step;
            const done = STEPS.findIndex((x) => x.key === step) > i;
            return (
              <React.Fragment key={s.key}>
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      done
                        ? "bg-emerald-600 text-white"
                        : current
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span
                    className={`mt-1.5 text-[10px] font-medium ${
                      current || done ? "text-emerald-700" : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-2 mt-[-20px] h-[2px] w-12 sm:w-20 ${
                      done ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {step === "cart" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-bold text-slate-800">
              Shopping Cart ({cartItems.length})
            </h2>
            <div className="space-y-3">
              {enrichedItems.map((item) => (
                <div
                  key={item.productId}
                  className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-emerald-50/50 p-3">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="h-[80px] w-[80px] object-contain"
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <Link
                        href={`/zobraipharm/product/${item.productId}`}
                        className="text-sm font-bold text-slate-800 hover:text-emerald-700"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-xs text-slate-500">{item.product.manufacturer}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[20px] text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-emerald-800">
                          ₹{item.product.price * item.quantity}
                        </span>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-slate-400 transition-colors hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="sticky top-24 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-800">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery</span>
                  <span>
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-600">FREE</span>
                    ) : (
                      `₹${deliveryFee}`
                    )}
                  </span>
                </div>
                {deliveryFee > 0 && (
                  <p className="text-[11px] text-amber-600">
                    Add ₹{299 - subtotal} more for free delivery
                  </p>
                )}
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Total</span>
                    <span className="text-lg text-emerald-800">₹{total}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setStep("details")}
                className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-700"
              >
                Proceed to Details
                <ChevronRight className="ml-1 inline h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "details" && (
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-lg font-bold text-slate-800">Delivery Details</h2>
          <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <User className="h-4 w-4 text-emerald-600" />
                Full Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
                className={`w-full rounded-xl border ${errors.name ? "border-red-300" : "border-slate-200"} bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Phone className="h-4 w-4 text-emerald-600" />
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+919XXXXXXXXX"
                className={`w-full rounded-xl border ${errors.phone ? "border-red-300" : "border-slate-200"} bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100`}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Delivery Address
              </label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Flat/House No., Street, Landmark"
                rows={2}
                className={`w-full rounded-xl border ${errors.address ? "border-red-300" : "border-slate-200"} bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100`}
              />
              {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Mumbai"
                  className={`w-full rounded-xl border ${errors.city ? "border-red-300" : "border-slate-200"} bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100`}
                />
                {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Pincode</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  placeholder="400001"
                  maxLength={6}
                  className={`w-full rounded-xl border ${errors.pincode ? "border-red-300" : "border-slate-200"} bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100`}
                />
                {errors.pincode && <p className="mt-1 text-xs text-red-500">{errors.pincode}</p>}
              </div>
            </div>
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep("cart")}
                className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
              >
                <ChevronLeft className="mr-1 inline h-4 w-4" />
                Back to Cart
              </button>
              <button
                onClick={() => {
                  if (validateForm()) setStep("payment");
                }}
                className="rounded-xl bg-emerald-600 px-8 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700"
              >
                Continue to Payment
                <ChevronRight className="ml-1 inline h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "payment" && (
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-lg font-bold text-slate-800">Payment Method</h2>
          <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Cash on Delivery</p>
                  <p className="text-xs text-slate-500">Pay when your order arrives</p>
                </div>
                <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-400">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500">Online Payment</p>
                  <p className="text-xs text-slate-400">Coming soon</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep("details")}
                className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
              >
                <ChevronLeft className="mr-1 inline h-4 w-4" />
                Back to Details
              </button>
              <button
                onClick={() => setStep("review")}
                className="rounded-xl bg-emerald-600 px-8 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700"
              >
                Review Order
                <ChevronRight className="ml-1 inline h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-lg font-bold text-slate-800">Review Your Order</h2>
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Delivery Address</h3>
              <p className="text-sm text-slate-600">
                {form.name}
                <br />
                {form.address}, {form.city} - {form.pincode}
                <br />
                {form.phone}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                Items ({enrichedItems.length})
              </h3>
              <div className="space-y-2">
                {enrichedItems.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      {item.product.name} x{item.quantity}
                    </span>
                    <span className="font-medium text-slate-800">
                      ₹{item.product.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 border-t pt-3">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Delivery</span>
                  <span>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
                </div>
                <div className="mt-2 flex justify-between font-bold text-slate-800">
                  <span>Total</span>
                  <span className="text-lg text-emerald-800">₹{total}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Payment</h3>
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                <span className="text-sm text-slate-600">Cash on Delivery</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep("payment")}
                className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
              >
                <ChevronLeft className="mr-1 inline h-4 w-4" />
                Back to Payment
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={submitting}
                className="rounded-xl bg-emerald-600 px-10 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? "Placing Order..." : "Place Order — ₹" + total}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
