"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Pill,
  Search,
  ShoppingCart,
  Star,
  TrendingUp,
  Shield,
  Truck,
  Clock,
  HeartPulse,
  Package,
  Sparkles,
  ArrowRight,
  Plus,
  Check,
  Leaf,
  FlaskConical,
  Stethoscope,
  Activity,
  Loader2,
} from "lucide-react";
import { CATEGORIES, type PharmProduct, loadCart, saveCart } from "@/lib/pharmacy-store-data";
import { fetchStoreProducts } from "@/lib/store-products";
import { supabase } from "@/lib/supabase";

const categoryIcons: Record<string, React.ReactNode> = {
  "All Products": <Package className="h-4 w-4" />,
  "Pain Relief": <Activity className="h-4 w-4" />,
  "Diabetes Care": <Activity className="h-4 w-4" />,
  Cholesterol: <FlaskConical className="h-4 w-4" />,
  "Blood Pressure": <HeartPulse className="h-4 w-4" />,
  "Heart Health": <HeartPulse className="h-4 w-4" />,
  Hypertension: <Activity className="h-4 w-4" />,
  "Digestive Health": <Stethoscope className="h-4 w-4" />,
  Antibiotics: <FlaskConical className="h-4 w-4" />,
  "Allergy Relief": <Sparkles className="h-4 w-4" />,
  "Anti-inflammatory": <Activity className="h-4 w-4" />,
  Supplements: <Leaf className="h-4 w-4" />,
};

