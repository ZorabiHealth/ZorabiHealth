"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Pill,
  Search,
  ShoppingCart,
  Star,
  ChevronRight,
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
  Brain,
} from "lucide-react";
import {
  PRODUCTS,
  CATEGORIES,
  type PharmProduct,
  loadCart,
  saveCart,
} from "@/lib/pharmacy-store-data";

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
    <section className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.3),transparent_50%)]" />
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24 lg:px-8">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-xs font-medium text-emerald-200 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by ZorabiHealth
          </div>
          <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl">
            Your Trusted
            <br />
            <span className="text-emerald-400">Online Pharmacy</span>
          </h1>
          <p className="mb-8 max-w-lg text-base leading-relaxed text-emerald-100/80">
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
}: {
  product: PharmProduct;
  cart: Record<string, number>;
  onAddToCart: (id: string) => void;
}) {
  const qty = cart[product.id] || 0;

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
          className="object-contain transition-transform duration-500 group-hover:scale-110"
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
        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <span className="text-lg font-bold text-emerald-800">₹{product.price}</span>
            <span className="ml-1.5 text-xs text-slate-400 line-through">₹{product.mrp}</span>
            <span className="ml-1.5 text-[11px] font-medium text-emerald-600">
              {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% off
            </span>
          </div>
          {qty > 0 ? (
            <div className="flex items-center gap-1.5">
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
            </div>
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
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>(() => {
    const items = loadCart();
    const map: Record<string, number> = {};
    items.forEach((i) => {
      map[i.productId] = i.quantity;
    });
    return map;
  });

  const filtered = useMemo(() => {
    let list = PRODUCTS;
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
  }, [activeCategory, searchQuery]);

  const handleAddToCart = (productId: string) => {
    const next = { ...cart };
    next[productId] = (next[productId] || 0) + 1;
    setCart(next);
    saveCart(Object.entries(next).map(([productId, quantity]) => ({ productId, quantity })));
  };

  const pinned = PRODUCTS.filter((p) => p.isPinned);

  return (
    <>
      <HeroBanner />
      <TrustStrip />
      <CategoryNav active={activeCategory} onSelect={setActiveCategory} />
      <TrendingBanner />

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

          {activeCategory === "all" && !searchQuery && pinned.length > 0 && (
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
                  />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                cart={cart}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package className="mb-4 h-12 w-12 text-slate-300" />
              <p className="text-lg font-medium text-slate-600">No products found</p>
              <p className="text-sm text-slate-400">Try adjusting your search or category filter</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
