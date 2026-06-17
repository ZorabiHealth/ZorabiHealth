"use client";

import React, { useEffect, useState, createContext, useContext } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ShoppingCart, Menu, X, Pill, HeartPulse, User, LogIn } from "lucide-react";
import { loadCart, type CartItem } from "@/lib/pharmacy-store-data";

interface AuthUser {
  id: string;
  email?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function useStoreAuth() {
  return useContext(AuthContext);
}

function ZoraipharmHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const { user } = useStoreAuth();
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    setCart(loadCart());
    const onFocus = () => setCart(loadCart());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-100/60 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8">
        <Link href="/zobraipharm" className="flex items-center gap-2.5">
          <Image
            src="/logo/image/logo.png"
            alt="ZorabiHealth"
            width={100}
            height={28}
            className="object-contain"
            priority
          />
          <span className="hidden text-xs font-medium text-emerald-700 md:inline-block">
            Pharmacy
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/zobraipharm"
            className="text-sm font-medium text-slate-700 transition-colors hover:text-emerald-700"
          >
            Store
          </Link>
          <Link
            href="/zobraipharm#categories"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-emerald-700"
          >
            Categories
          </Link>
          <Link
            href="/zobraipharm#trending"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-emerald-700"
          >
            Trending
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard/my-orders"
              className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 sm:flex"
            >
              <User className="h-3.5 w-3.5" />
              My Orders
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 sm:flex"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </Link>
          )}
          <Link
            href="/zobraipharm/checkout"
            className="relative flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition-all hover:bg-emerald-100"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-emerald-50 md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="border-t border-emerald-100 bg-white px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-2">
            <Link
              href="/zobraipharm"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-emerald-50"
              onClick={() => setMenuOpen(false)}
            >
              Store
            </Link>
            <Link
              href="/zobraipharm#categories"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-emerald-50"
              onClick={() => setMenuOpen(false)}
            >
              Categories
            </Link>
            <Link
              href="/zobraipharm#trending"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-emerald-50"
              onClick={() => setMenuOpen(false)}
            >
              Trending
            </Link>
            {user ? (
              <Link
                href="/dashboard/my-orders"
                className="rounded-lg px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                onClick={() => setMenuOpen(false)}
              >
                My Orders
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                onClick={() => setMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function ZoraipharmFooter() {
  return (
    <footer className="border-t border-emerald-100 bg-emerald-950 text-emerald-200">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Pill className="h-6 w-6 text-emerald-400" />
              <span className="text-lg font-bold text-white">ZorabiPharm</span>
            </div>
            <p className="mb-4 max-w-sm text-sm leading-relaxed text-emerald-300">
              Your trusted online pharmacy powered by ZorabiHealth. Quality medications delivered to
              your doorstep with real-time tracking and expert guidance.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <HeartPulse className="h-3.5 w-3.5" />
              Licensed pharmacy &bull; Verified medicines &bull; Free delivery
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/zobraipharm"
                  className="text-emerald-300 transition-colors hover:text-white"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/zobraipharm"
                  className="text-emerald-300 transition-colors hover:text-white"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/zobraipharm/checkout"
                  className="text-emerald-300 transition-colors hover:text-white"
                >
                  Cart
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Support</h4>
            <ul className="space-y-2 text-sm">
              <li className="text-emerald-300">pharmacy@zorabihealth.com</li>
              <li className="text-emerald-300">+91 1800-ZORABI</li>
              <li className="text-emerald-300">Mon-Sat 9AM - 9PM</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-emerald-800 pt-6 text-center text-xs text-emerald-400">
          &copy; {new Date().getFullYear()} ZorabiHealth. All rights reserved. Powered by
          ZorabiPharm.
        </div>
      </div>
    </footer>
  );
}

export default function ZoraipharmLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email });
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // If browsing catalog (not checkout or confirmation), allow viewing without login
  const needsAuth =
    pathname === "/zobraipharm/checkout" || pathname === "/zobraipharm/confirmation";

  useEffect(() => {
    if (!loading && !user && needsAuth) {
      router.push("/login");
    }
  }, [loading, user, needsAuth, router]);

  if (loading && needsAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50/30 via-white to-emerald-50/20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-emerald-50/30 via-white to-emerald-50/20">
        <ZoraipharmHeader />
        <main className="flex-1">{children}</main>
        <ZoraipharmFooter />
      </div>
    </AuthContext.Provider>
  );
}
