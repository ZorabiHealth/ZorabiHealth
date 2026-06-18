"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  Activity,
  HeartPulse,
  Clock,
  ChevronRight,
  X,
  Loader2,
  Stethoscope,
  AlertCircle,
  Plus,
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
  patient_id: string;
  condition: string;
  diagnosed_date: string | null;
  is_active: boolean;
  notes: string | null;
}

interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  diagnosis: string;
  notes?: string;
  created_at: string;
  prescription_items: PrescriptionItem[];
}

interface PrescriptionItem {
  id: string;
  prescription_id?: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string | null;
}

interface VitalSign {
  id: string;
  patient_id: string;
  doctor_id: string;
  prescription_id: string | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  heart_rate: number | null;
  temperature: number | null;
  oxygen_saturation: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  symptoms: string | null;
  recorded_at: string;
}

type Tab = "history" | "prescriptions" | "vitals";

export default function DoctorRecords() {
  const { role, userId, loading: authLoading } = useUserRole();
  const router = useRouter();

  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("history");
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([]);
  const [expandedPrescription, setExpandedPrescription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showAddCondition, setShowAddCondition] = useState(false);
  const [newCondition, setNewCondition] = useState("");
  const [newDiagnosedDate, setNewDiagnosedDate] = useState("");
  const [newConditionNotes, setNewConditionNotes] = useState("");
  const [savingCondition, setSavingCondition] = useState(false);

  useEffect(() => {
    if (!authLoading && !userId) {
      router.push("/login");
      return;
    }
    if (!authLoading && role !== "doctor") {
      router.push("/dashboard");
      return;
    }
  }, [userId, role, authLoading, router]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoadingPatients(true);
      setError(null);

      const { data: doctorProfile } = await supabase
        .from("doctor_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!doctorProfile || cancelled) {
        if (!cancelled) setLoadingPatients(false);
        if (!doctorProfile) setError("Doctor profile not found");
        return;
      }

      const [createdPatients, rxPatientsRes] = await Promise.all([
        supabase
          .from("patient_profiles")
          .select("id, full_name, email, phone, avatar_url, created_at")
          .eq("created_by", doctorProfile.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("prescriptions")
          .select("patient_id")
          .eq("doctor_id", doctorProfile.id)
          .not("patient_id", "is", null),
      ]);

      const createdList = createdPatients.data ?? [];
      const rxPatientIds = rxPatientsRes.data
        ? [...new Set(rxPatientsRes.data.map((r: { patient_id: string }) => r.patient_id))]
        : [];

      const createdIdSet = new Set(createdList.map((p) => p.id));
      const missingIds = rxPatientIds.filter((id) => !createdIdSet.has(id));

      let additionalPatients: typeof createdList = [];
      if (missingIds.length > 0) {
        const { data: extra } = await supabase
          .from("patient_profiles")
          .select("id, full_name, email, phone, avatar_url, created_at")
          .in("id", missingIds);
        additionalPatients = extra ?? [];
      }

      const allPatients = [...createdList, ...additionalPatients];
      allPatients.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      if (!cancelled) {
        setPatients(allPatients);
        setLoadingPatients(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!selectedPatient) return;
    let cancelled = false;
    (async () => {
      setLoadingRecords(true);
      setError(null);

      const [historyRes, prescriptionsRes, vitalsRes] = await Promise.all([
        supabase
          .from("patient_medical_history")
          .select("id, patient_id, condition, diagnosed_date, is_active, notes")
          .eq("patient_id", selectedPatient.id)
          .order("diagnosed_date", { ascending: false }),
        supabase
          .from("prescriptions")
          .select(
            "id, patient_id, doctor_id, diagnosis, created_at, prescription_items(id, drug_name, dosage, frequency, duration, notes)"
          )
          .eq("patient_id", selectedPatient.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("vital_signs")
          .select("*")
          .eq("patient_id", selectedPatient.id)
          .order("recorded_at", { ascending: false }),
      ]);

      if (cancelled) return;
      if (historyRes.error) {
        setError(historyRes.error.message);
      } else if (prescriptionsRes.error) {
        setError(prescriptionsRes.error.message);
      } else if (vitalsRes.error) {
        setError(vitalsRes.error.message);
      } else {
        setMedicalHistory(historyRes.data || []);
        setPrescriptions(prescriptionsRes.data || []);
        setVitalSigns(vitalsRes.data || []);
      }
      setLoadingRecords(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPatient]);

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add condition");
    } finally {
      setSavingCondition(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(query) || (p.email || "").toLowerCase().includes(query)
    );
  });

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "history", label: "History", icon: <FileText className="w-4 h-4" /> },
    { key: "prescriptions", label: "Prescriptions", icon: <Stethoscope className="w-4 h-4" /> },
    { key: "vitals", label: "Vitals", icon: <HeartPulse className="w-4 h-4" /> },
  ];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authLoading && role && role !== "doctor") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Left Panel - Patient List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Patients</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingPatients ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <AlertCircle className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No patients found</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredPatients.map((patient) => (
                <li
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient)}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedPatient?.id === patient.id
                      ? "bg-primary/5 border-l-4 border-primary"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {patient.full_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{patient.email}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right Panel - Records */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedPatient ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <Stethoscope className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Patient Selected</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              Select a patient from the list to view their medical records, prescriptions, and vital
              signs.
            </p>
          </div>
        ) : (
          <>
            {/* Patient Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedPatient.full_name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">{selectedPatient.email}</p>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.key
                        ? "bg-primary text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Records Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {loadingRecords ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* History Tab */}
                  {activeTab === "history" && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-gray-900">Medical History</h3>
                        <button
                          onClick={() => setShowAddCondition(!showAddCondition)}
                          className="text-sm font-medium text-primary flex items-center gap-1 hover:underline"
                        >
                          <Plus className="w-4 h-4" />{" "}
                          {showAddCondition ? "Cancel" : "Add Condition"}
                        </button>
                      </div>

                      {showAddCondition && (
                        <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200 space-y-3">
                          <input
                            type="text"
                            value={newCondition}
                            onChange={(e) => setNewCondition(e.target.value)}
                            placeholder="Condition name (e.g. Type 2 Diabetes)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="date"
                              value={newDiagnosedDate}
                              onChange={(e) => setNewDiagnosedDate(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                            <button
                              onClick={handleAddCondition}
                              disabled={savingCondition || !newCondition.trim()}
                              className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {savingCondition ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                              {savingCondition ? "Saving..." : "Add"}
                            </button>
                          </div>
                          <textarea
                            value={newConditionNotes}
                            onChange={(e) => setNewConditionNotes(e.target.value)}
                            placeholder="Additional notes (optional)"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                          />
                        </div>
                      )}

                      {medicalHistory.length === 0 ? (
                        <EmptyState
                          icon={<FileText className="w-10 h-10" />}
                          title="No Medical History"
                          description="No medical conditions recorded for this patient yet."
                        />
                      ) : (
                        <div className="space-y-3">
                          {medicalHistory.map((item) => (
                            <div
                              key={item.id}
                              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                            >
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm font-semibold text-gray-900">
                                      {item.condition}
                                    </h4>
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        item.is_active
                                          ? "bg-green-100 text-green-700"
                                          : "bg-gray-100 text-gray-600"
                                      }`}
                                    >
                                      {item.is_active ? "Active" : "Inactive"}
                                    </span>
                                  </div>
                                  {item.diagnosed_date && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      Diagnosed {formatDate(item.diagnosed_date)}
                                    </p>
                                  )}
                                  {item.notes && (
                                    <p className="text-sm text-gray-600 mt-2">{item.notes}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Prescriptions Tab */}
                  {activeTab === "prescriptions" && (
                    <div>
                      {prescriptions.length === 0 ? (
                        <EmptyState
                          icon={<Stethoscope className="w-10 h-10" />}
                          title="No Prescriptions"
                          description="No prescriptions have been issued for this patient yet."
                        />
                      ) : (
                        <div className="space-y-3">
                          {prescriptions.map((rx) => (
                            <div
                              key={rx.id}
                              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow"
                            >
                              <button
                                onClick={() =>
                                  setExpandedPrescription(
                                    expandedPrescription === rx.id ? null : rx.id
                                  )
                                }
                                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {rx.diagnosis}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {formatDate(rx.created_at)} •{" "}
                                    {rx.prescription_items?.length || 0} item
                                    {(rx.prescription_items?.length || 0) !== 1 ? "s" : ""}
                                  </p>
                                </div>
                                <ChevronRight
                                  className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
                                    expandedPrescription === rx.id ? "rotate-90" : ""
                                  }`}
                                />
                              </button>
                              {expandedPrescription === rx.id && (
                                <div className="px-4 pb-4 border-t border-gray-100">
                                  <div className="mt-3 space-y-2">
                                    {rx.prescription_items?.map((item) => (
                                      <div
                                        key={item.id}
                                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                                      >
                                        <Activity className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-medium text-gray-900">
                                            {item.drug_name}
                                          </p>
                                          <p className="text-xs text-gray-600 mt-0.5">
                                            {item.dosage} • {item.frequency} • {item.duration}
                                          </p>
                                          {item.notes && (
                                            <p className="text-xs text-gray-500 mt-1 italic">
                                              {item.notes}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Vitals Tab */}
                  {activeTab === "vitals" && (
                    <div>
                      {vitalSigns.length === 0 ? (
                        <EmptyState
                          icon={<HeartPulse className="w-10 h-10" />}
                          title="No Vital Signs"
                          description="No vital signs recorded for this patient yet. Vitals are saved automatically when a prescription is finalized."
                        />
                      ) : (
                        <div className="space-y-4">
                          {vitalSigns.map((v) => (
                            <div
                              key={v.id}
                              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-medium text-gray-500">
                                  {new Date(v.recorded_at).toLocaleDateString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {v.blood_pressure_systolic != null &&
                                  v.blood_pressure_diastolic != null && (
                                    <VitalCard
                                      label="BP"
                                      value={`${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`}
                                      unit="mmHg"
                                    />
                                  )}
                                {v.heart_rate != null && (
                                  <VitalCard
                                    label="Heart Rate"
                                    value={String(v.heart_rate)}
                                    unit="bpm"
                                  />
                                )}
                                {v.temperature != null && (
                                  <VitalCard
                                    label="Temperature"
                                    value={String(v.temperature)}
                                    unit="°F"
                                  />
                                )}
                                {v.oxygen_saturation != null && (
                                  <VitalCard
                                    label="SpO2"
                                    value={String(v.oxygen_saturation)}
                                    unit="%"
                                  />
                                )}
                                {v.weight != null && (
                                  <VitalCard label="Weight" value={String(v.weight)} unit="kg" />
                                )}
                                {v.height != null && (
                                  <VitalCard label="Height" value={String(v.height)} unit="cm" />
                                )}
                                {v.bmi != null && (
                                  <VitalCard label="BMI" value={String(v.bmi)} unit="kg/m²" />
                                )}
                              </div>
                              {v.symptoms && (
                                <p className="text-xs text-gray-500 mt-2 italic">
                                  Symptoms: {v.symptoms}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-gray-300 mb-3">{icon}</div>
      <h4 className="text-base font-medium text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-500 max-w-sm">{description}</p>
    </div>
  );
}

function VitalCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-0.5">
        {value} <span className="text-xs font-normal text-gray-400">{unit}</span>
      </p>
    </div>
  );
}
