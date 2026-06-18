"use client";

declare let pendo: {
  initialize: (config: Record<string, unknown>) => void;
  identify: (visitor: Record<string, unknown>) => void;
  pageLoad: () => void;
  clearSession?: () => void;
  [key: string]: unknown;
};

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  Calendar,
  MessageSquare,
  FileText,
  Users,
  BarChart3,
  CircleHelp,
  Settings,
  LogOut,
} from "lucide-react";

export function DoctorSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!isPlaceholder) {
      await supabase.auth.signOut();
    }
    if (typeof pendo !== "undefined" && pendo?.clearSession) {
      pendo.clearSession();
    }
    router.push("/");
  };

  const handleHelp = async () => {
    const { showToast } = await import("@/components/ui/toast");
    showToast("DocAssist Help Center is online.", "info");
  };

  const navItems = [
    { href: "/dashboard/doctor", icon: LayoutGrid, title: "Dashboard" },
    { href: "/dashboard/doctor/schedule", icon: Calendar, title: "Schedule" },
    { href: "/dashboard/doctor/messages", icon: MessageSquare, title: "Messages" },
    { href: "/dashboard/doctor/prescriptions", icon: FileText, title: "Prescriptions" },
    { href: "/dashboard/doctor/patients", icon: Users, title: "Patients" },
    { href: "/dashboard/doctor/analytics", icon: BarChart3, title: "Analytics" },
    { href: "/dashboard/doctor/records", icon: FileText, title: "Records" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full z-40 bg-[#f8f9ff]/70 backdrop-blur-2xl border-r border-white/20 shadow-sm w-20 flex flex-col items-center py-6 shrink-0">
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
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.title}
              className={cn(
                "p-3 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer",
                isActive
                  ? "bg-[#0c4381] text-white shadow-md shadow-blue-500/20 scale-105"
                  : "text-[#434750] hover:bg-[#d3e4fe]/30 hover:scale-105"
              )}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 mt-auto items-center">
        <button
          onClick={handleHelp}
          title="Help"
          className="text-[#434750] p-3 hover:bg-slate-100/50 rounded-xl transition-all duration-200 cursor-pointer"
        >
          <CircleHelp className="w-5 h-5" />
        </button>

        <Link
          href="/dashboard/doctor/settings"
          title="Settings"
          className={cn(
            "p-3 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer",
            pathname === "/dashboard/settings" || pathname === "/dashboard/doctor/settings"
              ? "bg-[#0c4381] text-white shadow-md shadow-blue-500/20 scale-105"
              : "text-[#434750] hover:bg-slate-100/50 hover:scale-105"
          )}
        >
          <Settings className="w-5 h-5" />
        </Link>

        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md">
          <Image
            src="/images/doctor1.jpg"
            alt="Doctor Profile"
            width={40}
            height={40}
            className="w-full h-full object-cover border-blue-500"
          />
        </div>

        <button
          onClick={handleLogout}
          title="Sign Out"
          className="text-[#434750] p-3 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}