function HeroBanner() {
  return (
    <section className="grid grid-cols-12 gap-8 px-4 md:px-6 lg:px-8 pt-10 pb-16 md:pb-20 items-center min-h-[calc(100vh-8rem)] relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.3),transparent_50%)]" />
      {/* Left Column: Copy */}
      <div className="col-span-12 md:col-span-5 relative z-10">
        <div className="flex flex-col gap-4 mb-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-xs font-medium text-emerald-200 backdrop-blur-sm w-fit">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by ZorabiHealth
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-[1.1] mb-6 text-white">
            Your Trusted
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-emerald-400 bg-clip-text text-transparent">
              Online Pharmacy
            </span>
          </h1>
          <p className="text-base leading-relaxed text-emerald-100/80 max-w-lg mb-8">
            Browse our extensive catalog of genuine medications. Safe, secure, and delivered to your
            doorstep with real-time tracking.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="#products"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-400/30"
            >
              Browse Products
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#categories"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-white/5 px-6 py-3 text-sm font-medium text-emerald-100 backdrop-blur-sm transition-all hover:bg-white/10"
            >
              Shop by Category
            </Link>
          </div>
        </div>
      </div>

      {/* Right Column: Video */}
      <div className="col-span-12 md:col-span-7 relative h-full min-h-[400px] md:min-h-[600px]">
        <div className="absolute inset-0 w-full h-full flex items-center justify-center rounded-2xl overflow-hidden">
          <video
            src="/video/pharmback.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/60 via-transparent to-transparent" />
          {/* Floating UI Elements */}
          <div className="content-overlay w-full h-full flex flex-col items-center justify-center relative">
            {/* Top Right Product Tag */}
            <div className="absolute top-4 md:top-8 right-4 md:right-8">
              <span className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 shadow-sm text-emerald-800">
                ZorabiHealth <span className="text-[10px]">▼</span>
              </span>
            </div>
            {/* Bottom Tabs */}
            <div className="absolute bottom-4 md:bottom-8 flex gap-2 md:gap-3">
              <span className="bg-white/90 backdrop-blur-sm px-3 md:px-4 py-1.5 rounded-full text-[10px] text-emerald-800 font-semibold border border-white shadow-sm">
                Clinical Voice
              </span>
              <span className="bg-white/90 backdrop-blur-sm px-3 md:px-4 py-1.5 rounded-full text-[10px] text-emerald-800 font-semibold border border-white shadow-sm">
                Auto-Refills
              </span>
              <span className="bg-white/90 backdrop-blur-sm px-3 md:px-4 py-1.5 rounded-full text-[10px] text-emerald-800 font-semibold border border-white shadow-sm">
                Pharmacy
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="border-b border-emerald-100 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 md:grid-cols-4 md:px-6 lg:px-8">
        {[
          {
            icon: <Shield className="h-5 w-5" />,
            label: "100% Genuine",
            desc: "Licensed pharmacy",
          },
          {
            icon: <Truck className="h-5 w-5" />,
            label: "Free Delivery",
            desc: "On orders above ₹299",
          },
          { icon: <Clock className="h-5 w-5" />, label: "Same Day", desc: "Order before 2PM" },
          {
            icon: <HeartPulse className="h-5 w-5" />,
            label: "Expert Care",
            desc: "Pharmacist support",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-xl bg-emerald-50/50 px-4 py-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{item.label}</p>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoryNav({ active, onSelect }: { active: string; onSelect: (c: string) => void }) {
  return (
    <section id="categories" className="bg-white pb-4 pt-8">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Shop by Category</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all ${
                active === cat.id
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
                  : "border-slate-100 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/50"
              }`}
            >
              {categoryIcons[cat.label] || <Pill className="h-4 w-4" />}
              <span className="truncate">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({
  product,
  cart,
  onAddToCart,
  onAutoRefill,
  refillStatus,
}: {
  product: PharmProduct;
  cart: Record<string, number>;
  onAddToCart: (id: string) => void;
  onAutoRefill: (product: PharmProduct) => void;
  refillStatus: Record<string, "idle" | "loading" | "done" | "error">;
}) {
  const qty = cart[product.id] || 0;
  const rf = refillStatus[product.id] || "idle";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-lg hover:shadow-emerald-500/5">
      <Link
        href={`/zobraipharm/product/${product.id}`}
        className="relative flex aspect-square items-center justify-center bg-gradient-to-b from-emerald-50/50 to-white p-6"
      >
        <Image
          src={product.image}
          alt={product.name}
          width={200}
          height={200}
          className="h-[200px] w-[200px] object-contain transition-transform duration-500 group-hover:scale-110"
        />
        {product.isPinned && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
            Best Seller
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
        <Link href={`/zobraipharm/product/${product.id}`}>
          <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-600">
            {product.category}
          </p>
          <h3 className="mt-0.5 text-sm font-bold text-slate-800 transition-colors group-hover:text-emerald-700">
            {product.name}
          </h3>
          <p className="text-xs text-slate-500">{product.manufacturer}</p>
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-2 pt-3">
          <div>
            <span className="text-lg font-bold text-emerald-800">₹{product.price}</span>
            <span className="ml-1.5 text-xs text-slate-400 line-through">₹{product.mrp}</span>
            <span className="ml-1.5 text-[11px] font-medium text-emerald-600">
              {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% off
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {qty > 0 ? (
              <>
                <button
                  onClick={() => onAddToCart(product.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[20px] text-center text-sm font-semibold text-emerald-800">
                  {qty}
                </span>
                <button
                  onClick={() => onAddToCart(product.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => onAddToCart(product.id)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-700"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Add
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => onAutoRefill(product)}
          disabled={rf === "loading" || rf === "done"}
          className={`mt-2 w-full rounded-lg py-1.5 text-[11px] font-semibold transition-all ${
            rf === "done"
              ? "bg-emerald-100 text-emerald-700"
              : rf === "error"
                ? "bg-red-50 text-red-600"
                : "bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
          }`}
        >
          {rf === "loading"
            ? "Setting up..."
            : rf === "done"
              ? "Auto-Refill On"
              : rf === "error"
                ? "Retry"
                : "Auto Refill"}
        </button>
      </div>
    </div>
  );
}

function TrendingBanner() {
  return (
    <section id="trending" className="py-8">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-700 p-6 md:p-10">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(ellipse_at_center_right,rgba(255,255,255,0.1),transparent_70%)]" />
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/30 px-3 py-1 text-xs font-medium text-emerald-100">
                <TrendingUp className="h-3 w-3" />
                Limited Time
              </div>
              <h3 className="text-xl font-bold text-white md:text-2xl">
                Free Delivery on First Order
              </h3>
              <p className="mt-1 text-sm text-emerald-200">
                Use code{" "}
                <span className="rounded bg-emerald-500/30 px-2 py-0.5 font-mono font-bold text-white">
                  ZORABI10
                </span>{" "}
                for extra 10% off
              </p>
            </div>
            <Link
              href="#products"
              className="inline-flex items-center gap-2 self-start rounded-full bg-white px-6 py-3 text-sm font-semibold text-emerald-800 shadow-lg transition-all hover:bg-emerald-50"
            >
              Shop Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ZoraipharmPage() {
  const [products, setProducts] = useState<PharmProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refillStatus, setRefillStatus] = useState<
    Record<string, "idle" | "loading" | "done" | "error">
  >({});
  const [cart, setCart] = useState<Record<string, number>>(() => {
    const items = loadCart();
    const map: Record<string, number> = {};
    items.forEach((i) => {
      map[i.productId] = i.quantity;
    });
    return map;
  });

  useEffect(() => {
    fetchStoreProducts().then((data) => {
      setProducts(data);
      setLoadingProducts(false);
    });
  }, []);

  const handleAutoRefill = async (product: PharmProduct) => {
    if (refillStatus[product.id] === "loading" || refillStatus[product.id] === "done") return;
    setRefillStatus((p) => ({ ...p, [product.id]: "loading" }));
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setRefillStatus((p) => ({ ...p, [product.id]: "error" }));
        return;
      }
      const res = await fetch("/api/store/refill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          medicationId: product.id,
          medicationName: product.name,
          dosage: product.dosage,
          quantity: 30,
        }),
      });
      if (res.ok) {
        setRefillStatus((p) => ({ ...p, [product.id]: "done" }));
      } else {
        setRefillStatus((p) => ({ ...p, [product.id]: "error" }));
      }
    } catch {
      setRefillStatus((p) => ({ ...p, [product.id]: "error" }));
    }
  };

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== "all") {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.genericName.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.manufacturer.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCategory, searchQuery, products]);

  const handleAddToCart = (productId: string) => {
    const next = { ...cart };
    next[productId] = (next[productId] || 0) + 1;
    setCart(next);
    saveCart(Object.entries(next).map(([productId, quantity]) => ({ productId, quantity })));
  };

  const showFeatured = activeCategory === "all" && !searchQuery;
  const pinned = products.filter((p) => p.isPinned);
  const nonPinned = products.filter((p) => !p.isPinned);
  const displayList = showFeatured && pinned.length > 0 ? nonPinned : filtered;

  return (
    <>
      <HeroBanner />
      <TrustStrip />
      <CategoryNav active={activeCategory} onSelect={setActiveCategory} />
      <TrendingBanner />

      {loadingProducts ? (
        <section className="py-20 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-3 text-sm text-slate-500">Loading products...</p>
        </section>
      ) : (
        <section id="products" className="py-6">
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {activeCategory === "all" ? "All Medications" : activeCategory}
                </h2>
                <p className="text-sm text-slate-500">{filtered.length} products found</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search medicines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            {showFeatured && pinned.length > 0 && (
              <div className="mb-8">
                <div className="mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-700">Featured Products</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {pinned.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      cart={cart}
                      onAddToCart={handleAddToCart}
                      onAutoRefill={handleAutoRefill}
                      refillStatus={refillStatus}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {displayList.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  cart={cart}
                  onAddToCart={handleAddToCart}
                  onAutoRefill={handleAutoRefill}
                  refillStatus={refillStatus}
                />
              ))}
            </div>

            {displayList.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Package className="mb-4 h-12 w-12 text-slate-300" />
                <p className="text-lg font-medium text-slate-600">No products found</p>
                <p className="text-sm text-slate-400">
                  Try adjusting your search or category filter
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
