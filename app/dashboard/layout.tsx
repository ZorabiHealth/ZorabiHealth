"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  HeartPulse,
  LayoutDashboard,
  LineChart,
  Activity,
  Leaf,
  Dumbbell,
  Settings,
  LogOut,
  ChevronRight,
  Bell,
  Pill,
  Sparkles,
  ShoppingBag,
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const isPlaceholder =
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder-url.supabase.co");

      if (isPlaceholder) {
        setIsMockMode(true);
        setCheckingAuth(false);
        console.warn(
          "[ZorabiHealth Auth] Running in Mock Bypass Mode due to placeholder Supabase URL."
        );
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
        } else {
          setCheckingAuth(false);
        }
      } catch (err) {
        console.error("[ZorabiHealth Auth] Failed to check user session:", err);
        router.push("/login");
      }
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const navItems = [
    {
      name: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      group: "main",
    },
    {
      name: "Analytics & Trends",
      href: "/dashboard/analytics",
      icon: LineChart,
      group: "main",
    },
    {
      name: "Symptom Tracker",
      href: "/dashboard/vitals",
      icon: Activity,
      group: "main",
    },
    {
      name: "Meditation & Mind",
      href: "/dashboard/meditation",
      icon: Leaf,
      group: "main",
    },
    {
      name: "Workout & Fitness",
      href: "/dashboard/workout",
      icon: Dumbbell,
      group: "main",
    },
    // ── AI & Health Features ──────────────────────────
    {
      name: "Voice Assistant",
      href: "/dashboard/voice",
      icon: Sparkles,
      group: "ai",
      badge: "AI",
    },
    {
      name: "Medications",
      href: "/dashboard/medications",
      icon: Pill,
      group: "ai",
    },
    {
      name: "Pharmacy & Refills",
      href: "/dashboard/pharmacy",
      icon: ShoppingBag,
      group: "ai",
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      group: "other",
    },
  ];

  const handleLogout = async () => {
    pendo.clearSession();

    const isPlaceholder =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder-url.supabase.co");

    if (!isPlaceholder) {
      await supabase.auth.signOut();
    }
    router.push("/");
  };

  if (checkingAuth) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md animate-pulse">
          <HeartPulse className="w-5 h-5 text-white" />
        </div>
        <p className="text-slate-500 font-bold text-sm">Authenticating session...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-[#eef2f8] via-[#e8eef9] to-[#d4e1f5] font-sans">
      {/* Sidebar */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`
          relative z-30 flex flex-col shrink-0
          bg-white/60 backdrop-blur-2xl border-r border-white/40
          shadow-xl shadow-slate-200/50
          transition-all duration-300 ease-in-out
          ${expanded ? "w-56" : "w-[70px]"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/30">
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shrink-0">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            {expanded && (
              <span className="font-bold text-slate-800 text-sm whitespace-nowrap truncate">
                ZorabiHealth
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 flex-grow px-2 py-4 overflow-y-auto overflow-x-hidden">
          {/* Main group */}
          {navItems
            .filter((i) => i.group === "main")
            .map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={!expanded ? item.name : undefined}
                  className={`
                  flex items-center gap-3 px-2.5 py-2.5 rounded-xl
                  transition-all duration-200 cursor-pointer
                  ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                      : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                  }
                `}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {expanded && (
                    <span className="text-sm font-medium whitespace-nowrap truncate flex-1">
                      {item.name}
                    </span>
                  )}
                  {isActive && expanded && (
                    <ChevronRight className="w-4 h-4 ml-auto shrink-0 opacity-70" />
                  )}
                </Link>
              );
            })}

          {/* AI Features divider */}
          <div
            className={`my-2 ${expanded ? "border-t border-white/30" : "border-t border-white/20"}`}
          >
            {expanded && (
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2.5 pt-2 pb-1">
                AI Features
              </p>
            )}
          </div>

          {/* AI group */}
          {navItems
            .filter((i) => i.group === "ai")
            .map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={!expanded ? item.name : undefined}
                  className={`
                  relative flex items-center gap-3 px-2.5 py-2.5 rounded-xl
                  transition-all duration-200 cursor-pointer
                  ${
                    isActive
                      ? item.href === "/dashboard/voice"
                        ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                        : item.href === "/dashboard/pharmacy"
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
                          : "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                      : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                  }
                `}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {expanded && (
                    <span className="text-sm font-medium whitespace-nowrap truncate flex-1">
                      {item.name}
                    </span>
                  )}
                  {"badge" in item && item.badge && !isActive && (
                    <span
                      className={`text-[8px] font-black px-1 py-0.5 rounded ${
                        expanded
                          ? "bg-violet-100 text-violet-600"
                          : "absolute -top-1 -right-1 bg-violet-500 text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && expanded && (
                    <ChevronRight className="w-4 h-4 ml-auto shrink-0 opacity-70" />
                  )}
                </Link>
              );
            })}

          {/* Settings */}
          <div className="my-2 border-t border-white/20" />
          {navItems
            .filter((i) => i.group === "other")
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={!expanded ? item.name : undefined}
                  className={`
                  flex items-center gap-3 px-2.5 py-2.5 rounded-xl
                  transition-all duration-200 cursor-pointer
                  ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                      : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                  }
                `}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {expanded && (
                    <span className="text-sm font-medium whitespace-nowrap truncate">
                      {item.name}
                    </span>
                  )}
                </Link>
              );
            })}
        </nav>

        {/* Bottom: Bell + Logout + Avatar */}
        <div className="flex flex-col items-center gap-3 px-2 py-4 border-t border-white/30">
          <button
            className="flex items-center gap-3 w-full px-2.5 py-2.5 rounded-xl text-slate-500 hover:bg-white/70 hover:text-slate-800 transition-all duration-200"
            title={!expanded ? "Notifications" : undefined}
          >
            <Bell className="w-5 h-5 shrink-0" />
            {expanded && <span className="text-sm font-medium">Notifications</span>}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-2.5 py-2.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
            title={!expanded ? "Sign Out" : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {expanded && <span className="text-sm font-medium">Sign Out</span>}
          </button>

          <div
            className="flex items-center gap-3 w-full px-2.5 py-1.5 rounded-xl cursor-pointer hover:bg-white/70 transition-all duration-200"
            title={!expanded ? "Dr. Jenkins" : undefined}
          >
            <div className="w-8 h-8 rounded-full border-2 border-blue-400/60 overflow-hidden bg-slate-300 shrink-0 relative">
              <Image src="/images/user.jpg" alt="User" className="object-cover" fill sizes="32px" />
            </div>
            {expanded && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">Dr. Jenkins</p>
                <p className="text-[10px] text-slate-400 truncate">Cardiologist</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden">{children}</main>
    </div>
  );
}
