"use client";

import React, { useState, useEffect } from "react";
import {
  Pill,
  Plus,
  Trash2,
  Bell,
  BellOff,
  Check,
  AlertTriangle,
  Clock,
  RefreshCw,
  Edit2,
  X,
  Smartphone,
  Database,
  WifiOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Medication,
  MedicationLog,
  STORAGE_KEYS,
  DEMO_MEDICATIONS,
  MEDICATION_COLORS,
  FREQUENCY_LABELS,
  loadFromStorage,
  saveToStorage,
  type FrequencyType,
  type MedicationCategory,
  type LogStatus,
} from "@/lib/medications";
import { supabase, queueSyncItem, drainSyncQueue } from "@/lib/supabase";
import { cleanAndValidatePhone } from "@/lib/validation";

type Tab = "list" | "add" | "logs";

const CATEGORIES: MedicationCategory[] = [
  "Cardiovascular",
  "Diabetes",
  "Blood Pressure",
  "Antibiotic",
  "Pain Relief",
  "Mental Health",
  "Vitamin",
  "Other",
];

const FREQUENCIES: { value: FrequencyType; label: string }[] = [
  { value: "daily", label: "Once daily" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "three_times_daily", label: "3× daily" },
  { value: "weekly", label: "Weekly" },
  { value: "as_needed", label: "As needed" },
];

