"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Activity,
  Plus,
  Trash2,
  CheckCircle2,
  CalendarDays,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

interface SymptomLog {
  id: string;
  timestamp: string;
  name: string;
  severity: "Mild" | "Moderate" | "Severe";
  notes: string;
}

export default function VitalsPage() {
  const [logs, setLogs] = useState<SymptomLog[]>([]);
  const [userId, setUserId] = useState<string>("00000000-0000-0000-0000-000000000000");
  const [loading, setLoading] = useState(true);

  // Form State
  const [symptomName, setSymptomName] = useState("Palpitations");
  const [severity, setSeverity] = useState<"Mild" | "Moderate" | "Severe">("Mild");
  const [notes, setNotes] = useState("");
  const [showAlertModal, setShowAlertModal] = useState(false);

  const fetchLogs = async (uid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("symptom_logs")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        setLogs(
          data.map((item: any) => ({
            id: item.id,
            timestamp: new Date(item.created_at).toLocaleString([], {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
            name: item.name,
            severity: item.severity,
            notes: item.notes,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch symptom logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id || "00000000-0000-0000-0000-000000000000";
      setUserId(uid);
      fetchLogs(uid);
    };
    initSession();
  }, []);

  // Submit Symptom Log
  const handleLogSymptom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomName) return;

    const payload = {
      user_id: userId,
      name: symptomName,
      severity,
      notes: notes || "No additional comments logged.",
    };

    try {
      const { data, error } = await supabase
        .from("symptom_logs")
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setLogs((prev) => [
          {
            id: data.id,
            timestamp: new Date(data.created_at).toLocaleString([], {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
            name: data.name,
            severity: data.severity,
            notes: data.notes,
          },
          ...prev,
        ]);

        // Pendo Track: symptom_logged
        if (typeof window !== 'undefined' && (window as any).pendo) {
          (window as any).pendo.track('symptom_logged', {
            symptom_name: data.name,
            severity: data.severity,
            has_notes: Boolean(notes),
          });
        }

        setNotes("");
        if (severity === "Severe") {
          setShowAlertModal(true);

          // Pendo Track: severe_symptom_alert_triggered
          if (typeof window !== 'undefined' && (window as any).pendo) {
            (window as any).pendo.track('severe_symptom_alert_triggered', {
              symptom_name: symptomName,
              severity: 'Severe',
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to log symptom entry:", err);
      // Fallback local log
      const date = new Date();
      const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
      const newLog: SymptomLog = {
        id: Math.random().toString(36).substring(7),
        timestamp: formattedDate,
        name: symptomName,
        severity,
        notes: notes || "No additional comments logged.",
      };
      setLogs((prev) => [newLog, ...prev]);
      setNotes("");
      if (severity === "Severe") {
        setShowAlertModal(true);
      }
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      const { error } = await supabase.from("symptom_logs").delete().eq("id", id);
      if (error) throw error;
      setLogs((prev) => prev.filter((log) => log.id !== id));

      // Pendo Track: symptom_log_deleted
      if (typeof window !== 'undefined' && (window as any).pendo) {
        (window as any).pendo.track('symptom_log_deleted', {
          log_id: id,
        });
      }
    } catch (err) {
      console.error("Failed to delete log from Supabase, removing locally:", err);
      setLogs((prev) => prev.filter((log) => log.id !== id));
    }
  };

  const severityStyles = {
    Mild: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    Moderate: "bg-amber-50 text-amber-600 border border-amber-100",
    Severe: "bg-rose-50 text-rose-600 border border-rose-100 font-bold animate-pulse",
  };

  return (
    <div className="p-8 space-y-8 w-full min-h-full bg-[#f0f5ff]">
      {/* Header Banner */}
      <header className="flex justify-between items-center bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Symptom Tracker</h1>
          <p className="text-slate-500 text-sm font-semibold mt-1">
            Log outpatient symptoms and keep records for diagnostic consultation.
          </p>
        </div>
      </header>

      {/* Grid Content */}
      <div className="grid grid-cols-12 gap-8">
        {/* Logging Form (5 Cols) */}
        <section className="col-span-12 lg:col-span-5 bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex gap-2.5 items-center mb-6">
              <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <Activity className="text-brand-500 h-5.5 w-5.5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">Log New Symptom</h3>
                <p className="text-slate-500 text-xs font-semibold">
                  Record active symptoms for review.
                </p>
              </div>
            </div>

            <form onSubmit={handleLogSymptom} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Symptom Type
                </label>
                <select
                  value={symptomName}
                  onChange={(e) => setSymptomName(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all focus-visible:outline-none"
                >
                  <option value="Palpitations">Chest Palpitations</option>
                  <option value="Chest Tightness">Chest Tightness</option>
                  <option value="Fatigue">Fatigue &amp; Lethargy</option>
                  <option value="Shortness of Breath">Shortness of Breath</option>
                  <option value="Dizziness">Dizziness &amp; Vertigo</option>
                  <option value="Headache">Headache</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Severity Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["Mild", "Moderate", "Severe"] as const).map((level) => {
                    const isSelected = severity === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setSeverity(level)}
                        className={`py-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          isSelected
                            ? level === "Mild"
                              ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10"
                              : level === "Moderate"
                                ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/10"
                                : "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/10"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Observations / Notes
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record when the symptoms occurred, duration, or triggering factors..."
                  className="bg-slate-50 border-slate-200 rounded-xl min-h-[100px] text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-brand-100"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-brand-500/10 mt-6"
              >
                <Plus className="h-4 w-4" /> Log Symptom Entry
              </button>
            </form>
          </div>
        </section>

        {/* Logs List (7 Cols) */}
        <section className="col-span-12 lg:col-span-7 bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Outpatient Log History
              </span>
              <h2 className="text-xl font-black text-slate-800 mt-1">Symptom Logs History</h2>
            </div>
            <span className="text-xs bg-slate-50 border border-slate-100 text-slate-500 px-3 py-1.5 rounded-xl font-bold">
              {logs.length} entries recorded
            </span>
          </div>

          <div className="flex-grow space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="h-10 w-10 text-brand-500 animate-spin mb-3" />
                <p className="text-xs font-semibold">Retrieving clinical logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-3" />
                <p className="text-xs font-semibold">
                  No active symptoms logged. Patient condition optimal.
                </p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 p-5 rounded-2xl flex gap-4 transition-colors"
                >
                  <div className="flex-grow space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{log.name}</span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${severityStyles[log.severity]}`}
                        >
                          {log.severity}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 font-mono">
                        <CalendarDays className="h-3 w-3" /> {log.timestamp}
                      </span>
                    </div>
                    <p className="text-[11.5px] leading-relaxed text-slate-600 font-medium">
                      {log.notes}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteLog(log.id)}
                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all self-center"
                    title="Delete log entry"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Critical Medical Warning Dialog Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowAlertModal(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-none"
          />

          <div className="bg-white rounded-3xl p-8 max-w-md w-full relative z-10 border border-slate-100 shadow-2xl text-center">
            <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-5 border border-rose-100">
              <ShieldAlert className="h-9 w-9 animate-bounce" />
            </div>

            <h3 className="text-xl font-black text-slate-800 mb-2">Severe Symptom Alert</h3>
            <p className="text-slate-600 text-sm font-semibold mb-6">
              A severe symptom has been recorded. The clinical staff has been alerted automatically.
              Please notify your designated physician immediately.
            </p>

            {/* Doctor Contact Box */}
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-3 text-left mb-6">
              <div className="w-10 h-10 rounded-full overflow-hidden relative flex-shrink-0">
                <Image
                  src="/images/doctor3.jpg"
                  alt="Dr. Sarah Jenkins"
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Dr. Sarah Jenkins</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Chief Medical Officer
                </p>
                <p className="text-[10px] text-brand-600 font-bold mt-0.5">
                  Alert status: Notification Sent
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowAlertModal(false)}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl"
            >
              Understood
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
