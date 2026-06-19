"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui/toast";
import {
  ChevronLeft,
  ChevronRight,
  Video,
  MessageSquare,
  User,
  Plus,
  X,
  Loader2,
  Circle,
  UserPlus,
} from "lucide-react";

interface Appointment {
  id: string;
  patient_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  type: "video" | "physical" | "chat";
  status: string;
  queue_position: number | null;
  notes: string | null;
  meeting_link: string | null;
  patient_name?: string;
}

const TYPE_ICONS = { video: Video, physical: User, chat: MessageSquare };
const TYPE_LABELS = { video: "Video", physical: "In-Clinic", chat: "Chat" };
const TYPE_COLORS: Record<string, string> = {
  video: "border-l-purple-400 bg-purple-50/70",
  physical: "border-l-[#0c4381] bg-blue-50/70",
  chat: "border-l-emerald-400 bg-emerald-50/70",
};
const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-slate-100 text-slate-600",
  confirmed: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-orange-100 text-orange-700",
};
const TYPE_FILTERS = ["all", "physical", "video", "chat"] as const;
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const h = 7 + i;
  return `${h.toString().padStart(2, "0")}:00`;
});
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function DoctorSchedule() {
  const { role, userId } = useUserRole();
  const router = useRouter();
  const toLocalDateStr = (d: Date) => d.toLocaleDateString("sv-SE");
  const today = new Date();
  const todayStr = toLocalDateStr(today);
  const [currentDate, setCurrentDate] = useState(todayStr);
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [doctorProfileId, setDoctorProfileId] = useState<string | null>(null);
  const [scheduleDoctorName, setScheduleDoctorName] = useState("Doctor");
  const [scheduleDoctorSpec, setScheduleDoctorSpec] = useState("");
  const [apptFilter, setApptFilter] = useState<string>("all");

  // Mini calendar
  const [miniCalMonth, setMiniCalMonth] = useState(today.getMonth());
  const [miniCalYear, setMiniCalYear] = useState(today.getFullYear());

  // Stats
  const [stats, setStats] = useState({ today: 0, pending: 0, completed: 0, avgWait: "—" });

  // New appointment form
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<{ id: string; label: string }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; label: string } | null>(
    null
  );
  const [apptDate, setApptDate] = useState(currentDate);
  const [apptStart, setApptStart] = useState("10:00");
  const [apptEnd, setApptEnd] = useState("10:30");
  const [apptType, setApptType] = useState<"video" | "physical" | "chat">("physical");
  const [apptNotes, setApptNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Create patient modal (for manual entry when search yields no results)
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientEmail, setNewPatientEmail] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [creatingPatient, setCreatingPatient] = useState(false);

  // Week view: generate 7 days starting from Sunday of current week
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(d);
      date.setDate(date.getDate() + i);
      return date.toISOString().slice(0, 10);
    });
  }, [currentDate]);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("doctor_profiles")
        .select("id, specialization, workspace_name, doctor_name")
        .eq("user_id", userId)
        .single();
      if (!profile) {
        setLoading(false);
        return;
      }
      setDoctorProfileId(profile.id);
      setScheduleDoctorSpec(profile.specialization || "General Medicine");
      if (profile.doctor_name) {
        const dn = profile.doctor_name.startsWith("Dr. ")
          ? profile.doctor_name
          : `Dr. ${profile.doctor_name}`;
        setScheduleDoctorName(dn);
      } else if (profile.workspace_name) {
        setScheduleDoctorName(`Dr. ${profile.workspace_name}`);
      } else {
        const { data: authData } = await supabase.auth.getUser();
        const metaName = authData?.user?.user_metadata?.full_name;
        setScheduleDoctorName(metaName ? `Dr. ${metaName}` : "Doctor");
      }

      // For week view, fetch all dates in the week
      const dateRange =
        viewMode === "week" ? { gte: weekDays[0], lte: weekDays[6] } : { eq: currentDate };

      let query = supabase
        .from("appointments")
        .select("*")
        .eq("doctor_id", profile.id)
        .order("start_time", { ascending: true });

      if ("eq" in dateRange) {
        query = query.eq("scheduled_date", dateRange.eq);
      } else {
        query = query.gte("scheduled_date", dateRange.gte).lte("scheduled_date", dateRange.lte);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Batch-resolve patient names
      const patientIds = [...new Set((data ?? []).map((a) => a.patient_id))];
      const { data: ppData } = await supabase
        .from("patient_profiles")
        .select("id, full_name")
        .in("id", patientIds.length > 0 ? patientIds : ["00000000-0000-0000-0000-000000000000"]);
      const nameMap = new Map((ppData ?? []).map((p) => [p.id, p.full_name]));

      const enriched = (data ?? []).map((a) => ({
        ...a,
        patient_name: nameMap.get(a.patient_id) || `Patient ${a.patient_id.slice(0, 6)}`,
      }));
      setAppointments(enriched);
      setStats({
        today: enriched.filter(
          (a) =>
            a.scheduled_date === currentDate && a.status !== "cancelled" && a.status !== "completed"
        ).length,
        pending: enriched.filter((a) => a.status === "scheduled" || a.status === "confirmed")
          .length,
        completed: enriched.filter((a) => a.status === "completed").length,
        avgWait: enriched.length > 0 ? "12 min" : "—",
      });
    } catch (err) {
      console.error("Failed to load appointments:", err);
    } finally {
      setLoading(false);
    }
  }, [
    userId,
    currentDate,
    viewMode,
    weekDays,
    setLoading,
    setDoctorProfileId,
    setScheduleDoctorSpec,
    setScheduleDoctorName,
    setAppointments,
    setStats,
  ]);

  useEffect(() => {
    if (role === null) return;
    if (role !== "doctor") {
      router.push("/dashboard");
      return;
    }
    const run = async () => {
      await loadAppointments();
    };
    run();
  }, [role, userId, router, currentDate, viewMode, loadAppointments]);

  const searchPatients = async (q: string) => {
    setPatientSearch(q);
    if (q.length < 2) {
      setPatients([]);
      return;
    }
    try {
      const { data } = await supabase
        .from("patient_profiles")
        .select("id, full_name, email")
        .ilike("full_name", `%${q}%`)
        .limit(10);
      setPatients(
        (data ?? []).map((d) => ({
          id: d.id,
          label: `${d.full_name}${d.email ? ` (${d.email})` : ""}`,
        }))
      );
    } catch {
      setPatients([]);
    }
  };

  const handleCreatePatient = async () => {
    if (!newPatientName.trim() || !doctorProfileId) return;
    setCreatingPatient(true);
    try {
      const { data: newPp, error } = await supabase
        .from("patient_profiles")
        .insert({
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          full_name: newPatientName.trim(),
          email: newPatientEmail.trim() || null,
          phone: newPatientPhone.trim() || null,
          created_by: doctorProfileId,
        })
        .select()
        .single();
      if (error) throw error;
      const patient = {
        id: newPp.id,
        label: `${newPp.full_name}${newPp.email ? ` (${newPp.email})` : ""}`,
      };
      setSelectedPatient(patient);
      setShowCreatePatient(false);
      setNewPatientName("");
      setNewPatientEmail("");
      setNewPatientPhone("");
    } catch (err) {
      console.error("Failed to create patient:", err);
      showToast("Failed to create patient.", "error");
    } finally {
      setCreatingPatient(false);
    }
  };

  const createAppointment = async () => {
    if (!selectedPatient || !doctorProfileId) return;
    if (apptEnd <= apptStart) {
      showToast("End time must be after start time.", "error");
      return;
    }

    // Double-booking check
    const { data: existing } = await supabase
      .from("appointments")
      .select("id, start_time, end_time")
      .eq("doctor_id", doctorProfileId)
      .eq("scheduled_date", apptDate)
      .neq("status", "cancelled");
    const hasConflict = (existing ?? []).some(
      (a) => a.start_time < apptEnd && a.end_time > apptStart
    );
    if (hasConflict) {
      showToast("Time slot conflicts with an existing appointment.", "warning");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("appointments").insert({
        doctor_id: doctorProfileId,
        patient_id: selectedPatient.id,
        scheduled_date: apptDate,
        start_time: apptStart,
        end_time: apptEnd,
        type: apptType,
        status: "scheduled",
        notes: apptNotes || null,
      });
      if (error) throw error;
      setShowNewForm(false);
      setSelectedPatient(null);
      setApptNotes("");
      loadAppointments();
    } catch (err) {
      console.error("Failed to create appointment:", err);
      showToast("Failed to create appointment. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("appointments").update({ status }).eq("id", id);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    loadAppointments();
  };

  const navigateDay = (offset: number) => {
    const parts = currentDate.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + offset);
    setCurrentDate(toLocalDateStr(d));
  };

  const filteredAppts = useMemo(
    () => (apptFilter === "all" ? appointments : appointments.filter((a) => a.type === apptFilter)),
    [appointments, apptFilter]
  );

  // Mini calendar helpers
  const miniCalDays = useMemo(() => {
    const firstDay = new Date(miniCalYear, miniCalMonth, 1).getDay();
    const daysInMonth = new Date(miniCalYear, miniCalMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [miniCalMonth, miniCalYear]);

  const currentDayNum = parseInt(currentDate.slice(8, 10));
  const currentMonthNum = parseInt(currentDate.slice(5, 7)) - 1;
  const currentYearNum = parseInt(currentDate.slice(0, 4));

  if (role !== "doctor") return null;

  return (
    <div className="h-full clinical-bg-gradient">
      <div className="h-full flex">
        {/* ============================================================
            LEFT PANEL: Mini Calendar + Filters + Staff
            ============================================================ */}
        <div className="w-[240px] shrink-0 bg-[#f8f9ff]/70 backdrop-blur-xl border-r border-white/30 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/20">
            <h2 className="text-xs font-bold text-[#0c4381] tracking-wider uppercase mb-3">
              Schedule
            </h2>

            {/* Mini Calendar */}
            <div className="bg-white/60 rounded-2xl p-3 glass-panel-sm mb-4">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => {
                    if (miniCalMonth === 0) {
                      setMiniCalMonth(11);
                      setMiniCalYear(miniCalYear - 1);
                    } else setMiniCalMonth(miniCalMonth - 1);
                  }}
                  className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-slate-700">
                  {MONTHS[miniCalMonth]} {miniCalYear}
                </span>
                <button
                  onClick={() => {
                    if (miniCalMonth === 11) {
                      setMiniCalMonth(0);
                      setMiniCalYear(miniCalYear + 1);
                    } else setMiniCalMonth(miniCalMonth + 1);
                  }}
                  className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-0 text-center">
                {DAYS.map((d) => (
                  <span key={d} className="text-[8px] font-bold text-slate-400 py-1">
                    {d}
                  </span>
                ))}
                {miniCalDays.map((day, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      day &&
                      setCurrentDate(
                        `${miniCalYear}-${String(miniCalMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                      )
                    }
                    className={`text-[10px] w-full aspect-square rounded-lg font-semibold transition-all ${
                      day === null
                        ? "invisible"
                        : day === currentDayNum &&
                            miniCalMonth === currentMonthNum &&
                            miniCalYear === currentYearNum
                          ? "bg-[#0c4381] text-white"
                          : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Consultation Type Filters */}
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Consultation Types
              </p>
              {TYPE_FILTERS.map((t) => (
                <button
                  key={t}
                  onClick={() => setApptFilter(t)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                    apptFilter === t
                      ? "bg-[#0c4381] text-white shadow-sm"
                      : "text-slate-600 hover:bg-white/60"
                  }`}
                >
                  <Circle
                    className={`w-2 h-2 fill-current ${t === "all" ? "text-slate-400" : t === "physical" ? "text-[#0c4381]" : t === "video" ? "text-purple-500" : "text-emerald-500"}`}
                  />
                  {t === "all" ? "All Types" : TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Staff / Doctor info */}
          <div className="p-4 border-t border-white/20 mt-auto">
            <div className="flex items-center gap-3 bg-white/60 rounded-2xl p-3 glass-panel-sm">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0c4381] to-[#006686] flex items-center justify-center text-white text-xs font-bold shrink-0">
                D
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{scheduleDoctorName}</p>
                <p className="text-[9px] text-slate-400">{scheduleDoctorSpec}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            CENTER PANEL: Calendar Grid with Appointments
            ============================================================ */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar */}
          <div className="bg-white/70 backdrop-blur-md border-b border-white/30 px-5 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigateDay(-1)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-800">
                  {(() => {
                    const p = currentDate.split("-").map(Number);
                    const d = new Date(p[0], p[1] - 1, p[2]);
                    return d.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    });
                  })()}
                </p>
                {currentDate === todayStr && (
                  <p className="text-[10px] font-semibold text-[#0c4381]">Today</p>
                )}
              </div>
              <button
                onClick={() => navigateDay(1)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Day/Week Toggle */}
              <div className="bg-white/60 rounded-xl p-0.5 flex border border-white/30">
                {(["day", "week"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                      viewMode === mode
                        ? "bg-[#0c4381] text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowNewForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0c4381] text-white rounded-xl text-xs font-bold hover:bg-[#093262] transition-colors shadow-md shadow-[#0c4381]/20"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>
          </div>

          {/* Calendar Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading schedule...
              </div>
            ) : viewMode === "day" ? (
              /* Day View — time-slot grid */
              <div className="divide-y divide-white/20">
                {TIME_SLOTS.map((slot, si) => {
                  const slotAppts = filteredAppts.filter((a) => {
                    const startHour = parseInt(a.start_time.slice(0, 2));
                    const slotHour = 7 + si;
                    return startHour === slotHour;
                  });
                  return (
                    <div
                      key={slot}
                      className="flex min-h-[60px] hover:bg-white/30 transition-colors group"
                    >
                      <div className="w-16 shrink-0 flex items-start justify-center pt-2 border-r border-white/20">
                        <span className="text-[10px] font-bold text-slate-400">{slot}</span>
                      </div>
                      <div className="flex-1 relative p-1 flex gap-1.5 flex-wrap items-start">
                        {slotAppts.map((appt) => {
                          const TypeIcon = TYPE_ICONS[appt.type];
                          return (
                            <div
                              key={appt.id}
                              className={`flex-1 min-w-[160px] max-w-[240px] border-l-4 rounded-xl p-2.5 cursor-pointer hover-glow ${TYPE_COLORS[appt.type] || "border-l-slate-300 bg-white"}`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-slate-800 truncate">
                                  {appt.patient_name}
                                </span>
                                <span
                                  className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${STATUS_COLORS[appt.status] || "bg-slate-100 text-slate-600"}`}
                                >
                                  {appt.status.replace("_", " ")}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <TypeIcon className="w-3 h-3 text-slate-400" />
                                <span className="text-[9px] text-slate-500 font-semibold">
                                  {appt.start_time.slice(0, 5)} - {appt.end_time.slice(0, 5)}
                                </span>
                              </div>
                              <div className="flex gap-1 mt-1.5">
                                {appt.status === "scheduled" && (
                                  <button
                                    onClick={() => updateStatus(appt.id, "confirmed")}
                                    className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                                  >
                                    Confirm
                                  </button>
                                )}
                                {appt.status === "confirmed" && (
                                  <button
                                    onClick={() => updateStatus(appt.id, "in_progress")}
                                    className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 hover:bg-amber-200"
                                  >
                                    Start
                                  </button>
                                )}
                                {appt.status === "in_progress" && (
                                  <button
                                    onClick={() => updateStatus(appt.id, "completed")}
                                    className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  >
                                    Complete
                                  </button>
                                )}
                                {appt.status !== "completed" &&
                                  appt.status !== "in_progress" &&
                                  appt.status !== "cancelled" && (
                                    <button
                                      onClick={() => updateStatus(appt.id, "cancelled")}
                                      className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 hover:bg-red-200"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                {appt.status !== "cancelled" && (
                                  <button
                                    onClick={() =>
                                      router.push(`/dashboard/doctor?patient_id=${appt.patient_id}`)
                                    }
                                    className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-[#0c4381]/10 hover:border-[#0c4381]/20"
                                  >
                                    Rx
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {/* Click to add at this time slot */}
                        <button
                          onClick={() => {
                            setApptStart(slot);
                            setApptDate(currentDate);
                            setShowNewForm(true);
                          }}
                          className="absolute right-1 top-1 w-5 h-5 rounded-full bg-white/0 hover:bg-white/80 border border-dashed border-slate-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Plus className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Week View — 7-day grid */
              <div className="flex flex-col h-full p-4">
                <div className="flex border-b border-white/20">
                  <div className="w-16 shrink-0" />
                  {weekDays.map((dayStr) => {
                    const d = new Date(dayStr);
                    const isToday = dayStr === todayStr;
                    return (
                      <div key={dayStr} className="flex-1 text-center py-2">
                        <p
                          className={`text-[9px] font-bold uppercase ${isToday ? "text-[#0c4381]" : "text-slate-400"}`}
                        >
                          {DAYS[d.getDay()]}
                        </p>
                        <p
                          className={`text-lg font-black ${isToday ? "text-[#0c4381]" : "text-slate-700"}`}
                        >
                          {d.getDate()}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-white/10 custom-scrollbar">
                  {TIME_SLOTS.map((slot) => (
                    <div
                      key={slot}
                      className="flex min-h-[44px] hover:bg-white/20 transition-colors"
                    >
                      <div className="w-16 shrink-0 flex items-start justify-center pt-1 border-r border-white/20">
                        <span className="text-[8px] font-bold text-slate-400">{slot}</span>
                      </div>
                      {weekDays.map((dayStr) => {
                        const dayAppts = filteredAppts.filter((a) => {
                          const startHour = parseInt(a.start_time.slice(0, 2));
                          const slotHour = parseInt(slot.slice(0, 2));
                          return a.scheduled_date === dayStr && startHour === slotHour;
                        });
                        return (
                          <div
                            key={dayStr}
                            className="flex-1 border-r border-white/10 p-0.5 min-h-[44px] relative"
                          >
                            {dayAppts.map((appt) => (
                              <div
                                key={appt.id}
                                className={`text-[8px] font-bold px-1.5 py-1 rounded-lg mb-0.5 border-l-2 cursor-pointer hover-glow ${
                                  appt.type === "physical"
                                    ? "border-l-[#0c4381] bg-blue-100/80 text-blue-800"
                                    : appt.type === "video"
                                      ? "border-l-purple-400 bg-purple-100/80 text-purple-800"
                                      : "border-l-emerald-400 bg-emerald-100/80 text-emerald-800"
                                }`}
                                title={`${appt.patient_name} — ${appt.start_time}-${appt.end_time}`}
                              >
                                {appt.patient_name?.replace("Patient ", "P")}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================
            RIGHT PANEL: Stats & Summary
            ============================================================ */}
        <div className="w-[220px] shrink-0 bg-[#f8f9ff]/70 backdrop-blur-xl border-l border-white/30 p-4 space-y-4 overflow-y-auto custom-scrollbar">
          <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            Day Overview
          </h3>

          <div className="glass-panel-sm rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-semibold">Appointments</span>
              <span className="text-lg font-black text-[#0c4381]">{stats.today}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-semibold">Pending</span>
              <span className="text-lg font-black text-amber-600">{stats.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-semibold">Completed</span>
              <span className="text-lg font-black text-emerald-600">{stats.completed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-semibold">Avg. Wait</span>
              <span className="text-lg font-black text-slate-700">{stats.avgWait}</span>
            </div>
          </div>

          {/* Upcoming appointments mini-list */}
          <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pt-2">
            Upcoming
          </h3>
          <div className="space-y-2">
            {filteredAppts
              .filter((a) => a.status !== "completed" && a.status !== "cancelled")
              .slice(0, 4)
              .map((appt) => (
                <div
                  key={appt.id}
                  className="glass-panel-sm rounded-xl p-3 flex items-center gap-2.5"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      appt.type === "physical"
                        ? "bg-[#0c4381]"
                        : appt.type === "video"
                          ? "bg-purple-500"
                          : "bg-emerald-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-slate-700 truncate">
                      {appt.patient_name}
                    </p>
                    <p className="text-[8px] text-slate-400">{appt.start_time.slice(0, 5)}</p>
                  </div>
                  <span
                    className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${STATUS_COLORS[appt.status]}`}
                  >
                    {appt.status === "in_progress" ? "Now" : appt.status.slice(0, 4)}
                  </span>
                </div>
              ))}
            {filteredAppts.filter((a) => a.status !== "completed" && a.status !== "cancelled")
              .length === 0 && (
              <p className="text-[10px] text-slate-400 italic text-center py-4">
                No upcoming appointments
              </p>
            )}
          </div>

          {/* Demographics summary */}
          <div className="glass-panel-sm rounded-2xl p-4">
            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              Consultations
            </h4>
            <div className="space-y-2">
              {(["physical", "video", "chat"] as const).map((type) => {
                const count = appointments.filter((a) => a.type === type).length;
                return (
                  <div key={type} className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        type === "physical"
                          ? "bg-[#0c4381]"
                          : type === "video"
                            ? "bg-purple-500"
                            : "bg-emerald-500"
                      }`}
                    />
                    <span className="text-[10px] text-slate-600 font-semibold flex-1">
                      {TYPE_LABELS[type]}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* New Appointment Modal */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/40 w-full max-w-md mx-4 overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">New Appointment</h2>
              <button
                onClick={() => setShowNewForm(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Patient</label>
                {selectedPatient ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#0c4381]/10 text-[#0c4381] rounded-xl text-sm">
                    <span className="font-semibold">{selectedPatient.label}</span>
                    <button onClick={() => setSelectedPatient(null)} className="ml-auto">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      value={patientSearch}
                      onChange={(e) => searchPatients(e.target.value)}
                      placeholder="Search patients..."
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/30"
                    />
                    <div className="mt-1 bg-white rounded-xl shadow-lg border border-slate-200 max-h-40 overflow-y-auto">
                      {patients.length > 0 &&
                        patients.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSelectedPatient(p);
                              setPatientSearch("");
                              setPatients([]);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-[#0c4381]/10 text-slate-700 border-b border-slate-50 last:border-0"
                          >
                            {p.label}
                          </button>
                        ))}
                      {patientSearch.length >= 2 && patients.length === 0 && (
                        <button
                          onClick={() => {
                            setNewPatientName(patientSearch);
                            setShowCreatePatient(true);
                          }}
                          className="w-full text-left px-3 py-2.5 text-sm text-[#0c4381] font-semibold hover:bg-[#0c4381]/10 flex items-center gap-2 border-t border-dashed border-slate-200"
                        >
                          <UserPlus className="w-4 h-4" /> Create &quot;{patientSearch}&quot;
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Date</label>
                  <input
                    type="date"
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Type</label>
                  <select
                    value={apptType}
                    onChange={(e) => setApptType(e.target.value as "video" | "physical" | "chat")}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                  >
                    <option value="physical">In-Clinic</option>
                    <option value="video">Video Call</option>
                    <option value="chat">Chat</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={apptStart}
                    onChange={(e) => setApptStart(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={apptEnd}
                    onChange={(e) => setApptEnd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Notes</label>
                <textarea
                  value={apptNotes}
                  onChange={(e) => setApptNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm resize-none"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={createAppointment}
                disabled={saving || !selectedPatient}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-[#0c4381] rounded-xl hover:bg-[#093262] disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Creating..." : "Create Appointment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Patient Modal */}
      {showCreatePatient && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/40 w-full max-w-sm mx-4 overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0c4381]">New Patient</h2>
              <button
                onClick={() => setShowCreatePatient(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input
                type="text"
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                placeholder="Full Name *"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/30"
              />
              <input
                type="email"
                value={newPatientEmail}
                onChange={(e) => setNewPatientEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/30"
              />
              <input
                type="tel"
                value={newPatientPhone}
                onChange={(e) => setNewPatientPhone(e.target.value)}
                placeholder="Phone"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/30"
              />
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setShowCreatePatient(false)}
                className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePatient}
                disabled={creatingPatient || !newPatientName.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-[#0c4381] rounded-xl hover:bg-[#093262] disabled:opacity-50"
              >
                {creatingPatient && <Loader2 className="w-4 h-4 animate-spin" />}
                {creatingPatient ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
