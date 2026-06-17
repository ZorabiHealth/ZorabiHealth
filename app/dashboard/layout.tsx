"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { MedicationAlarmAlerter } from "@/components/medication-alarm-alerter";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationToast } from "@/components/notification-toast";
import { PairButton } from "@/components/pair-button";
import { cn } from "@/lib/utils";
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
  BellRing,
  Pill,
  Sparkles,
  ShoppingBag,
  Moon,
  FolderOpen,
  Package,
  BookOpen,
  ClipboardList,
  CircleHelp,
  LayoutGrid,
  Calendar,
  MessageSquare,
  Users,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const patientNavItems: NavItem[] = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Analytics & Trends",
    href: "/dashboard/analytics",
    icon: LineChart,
  },
  {
    name: "Symptom Tracker",
    href: "/dashboard/vitals",
    icon: Activity,
  },
  {
    name: "Meditation & Mind",
    href: "/dashboard/meditation",
    icon: Leaf,
  },
  {
    name: "Workout & Fitness",
    href: "/dashboard/workout",
    icon: Dumbbell,
  },
  {
    name: "Sleep Companion",
    href: "/dashboard/sleep",
    icon: Moon,
  },
  {
    name: "Voice Assistant",
    href: "/dashboard/voice",
    icon: Sparkles,
    badge: "AI",
  },
  {
    name: "Medications",
    href: "/dashboard/medications",
    icon: Pill,
  },
  {
    name: "Pharmacy & Refills",
    href: "/dashboard/pharmacy",
    icon: ShoppingBag,
  },
  {
    name: "My Orders",
    href: "/dashboard/my-orders",
    icon: ClipboardCheck,
  },
  {
    name: "Choose Your Doctor",
    href: "/dashboard/patient/book-appointment",
    icon: Calendar,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

const pharmacyNavItems: NavItem[] = [
  {
    name: "Inventory",
    href: "/dashboard/pharmacy/inventory",
    icon: Package,
  },
  {
    name: "Active Orders",
    href: "/dashboard/pharmacy",
    icon: ClipboardList,
  },
  {
    name: "Drug Catalog",
    href: "/dashboard/pharmacy/catalog",
    icon: BookOpen,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

function getActiveColor(href: string): string {
  if (href === "/dashboard/voice") return "bg-violet-600 text-white shadow-md shadow-violet-500/25";
  if (href === "/dashboard/pharmacy" || href.startsWith("/dashboard/pharmacy"))
    return "bg-emerald-600 text-white shadow-md shadow-emerald-500/25";
  return "bg-blue-600 text-white shadow-md shadow-blue-500/25";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { permission, requestPermission, initialized, inAppNotifications, dismissNotification } =
    useNotifications();
  const [notifGranted, setNotifGranted] = useState(false);
  const { role, loading: roleLoading } = useUserRole();

  useEffect(() => {
    if (initialized && permission === "granted") {
      setNotifGranted((prev) => prev || true);
    }
  }, [initialized, permission]);

  useEffect(() => {
    if (!roleLoading && role === null && !checkingAuth) {
      router.push("/dashboard/role-select");
    }
  }, [role, roleLoading, checkingAuth, router]);

  useEffect(() => {
    const checkUser = async () => {
      const isPlaceholder =
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder-url.supabase.co");

      if (isPlaceholder) {
        setCheckingAuth(false);
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
          pendo.identify({
            visitor: {
              id: session.user.id,
              email: session.user.email || "",
              full_name: session.user.user_metadata?.full_name || "",
            },
          });
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

  const getNavItemsForRole = () => {
    switch (role) {
      case "pharmacy_vendor":
        return pharmacyNavItems;
      case "patient":
      default:
        return patientNavItems;
    }
  };

  const currentNavItems = getNavItemsForRole();

  const handleLogout = async () => {
    const isPlaceholder =
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder-url.supabase.co");

    if (!isPlaceholder) {
      await supabase.auth.signOut();
    }
    pendo.clearSession();
    router.push("/");
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive =
      pathname === item.href ||
      (![
        "/dashboard",
        "/dashboard/doctor",
        "/dashboard/pharmacy",
        "/dashboard/pharmacy/inventory",
      ].includes(item.href) &&
        pathname.startsWith(item.href));

    return (
      <Link
        key={item.name}
        href={item.href}
        title={!expanded ? item.name : undefined}
        className={`
          relative flex items-center gap-3 px-2.5 py-2.5 rounded-xl
          transition-all duration-200 cursor-pointer
          ${isActive ? getActiveColor(item.href) : "text-slate-500 hover:bg-white/70 hover:text-slate-800"}
        `}
      >
        <Icon className="w-5 h-5 shrink-0" />
        {expanded && (
          <span className="text-sm font-medium whitespace-nowrap truncate flex-1">{item.name}</span>
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
        {isActive && expanded && <ChevronRight className="w-4 h-4 ml-auto shrink-0 opacity-70" />}
      </Link>
    );
  };

  if (checkingAuth || roleLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md animate-pulse">
          <HeartPulse className="w-5 h-5 text-white" />
        </div>
        <p className="text-slate-500 font-bold text-sm">
          {roleLoading ? "Loading profile..." : "Authenticating session..."}
        </p>
      </div>
    );
  }

  if (role === "doctor") {
    return (
      <div className="flex h-screen w-screen overflow-hidden clinical-bg-gradient font-sans">
        {/* Doctor-specific Rail Sidebar */}
        <aside className="fixed left-0 top-0 h-full z-40 bg-[#f8f9ff]/70 backdrop-blur-2xl border-r border-white/20 shadow-sm w-20 flex flex-col items-center py-6 shrink-0">
          {/* Zorabi Logo */}
          <Link
            href="/dashboard/doctor"
            className="mb-8 hover:scale-105 transition-transform cursor-pointer block"
          >
            <Image
              src="/logo/image/logo.png"
              alt="ZorabiHealth"
              width={50}
              height={50}
              className="object-contain"
              style={{ width: "auto", height: "auto" }}
              loading="eager"
              unoptimized
            />
          </Link>

          <div className="flex flex-col gap-6 flex-grow items-center">
            {/* grid_view (Clinical Pad / Dashboard Workspace) */}
            <Link
              href="/dashboard/doctor"
              title="Dashboard"
              aria-label="Dashboard"
              className={cn(
                "p-3 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer",
                pathname === "/dashboard/doctor"
                  ? "bg-[#0c4381] text-white shadow-md shadow-blue-500/20 scale-105"
                  : "text-[#434750] hover:bg-[#d3e4fe]/30 hover:scale-105"
              )}
            >
              <LayoutGrid className="w-5 h-5" />
            </Link>

            {/* calendar_today (Schedule view) */}
            <Link
              href="/dashboard/doctor/schedule"
              title="Schedule"
              aria-label="Schedule"
              className={cn(
                "p-3 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer",
                pathname === "/dashboard/doctor/schedule"
                  ? "bg-[#0c4381] text-white shadow-md shadow-blue-500/20 scale-105"
                  : "text-[#434750] hover:bg-[#d3e4fe]/30 hover:scale-105"
              )}
            >
              <Calendar className="w-5 h-5" />
            </Link>

            {/* chat (Messages view) */}
            <Link
              href="/dashboard/doctor/messages"
              title="Messages"
              aria-label="Messages"
              className={cn(
                "p-3 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer",
                pathname === "/dashboard/doctor/messages"
                  ? "bg-[#0c4381] text-white shadow-md shadow-blue-500/20 scale-105"
                  : "text-[#434750] hover:bg-[#d3e4fe]/30 hover:scale-105"
              )}
            >
              <MessageSquare className="w-5 h-5" />
            </Link>

            {/* stethoscope (Prescriptions List) */}
            <Link
              href="/dashboard/doctor/prescriptions"
              title="Prescriptions"
              aria-label="Prescriptions"
              className={cn(
                "p-3 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer",
                pathname === "/dashboard/doctor/prescriptions"
                  ? "bg-[#0c4381] text-white shadow-md shadow-blue-500/20 scale-105"
                  : "text-[#434750] hover:bg-[#d3e4fe]/30 hover:scale-105"
              )}
            >
              <ClipboardList className="w-5 h-5" />
            </Link>

            {/* group (Patients view) */}
            <Link
              href="/dashboard/doctor/patients"
              title="Patients"
              aria-label="Patients"
              className={cn(
                "p-3 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer",
                pathname === "/dashboard/doctor/patients"
                  ? "bg-[#0c4381] text-white shadow-md shadow-blue-500/20 scale-105"
                  : "text-[#434750] hover:bg-[#d3e4fe]/30 hover:scale-105"
              )}
            >
              <Users className="w-5 h-5" />
            </Link>

            {/* bar_chart (Analytics view) */}
            <Link
              href="/dashboard/doctor/analytics"
              title="Analytics"
              aria-label="Analytics"
              className={cn(
                "p-3 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer",
                pathname === "/dashboard/doctor/analytics"
                  ? "bg-[#0c4381] text-white shadow-md shadow-blue-500/20 scale-105"
                  : "text-[#434750] hover:bg-[#d3e4fe]/30 hover:scale-105"
              )}
            >
              <BarChart3 className="w-5 h-5" />
            </Link>

            {/* article (Records view) */}
            <Link
              href="/dashboard/doctor/records"
              title="Records"
              aria-label="Records"
              className={cn(
                "p-3 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer",
                pathname === "/dashboard/doctor/records"
                  ? "bg-[#0c4381] text-white shadow-md shadow-blue-500/20 scale-105"
                  : "text-[#434750] hover:bg-[#d3e4fe]/30 hover:scale-105"
              )}
            >
              <FolderOpen className="w-5 h-5" />
            </Link>
          </div>

          <div className="flex flex-col gap-4 mt-auto items-center">
            {/* help_outline */}
            <Link
              href="/resources/help-center"
              title="Help"
              aria-label="Help Center"
              className="text-[#434750] p-3 hover:bg-slate-100/50 rounded-xl transition-all duration-200 cursor-pointer"
            >
              <CircleHelp className="w-5 h-5" />
            </Link>

            {/* settings / report -> mapped to /dashboard/settings or /dashboard/doctor/settings */}
            <Link
              href={role === "doctor" ? "/dashboard/doctor/settings" : "/dashboard/settings"}
              title="Settings"
              aria-label="Settings"
              className={cn(
                "p-3 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer",
                pathname === "/dashboard/settings" || pathname === "/dashboard/doctor/settings"
                  ? "bg-[#0c4381] text-white shadow-md shadow-blue-500/20 scale-105"
                  : "text-[#434750] hover:bg-slate-100/50 hover:scale-105"
              )}
            >
              <Settings className="w-5 h-5" />
            </Link>

            {/* Doctor Profile Avatar */}
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md">
              <img
                src="/images/doctor1.jpg"
                alt="Doctor Profile"
                className="w-full h-full object-cover border-blue-500"
              />
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
              className="text-[#434750] p-3 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* Main Content shifted to the right by 80px (w-20) */}
        <main
          id="dashboard-main"
          className="flex-grow min-w-0 h-full overflow-y-auto overflow-x-hidden ml-20"
        >
          {children}
        </main>
        <MedicationAlarmAlerter />
        <NotificationToast notifications={inAppNotifications} onDismiss={dismissNotification} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden clinical-bg-gradient font-sans">
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
            {expanded ? (
              <Image
                src="/logo/image/logo.png"
                alt="ZorabiHealth"
                width={140}
                height={40}
                className="object-contain"
                style={{ width: "auto", height: "auto" }}
                loading="eager"
                unoptimized
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shrink-0">
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 flex-grow px-2 py-4 overflow-y-auto overflow-x-hidden">
          {currentNavItems.map(renderNavItem)}
        </nav>

        {/* Bottom: Pair + Bell + Logout + Avatar */}
        <div className="flex flex-col items-center gap-3 px-2 py-4 border-t border-white/30">
          <PairButton />
          <button
            onClick={async () => {
              if (!notifGranted) {
                const result = await requestPermission();
                if (result === "granted") setNotifGranted(true);
              }
            }}
            className="flex items-center gap-3 w-full px-2.5 py-2.5 rounded-xl text-slate-500 hover:bg-white/70 hover:text-slate-800 transition-all duration-200"
            title={!expanded ? "Notifications" : undefined}
          >
            {notifGranted ? (
              <BellRing className="w-5 h-5 shrink-0 text-blue-500" />
            ) : (
              <Bell className="w-5 h-5 shrink-0" />
            )}
            {expanded && (
              <span className="text-sm font-medium">
                {notifGranted ? "Notifications On" : "Enable Notifications"}
              </span>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-2.5 py-2.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
            title={!expanded ? "Sign Out" : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {expanded && <span className="text-sm font-medium">Sign Out</span>}
          </button>

          {/* User Avatar */}
          <div className="flex items-center gap-3 w-full px-2.5 py-1.5 rounded-xl">
            <div className="w-8 h-8 rounded-full border-2 border-blue-400/60 overflow-hidden bg-slate-300 shrink-0 relative">
              <Image src="/images/user.jpg" alt="User" className="object-cover" fill sizes="32px" />
            </div>
            {expanded && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {role === "pharmacy_vendor"
                    ? "Pharmacist"
                    : role === ("doctor" as string)
                      ? "Doctor"
                      : "Patient"}
                </p>
                <p className="text-[10px] text-slate-400 truncate capitalize">
                  {role ?? "No role"}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main id="dashboard-main" className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden">
        {children}
      </main>
      <MedicationAlarmAlerter />
      <NotificationToast notifications={inAppNotifications} onDismiss={dismissNotification} />
    </div>
  );
}
