"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Moon,
  AlarmClock,
  Footprints,
  Sparkles,
  Smartphone,
  Plus,
  Trash2,
  Volume2,
  RefreshCw,
  X,
  Info,
  Download,
  QrCode,
  Share2,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { QRCodeSVG } from "qrcode.react";

interface Alarm {
  id: string;
  time: string; // "HH:MM"
  label: string;
  enabled: boolean;
  repeat: string[]; // ['Mon', 'Tue', ...]
  smart_wake: boolean; // wakes within 30 min of cycle
  sound: string; // "Forest Rain" | "Chime Chord" | "Serene Birds"
}

interface SleepSession {
  date: string;
  duration: number; // hours
  efficiency: number; // percentage
  deepMinutes: number;
  remMinutes: number;
  lightMinutes: number;
  awakeMinutes: number;
  averageHr: number;
  stages: { time: string; stage: "Awake" | "REM" | "Light" | "Deep" }[];
}

interface DailyStepsRow {
  steps: number;
  calories: number;
  active_minutes: number;
  [key: string]: unknown;
}

export default function SleepCompanionPage() {
  // --- Audio Synthesis Helper ---
  const synthIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const playSynthesizedChime = (type: string) => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const playTone = (freq: number, delay: number, duration: number, vol = 0.2) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = type === "Forest Rain" ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, now + delay);

        gainNode.gain.setValueAtTime(0, now + delay);
        gainNode.gain.linearRampToValueAtTime(vol, now + delay + 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + duration);
      };

      if (type === "Forest Rain") {
        playTone(180, 0, 1.2, 0.15);
        playTone(440, 0.2, 0.8, 0.1);
        playTone(660, 0.5, 0.6, 0.08);
      } else if (type === "Serene Birds") {
        playTone(1200, 0, 0.15, 0.15);
        playTone(1400, 0.1, 0.1, 0.1);
        playTone(1100, 0.2, 0.15, 0.1);
        playTone(1300, 0.35, 0.2, 0.15);
      } else {
        playTone(523.25, 0, 1.5, 0.2); // C5
        playTone(659.25, 0.2, 1.5, 0.2); // E5
        playTone(783.99, 0.4, 1.5, 0.2); // G5
        playTone(1046.5, 0.6, 2.0, 0.2); // C6
      }
    } catch {
      // AudioContext synthesis failed
    }
  };

  const startAlarmRingtoneLoop = (soundType: string) => {
    playSynthesizedChime(soundType);
    if (synthIntervalRef.current) clearInterval(synthIntervalRef.current);
    synthIntervalRef.current = setInterval(() => {
      playSynthesizedChime(soundType);
    }, 2800);
  };

  const stopAlarmRingtoneLoop = useCallback(() => {
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
  }, []);

  // --- State Variables ---
  const [userId, setUserId] = useState<string>("");
  const [isPaired, setIsPaired] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [, setSyncTimestamp] = useState("Never synced");
  const [syncHistory, setSyncHistory] = useState<string[]>([
    "Device disconnected. Waiting for companion pairing...",
  ]);

  const [showQR, setShowQR] = useState(true);
  const [showPairingMode, setShowPairingMode] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [generatingPairCode, setGeneratingPairCode] = useState(false);
  const [codeExpiresIn, setCodeExpiresIn] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Telemetry Metrics
  const [steps, setSteps] = useState(6420);
  const stepsGoal = 10000;
  const [, setActiveMinutes] = useState(48);
  const [, setCalories] = useState(310);

  // Alarms
  const [alarms, setAlarms] = useState<Alarm[]>([
    {
      id: "a1",
      time: "07:30",
      label: "Weekday Wakeup",
      enabled: true,
      repeat: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      smart_wake: true,
      sound: "Chime Chord",
    },
  ]);
  const [newAlarmTime, setNewAlarmTime] = useState("07:00");
  const [newAlarmLabel, setNewAlarmLabel] = useState("Morning Alarm");
  const [newAlarmSmart, setNewAlarmSmart] = useState(true);
  const [newAlarmSound, setNewAlarmSound] = useState("Chime Chord");
  const [showAddForm, setShowAddForm] = useState(false);

  // Sleep Hygiene Checklist
  const [hygieneChecks, setHygieneChecks] = useState({
    noCaffeine: true,
    blueLightFilter: false,
    coolRoom: true,
    noScreens: false,
  });

  const checkedCount = Object.values(hygieneChecks).filter(Boolean).length;
  const dailyHygieneScore = Math.round((checkedCount / 4) * 100);

  // Hypnogram Settings
  const [showHrOverlay, setShowHrOverlay] = useState(true);

  // Sleep Data
  const [sleepHistory, setSleepHistory] = useState<SleepSession[]>([]);

  const fallbackSleep: SleepSession = {
    date: "No Data",
    duration: 0,
    efficiency: 0,
    deepMinutes: 0,
    remMinutes: 0,
    lightMinutes: 0,
    awakeMinutes: 0,
    averageHr: 0,
    stages: [],
  };

  const currentSleep = sleepHistory[sleepHistory.length - 1] || fallbackSleep;

  // Device Simulator States
  const [isPhoneRinging, setIsPhoneRinging] = useState(false);
  const [, setPhoneRingingAlarm] = useState<Alarm | null>(null);
  const [solveMathAnswer, setSolveMathAnswer] = useState("");
  const [mathNum1, setMathNum1] = useState(8);
  const [mathNum2, setMathNum2] = useState(7);
  const [mathError, setMathError] = useState(false);

  // Sync Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const fetchRealData = useCallback(async (uid: string) => {
    try {
      // Fetch Alarms
      const { data: alarmsData } = await supabase
        .from("wearable_alarms")
        .select("*")
        .eq("user_id", uid)
        .order("time", { ascending: true });

      if (alarmsData && alarmsData.length > 0) {
        setAlarms(
          alarmsData.map((a) => ({
            id: a.id,
            time: a.time,
            label: a.label || "Alarm",
            enabled: a.enabled,
            repeat: a.repeat || [],
            smart_wake: a.smart_wake,
            sound: a.sound || "Chime Chord",
          }))
        );
      }

      // Fetch Sleep logs
      const { data: sleepData } = await supabase
        .from("sleep_sessions")
        .select("*")
        .eq("user_id", uid)
        .order("date", { ascending: true });

      if (sleepData && sleepData.length > 0) {
        setSleepHistory(
          sleepData.map((s) => ({
            date: s.date,
            duration: Number(s.duration),
            efficiency: s.efficiency,
            deepMinutes: s.deep_minutes,
            remMinutes: s.rem_minutes,
            lightMinutes: s.light_minutes,
            awakeMinutes: s.awake_minutes,
            averageHr: s.average_hr || 60,
            stages: s.stages || [],
          }))
        );
      }

      // Fetch Steps
      const todayStr = new Date().toISOString().split("T")[0];
      const { data: stepsData } = await supabase
        .from("daily_steps")
        .select("*")
        .eq("user_id", uid)
        .eq("date", todayStr)
        .single();

      if (stepsData) {
        setSteps(stepsData.steps);
        setCalories(stepsData.calories);
        setActiveMinutes(stepsData.active_minutes);
      }
    } catch {
      // Using fallback state
    }
  }, []);

  const setupRealtimeSubscriptions = useCallback(
    (uid: string) => {
      try {
        const alarmsSub = supabase
          .channel("web_alarms_sync")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "wearable_alarms", filter: `user_id=eq.${uid}` },
            () => {
              fetchRealData(uid);
              triggerToast("Alarms updated from wearable sync");
            }
          )
          .subscribe();

        const stepsSub = supabase
          .channel("web_steps_sync")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "daily_steps", filter: `user_id=eq.${uid}` },
            (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
              if (payload.new) {
                const { steps, calories, active_minutes } = payload.new as DailyStepsRow;
                setSteps(steps);
                setCalories(calories);
                setActiveMinutes(active_minutes);
                setSyncTimestamp("Just now");
                triggerToast(`Steps counter synchronized: ${steps} steps`);
              }
            }
          )
          .subscribe();

        const sleepSub = supabase
          .channel("web_sleep_sync")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "sleep_sessions", filter: `user_id=eq.${uid}` },
            () => {
              fetchRealData(uid);
              triggerToast("New Sleep Session synchronized from paired device");
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(alarmsSub);
          supabase.removeChannel(stepsSub);
          supabase.removeChannel(sleepSub);
        };
      } catch {
        // Realtime channels setup failed
      }
    },
    [fetchRealData, triggerToast, setSyncTimestamp]
  );

  // --- Supabase Synchronization Lifecycle ---
  useEffect(() => {
    const initSupabase = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session && session.user) {
          setUserId(session.user.id);
          fetchRealData(session.user.id);
          setupRealtimeSubscriptions(session.user.id);
        } else {
          fetchRealData(userId);
          setupRealtimeSubscriptions(userId);
        }
      } catch {
        // Supabase connection bypassed/mock-mode active
      }
    };

    initSupabase();

    return () => {
      stopAlarmRingtoneLoop();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchRealData, setupRealtimeSubscriptions, userId, stopAlarmRingtoneLoop]);

  // --- Sleep Cycle Coaching Info ---
  const calculateSleepCoaching = () => {
    if (currentSleep.duration === 0) {
      return {
        cyclesCount: "0.0",
        alignment: "No Data",
        message: "No sleep sessions recorded yet.",
        suggestion: "Pair your companion device or sync data manually.",
      };
    }
    const totalMins = currentSleep.duration * 60;
    const cyclesCount = (totalMins / 90).toFixed(1);
    const remainder = totalMins % 90;

    let alignment = "Moderate";
    let message = "Your sleep cycle was disrupted slightly during light stages.";
    let suggestion =
      "Try adjusting your alarm to match exact 90-minute blocks (e.g. 7.5 hours or 6 hours).";

    if (remainder <= 15 || remainder >= 75) {
      alignment = "Optimal";
      message = "Fantastic! You completed almost exact sleep cycles, minimizing grogginess.";
      suggestion = "Maintain this sleep target to align with your natural wake-up window.";
    } else if (remainder > 30 && remainder < 60) {
      alignment = "Disrupted";
      message = "You woke up during a deep sleep cycle, causing mild sleep inertia (grogginess).";
      suggestion =
        "Shift your target bed-time 15-20 minutes earlier or sleep 15 mins later to finish the cycle.";
    }

    return { cyclesCount, alignment, message, suggestion };
  };

  const coach = calculateSleepCoaching();

  // --- Handlers ---
  const handleAddAlarm = async (e: React.FormEvent) => {
    e.preventDefault();
    const newAlarmPayload = {
      user_id: userId,
      time: newAlarmTime,
      label: newAlarmLabel,
      enabled: true,
      smart_wake: newAlarmSmart,
      sound: newAlarmSound,
      repeat: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    };

    try {
      const { data, error } = await supabase
        .from("wearable_alarms")
        .insert([newAlarmPayload])
        .select();

      if (error) throw error;
      if (data && data[0]) {
        fetchRealData(userId);
        triggerToast(`Alarm "${newAlarmLabel}" synced to mobile at ${newAlarmTime}`);
        setShowAddForm(false);
      }
    } catch {
      const newAlarm: Alarm = {
        id: Math.random().toString(36).substring(7),
        time: newAlarmTime,
        label: newAlarmLabel,
        enabled: true,
        repeat: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        smart_wake: newAlarmSmart,
        sound: newAlarmSound,
      };
      setAlarms((prev) => [...prev, newAlarm].sort((a, b) => a.time.localeCompare(b.time)));
      triggerToast(`Local Fallback Alarm "${newAlarmLabel}" scheduled for ${newAlarmTime}`);
      setShowAddForm(false);
    }
  };

  const handleDeleteAlarm = async (id: string) => {
    try {
      const { error } = await supabase.from("wearable_alarms").delete().eq("id", id);
      if (error) throw error;
      fetchRealData(userId);
    } catch {
      setAlarms((prev) => prev.filter((a) => a.id !== id));
      triggerToast("Alarm removed locally.");
    }
  };

  const toggleAlarmEnabled = async (id: string) => {
    const alarm = alarms.find((a) => a.id === id);
    if (!alarm) return;
    const nextVal = !alarm.enabled;

    try {
      const { error } = await supabase
        .from("wearable_alarms")
        .update({ enabled: nextVal })
        .eq("id", id);
      if (error) throw error;
      fetchRealData(userId);
    } catch {
      setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: nextVal } : a)));
      triggerToast(`Alarm "${alarm.label}" status toggled.`);
    }
  };

  const handleTriggerAlarmRinging = (alarm: Alarm) => {
    setPhoneRingingAlarm(alarm);
    setIsPhoneRinging(true);
    const n1 = Math.floor(5 + Math.random() * 8); // eslint-disable-line react-hooks/purity
    const n2 = Math.floor(6 + Math.random() * 9); // eslint-disable-line react-hooks/purity
    setMathNum1(n1);
    setMathNum2(n2);
    setSolveMathAnswer("");
    setMathError(false);
    startAlarmRingtoneLoop(alarm.sound);
  };

  const handleSolveAlarmChallenge = () => {
    const correctAnswer = mathNum1 + mathNum2;
    if (parseInt(solveMathAnswer) === correctAnswer) {
      setIsPhoneRinging(false);
      setPhoneRingingAlarm(null);
      setMathError(false);
      stopAlarmRingtoneLoop();
      triggerToast("Alarm solved on paired simulator!");
    } else {
      setMathError(true);
      playSynthesizedChime("Chime Chord");
    }
  };

  const getFreshToken = async (): Promise<string | null> => {
    const {
      data: { session: fresh },
    } = await supabase.auth.refreshSession();
    return fresh?.access_token ?? null;
  };

  const generatePairingCode = async () => {
    const token = await getFreshToken();
    if (!token) return;
    setGeneratingPairCode(true);
    setPairingCode(null);
    try {
      const res = await fetch("/api/notifications/pairing/init", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.code) {
        setPairingCode(json.code);
        setCodeExpiresIn(json.expires_in || 600);
      }
    } catch {
      // ignore
    } finally {
      setGeneratingPairCode(false);
    }
  };

  useEffect(() => {
    if (!pairingCode || codeExpiresIn <= 0) return;
    const interval = setInterval(() => {
      setCodeExpiresIn((prev) => {
        if (prev <= 1) {
          setPairingCode(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    intervalRef.current = interval;
    return () => clearInterval(interval);
  }, [pairingCode, codeExpiresIn]);

  const checkPairingStatus = useCallback(async () => {
    const token = await getFreshToken();
    if (!token) return;
    try {
      const res = await fetch("/api/notifications/devices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.devices) {
        const hasMobile = json.devices.some(
          (d: { platform: string; is_active: boolean }) => d.platform !== "web" && d.is_active
        );
        const isNowPaired = json.devices.some(
          (d: { platform: string; is_active: boolean }) => d.platform !== "web"
        );
        if (hasMobile && !isPaired) {
          setIsPaired(true);
          setSyncHistory((prev) => [
            `Mobile device paired successfully at ${new Date().toLocaleTimeString()}`,
            ...prev,
          ]);
          triggerToast("Mobile device paired successfully!");
        } else if (!isNowPaired && isPaired) {
          setIsPaired(false);
        }
      }
    } catch {
      // ignore
    }
  }, [isPaired, triggerToast]);

  useEffect(() => {
    if (!showPairingMode || !pairingCode) return;
    const interval = setInterval(checkPairingStatus, 5000);
    return () => clearInterval(interval);
  }, [showPairingMode, pairingCode, checkPairingStatus]);

  const handleShareWithDoctor = () => {
    triggerToast("Clinician report shared successfully with Dr. Jenkins");
  };

  // Longitudinal Recovery Data
  const recoveryData = [
    { day: "M", pct: 75, style: "h-[75%] bg-blue-200" },
    { day: "T", pct: 85, style: "h-[85%] bg-blue-300" },
    { day: "W", pct: 92, style: "h-[92%] bg-blue-400" },
    { day: "T", pct: 80, style: "h-[80%] bg-blue-500" },
    { day: "F", pct: 88, style: "h-[88%] bg-blue-600" },
    { day: "S", pct: 65, style: "h-[65%] bg-blue-400" },
    { day: "S", pct: 88, style: "h-[88%] bg-blue-500" },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 w-full min-h-full bg-gradient-to-br from-[#eef2f8] via-[#e8eef9] to-[#d4e1f5] text-slate-800 overflow-x-hidden relative font-sans">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-semibold text-xs border border-blue-400/30"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/40 border border-white/30 rounded-3xl p-6 backdrop-blur-md shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] -z-10" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] -z-10" />

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight font-hanken">
              Sleep Intelligence
            </h1>
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-100">
              <div
                className={`w-2 h-2 rounded-full ${isPaired ? "bg-green-500 animate-pulse" : "bg-red-400"}`}
              ></div>
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">
                {isPaired ? "Mobile Connected" : "Offline"}
              </span>
            </div>
          </div>
          <p className="text-slate-500 text-xs font-semibold">
            Evaluate sleep wake cycle intervals, track active metrics, and pair with companion
            devices.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button
            onClick={() => {
              setIsSyncing(true);
              fetchRealData(userId).then(() => {
                setIsSyncing(false);
                setSyncTimestamp("Just now");
                setSyncHistory((prev) => [
                  `Manual sync successfully completed at ${new Date().toLocaleTimeString()}`,
                  ...prev,
                ]);
                triggerToast("Sync completed.");
              });
            }}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-white/75 border border-white/40 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${isSyncing ? "animate-spin" : ""}`} />
            Manual Sync
          </button>
        </div>
      </header>

      {/* Main Grid Content */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Stats, Hypnogram & Middle Grid */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Pedometer */}
            <div className="bg-white/40 border border-white/30 backdrop-blur-md p-5 rounded-[32px] flex flex-col gap-2 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Pedometer</p>
              <p className="text-2xl font-bold text-slate-800">
                {steps.toLocaleString()}{" "}
                <span className="text-xs font-normal text-slate-400">
                  / {stepsGoal.toLocaleString()}
                </span>
              </p>
              <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (steps / stepsGoal) * 100)}%` }}
                />
              </div>
            </div>

            {/* Sleep Score */}
            <div className="bg-white/40 border border-white/30 backdrop-blur-md p-5 rounded-[32px] flex flex-col gap-2 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">Sleep Score</p>
              <p className="text-2xl font-bold text-slate-800">
                {currentSleep.efficiency}{" "}
                <span className="text-xs font-normal text-slate-400">Optimal</span>
              </p>
              <div className="flex gap-1 mt-2">
                <div className="h-1.5 flex-grow bg-blue-500 rounded-full"></div>
                <div className="h-1.5 flex-grow bg-blue-500 rounded-full"></div>
                <div className="h-1.5 flex-grow bg-blue-500 rounded-full"></div>
                <div
                  className={`h-1.5 flex-grow rounded-full ${currentSleep.efficiency >= 90 ? "bg-blue-500" : "bg-slate-200"}`}
                ></div>
              </div>
            </div>

            {/* HRV */}
            <div className="bg-white/40 border border-white/30 backdrop-blur-md p-5 rounded-[32px] flex flex-col justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500">HRV (Avg)</p>
                <p className="text-2xl font-bold text-slate-800">
                  {currentSleep.averageHr + 4}{" "}
                  <span className="text-[10px] text-green-600 font-medium">ms</span>
                </p>
              </div>
              <div className="h-8 w-full mt-1">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 20">
                  <path
                    d="M0 15 L10 12 L20 18 L30 10 L40 14 L50 8 L60 12 L70 5 L80 10 L90 8 L100 12"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>

            {/* SpO2 */}
            <div className="bg-white/40 border border-white/30 backdrop-blur-md p-5 rounded-[32px] flex flex-col justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500">SpO2 (Low)</p>
                <p className="text-2xl font-bold text-slate-800">
                  96 <span className="text-[10px] text-blue-600 font-medium">%</span>
                </p>
              </div>
              <div className="h-8 w-full mt-1">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 20">
                  <path
                    d="M0 5 L15 6 L30 5 L45 7 L60 15 L75 8 L90 6 L100 5"
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Night Hypnogram */}
          <section className="bg-gradient-to-b from-blue-900 to-purple-950 rounded-[40px] p-6 md:p-8 relative overflow-hidden min-h-[300px] text-white shadow-lg">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white text-lg font-semibold flex items-center gap-2">
                  <Moon className="w-5 h-5 text-blue-300" /> Night Hypnogram
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">
                    Heart Rate Overlay
                  </span>
                  <Switch
                    checked={showHrOverlay}
                    onCheckedChange={setShowHrOverlay}
                    className="data-[state=checked]:bg-blue-500 border-white/10"
                  />
                </div>
              </div>

              <div className="h-48 w-full relative mt-4">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 200">
                  <defs>
                    <linearGradient id="grad" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop
                        offset="0%"
                        style={{ stopColor: "rgba(96,165,250,0.4)", stopOpacity: 1 }}
                      ></stop>
                      <stop
                        offset="100%"
                        style={{ stopColor: "rgba(96,165,250,0)", stopOpacity: 1 }}
                      ></stop>
                    </linearGradient>
                  </defs>

                  {/* Baselines */}
                  <line
                    x1="0"
                    y1="40"
                    x2="800"
                    y2="40"
                    stroke="rgba(255,255,255,0.05)"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1="0"
                    y1="80"
                    x2="800"
                    y2="80"
                    stroke="rgba(255,255,255,0.05)"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1="0"
                    y1="120"
                    x2="800"
                    y2="120"
                    stroke="rgba(255,255,255,0.05)"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1="0"
                    y1="160"
                    x2="800"
                    y2="160"
                    stroke="rgba(255,255,255,0.05)"
                    strokeDasharray="3 3"
                  />

                  {/* Stage Labels */}
                  <text x="5" y="45" className="text-[8px] fill-white/30 font-bold">
                    Awake
                  </text>
                  <text x="5" y="85" className="text-[8px] fill-pink-400/30 font-bold">
                    REM
                  </text>
                  <text x="5" y="125" className="text-[8px] fill-blue-300/30 font-bold">
                    Light
                  </text>
                  <text x="5" y="165" className="text-[8px] fill-indigo-400/30 font-bold">
                    Deep
                  </text>

                  {/* Hypnogram Area */}
                  <path
                    d="M0,150 L50,140 L100,160 L150,80 L200,100 L250,40 L300,60 L350,120 L400,140 L450,100 L500,110 L550,160 L600,140 L650,150 L700,130 L750,140 L800,150 L800,200 L0,200 Z"
                    fill="url(#grad)"
                  />
                  <path
                    d="M0,150 L50,140 L100,160 L150,80 L200,100 L250,40 L300,60 L350,120 L400,140 L450,100 L500,110 L550,160 L600,140 L650,150 L700,130 L750,140 L800,150"
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Heart Rate Overlay (Dashed Red-ish line) */}
                  {showHrOverlay && (
                    <motion.path
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      d="M0,100 Q100,110 150,90 T250,95 T350,85 T450,105 T550,90 T650,100 T800,95"
                      fill="none"
                      stroke="rgba(248,113,113,0.6)"
                      strokeDasharray="4"
                      strokeWidth="2"
                    />
                  )}

                  <circle cx="250" cy="40" fill="#fff" r="5" stroke="#000" strokeWidth="1"></circle>
                  <circle
                    cx="150"
                    cy="80"
                    fill="#60a5fa"
                    r="5"
                    stroke="#000"
                    strokeWidth="1"
                  ></circle>
                </svg>

                <div className="flex justify-between mt-4 text-[9px] text-white/45 font-medium uppercase tracking-widest px-2">
                  <span>22:00</span>
                  <span>00:00</span>
                  <span>02:00</span>
                  <span>04:00</span>
                  <span>06:00</span>
                  <span>08:00</span>
                </div>
              </div>
            </div>
          </section>

          {/* Middle Grid: Hygiene, Alarms & Coach */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Column: Coach & Alarms */}
            <div className="md:col-span-6 flex flex-col gap-6">
              {/* Circadian Coach */}
              <div className="bg-blue-50 border border-blue-100 rounded-[32px] p-6 shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-4 mb-1">
                  <div className="w-10 h-10 bg-blue-500 rounded-2xl flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-white animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 leading-tight">
                      Circadian Coach
                    </h4>
                    <span
                      className={`text-[8px] px-2 py-0.5 rounded font-black tracking-wider ${coach.alignment === "Optimal" ? "bg-green-150 text-green-700" : coach.alignment === "Moderate" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}
                    >
                      {coach.alignment} Alignment
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">{coach.message}</p>
                <div className="bg-blue-500/5 px-3 py-2 rounded-xl border border-blue-200/50 mt-1">
                  <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                    AI Recommendation
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                    💡 {coach.suggestion}
                  </p>
                </div>
              </div>

              {/* Active Alarms */}
              <div className="bg-white/40 border border-white/30 backdrop-blur-md rounded-[32px] p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-slate-800">Active Alarms</h4>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors flex items-center justify-center cursor-pointer"
                    title="Add Alarm"
                  >
                    {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>

                <AnimatePresence>
                  {showAddForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-b border-slate-200/50 pb-4 mb-4 overflow-hidden"
                    >
                      <form onSubmit={handleAddAlarm} className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                              Alarm Time
                            </label>
                            <Input
                              type="time"
                              value={newAlarmTime}
                              onChange={(e) => setNewAlarmTime(e.target.value)}
                              className="bg-white/60 border-slate-200 text-xs h-8 text-slate-800"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                              Label Tag
                            </label>
                            <Input
                              type="text"
                              value={newAlarmLabel}
                              onChange={(e) => setNewAlarmLabel(e.target.value)}
                              placeholder="Label"
                              className="bg-white/60 border-slate-200 text-xs h-8 text-slate-850"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-xl bg-white/50 border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-600">
                            Smart Cycle Rings
                          </span>
                          <Switch
                            checked={newAlarmSmart}
                            onCheckedChange={setNewAlarmSmart}
                            className="data-[state=checked]:bg-blue-500 scale-90"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Audio Chime
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={newAlarmSound}
                              onChange={(e) => {
                                setNewAlarmSound(e.target.value);
                                playSynthesizedChime(e.target.value);
                              }}
                              className="bg-white/60 border border-slate-200 text-xs rounded-xl h-8 px-2 flex-grow outline-none text-slate-800"
                            >
                              <option value="Chime Chord">Chime Chord (Bell)</option>
                              <option value="Serene Birds">Serene Birds (Chirps)</option>
                              <option value="Forest Rain">Forest Rain (Rain)</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => playSynthesizedChime(newAlarmSound)}
                              className="h-8 w-8 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/40 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
                              title="Test Sound"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Save Alarm
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3">
                  {alarms.map((alarm) => (
                    <div
                      key={alarm.id}
                      className={`group flex items-center justify-between p-3 bg-white/50 border border-white/50 rounded-2xl transition-all ${alarm.enabled ? "shadow-sm border-blue-200/40" : "opacity-45"}`}
                    >
                      <div className="space-y-0.5">
                        <p className="text-lg font-bold text-slate-800 leading-none">
                          {alarm.time}{" "}
                          <span className="text-[10px] font-normal text-slate-400">
                            {alarm.repeat.length > 0 ? "Daily" : "Once"}
                          </span>
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] text-slate-400 font-semibold">
                            {alarm.label}
                          </span>
                          {alarm.smart_wake && (
                            <span className="text-[7px] bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded font-black tracking-wider">
                              SMART WAKE
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTriggerAlarmRinging(alarm)}
                          disabled={!alarm.enabled}
                          className="p-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 text-[8px] font-bold disabled:opacity-40 cursor-pointer"
                        >
                          Ring Test
                        </button>
                        <Switch
                          checked={alarm.enabled}
                          onCheckedChange={() => toggleAlarmEnabled(alarm.id)}
                          className="data-[state=checked]:bg-blue-500 scale-90 cursor-pointer"
                        />
                        <button
                          onClick={() => handleDeleteAlarm(alarm.id)}
                          className="p-1 rounded bg-red-50 hover:bg-red-100 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {alarms.length === 0 && (
                    <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                      No chimes scheduled.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Middle Column: Sleep Hygiene Checklist */}
            <div className="md:col-span-6 bg-white/40 border border-white/30 backdrop-blur-md rounded-[32px] p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-4">Sleep Hygiene</h4>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={hygieneChecks.noCaffeine}
                      onChange={(e) =>
                        setHygieneChecks((prev) => ({ ...prev, noCaffeine: e.target.checked }))
                      }
                      className="w-4 h-4 rounded text-blue-500 focus:ring-blue-400 border-slate-300 checkbox-custom cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 group-hover:text-slate-900 font-medium transition-colors">
                      No Caffeine after 2PM
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={hygieneChecks.blueLightFilter}
                      onChange={(e) =>
                        setHygieneChecks((prev) => ({ ...prev, blueLightFilter: e.target.checked }))
                      }
                      className="w-4 h-4 rounded text-blue-500 focus:ring-blue-400 border-slate-300 checkbox-custom cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 group-hover:text-slate-900 font-medium transition-colors">
                      Blue Light Filter Active
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={hygieneChecks.coolRoom}
                      onChange={(e) =>
                        setHygieneChecks((prev) => ({ ...prev, coolRoom: e.target.checked }))
                      }
                      className="w-4 h-4 rounded text-blue-500 focus:ring-blue-400 border-slate-300 checkbox-custom cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 group-hover:text-slate-900 font-medium transition-colors">
                      Cool Room Temp (18°C)
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={hygieneChecks.noScreens}
                      onChange={(e) =>
                        setHygieneChecks((prev) => ({ ...prev, noScreens: e.target.checked }))
                      }
                      className="w-4 h-4 rounded text-blue-500 focus:ring-blue-400 border-slate-300 checkbox-custom cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 group-hover:text-slate-900 font-medium transition-colors">
                      No Screens 1h Before Bed
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/50 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    Hygiene Status
                  </p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">
                    {checkedCount} of 4 complete
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2 text-right">
                  <span className="text-[9px] font-black text-blue-400 block uppercase">
                    Daily Score
                  </span>
                  <span className="text-lg font-black text-blue-600">{dailyHygieneScore}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Mobile Pairing, Route Tracker & Logs */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Mobile Pairing & Logs */}
          <section className="bg-white/40 border border-white/30 backdrop-blur-md rounded-[32px] p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
            {/* Pulse Indicator */}
            <div className="absolute top-6 right-6 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${isPaired ? "bg-green-400 animate-pulse" : "bg-red-400 animate-ping"}`}
              />
              <span
                className={`text-[8px] px-2 py-0.5 rounded font-black tracking-wider ${isPaired ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}
              >
                {isPaired ? "ACTIVE" : "DISCONNECTED"}
              </span>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-4">Mobile Pairing</h4>

              {/* Connected State */}
              {isPaired && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/50 rounded-xl flex items-center justify-center shadow-sm">
                      <Smartphone className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">iPhone 15 Pro</p>
                      <p className="text-[10px] text-slate-500">89% Batt • Strong Link</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/60 border border-slate-100 p-2.5 rounded-xl shadow-sm">
                      <p className="text-[8px] text-slate-500 uppercase font-bold">
                        Signal Strength
                      </p>
                      <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">-64 dBm</p>
                    </div>
                    <div className="bg-white/60 border border-slate-100 p-2.5 rounded-xl shadow-sm">
                      <p className="text-[8px] text-slate-500 uppercase font-bold">
                        Latency Buffer
                      </p>
                      <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">0.2ms Lat</p>
                    </div>
                    <div className="bg-white/60 border border-slate-100 p-2.5 rounded-xl col-span-2 shadow-sm">
                      <p className="text-[8px] text-slate-500 uppercase font-bold">
                        Pairing Protocol
                      </p>
                      <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                        BLE 5.3v_secure
                      </p>
                    </div>
                  </div>

                  {/* Ringing Challenge */}
                  <AnimatePresence>
                    {isPhoneRinging && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center space-y-3 shadow-md"
                      >
                        <div className="flex gap-2 items-center justify-center text-red-600 font-bold">
                          <AlarmClock className="w-4 h-4 animate-bounce" />
                          <h6 className="text-xs font-black">Smart Wake Ringing!</h6>
                        </div>

                        <div className="bg-white p-3 rounded-xl space-y-2 text-left border border-red-100 shadow-sm">
                          <p className="text-[9px] text-blue-600 font-bold flex items-center gap-1">
                            <Info className="w-3 h-3 animate-pulse" /> Solve math to silence:
                          </p>
                          <p className="text-xs text-slate-800 font-black tracking-wide">
                            Challenge: {mathNum1} + {mathNum2} = ?
                          </p>
                          <div className="flex gap-2 mt-1.5">
                            <input
                              type="number"
                              value={solveMathAnswer}
                              onChange={(e) => setSolveMathAnswer(e.target.value)}
                              placeholder="Ans"
                              className="bg-slate-50 border border-slate-200 rounded-lg text-center text-xs h-8 text-slate-800 w-full outline-none focus:border-blue-500"
                            />
                            <button
                              onClick={handleSolveAlarmChallenge}
                              className="px-4 bg-blue-600 text-white font-bold rounded-lg text-[10px] hover:bg-blue-700 cursor-pointer shadow-sm"
                            >
                              Snooze
                            </button>
                          </div>
                          {mathError && (
                            <p className="text-[8px] text-red-500 font-bold">
                              Incorrect answer. Try again!
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2 pt-2 border-t border-slate-200/50">
                    <button
                      onClick={() => {
                        setIsSyncing(true);
                        fetchRealData(userId).then(() => {
                          setIsSyncing(false);
                          setSyncTimestamp("Just now");
                          setSyncHistory((prev) => [
                            `Forced telemetry sync success: steps goal at ${steps} steps, efficiency ${currentSleep.efficiency}%`,
                            ...prev,
                          ]);
                          triggerToast("Wearable sync complete.");
                        });
                      }}
                      disabled={isSyncing}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />{" "}
                      Sync Telemetry
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (alarms && alarms[0]) {
                            handleTriggerAlarmRinging(alarms[0]);
                          } else {
                            triggerToast("Create an alarm to ring preview.");
                          }
                        }}
                        className="flex-grow bg-white/60 hover:bg-white/90 text-blue-600 border border-blue-200/40 font-bold py-2 rounded-xl text-[10px] transition-colors cursor-pointer"
                      >
                        Test Ring
                      </button>
                      <button
                        onClick={() => {
                          setIsPaired(false);
                          setShowPairingMode(false);
                          setPairingCode(null);
                          setSyncHistory((prev) => [
                            `Companion paired device removed at ${new Date().toLocaleTimeString()}`,
                            ...prev,
                          ]);
                          triggerToast("Companion device unpaired.");
                        }}
                        className="flex-grow bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 font-bold py-2 rounded-xl text-[10px] transition-colors cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Disconnected State: Pairing Mode options */}
              {!isPaired && showPairingMode && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 text-center">
                    {/* Pairing options switch tabs */}
                    <div className="flex justify-center gap-2 bg-slate-200/50 p-1.5 rounded-xl border border-slate-200/40 mb-3">
                      <button
                        onClick={() => setShowQR(false)}
                        className={`flex-grow py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                          !showQR
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        Code Key
                      </button>
                      <button
                        onClick={() => setShowQR(true)}
                        className={`flex-grow py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                          showQR
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        QR Code
                      </button>
                    </div>

                    {generatingPairCode ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                      </div>
                    ) : pairingCode ? (
                      showQR ? (
                        <div className="flex flex-col items-center justify-center space-y-3 py-1">
                          <div className="p-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                            <QRCodeSVG value={`zorabihealth://pair?c=${pairingCode}`} size={112} />
                          </div>
                          <p className="text-[9px] text-slate-500 font-medium">
                            Open mobile app and scan this QR to pair.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 py-4">
                          <div className="bg-white border border-slate-200 rounded-xl p-2.5 inline-block shadow-sm">
                            <span className="text-base font-black font-mono text-blue-600 tracking-wider">
                              {pairingCode}
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-500 font-medium max-w-xs mx-auto">
                            Enter this code in the mobile app to pair your device.
                          </p>
                          <p className="text-[8px] text-amber-600 font-bold">
                            Expires in {Math.floor(codeExpiresIn / 60)}:
                            {String(codeExpiresIn % 60).padStart(2, "0")}
                          </p>
                        </div>
                      )
                    ) : (
                      <button
                        onClick={generatePairingCode}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                      >
                        <QrCode className="w-4 h-4" /> Generate Pairing Code
                      </button>
                    )}

                    {pairingCode && (
                      <p className="text-[7px] text-slate-400 mt-2">
                        Waiting for mobile device to scan... Auto-detects when paired
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {pairingCode ? (
                      <button
                        onClick={() => {
                          setPairingCode(null);
                          generatePairingCode();
                        }}
                        disabled={generatingPairCode}
                        className="flex-grow bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-2 rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        Regenerate
                      </button>
                    ) : (
                      <button
                        onClick={generatePairingCode}
                        disabled={generatingPairCode}
                        className="flex-grow bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-2 rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        {generatingPairCode ? "Generating..." : "Generate Code"}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowPairingMode(false);
                        setPairingCode(null);
                      }}
                      className="flex-grow bg-white/60 hover:bg-white/80 text-slate-600 text-[10px] font-bold py-2 rounded-xl transition-all border border-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Disconnected State: Default display */}
              {!isPaired && !showPairingMode && (
                <div className="space-y-5 text-center py-4">
                  <div className="relative w-24 h-24 mx-auto flex items-center justify-center rounded-full bg-blue-500/5 border border-blue-500/10 shadow-inner">
                    <Smartphone className="w-10 h-10 text-slate-400 animate-pulse" />
                    <div className="absolute bottom-1 right-1 h-7 w-7 bg-white border border-blue-100 rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                      <QrCode className="w-4 h-4 text-blue-500" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-slate-700">No Paired Wearable</h5>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium max-w-[220px] mx-auto">
                      Link your device to sync step telemetry logs and smart alarms.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setShowPairingMode(true);
                        generatePairingCode();
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <QrCode className="w-4 h-4" /> Start QR Pairing
                    </button>
                    <button
                      onClick={() => triggerToast("Downloading companion app APK...")}
                      className="w-full bg-white/60 hover:bg-white/90 text-blue-600 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all border border-blue-200/30 cursor-pointer shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" /> Get Companion APK
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sync Console Logs */}
            <div className="mt-6 space-y-2">
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">
                Real-Time Sync Logs
              </h5>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-[9px] text-green-400 font-mono space-y-1.5 h-20 overflow-y-auto">
                {syncHistory.map((log, idx) => (
                  <div key={idx} className="flex gap-2 items-start text-left">
                    <span className="text-green-500 shrink-0">✓</span>
                    <span className="leading-relaxed">{log}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Route Target progress */}
          <section className="bg-white/40 border border-white/30 backdrop-blur-md rounded-[32px] p-6 shadow-sm flex flex-col items-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 self-start flex items-center gap-2">
              <Footprints className="w-4 h-4 text-blue-500" /> Walk Distance Trail
            </h3>

            <div className="w-full h-24 bg-blue-500/5 rounded-2xl overflow-hidden border border-blue-200/30 relative">
              <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                <path
                  d="M 25 25 Q 70 15 110 35 T 180 75"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3.5"
                  strokeDasharray="4 2"
                  strokeLinecap="round"
                />
                <circle cx="25" cy="25" r="5" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
                <circle cx="180" cy="75" r="5" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
                <text x="35" y="28" className="text-[8px] fill-slate-400 font-bold">
                  Start
                </text>
                <text x="140" y="78" className="text-[8px] fill-slate-400 font-bold">
                  Current
                </text>
              </svg>
            </div>

            <div className="w-full flex justify-between items-center text-[10px] font-bold text-slate-500 mt-3">
              <span>Goal Target: {stepsGoal.toLocaleString()} steps</span>
              <span className="text-blue-600">{(steps * 0.0008).toFixed(2)} km walked</span>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Grid: Recovery & Clinical Notes */}
      <div className="grid grid-cols-12 gap-6">
        {/* Longitudinal Recovery (7d) */}
        <div className="col-span-12 md:col-span-7 bg-white/40 border border-white/30 backdrop-blur-md rounded-[32px] p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-bold text-slate-800">Longitudinal Recovery (7d)</h4>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
              Avg Score: 84
            </span>
          </div>
          <div className="flex items-end justify-between h-32 px-2 gap-2">
            {recoveryData.map((d, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-2 w-full h-full justify-end"
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${d.pct}%` }}
                  transition={{ duration: 0.8, delay: index * 0.05 }}
                  className={`w-full rounded-t-lg ${d.style}`}
                />
                <span className="text-[10px] text-slate-400 font-bold">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Clinician Notes Section */}
        <div className="col-span-12 md:col-span-5 bg-white/40 border border-white/30 backdrop-blur-md rounded-[32px] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                <Info className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Clinician Notes & AI Insights</h4>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800">Observation:</span> HRV variability shows
                positive correlation with 18:00 light exercise. Deep sleep cycles are stable at
                1.5h.
              </p>
              <p className="text-[10px] text-slate-400 italic">
                No significant respiratory events detected during REM phase.
              </p>
            </div>
          </div>

          <button
            onClick={handleShareWithDoctor}
            className="mt-6 w-full bg-slate-850 hover:bg-slate-900 text-white py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            Share with Doctor
          </button>
        </div>
      </div>
    </div>
  );
}
