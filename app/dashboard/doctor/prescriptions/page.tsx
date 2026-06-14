"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, FileText, ChevronRight, ChevronDown, Search } from "lucide-react";

interface Prescription {
  id: string;
  patient_id: string;
  diagnosis: string;
  notes: string;
  status: "draft" | "active" | "expired" | "filled" | "completed" | "cancelled";
  created_at: string;
  patient_email?: string;
  patient_name?: string;
  items: PrescriptionItem[];
}

interface PrescriptionItem {
  id: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity?: number;
  notes: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  expired: "bg-red-100 text-red-600",
  filled: "bg-blue-100 text-blue-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-gray-100 text-gray-500",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PrescriptionsPage() {
  const { role, userId } = useUserRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [doctorProfileId, setDoctorProfileId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [patientNames, setPatientNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (role === null) return;
    if (role !== "doctor") {
      router.push("/dashboard");
      return;
    }
    const init = async () => {
      const { data: profile } = await supabase
        .from("doctor_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();
      if (profile) {
        setDoctorProfileId(profile.id);
        setLoading(true);
        const { data, error } = await supabase
          .from("prescriptions")
          .select("*, items:prescription_items(id, drug_name, dosage, frequency, duration, notes)")
          .eq("doctor_id", profile.id)
          .order("created_at", { ascending: false });
        if (!error) {
          const pIds = [...new Set((data ?? []).map((rx) => rx.patient_id))];
          const { data: ppData } = await supabase
            .from("patient_profiles")
            .select("id, email, full_name")
            .in("id", pIds.length > 0 ? pIds : ["00000000-0000-0000-0000-000000000000"]);
          const emailMap = new Map((ppData ?? []).map((p) => [p.id, p.email]));
          const nameMap = new Map(
            (ppData ?? []).map((p) => [p.id, p.full_name || p.email || "Unknown Patient"])
          );
          setPatientNames(nameMap);
          setPrescriptions(
            (data ?? []).map((rx) => ({
              ...rx,
              patient_email: emailMap.get(rx.patient_id) || "",
              patient_name: nameMap.get(rx.patient_id) || "Unknown Patient",
            }))
          );
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    };
    init();
  }, [role, userId, router]);

  useEffect(() => {
    const pid = searchParams.get("patient_id");
    if (pid) {
      router.replace(`/dashboard/doctor?patient_id=${pid}`);
    }
  }, [searchParams, router]);

  const filteredPrescriptions = prescriptions.filter((rx) => {
    const q = searchTerm.toLowerCase();
    return (
      rx.diagnosis.toLowerCase().includes(q) ||
      rx.patient_email?.toLowerCase().includes(q) ||
      rx.patient_name?.toLowerCase().includes(q)
    );
  });

  if (role === null) {
    return <div className="flex items-center justify-center h-full text-slate-500">Loading...</div>;
  }

  return (
    <div className="min-h-full clinical-bg-gradient p-6 pb-28">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Prescriptions</h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Browse and manage all patient prescriptions
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/doctor")}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0c4381] text-white rounded-xl hover:bg-[#093262] transition-colors shadow-md shadow-[#0c4381]/20 text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            New Prescription
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search prescriptions by diagnosis or patient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-white/40 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
          />
        </div>

        {/* Prescription List */}
        <div className="glass-panel rounded-2xl border border-white/40 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-white/30 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              {filteredPrescriptions.length} Prescription
              {filteredPrescriptions.length !== 1 ? "s" : ""}
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading prescriptions...</div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-1">
                {searchTerm ? "No matching prescriptions" : "No prescriptions yet"}
              </p>
              <p className="text-xs text-slate-400 mb-4">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Create your first prescription to get started"}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => router.push("/dashboard/doctor")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0c4381] text-white text-xs font-semibold rounded-lg hover:bg-[#093262] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create your first prescription
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/20">
              {filteredPrescriptions.map((rx) => {
                const isExpanded = expandedId === rx.id;
                return (
                  <div key={rx.id}>
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : rx.id)}
                      className="flex items-center justify-between px-4 py-3.5 hover:bg-white/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0c4381] to-[#006686] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {rx.diagnosis}
                          </p>
                          <p className="text-xs text-slate-500">
                            {rx.patient_name} &middot; {rx.items?.length ?? 0} meds &middot;{" "}
                            {formatDate(rx.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[rx.status]}`}
                        >
                          {rx.status}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 bg-slate-50/60">
                        {rx.notes && (
                          <p className="text-xs text-slate-500 mb-3 ml-12">{rx.notes}</p>
                        )}
                        {rx.items && rx.items.length > 0 ? (
                          <table className="w-full text-xs ml-12">
                            <thead>
                              <tr className="text-left text-slate-400 font-medium">
                                <th className="pb-1.5 pr-4">Drug</th>
                                <th className="pb-1.5 pr-4">Dosage</th>
                                <th className="pb-1.5 pr-4">Frequency</th>
                                <th className="pb-1.5 pr-4">Duration</th>
                                <th className="pb-1.5 pr-4">Qty</th>
                              </tr>
                            </thead>
                            <tbody className="text-slate-600">
                              {rx.items.map((item) => (
                                <tr key={item.id} className="border-t border-slate-200/60">
                                  <td className="py-1.5 pr-4 font-medium">{item.drug_name}</td>
                                  <td className="py-1.5 pr-4">{item.dosage}</td>
                                  <td className="py-1.5 pr-4">{item.frequency}</td>
                                  <td className="py-1.5 pr-4">{item.duration}</td>
                                  <td className="py-1.5 pr-4">{item.quantity ?? "\u2014"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="text-xs text-slate-400 ml-12">
                            No items in this prescription
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