function generateUUID(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function MedicationsPage() {
  const [tab, setTab] = useState<Tab>("list");
  const [meds, setMeds] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [sendingTestSMS, setSendingTestSMS] = useState<string | null>(null);
  const [smsResult, setSmsResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emergencyPhoneError, setEmergencyPhoneError] = useState<string | null>(null);

  // Sync state
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"connected" | "offline" | "syncing">("connected");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUserId(session?.user?.id ?? null);
    });
  }, []);

  // Form state
  const [form, setForm] = useState({
    name: "",
    genericName: "",
    dosage: "",
    category: "Other" as MedicationCategory,
    frequency: "daily" as FrequencyType,
    time1: "08:00",
    time2: "20:00",
    time3: "13:00",
    startDate: new Date().toISOString().slice(0, 10),
    currentStock: "30",
    refillAt: "7",
    prescribedBy: "",
    phoneForAlerts: "",
    emergencyName: "",
    emergencyPhone: "",
    alertAfterMisses: "2",
    notes: "",
  });

  // Fetch from Supabase with LocalStorage cache fallback
  const loadData = async () => {
    setIsLoading(true);
    const isOnline = typeof window !== "undefined" && navigator.onLine;

    if (!isOnline) {
      setSyncStatus("offline");
      const localMeds = loadFromStorage<Medication[]>(STORAGE_KEYS.MEDICATIONS, DEMO_MEDICATIONS);
      const localLogs = loadFromStorage<MedicationLog[]>(STORAGE_KEYS.MEDICATION_LOGS, []);
      setMeds(localMeds);
      setLogs(localLogs);
      setIsLoading(false);
      return;
    }

    try {
      setSyncStatus("syncing");
      // Try draining offline queue first
      await drainSyncQueue();

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? sessionUserId;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const { data: dbMeds, error: medsError } = await supabase
        .from("medications")
        .select("*")
        .eq("is_active", true)
        .eq("user_id", userId)
        .order("name", { ascending: true });

      if (medsError) throw medsError;

      // Fetch Logs (last 50 logs)
      const { data: dbLogs, error: logsError } = await supabase
        .from("medication_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (logsError) throw logsError;

      // Map Medications
      const mappedMeds: Medication[] = (dbMeds || []).map((db) => ({
        id: db.id,
        name: db.name,
        genericName: db.generic_name || undefined,
        dosage: db.dosage,
        category: db.category as MedicationCategory,
        frequency: db.frequency as FrequencyType,
        scheduledTimes: db.scheduled_times,
        startDate: db.start_date,
        currentStock: db.current_stock,
        refillAt: db.refill_at,
        prescribedBy: db.prescribed_by || "",
        phoneForAlerts: db.phone_for_alerts || "",
        emergencyContact: db.emergency_contact_name
          ? {
              name: db.emergency_contact_name,
              phone: db.emergency_contact_phone || "",
              alertAfterMisses: db.alert_after_misses || 2,
            }
          : undefined,
        notes: db.notes || undefined,
        isActive: db.is_active,
        color: db.color || "blue",
        createdAt: db.created_at,
        updatedAt: db.updated_at,
      }));

      // Map Logs
      const mappedLogs: MedicationLog[] = (dbLogs || []).map((db) => ({
        id: db.id,
        medicationId: db.medication_id,
        medicationName: db.medication_name,
        scheduledAt: db.scheduled_at,
        takenAt: db.taken_at || undefined,
        status: db.status as LogStatus,
        dose: db.dose,
        note: db.note || undefined,
        alertSent: db.alert_sent,
        snoozedUntil: db.snoozed_until || undefined,
      }));

      setMeds(mappedMeds);
      setLogs(mappedLogs);

      // Update cache
      saveToStorage(STORAGE_KEYS.MEDICATIONS, mappedMeds);
      saveToStorage(STORAGE_KEYS.MEDICATION_LOGS, mappedLogs);
      setSyncStatus("connected");
    } catch (err) {
      console.error("[Medications] Supabase fetch failed. Falling back to cache:", err);
      setSyncStatus("offline");
      const localMeds = loadFromStorage<Medication[]>(STORAGE_KEYS.MEDICATIONS, DEMO_MEDICATIONS);
      const localLogs = loadFromStorage<MedicationLog[]>(STORAGE_KEYS.MEDICATION_LOGS, []);
      setMeds(localMeds);
      setLogs(localLogs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => loadData().catch(console.error));

    // Listen to network status change
    const handleOnline = () => {
      setSyncStatus("syncing");
      loadData().catch(console.error);
    };
    const handleOffline = () => setSyncStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const getScheduledTimes = (): string[] => {
    const freq = form.frequency;
    if (freq === "daily" || freq === "weekly" || freq === "as_needed") return [form.time1];
    if (freq === "twice_daily") return [form.time1, form.time2];
    if (freq === "three_times_daily") return [form.time1, form.time2, form.time3];
    return [form.time1];
  };

  const handleSaveMed = async () => {
    if (!form.name || !form.dosage) return;

    let hasError = false;
    let validatedPhone = form.phoneForAlerts;
    let validatedEmergencyPhone = form.emergencyPhone;

    // Validate phone number for alerts if entered
    if (form.phoneForAlerts && form.phoneForAlerts.trim() !== "") {
      const phoneVal = cleanAndValidatePhone(form.phoneForAlerts);
      if (!phoneVal.isValid) {
        setPhoneError(phoneVal.error ?? "Invalid phone number");
        hasError = true;
      } else {
        setPhoneError(null);
        validatedPhone = phoneVal.cleanedPhone ?? form.phoneForAlerts;
      }
    } else {
      setPhoneError(null);
    }

    // Validate emergency phone if emergency contact name is set
    if (form.emergencyName && form.emergencyPhone && form.emergencyPhone.trim() !== "") {
      const emergencyPhoneVal = cleanAndValidatePhone(form.emergencyPhone);
      if (!emergencyPhoneVal.isValid) {
        setEmergencyPhoneError(emergencyPhoneVal.error ?? "Invalid emergency phone number");
        hasError = true;
      } else {
        setEmergencyPhoneError(null);
        validatedEmergencyPhone = emergencyPhoneVal.cleanedPhone ?? form.emergencyPhone;
      }
    } else {
      setEmergencyPhoneError(null);
    }

    if (hasError) return;

    const times = getScheduledTimes();
    const now = new Date().toISOString();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? sessionUserId;

    const targetId = editingMed?.id ?? generateUUID();
    const newMed: Medication = {
      id: targetId,
      name: form.name,
      genericName: form.genericName || undefined,
      dosage: form.dosage,
      category: form.category,
      frequency: form.frequency,
      scheduledTimes: times,
      startDate: form.startDate,
      currentStock: parseInt(form.currentStock) || 30,
      refillAt: parseInt(form.refillAt) || 7,
      prescribedBy: form.prescribedBy,
      phoneForAlerts: validatedPhone,
      emergencyContact: form.emergencyName
        ? {
            name: form.emergencyName,
            phone: validatedEmergencyPhone,
            alertAfterMisses: parseInt(form.alertAfterMisses) || 2,
          }
        : undefined,
      notes: form.notes || undefined,
      isActive: true,
      color: "blue",
      createdAt: editingMed?.createdAt ?? now,
      updatedAt: now,
    };

    // Update local state and cache first for optimistic UI response
    const updated = editingMed
      ? meds.map((m) => (m.id === editingMed.id ? newMed : m))
      : [...meds, newMed];
    setMeds(updated);
    saveToStorage(STORAGE_KEYS.MEDICATIONS, updated);

    // Save to Database
    const dbPayload = {
      id: newMed.id,
      ...(userId ? { user_id: userId } : {}),
      name: newMed.name,
      generic_name: newMed.genericName || null,
      dosage: newMed.dosage,
      category: newMed.category,
      frequency: newMed.frequency,
      scheduled_times: newMed.scheduledTimes,
      start_date: newMed.startDate,
      current_stock: newMed.currentStock,
      refill_at: newMed.refillAt,
      prescribed_by: newMed.prescribedBy || null,
      phone_for_alerts: newMed.phoneForAlerts || null,
      emergency_contact_name: newMed.emergencyContact?.name || null,
      emergency_contact_phone: newMed.emergencyContact?.phone || null,
      alert_after_misses: newMed.emergencyContact?.alertAfterMisses || 2,
      notes: newMed.notes || null,
      is_active: newMed.isActive,
      color: newMed.color,
    };

    if (navigator.onLine) {
      try {
        const { error } = await supabase.from("medications").upsert(dbPayload);
        if (error) throw error;
      } catch (err) {
        console.error("[Supabase] Failed to save, queuing offline:", err);
        queueSyncItem({ table: "medications", action: "update", payload: dbPayload });
        setSyncStatus("offline");
      }
    } else {
      queueSyncItem({ table: "medications", action: "update", payload: dbPayload });
      setSyncStatus("offline");
    }

    resetForm();
    setTab("list");
  };

  const handleDelete = async (id: string) => {
    // Optimistic delete
    const updated = meds.filter((m) => m.id !== id);
    setMeds(updated);
    saveToStorage(STORAGE_KEYS.MEDICATIONS, updated);
    setShowDeleteConfirm(null);

    // Database deletion (mark active = false in soft delete style or hard delete)
    if (navigator.onLine) {
      try {
        // We do hard delete as defined in our schema cascade constraints
        const { error } = await supabase.from("medications").delete().eq("id", id);
        if (error) throw error;
      } catch (err) {
        console.error("[Supabase] Failed to delete, queuing offline:", err);
        queueSyncItem({ table: "medications", action: "delete", payload: { id } });
        setSyncStatus("offline");
      }
    } else {
      queueSyncItem({ table: "medications", action: "delete", payload: { id } });
      setSyncStatus("offline");
    }
  };

  const handleLogTaken = async (med: Medication) => {
    const logId = generateUUID();
    const now = new Date().toISOString();
    const newLog: MedicationLog = {
      id: logId,
      medicationId: med.id,
      medicationName: med.name,
      scheduledAt: now,
      takenAt: now,
      status: "taken",
      dose: med.dosage,
      alertSent: false,
    };

    // Optimistic state update
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    saveToStorage(STORAGE_KEYS.MEDICATION_LOGS, updatedLogs);

    const updatedStock = Math.max(0, med.currentStock - 1);
    const updatedMeds = meds.map((m) =>
      m.id === med.id ? { ...m, currentStock: updatedStock } : m
    );
    setMeds(updatedMeds);
    saveToStorage(STORAGE_KEYS.MEDICATIONS, updatedMeds);

    // Save Log & Decrement Stock in Supabase
    const dbLogPayload = {
      id: newLog.id,
      medication_id: newLog.medicationId,
      medication_name: newLog.medicationName,
      scheduled_at: newLog.scheduledAt,
      taken_at: newLog.takenAt,
      status: newLog.status,
      dose: newLog.dose,
      alert_sent: newLog.alertSent,
    };

    if (navigator.onLine) {
      try {
        // Insert log
        const { error: logErr } = await supabase.from("medication_logs").insert(dbLogPayload);
        if (logErr) throw logErr;

        // Update stock
        const { error: stockErr } = await supabase
          .from("medications")
          .update({ current_stock: updatedStock })
          .eq("id", med.id);
        if (stockErr) throw stockErr;
      } catch (err) {
        console.error("[Supabase] Failed to log dose, queuing offline:", err);
        queueSyncItem({ table: "medication_logs", action: "insert", payload: dbLogPayload });
        queueSyncItem({
          table: "medications",
          action: "update",
          payload: { id: med.id, current_stock: updatedStock },
        });
        setSyncStatus("offline");
      }
    } else {
      queueSyncItem({ table: "medication_logs", action: "insert", payload: dbLogPayload });
      queueSyncItem({
        table: "medications",
        action: "update",
        payload: { id: med.id, current_stock: updatedStock },
      });
      setSyncStatus("offline");
    }
  };

  const handleTestSMS = async (med: Medication) => {
    setSendingTestSMS(med.id);
    setSmsResult(null);
    try {
      // Trigger a test alarm by creating a log scheduled 5 minutes ago with status pending
      const testTime = new Date(Date.now() - 5 * 60 * 1000);
      const { error } = await supabase.from("medication_logs").insert({
        medication_id: med.id,
        medication_name: med.name,
        scheduled_at: testTime.toISOString(),
        status: "pending",
        dose: med.dosage,
        note: "System Test Alarm Event",
      });

      if (error) throw error;

      setSmsResult({
        id: med.id,
        ok: true,
        msg: "Test alarm triggered! Modal should appear shortly on all active devices.",
      });
    } catch (err: any) {
      setSmsResult({ id: med.id, ok: false, msg: err.message || "Failed to trigger test alarm" });
    } finally {
      setSendingTestSMS(null);
    }
  };

  const startEdit = (med: Medication) => {
    setPhoneError(null);
    setEmergencyPhoneError(null);
    setEditingMed(med);
    setForm({
      name: med.name,
      genericName: med.genericName ?? "",
      dosage: med.dosage,
      category: med.category,
      frequency: med.frequency,
      time1: med.scheduledTimes[0] ?? "08:00",
      time2: med.scheduledTimes[1] ?? "20:00",
      time3: med.scheduledTimes[2] ?? "13:00",
      startDate: med.startDate,
      currentStock: med.currentStock.toString(),
      refillAt: med.refillAt.toString(),
      prescribedBy: med.prescribedBy,
      phoneForAlerts: med.phoneForAlerts,
      emergencyName: med.emergencyContact?.name ?? "",
      emergencyPhone: med.emergencyContact?.phone ?? "",
      alertAfterMisses: (med.emergencyContact?.alertAfterMisses ?? 2).toString(),
      notes: med.notes ?? "",
    });
    setTab("add");
  };

  const resetForm = () => {
    setPhoneError(null);
    setEmergencyPhoneError(null);
    setEditingMed(null);
    setForm({
      name: "",
      genericName: "",
      dosage: "",
      category: "Other",
      frequency: "daily",
      time1: "08:00",
      time2: "20:00",
      time3: "13:00",
      startDate: new Date().toISOString().slice(0, 10),
      currentStock: "30",
      refillAt: "7",
      prescribedBy: "",
      phoneForAlerts: "",
      emergencyName: "",
      emergencyPhone: "",
      alertAfterMisses: "2",
      notes: "",
    });
  };

  const getStockColor = (med: Medication) => {
    if (med.currentStock <= med.refillAt) return "text-red-600 bg-red-50 border border-red-100";
    if (med.currentStock <= med.refillAt * 2)
      return "text-amber-600 bg-amber-50 border border-amber-100";
    return "text-emerald-600 bg-emerald-50 border border-emerald-100";
  };

  const todayLogs = logs.filter(
    (l) => l.takenAt && l.takenAt.startsWith(new Date().toISOString().slice(0, 10))
  );

  return (
    <div className="w-full min-h-full bg-[#f0f5ff] p-6 md:p-8 flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Pill className="w-6 h-6 text-blue-600 animate-pulse" /> Medications
            </h1>

            {/* Premium Sync status badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-slate-100 shadow-sm">
              {syncStatus === "connected" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 absolute" />
                  <Database className="w-3.5 h-3.5 text-emerald-600 ml-1" />
                  <span className="text-emerald-700">Database Synced</span>
                </>
              )}
              {syncStatus === "offline" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-amber-500 absolute" />
                  <WifiOff className="w-3.5 h-3.5 text-amber-600 ml-1" />
                  <span className="text-amber-700">Offline Mode</span>
                </>
              )}
              {syncStatus === "syncing" && (
                <>
                  <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                  <span className="text-blue-700 ml-1">Syncing...</span>
                </>
              )}
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Manage prescriptions, stock levels, and automated SMS alerts
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={tab === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setTab("list");
              resetForm();
            }}
            className="text-xs rounded-xl shadow-sm"
          >
            My Meds ({meds.filter((m) => m.isActive).length})
          </Button>
          <Button
            variant={tab === "add" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setTab("add");
              if (tab === "add") resetForm();
            }}
            className="text-xs rounded-xl shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> {editingMed ? "Edit" : "Add"}
          </Button>
          <Button
            variant={tab === "logs" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("logs")}
            className="text-xs rounded-xl shadow-sm"
          >
            Logs ({todayLogs.length} today)
          </Button>
        </div>
      </header>

      {/* ═══ TAB: LIST ════════════════════════════════════════════ */}
      {tab === "list" && (
        <>
          {isLoading ? (
            /* Premium shimmer loading skeletons */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col gap-4 animate-pulse"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 w-2/3">
                      <div className="h-4 bg-slate-200 rounded-full w-3/4" />
                      <div className="h-3 bg-slate-100 rounded-full w-1/2" />
                      <div className="h-5 bg-slate-100 rounded-full w-1/3" />
                    </div>
                    <div className="h-6 w-12 bg-slate-100 rounded-lg" />
                  </div>
                  <div className="h-8 bg-slate-50 rounded-xl" />
                  <div className="h-4 bg-slate-100 rounded-full w-1/2" />
                  <div className="h-8 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {meds
                  .filter((m) => m.isActive)
                  .map((med) => (
                    <motion.div
                      key={med.id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 group relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {/* Top row */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-slate-800 text-base">{med.name}</h3>
                          {med.genericName && (
                            <p className="text-xs text-slate-400">{med.genericName}</p>
                          )}
                          <span
                            className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border mt-1.5 ${MEDICATION_COLORS[med.category]}`}
                          >
                            {med.category}
                          </span>
                        </div>
                        <div className="flex gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(med)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(med.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Dosage & Frequency */}
                      <div className="flex gap-2 text-xs">
                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-semibold border border-blue-100">
                          {med.dosage}
                        </span>
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200">
                          {FREQUENCY_LABELS[med.frequency]}
                        </span>
                      </div>

                      {/* Times */}
                      <div className="flex gap-1.5 flex-wrap">
                        {med.scheduledTimes.map((t, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1 text-[11px] bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-100 font-medium"
                          >
                            <Clock className="w-3 h-3 text-slate-400" /> {t}
                          </span>
                        ))}
                      </div>

                      {/* Stock */}
                      <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3.5 py-2.5">
                        <div className="text-xs text-slate-500 font-medium">Stock remaining</div>
                        <div
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${getStockColor(med)}`}
                        >
                          {med.currentStock <= med.refillAt && (
                            <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
                          )}
                          {med.currentStock} pills
                        </div>
                      </div>

                      {/* Refill threshold */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
                        Refill alert at {med.refillAt} pills left
                      </div>

                      {/* SMS Alert */}
                      <div className="border-t border-slate-100 pt-3.5 mt-1 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs">
                          {med.phoneForAlerts ? (
                            <>
                              <Bell className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-700 font-bold font-mono">
                                {med.phoneForAlerts}
                              </span>
                            </>
                          ) : (
                            <>
                              <BellOff className="w-3.5 h-3.5 text-slate-300" />
                              <span className="text-slate-400 font-medium">No SMS/Push alerts</span>
                            </>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          {med.phoneForAlerts && (
                            <button
                              onClick={() => handleTestSMS(med)}
                              disabled={sendingTestSMS === med.id}
                              className="text-[11px] px-2.5 py-1.5 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors font-semibold disabled:opacity-50 flex items-center gap-1 border border-violet-100 shadow-sm"
                            >
                              <Bell className="w-3 h-3" />
                              {sendingTestSMS === med.id ? "Triggering..." : "Test Alarm"}
                            </button>
                          )}
                          <button
                            onClick={() => handleLogTaken(med)}
                            className="text-[11px] px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors font-semibold flex items-center gap-1 border border-emerald-100 shadow-sm"
                          >
                            <Check className="w-3 h-3" /> Taken
                          </button>
                        </div>
                      </div>

                      {/* SMS Result feedback */}
                      <AnimatePresence>
                        {smsResult?.id === med.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`text-xs px-3 py-2 rounded-xl font-semibold border mt-1.5 ${smsResult.ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}
                          >
                            {smsResult.ok ? "✅" : "❌"} {smsResult.msg}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Prescribed by */}
                      {med.prescribedBy && (
                        <p className="text-[10px] text-slate-400 font-medium italic mt-0.5">
                          Prescribed by {med.prescribedBy}
                        </p>
                      )}
                    </motion.div>
                  ))}
              </AnimatePresence>

              {meds.filter((m) => m.isActive).length === 0 && (
                <div className="col-span-3 text-center py-20 text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <Pill className="w-12 h-12 mx-auto mb-3 opacity-30 text-blue-500 animate-bounce" />
                  <p className="font-bold text-slate-600 text-lg">No Medications Found</p>
                  <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1">
                    Get started by logging your prescriptions and setting automated alert schedules.
                  </p>
                  <button
                    onClick={() => setTab("add")}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    Add Medication
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </>
      )}

      {/* ═══ TAB: ADD / EDIT ══════════════════════════════════════ */}
      {tab === "add" && (
        <div className="max-w-2xl mx-auto w-full">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
            <h2 className="font-black text-slate-800 text-lg flex items-center gap-2">
              {editingMed ? (
                <>
                  <Edit2 className="w-5 h-5 text-blue-600" /> Edit Medication
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-blue-600" /> Add New Medication
                </>
              )}
            </h2>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                  Medication Name *
                </label>
                <Input
                  placeholder="e.g. Metformin"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                  Generic Name
                </label>
                <Input
                  placeholder="e.g. Metformin HCl"
                  value={form.genericName}
                  onChange={(e) => setForm({ ...form, genericName: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">Dosage *</label>
                <Input
                  placeholder="e.g. 500mg"
                  value={form.dosage}
                  onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">Category</label>
                <select
                  className="w-full h-10 px-3 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as MedicationCategory })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 block">Frequency</label>
              <div className="flex flex-wrap gap-2">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setForm({ ...form, frequency: f.value })}
                    className={`text-xs px-3.5 py-2 rounded-xl border-2 font-bold transition-all ${form.frequency === f.value ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Time 1</label>
                  <Input
                    type="time"
                    value={form.time1}
                    onChange={(e) => setForm({ ...form, time1: e.target.value })}
                    className="w-32 rounded-xl"
                  />
                </div>
                {(form.frequency === "twice_daily" || form.frequency === "three_times_daily") && (
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">
                      Time 2
                    </label>
                    <Input
                      type="time"
                      value={form.time2}
                      onChange={(e) => setForm({ ...form, time2: e.target.value })}
                      className="w-32 rounded-xl"
                    />
                  </div>
                )}
                {form.frequency === "three_times_daily" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">
                      Time 3
                    </label>
                    <Input
                      type="time"
                      value={form.time3}
                      onChange={(e) => setForm({ ...form, time3: e.target.value })}
                      className="w-32 rounded-xl"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Stock */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                  Current Stock
                </label>
                <Input
                  type="number"
                  min="0"
                  value={form.currentStock}
                  onChange={(e) => setForm({ ...form, currentStock: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                  Refill Alert At
                </label>
                <Input
                  type="number"
                  min="1"
                  value={form.refillAt}
                  onChange={(e) => setForm({ ...form, refillAt: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">Start Date</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Prescribed By */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Prescribed By</label>
              <Input
                placeholder="e.g. Dr. Arun Kumar"
                value={form.prescribedBy}
                onChange={(e) => setForm({ ...form, prescribedBy: e.target.value })}
                className="rounded-xl"
              />
            </div>

            {/* Synchronized Device Alarm Setup */}
            <div className="bg-violet-50/50 border border-violet-100 rounded-2xl p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-black text-violet-700 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" /> Synchronized Device Alarm System & Alerts
              </h3>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                  Alert Phone Number{" "}
                  <span className="font-normal text-slate-400">
                    (E.164 phone e.g. +91xxxxxxxxxx)
                  </span>
                </label>
                <Input
                  placeholder="+919876543210"
                  value={form.phoneForAlerts}
                  onChange={(e) => setForm({ ...form, phoneForAlerts: e.target.value })}
                  className={`rounded-xl bg-white ${phoneError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                {phoneError && (
                  <p className="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {phoneError}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                    Emergency Contact Name
                  </label>
                  <Input
                    placeholder="e.g. Spouse / Relative"
                    value={form.emergencyName}
                    onChange={(e) => setForm({ ...form, emergencyName: e.target.value })}
                    className="rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                    Emergency Contact Alerts{" "}
                    <span className="font-normal text-slate-400">(Phone number)</span>
                  </label>
                  <Input
                    placeholder="+919876543210"
                    value={form.emergencyPhone}
                    onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
                    className={`rounded-xl bg-white ${emergencyPhoneError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                  {emergencyPhoneError && (
                    <p className="text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {emergencyPhoneError}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                  Alert emergency contact after missed doses
                </label>
                <select
                  className="w-44 h-10 px-3 text-sm border border-slate-200 rounded-xl bg-white font-semibold"
                  value={form.alertAfterMisses}
                  onChange={(e) => setForm({ ...form, alertAfterMisses: e.target.value })}
                >
                  {[1, 2, 3, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} consecutive miss{n > 1 ? "es" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-violet-500 leading-relaxed">
                🔔 The patient will receive a synchronized visual and audio alarm alert on both
                mobile and web dashboard devices. marking as taken or snoozing on one device
                immediately silences the alarm on all other active devices.
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">Notes</label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                placeholder="Instructions e.g., 'Take after food', 'Do not double dose'..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSaveMed}
                disabled={!form.name || !form.dosage}
                className="flex-1 rounded-xl shadow-md font-bold h-11"
              >
                <Check className="w-4 h-4 mr-1" /> {editingMed ? "Save Changes" : "Add Medication"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTab("list");
                  resetForm();
                }}
                className="rounded-xl font-bold h-11"
              >
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: LOGS ════════════════════════════════════════════ */}
      {tab === "logs" && (
        <div className="max-w-2xl mx-auto w-full">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-4">
            <h2 className="font-black text-slate-800 text-lg">Medication History Logs</h2>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-12 font-medium">
                No dose tracking history found yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-50">
                {logs.slice(0, 50).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {log.medicationName} — {log.dose}
                      </p>
                      <p className="text-xs text-slate-400 font-medium">
                        {log.takenAt
                          ? `Logged Taken: ${new Date(log.takenAt).toLocaleString()}`
                          : `Scheduled: ${new Date(log.scheduledAt).toLocaleString()}`}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        log.status === "taken"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : log.status === "missed"
                            ? "bg-red-50 text-red-700 border-red-100"
                            : log.status === "snoozed"
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {log.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100">
            <h3 className="font-black text-slate-800 text-lg mb-2">Remove Medication?</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-5">
              This action will delete this medication schedule and stop all associated SMS alerts.
              Historic logs remain intact.
            </p>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 rounded-xl font-bold"
              >
                Remove
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 rounded-xl font-bold"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
