"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { HeartPulse, Stethoscope, Pill as PillIcon, ChevronRight } from "lucide-react";

const roles = [
  {
    id: "patient" as const,
    label: "Patient",
    description: "Manage your health, medications, appointments, and refills",
    icon: HeartPulse,
    color: "from-blue-500 to-blue-700",
    shadow: "shadow-blue-500/25",
  },
  {
    id: "doctor" as const,
    label: "Doctor",
    description: "Manage patients, create AI-assisted prescriptions, and track care",
    icon: Stethoscope,
    color: "from-violet-500 to-violet-700",
    shadow: "shadow-violet-500/25",
  },
  {
    id: "pharmacy_vendor" as const,
    label: "Pharmacy",
    description: "Manage inventory, fulfill prescriptions, and process orders",
    icon: PillIcon,
    color: "from-emerald-500 to-emerald-700",
    shadow: "shadow-emerald-500/25",
  },
];

export default function RoleSelectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

  useEffect(() => {
    const checkExistingRole = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data?.role) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        // User not logged in — let them see the page
      } finally {
        setCheckingExisting(false);
      }
    };
    checkExistingRole();
  }, [router]);

  if (checkingExisting) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#eef2f8] via-[#e8eef9] to-[#d4e1f5]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md animate-pulse">
          <HeartPulse className="w-5 h-5 text-white" />
        </div>
      </div>
    );
  }

  const selectRole = async (role: string) => {
    setSaving(role);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { error } = await supabase.from("user_roles").insert({
        user_id: user.id,
        role,
      });

      if (error) {
        if (error.code === "23505") {
          const { error: updateErr } = await supabase
            .from("user_roles")
            .update({ role })
            .eq("user_id", user.id);
          if (updateErr) throw updateErr;
        } else {
          throw error;
        }
      }

      // Create patient_profiles entry for new patient signups
      if (role === "patient") {
        const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Patient";
        // Check if patient_profiles entry already exists
        const { data: existing } = await supabase
          .from("patient_profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        if (!existing) {
          await supabase.from("patient_profiles").insert({
            id: user.id,
            full_name: fullName,
            email: user.email || null,
          });
        }
      }

      router.push(role === "doctor" ? "/dashboard/doctor" : "/dashboard");
    } catch (err) {
      console.error("Failed to set role:", err);
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#eef2f8] via-[#e8eef9] to-[#d4e1f5] p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg mx-auto mb-4">
            <HeartPulse className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome to ZorabiHealth</h1>
          <p className="text-sm text-slate-500 mt-1">Choose your role to get started</p>
        </div>

        {/* Role Cards */}
        <div className="space-y-3">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => selectRole(role.id)}
                disabled={saving !== null}
                className="w-full text-left bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-white/40 shadow-sm hover:shadow-md hover:bg-white/90 transition-all disabled:opacity-60 group"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center shadow-md shrink-0 ${role.shadow}`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-slate-800">{role.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{role.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Your role is permanent once selected and cannot be changed later.
        </p>
      </div>
    </div>
  );
}
