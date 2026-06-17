"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Pill, AlarmClock, CheckCircle, Clock } from "lucide-react";
import {
  buildScheduleFromRemote,
  saveAlarmSchedule,
  loadAlarmSchedule,
  scheduleBrowserAlarm,
  queueOfflineAction,
  syncOfflineQueue,
} from "@/lib/alarm-queue";

interface Medication {
  id: string;
  user_id?: string;
  name: string;
  dosage: string;
  scheduled_times: string[];
  current_stock: number;
}

interface MedicationLog {
  id: string;
  medication_id: string;
  status: string;
  scheduled_at: string;
  snoozed_until: string | null;
}

export function MedicationAlarmAlerter() {
  const [activeAlarms, setActiveAlarms] = useState<
    { med: Medication; time: string; logId?: string }[]
  >([]);
  const [session, setSession] = useState<any>(null);
  const channelsRef = useRef<{ unsubscribe: () => void }[]>([]);

  // Audio state refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalIdRef = useRef<any>(null);
  const userInteracted = useRef<boolean>(false);

  const stopAlarmSound = () => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
  };

  const startAlarmSound = () => {
    if (typeof window === "undefined" || !userInteracted.current) return;
    if (audioCtxRef.current) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      audioCtxRef.current = new AudioContextClass();
      let alternating = false;

      intervalIdRef.current = setInterval(() => {
        const audioCtx = audioCtxRef.current;
        if (!audioCtx) return;

        if (audioCtx.state === "suspended") {
          audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(alternating ? 880 : 587, audioCtx.currentTime);

        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.45);
        alternating = !alternating;
      }, 750);
    } catch (e) {
      console.warn("Failed to initialize Web Audio alarm sound:", e);
    }
  };

  // Check auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    // Detect user interaction so browser allows audio playback
    const handleInteraction = () => {
      userInteracted.current = true;
    };
    window.addEventListener("click", handleInteraction);
    window.addEventListener("keydown", handleInteraction);

    // Sync offline queue when coming back online
    window.addEventListener("online", syncOfflineQueue);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("online", syncOfflineQueue);
      stopAlarmSound();
      channelsRef.current.forEach((ch) => ch.unsubscribe());
    };
  }, []);

  // Build local schedule + schedule browser notifications
  const refreshSchedule = async () => {
    if (!session?.user?.id) return;

    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: meds } = await supabase
        .from("medications")
        .select("id, name, dosage, scheduled_times, current_stock")
        .eq("user_id", session.user.id)
        .eq("is_active", true);

      if (!meds) return;

      const { data: logs } = await supabase
        .from("medication_logs")
        .select("id, medication_id, status, scheduled_at, snoozed_until")
        .gte("scheduled_at", startOfDay.toISOString());

      const schedule = buildScheduleFromRemote(meds, logs || []);
      saveAlarmSchedule(schedule);

      // Schedule browser notifications for future slots
      for (const entry of schedule) {
        if (entry.status === "scheduled") {
          await scheduleBrowserAlarm(entry, session.user.id);
        }
      }
    } catch (e) {
      console.warn("[Alarm] refreshSchedule failed:", e);
    }
  };

  const checkAlarms = async () => {
    if (!session?.user?.id) return;

    try {
      let schedule = loadAlarmSchedule();

      if (schedule.length === 0) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const { data: meds } = await supabase
          .from("medications")
          .select("id, name, dosage, scheduled_times, current_stock")
          .eq("user_id", session.user.id)
          .eq("is_active", true);

        const { data: logs } = await supabase
          .from("medication_logs")
          .select("id, medication_id, status, scheduled_at, snoozed_until")
          .gte("scheduled_at", startOfDay.toISOString());

        schedule = buildScheduleFromRemote(meds || [], logs || []);
        saveAlarmSchedule(schedule);
      }

      const now = new Date();
      const triggered: { med: Medication; time: string; logId?: string }[] = [];

      for (const entry of schedule) {
        if (entry.status === "taken") continue;

        const [hours, minutes] = entry.scheduled_time.split(":").map(Number);
        const scheduledDate = new Date();
        scheduledDate.setHours(hours, minutes, 0, 0);

        if (now <= scheduledDate) continue;

        if (entry.status === "snoozed" && entry.snoozed_until) {
          if (new Date(entry.snoozed_until) > now) continue;
        }

        triggered.push({
          med: {
            id: entry.medication_id,
            name: entry.medication_name,
            dosage: entry.dosage,
            scheduled_times: [entry.scheduled_time],
            current_stock: entry.current_stock,
          },
          time: entry.scheduled_time,
          logId: entry.log_id ?? undefined,
        });
      }

      setActiveAlarms(triggered);

      if (triggered.length > 0) {
        startAlarmSound();
      } else {
        stopAlarmSound();
      }
    } catch (err) {
      console.error("Alarm check failed:", err);
    }
  };

  // Subscribe to Realtime + init local schedule
  useEffect(() => {
    if (!session?.user?.id) return;

    queueMicrotask(() => {
      refreshSchedule().then(checkAlarms);
    });

    const intervalId = setInterval(() => {
      checkAlarms();
    }, 30_000);

    syncOfflineQueue();

    const logsChannel = supabase
      .channel(`web-med-logs-${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "medication_logs",
        },
        () => {
          refreshSchedule().then(checkAlarms);
        }
      )
      .subscribe();

    const medsChannel = supabase
      .channel(`web-meds-${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "medications",
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          refreshSchedule().then(checkAlarms);
        }
      )
      .subscribe();

    channelsRef.current = [logsChannel, medsChannel];

    return () => {
      clearInterval(intervalId);
      logsChannel.unsubscribe();
      medsChannel.unsubscribe();
    };
  }, [session?.user?.id]);

  const handleTakeNow = async (alarm: { med: Medication; time: string; logId?: string }) => {
    if (!session?.user?.id) return;
    stopAlarmSound();

    const now = new Date();
    const [hours, minutes] = alarm.time.split(":").map(Number);
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    const updateLocal = () => {
      const schedule = loadAlarmSchedule();
      const updated = schedule.map((e) => {
        if (e.medication_id === alarm.med.id && e.scheduled_time === alarm.time) {
          return { ...e, status: "taken" as const };
        }
        return e;
      });
      saveAlarmSchedule(updated);
      checkAlarms();
    };

    try {
      if (alarm.logId) {
        const { error } = await supabase
          .from("medication_logs")
          .update({
            status: "taken",
            taken_at: now.toISOString(),
            snoozed_until: null,
            note: "Confirmed taken from Web Device Alarm",
          })
          .eq("id", alarm.logId);
        if (error) throw error;
      } else {
        const payload = {
          medication_id: alarm.med.id,
          medication_name: alarm.med.name,
          scheduled_at: scheduledTime.toISOString(),
          taken_at: now.toISOString(),
          status: "taken",
          dose: alarm.med.dosage,
          note: "Logged taken from Web Device Alarm",
        };
        const { error } = await supabase.from("medication_logs").insert(payload);
        if (error) {
          queueOfflineAction({ table: "medication_logs", action: "insert", payload });
        }
      }

      const newStock = Math.max(0, alarm.med.current_stock - 1);
      const { error: stockErr } = await supabase
        .from("medications")
        .update({ current_stock: newStock })
        .eq("id", alarm.med.id);

      if (stockErr) {
        queueOfflineAction({
          table: "medications",
          action: "update",
          payload: { id: alarm.med.id, current_stock: newStock },
        });
      }

      updateLocal();
    } catch (e) {
      queueOfflineAction({
        table: "medication_logs",
        action: alarm.logId ? "update" : "insert",
        payload: alarm.logId
          ? { id: alarm.logId, status: "taken", taken_at: now.toISOString(), snoozed_until: null }
          : {
              medication_id: alarm.med.id,
              medication_name: alarm.med.name,
              scheduled_at: scheduledTime.toISOString(),
              taken_at: now.toISOString(),
              status: "taken",
              dose: alarm.med.dosage,
            },
      });
      updateLocal();
    }
  };

  const handleSnooze = async (alarm: { med: Medication; time: string; logId?: string }) => {
    if (!session?.user?.id) return;
    stopAlarmSound();

    const [hours, minutes] = alarm.time.split(":").map(Number);
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);
    const snoozeUntil = new Date(new Date().getTime() + 10 * 60 * 1000).toISOString();

    const updateLocal = () => {
      const schedule = loadAlarmSchedule();
      const updated = schedule.map((e) => {
        if (e.medication_id === alarm.med.id && e.scheduled_time === alarm.time) {
          return { ...e, status: "snoozed" as const, snoozed_until: snoozeUntil };
        }
        return e;
      });
      saveAlarmSchedule(updated);
      checkAlarms();
    };

    try {
      if (alarm.logId) {
        const { error } = await supabase
          .from("medication_logs")
          .update({
            status: "snoozed",
            snoozed_until: snoozeUntil,
            note: "Snoozed 10m from Web Device Alarm",
          })
          .eq("id", alarm.logId);
        if (error) throw error;
      } else {
        const payload = {
          medication_id: alarm.med.id,
          medication_name: alarm.med.name,
          scheduled_at: scheduledTime.toISOString(),
          status: "snoozed",
          snoozed_until: snoozeUntil,
          dose: alarm.med.dosage,
          note: "Snoozed 10m from Web Device Alarm",
        };
        const { error } = await supabase.from("medication_logs").insert(payload);
        if (error) {
          queueOfflineAction({ table: "medication_logs", action: "insert", payload });
        }
      }

      updateLocal();
    } catch (e) {
      queueOfflineAction({
        table: "medication_logs",
        action: alarm.logId ? "update" : "insert",
        payload: alarm.logId
          ? { id: alarm.logId, status: "snoozed", snoozed_until: snoozeUntil }
          : {
              medication_id: alarm.med.id,
              medication_name: alarm.med.name,
              scheduled_at: scheduledTime.toISOString(),
              status: "snoozed",
              snoozed_until: snoozeUntil,
              dose: alarm.med.dosage,
            },
      });
      updateLocal();
    }
  };

  if (activeAlarms.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden animate-scale-up">
        {/* Ringing decorative background pulses */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-red-100 rounded-full blur-2xl animate-pulse opacity-60" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-amber-100 rounded-full blur-2xl animate-pulse opacity-60" />

        <div className="flex flex-col items-center text-center space-y-6 relative z-10">
          {/* Ringing Icon Container */}
          <div className="w-20 h-20 bg-red-50 border border-red-100 rounded-3xl flex items-center justify-center relative shadow-inner animate-bounce">
            <div className="absolute inset-0 bg-red-500 rounded-3xl opacity-20 animate-ping" />
            <AlarmClock className="h-10 w-10 text-red-500" />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Medication Alarm</h2>
            <p className="text-slate-500 text-xs font-semibold mt-1">
              You have medication schedules that require your immediate attention:
            </p>
          </div>

          {/* Alarm list */}
          <div className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-4 divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {activeAlarms.map((alarm, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center py-3 first:pt-0 last:pb-0"
              >
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Pill className="h-4 w-4 text-brand-500" /> {alarm.med.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Dosage: {alarm.med.dosage} · Scheduled: {alarm.time}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleSnooze(alarm)}
                    className="p-2 bg-white hover:bg-amber-50 border border-slate-200 text-amber-600 rounded-xl transition-all cursor-pointer"
                    title="Snooze 10 mins"
                  >
                    <Clock className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleTakeNow(alarm)}
                    className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all cursor-pointer shadow-sm shadow-emerald-500/10"
                    title="Mark Taken"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Device sync: marking taken or snoozing updates all devices.
          </div>
        </div>
      </div>
    </div>
  );
}
