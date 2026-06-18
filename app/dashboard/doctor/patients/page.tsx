"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  Mail,
  Phone,
  Calendar,
  ChevronRight,
  FileText,
  X,
  Loader2,
  UserPlus,
  HeartPulse,
  Plus,
  Save,
} from "lucide-react";

interface PatientProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

interface MedicalHistory {
  id: string;
  condition: string;
  diagnosed_date: string | null;
  notes: string | null;
}

interface PrescriptionSummary {
  id: string;
  diagnosis: string;
  status: string;
  created_at: string;
}

export default function DoctorPatients() {
  const { role, userId, loading: authLoading } = useUserRole();
  const router = useRouter();

  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);

  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory[]>([]);
  const [prescriptionCount, setPrescriptionCount] = useState(0);
  const [recentPrescriptions, setRecentPrescriptions] = useState<PrescriptionSummary[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [showAddCondition, setShowAddCondition] = useState(false);
  const [newCondition, setNewCondition] = useState("");
  const [newDiagnosedDate, setNewDiagnosedDate] = useState("");
  const [newConditionNotes, setNewConditionNotes] = useState("");
  const [savingCondition, setSavingCondition] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (role !== "doctor") {
      router.push("/dashboard");
      return;
    }

    const fetchPatients = async () => {
      setLoading(true);
      try {
        const { data: doctorProfile, error: profileErr } = await supabase
          .from("doctor_profiles")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (profileErr) throw profileErr;

        // Fetch patients created by the doctor AND patients with prescriptions from this doctor
        const [createdRes, rxPatientsRes] = await Promise.all([
          supabase
            .from("patient_profiles")
            .select("id, full_name, email, phone, created_at")
            .eq("created_by", doctorProfile.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("prescriptions")
            .select("patient_id")
            .eq("doctor_id", doctorProfile.id)
            .not("patient_id", "is", null),
        ]);

        if (createdRes.error) throw createdRes.error;
        if (rxPatientsRes.error) throw rxPatientsRes.error;

        const createdPatientIds = new Set((createdRes.data || []).map((p) => p.id));
        const rxPatientIds = rxPatientsRes.data
          ? [...new Set(rxPatientsRes.data.map((r: { patient_id: string }) => r.patient_id))]
          : [];

        // Fetch profiles of patients from prescriptions who aren't already in created list
        const missingIds = rxPatientIds.filter((id) => !createdPatientIds.has(id));
        let additionalPatients: typeof createdRes.data = [];
        if (missingIds.length > 0) {
          const { data: extra, error: extraErr } = await supabase
            .from("patient_profiles")
            .select("id, full_name, email, phone, created_at")
            .in("id", missingIds);
          if (extraErr) throw extraErr;
          additionalPatients = extra || [];
        }

        const allPatients = [...(createdRes.data || []), ...additionalPatients];
        allPatients.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setPatients(allPatients);
      } catch (err) {
        console.error("Failed to fetch patients:", err);
        setToast({ message: "Failed to load patients.", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [role, userId, authLoading, router]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!selectedPatient) return;

    const fetchDetails = async () => {
      setLoadingDetails(true);
      try {
        const [historyRes, countRes, recentRes] = await Promise.all([
          supabase
            .from("patient_medical_history")
            .select("id, condition, diagnosed_date, notes")
            .eq("patient_id", selectedPatient.id)
            .order("diagnosed_date", { ascending: false }),
          supabase
            .from("prescriptions")
            .select("id", { count: "exact", head: true })
            .eq("patient_id", selectedPatient.id),
          supabase
            .from("prescriptions")
            .select("id, diagnosis, status, created_at")
            .eq("patient_id", selectedPatient.id)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        if (historyRes.error) throw historyRes.error;
        if (countRes.error) throw countRes.error;
        if (recentRes.error) throw recentRes.error;

        setMedicalHistory(historyRes.data || []);
        setPrescriptionCount(countRes.count || 0);
        setRecentPrescriptions(recentRes.data || []);
      } catch (err) {
        console.error("Failed to fetch patient details:", err);
        setToast({ message: "Failed to load patient details.", type: "error" });
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedPatient]);

  const filteredPatients = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCondition = async () => {
    if (!selectedPatient || !newCondition.trim()) return;
    setSavingCondition(true);
    try {
      const { data, error } = await supabase
        .from("patient_medical_history")
        .insert({
          patient_id: selectedPatient.id,
          condition: newCondition.trim(),
          diagnosed_date: newDiagnosedDate || null,
          notes: newConditionNotes.trim() || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setMedicalHistory((prev) => [data, ...prev]);
      setNewCondition("");
      setNewDiagnosedDate("");
      setNewConditionNotes("");
      setShowAddCondition(false);
      setToast({ message: "Condition added successfully.", type: "success" });
    } catch (err) {
      console.error("Failed to add condition:", err);
      setToast({ message: "Failed to add condition.", type: "error" });
    } finally {
      setSavingCondition(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (authLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0c4381] to-[#006686] flex items-center justify-center shadow-lg animate-spin">
          <HeartPulse className="w-6 h-6 text-white" />
        </div>
        <p className="text-slate-500 font-bold text-sm">Loading...</p>
      </div>
    );
  }

  if (!authLoading && role !== "doctor") return null;

  return (
    <div className="min-h-full bg-slate-50 p-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 rounded-2xl px-6 py-4 flex items-center gap-3 shadow-xl transition-all ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <HeartPulse className="w-5 h-5" />
          ) : (
            <X className="w-5 h-5" />
          )}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Users className="w-6 h-6 text-[#0c4381]" /> My Patients
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Manage your patient records
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search patients by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-white/40 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
          />
        </div>

        {/* Content */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Patient List */}
          <div className="col-span-12 lg:col-span-5">
            <div className="glass-panel rounded-2xl border border-white/40 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-white/30">
                <h2 className="text-sm font-semibold text-slate-700">
                  {filteredPatients.length} Patient{filteredPatients.length !== 1 ? "s" : ""}
                </h2>
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading patients...
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    {searchQuery ? (
                      <Search className="w-7 h-7 text-slate-300" />
                    ) : (
                      <UserPlus className="w-7 h-7 text-slate-300" />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-600 mb-1">
                    {searchQuery ? "No matching patients" : "No patients yet"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {searchQuery
                      ? "Try adjusting your search terms"
                      : "Patients you create will appear here"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/20 max-h-[600px] overflow-y-auto">
                  {filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => setSelectedPatient(patient)}
                      className={`flex items-center justify-between px-4 py-3.5 cursor-pointer transition-colors ${
                        selectedPatient?.id === patient.id ? "bg-[#0c4381]/10" : "hover:bg-white/60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0c4381] to-[#006686] flex items-center justify-center shrink-0 text-white text-xs font-bold">
                          {(patient.full_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {patient.full_name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {patient.email || "No email"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="col-span-12 lg:col-span-7">
            {selectedPatient ? (
              <div className="space-y-6">
                {/* Patient Header */}
                <div className="glass-panel rounded-2xl border border-white/40 shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0c4381] to-[#006686] flex items-center justify-center text-white text-xl font-bold">
                        {(selectedPatient.full_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-800">
                          {selectedPatient.full_name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-slate-500">
                          {selectedPatient.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" /> {selectedPatient.email}
                            </span>
                          )}
                          {selectedPatient.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" /> {selectedPatient.phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> Joined{" "}
                            {formatDate(selectedPatient.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-panel rounded-2xl border border-white/40 shadow-sm p-4 text-center">
                    <p className="text-2xl font-black text-[#0c4381]">{prescriptionCount}</p>
                    <p className="text-xs text-slate-500 font-semibold mt-1">Total Prescriptions</p>
                  </div>
                  <div className="glass-panel rounded-2xl border border-white/40 shadow-sm p-4 text-center">
                    <p className="text-2xl font-black text-[#0c4381]">{medicalHistory.length}</p>
                    <p className="text-xs text-slate-500 font-semibold mt-1">Medical Records</p>
                  </div>
                </div>

                {/* Medical History */}
                <div className="glass-panel rounded-2xl border border-white/40 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-white/30 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#0c4381]" /> Medical History
                    </h3>
                    <button
                      onClick={() => setShowAddCondition(!showAddCondition)}
                      className="text-xs font-semibold text-[#0c4381] flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> {showAddCondition ? "Cancel" : "Add"}
                    </button>
                  </div>

                  {showAddCondition && (
                    <div className="p-4 border-b border-white/20 bg-slate-50/50">
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={newCondition}
                          onChange={(e) => setNewCondition(e.target.value)}
                          placeholder="Condition name (e.g. Type 2 Diabetes)"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="date"
                            value={newDiagnosedDate}
                            onChange={(e) => setNewDiagnosedDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
                          />
                          <button
                            onClick={handleAddCondition}
                            disabled={savingCondition || !newCondition.trim()}
                            className="w-full bg-[#0c4381] text-white py-2 rounded-xl text-xs font-bold hover:bg-[#093262] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {savingCondition ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            {savingCondition ? "Saving..." : "Save"}
                          </button>
                        </div>
                        <textarea
                          value={newConditionNotes}
                          onChange={(e) => setNewConditionNotes(e.target.value)}
                          placeholder="Additional notes (optional)"
                          rows={2}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20 resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {loadingDetails ? (
                    <div className="p-6 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </div>
                  ) : medicalHistory.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No medical history recorded
                    </div>
                  ) : (
                    <div className="divide-y divide-white/20">
                      {medicalHistory.map((entry) => (
                        <div key={entry.id} className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-800">{entry.condition}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            {entry.diagnosed_date && (
                              <span>{formatDate(entry.diagnosed_date)}</span>
                            )}
                            {entry.notes && <span>&middot; {entry.notes}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Prescriptions */}
                <div className="glass-panel rounded-2xl border border-white/40 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-white/30 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-[#0c4381]" /> Recent Prescriptions
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">
                      {prescriptionCount} total
                    </span>
                  </div>
                  {loadingDetails ? (
                    <div className="p-6 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </div>
                  ) : recentPrescriptions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No prescriptions yet
                    </div>
                  ) : (
                    <div className="divide-y divide-white/20">
                      {recentPrescriptions.map((rx) => (
                        <div key={rx.id} className="px-4 py-3 flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {rx.diagnosis}
                            </p>
                            <p className="text-xs text-slate-500">{formatDate(rx.created_at)}</p>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize shrink-0 ml-3 ${
                              rx.status === "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : rx.status === "draft"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {rx.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-panel rounded-2xl border border-white/40 shadow-sm p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-600 mb-1">Select a patient</p>
                <p className="text-xs text-slate-400">
                  Click on a patient from the list to view their details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
