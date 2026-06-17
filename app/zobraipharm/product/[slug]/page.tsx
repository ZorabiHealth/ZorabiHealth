"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ShoppingCart,
  ChevronLeft,
  Check,
  Pill,
  Shield,
  AlertTriangle,
  Thermometer,
  Info,
  Star,
  Package,
  Truck,
  HeartPulse,
  Plus,
  Minus,
} from "lucide-react";
import { getProductBySlug, PRODUCTS, loadCart, saveCart } from "@/lib/pharmacy-store-data";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const product = getProductBySlug(slug);

  const [cart, setCart] = useState<Record<string, number>>(() => {
    const items = loadCart();
    const map: Record<string, number> = {};
    items.forEach((i) => {
      map[i.productId] = i.quantity;
    });
    return map;
  });

  if (!product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <Package className="mb-4 h-16 w-16 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-700">Product Not Found</h2>
        <p className="mt-2 text-sm text-slate-500">This medication is not in our catalog.</p>
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

  const qty = cart[product.id] || 0;

  const handleQtyChange = (delta: number) => {
    const next = { ...cart };
    const newQty = (next[product.id] || 0) + delta;
    if (newQty <= 0) {
      delete next[product.id];
    } else {
      next[product.id] = newQty;
    }
    setCart(next);
    saveCart(Object.entries(next).map(([productId, quantity]) => ({ productId, quantity })));
  };

  const related = PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id
  ).slice(0, 4);

  const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/zobraipharm" className="transition-colors hover:text-emerald-700">
          Store
        </Link>
        <ChevronLeft className="h-3 w-3 rotate-180" />
        <span className="text-slate-400">{product.category}</span>
        <ChevronLeft className="h-3 w-3 rotate-180" />
        <span className="font-medium text-slate-800">{product.name}</span>
      </nav>

      {/* Product Detail */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image */}
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-b from-emerald-50/80 to-white p-8 shadow-sm lg:sticky lg:top-24">
          <Image
            src={product.image}
            alt={product.name}
            width={380}
            height={380}
            className="object-contain transition-all duration-500 hover:scale-110"
            priority
          />
          {discount > 0 && (
            <span className="absolute right-4 top-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
              {discount}% OFF
            </span>
          )}
          {product.isPinned && (
            <span className="absolute left-4 top-4 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              Best Seller
            </span>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
            <Pill className="h-3 w-3" />
            {product.category}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-slate-800 md:text-3xl">{product.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {product.genericName} &bull; {product.manufacturer}
          </p>

          {/* Price */}
          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-emerald-800">₹{product.price}</span>
            <span className="text-lg text-slate-400 line-through">₹{product.mrp}</span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              Save ₹{product.mrp - product.price}
            </span>
          </div>

          {/* Quantity Selector */}
          <div className="mt-6 flex items-center gap-4">
            {qty > 0 ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleQtyChange(-1)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[32px] text-center text-lg font-bold text-slate-800">
                  {qty}
                </span>
                <button
                  onClick={() => handleQtyChange(1)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <Link
                  href="/zobraipharm/checkout"
                  className="ml-2 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700"
                >
                  <ShoppingCart className="h-4 w-4" />
                  View Cart ({qty})
                </Link>
              </div>
            ) : (
              <button
                onClick={() => handleQtyChange(1)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-700"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </button>
            )}
          </div>

          {/* Trust badges */}
          <div className="mt-6 flex flex-wrap gap-4">
            {[
              { icon: <Shield className="h-4 w-4" />, text: "Genuine medicine" },
              { icon: <Truck className="h-4 w-4" />, text: "Free delivery" },
              { icon: <Check className="h-4 w-4" />, text: "Prescription may apply" },
            ].map((badge) => (
              <div
                key={badge.text}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"
              >
                {badge.icon}
                {badge.text}
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="mt-8">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Description
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">{product.description}</p>
          </div>

          {/* Composition */}
          <div className="mt-6">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
              <FlaskConical className="h-4 w-4 text-emerald-600" />
              Composition
            </h2>
            <p className="text-sm font-medium text-slate-700">{product.composition}</p>
          </div>

          {/* Dosage */}
          <div className="mt-6">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
              <Info className="h-4 w-4 text-emerald-600" />
              Dosage
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">{product.dosage}</p>
          </div>

          {/* Usage */}
          <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Therapeutic Uses</h2>
            <div className="flex flex-wrap gap-2">
              {product.usage.split(", ").map((u) => (
                <span
                  key={u}
                  className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"
                >
                  {u}
                </span>
              ))}
            </div>
          </div>

          {/* Safety */}
          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/50 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Safety Information
            </h2>
            <ul className="space-y-1.5">
              {product.safety.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-amber-700">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Side Effects */}
          <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Thermometer className="h-4 w-4 text-slate-500" />
              Possible Side Effects
            </h2>
            <p className="text-xs leading-relaxed text-slate-500">{product.sideEffects}</p>
          </div>

          {/* Storage */}
          <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Package className="h-4 w-4 text-slate-500" />
              Storage Instructions
            </h2>
            <p className="text-xs leading-relaxed text-slate-500">{product.storage}</p>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-16">
          <div className="mb-6 flex items-center gap-2">
            <Star className="h-4 w-4 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-800">
              Related Products in {product.category}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((rp) => {
              const rQty = cart[rp.id] || 0;
              return (
                <Link
                  key={rp.id}
                  href={`/zobraipharm/product/${rp.id}`}
                  className="group rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="mb-3 flex aspect-square items-center justify-center rounded-xl bg-emerald-50/50 p-4">
                    <Image
                      src={rp.image}
                      alt={rp.name}
                      width={120}
                      height={120}
                      className="object-contain transition-transform group-hover:scale-110"
                    />
                  </div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-600">
                    {rp.category}
                  </p>
                  <h3 className="text-sm font-bold text-slate-800">{rp.name}</h3>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="font-bold text-emerald-800">₹{rp.price}</span>
                    <span className="text-xs text-slate-400 line-through">₹{rp.mrp}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// Need to import FlaskConical since we use it
function FlaskConical(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
      <path d="M8.5 2h7" />
      <path d="M7 16h10" />
    </svg>
  );
}
