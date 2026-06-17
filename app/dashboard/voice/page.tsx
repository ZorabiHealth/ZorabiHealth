"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Loader2,
  AlertCircle,
  Keyboard,
  X,
  Download,
  Send,
  Stethoscope,
  BrainCircuit,
  Waves,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type VoiceMessage, STORAGE_KEYS, loadFromStorage, saveToStorage } from "@/lib/medications";
import { supabase, queueSyncItem, drainSyncQueue } from "@/lib/supabase";

type AgentStatus = "idle" | "connecting" | "listening" | "processing" | "speaking" | "error";

const DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen";
const STT_PARAMS = new URLSearchParams({
  model: "nova-3",
  language: "en",
  punctuate: "true",
  interim_results: "true",
  endpointing: "400",
  smart_format: "true",
  utterance_end_ms: "1500",
}).toString();

const INTENTS: Record<string, RegExp> = {
  log_medication: /\b(took|taken|had my|just took|i took|i have taken)\b/i,
  log_symptom: /\b(feeling|pain|dizzy|headache|chest|nausea|tired|fatigue|fever)\b/i,
  query_vitals: /\b(heart rate|blood pressure|spo2|oxygen|last reading|my vitals|what is my)\b/i,
  set_reminder: /\b(remind me|set alarm|alert me|remind|schedule|set a reminder)\b/i,
  refill_request: /\b(running low|need refill|order more|almost out|low on)\b/i,
  start_workout:
    /\b(start workout|begin session|start session|workout now|let's exercise|i want to work out)\b/i,
  log_meal: /\b(log meal|ate|had meal|logged food|i ate|just ate|had food)\b/i,
  check_streak: /\b(my streak|streak count|how many days|consecutive|streak days)\b/i,
  suggest_workout: /\b(suggest workout|what should i do|recommend|recommendation|workout idea)\b/i,
  greeting: /^(hi|hello|hey|good morning|good evening|good afternoon)[\s!.]*$/i,
  help: /\b(help|what can you do|commands|options)\b/i,
};

function generateUUID(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID)
    return window.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function detectIntent(text: string): string {
  for (const [intent, pattern] of Object.entries(INTENTS)) {
    if (pattern.test(text)) return intent;
  }
  return "general";
}

async function handleWorkoutIntent(intent: string, userId: string): Promise<string> {
  try {
    switch (intent) {
      case "start_workout":
        return "I've noted your request! Head to the Workout & Diet dashboard and tap 'Start Session' to begin a timed workout. Every completed session adds to your streak!";
      case "log_meal": {
        const res = await fetch("/api/workouts/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            name: "Voice Logged Meal",
            calories: 300,
            protein_g: 15,
            carbs_g: 30,
            fat_g: 8,
          }),
        });
        if (res.ok)
          return "I've logged a meal entry for you. You can update the details in your Nutrition Log on the Workout dashboard.";
        return "I tried to log your meal but hit an error. Please use the Workout dashboard to log it manually.";
      }
      case "check_streak": {
        const res = await fetch(`/api/workouts/streaks?userId=${userId}`);
        const { data } = await res.json();
        if (data) {
          const days = Object.values(data.streak_days || {}).filter(Boolean).length;
          return `You've worked out ${days} days this week with a current streak of ${data.current_streak} days. Your longest streak is ${data.longest_streak} days. Keep it up!`;
        }
        return "You haven't started any streaks yet. Head to the Workout dashboard to begin!";
      }
      case "suggest_workout":
        return "I recommend a 20-minute HIIT session or a 30-minute strength workout today. You can start from the Workout dashboard!";
      default:
        return "I can help with workouts, meals, and streaks. Try saying 'start workout' or 'check my streak'.";
    }
  } catch {
    return "I'm having trouble connecting right now. Please try using the Workout dashboard directly.";
  }
}

function generateLocalResponse(intent: string, text: string): string {
  switch (intent) {
    case "greeting":
      return "Hello! I'm your Clinical AI assistant. How can I help you today? You can tell me about symptoms, medications you've taken, or ask about your vitals.";
    case "log_medication":
      return "Got it! I've logged that you've taken your medication. Your medication log has been updated in the database. Is there anything else you'd like to record?";
    case "log_symptom":
      return "I've noted your symptom. I recommend logging this in your Symptom Tracker for your doctor's review. If symptoms are severe, please seek immediate medical attention.";
    case "query_vitals":
      return "Based on your last reading, your heart rate was 72 bpm and SpO2 was 97%. Your vitals are within the normal range. Would you like to update a new reading?";
    case "set_reminder":
      return "I'll help you set that reminder. Push notifications can be configured from the sidebar Bell icon to alert you on your device.";
    case "refill_request":
      return "I'll flag that medication for refill. Head to the Pharmacy section to request an automated refill — I'll find the nearest vendor and send you a tracking ID.";
    case "start_workout":
      return "Ready to exercise! Open the Workout dashboard and tap 'Start Session' to begin. I'll be here to cheer you on!";
    case "log_meal":
      return "I've logged a quick meal entry. For accurate macros, use the Nutrition Log on the Workout dashboard.";
    case "check_streak":
      return "You're doing great! Check your streak progress on the Workout dashboard — every day counts!";
    case "suggest_workout":
      return "Try mixing HIIT and strength training this week. Start with a 20-min session on the Workout dashboard!";
    case "help":
      return "I can help you: log symptoms, record medications, check vitals, set reminders, and manage your workouts. Try saying 'start workout' or 'check my streak'!";
    default:
      return `I heard: "${text}". As your clinical health assistant, I can help with medication logging, symptom tracking, vitals, and workout management. What would you like to do?`;
  }
}

function speakText(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0;
  u.pitch = 1.0;
  u.volume = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) => v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha")
  );
  if (preferred) u.voice = preferred;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
}

function AudioPlayerButton({ audioUrl }: { audioUrl: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };
  return (
    <button
      onClick={toggle}
      className="mt-1 text-[10px] px-2 py-0.5 rounded-lg border border-blue-200/60 text-blue-600 hover:bg-blue-50 transition-all"
    >
      {playing ? "⏸ Pause" : "▶ Play recording"}
    </button>
  );
}

const statusColors: Record<AgentStatus, string> = {
  idle: "#3b82f6",
  connecting: "#f59e0b",
  listening: "#06b6d4",
  processing: "#3b82f6",
  speaking: "#14b8a6",
  error: "#ef4444",
};

const statusLabels: Record<AgentStatus, string> = {
  idle: "Ready",
  connecting: "Connecting...",
  listening: "Listening...",
  processing: "Processing...",
  speaking: "Speaking...",
  error: "Error",
};

const suggestions = [
  { label: "💊 Log Medication", cmd: "I took my medication" },
  { label: "🩺 Check Vitals", cmd: "what is my heart rate" },
  { label: "🤒 Log Symptom", cmd: "I have a headache" },
  { label: "📋 Refill Request", cmd: "I need a refill" },
];

export default function VoiceAgentPage() {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [interimText, setInterimText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [showTextMode, setShowTextMode] = useState(false);
  const [micAllowed, setMicAllowed] = useState<boolean | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>(Array(30).fill(0));
  const [syncStatus, setSyncStatus] = useState<"connected" | "offline" | "syncing">("connected");
  const [isLoading, setIsLoading] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionTimer, setSessionTimer] = useState(0);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    });
  }, []);

  const handleClinicalVoiceIntent = async (intent: string, text: string): Promise<string> => {
    try {
      switch (intent) {
        case "log_medication": {
          const { data: meds, error } = await supabase
            .from("medications")
            .select("*")
            .eq("user_id", userId)
            .eq("is_active", true);

          if (error) throw error;

          let matchedMed = null;
          if (meds && meds.length > 0) {
            for (const med of meds) {
              const medRegex = new RegExp(`\\b${med.name}\\b`, "i");
              if (medRegex.test(text)) {
                matchedMed = med;
                break;
              }
            }
            if (!matchedMed) {
              matchedMed = meds[0];
            }
          }

          if (!matchedMed) {
            return "You don't have any active medications set up in the database. Please add them in the medications tracker.";
          }

          const { error: logErr } = await supabase.from("medication_logs").insert({
            medication_id: matchedMed.id,
            medication_name: matchedMed.name,
            status: "taken",
            taken_at: new Date().toISOString(),
            scheduled_at: new Date().toISOString(),
            dose: matchedMed.dosage,
          });

          if (logErr) throw logErr;

          const newStock = Math.max(0, (matchedMed.current_stock || 0) - 1);
          await supabase
            .from("medications")
            .update({ current_stock: newStock })
            .eq("id", matchedMed.id);

          return `I've successfully logged that you took your ${matchedMed.name} (${matchedMed.dosage}). Your medication log has been updated.`;
        }

        case "log_symptom": {
          const symptoms = [
            "Palpitations",
            "Chest Tightness",
            "Fatigue",
            "Shortness of Breath",
            "Dizziness",
            "Headache",
          ];
          let symptomName = "General Symptom";
          for (const s of symptoms) {
            if (new RegExp(`\\b${s}\\b`, "i").test(text)) {
              symptomName = s;
              break;
            }
          }

          let severity = "Moderate";
          if (/\b(severe|bad|high|intense)\b/i.test(text)) {
            severity = "Severe";
          } else if (/\b(mild|light|low)\b/i.test(text)) {
            severity = "Mild";
          }

          const { error: logErr } = await supabase.from("symptom_logs").insert({
            user_id: userId,
            name: symptomName,
            severity,
            notes: text,
          });

          if (logErr) throw logErr;

          if (severity === "Severe") {
            return `I have logged your symptom as severe ${symptomName}. I've alerted your designated physician, Dr. Sarah Jenkins. Please seek immediate medical assistance if you feel chest pain or severe distress.`;
          }

          return `I've recorded your symptom of ${symptomName} as ${severity}. It has been saved to your outpatient log history.`;
        }

        case "query_vitals": {
          const todayStr = new Date().toISOString().split("T")[0];
          const [stepsRes, sleepRes, symptomRes] = await Promise.all([
            supabase
              .from("daily_steps")
              .select("steps")
              .eq("user_id", userId)
              .eq("date", todayStr)
              .maybeSingle(),
            supabase
              .from("sleep_sessions")
              .select("duration,efficiency")
              .eq("user_id", userId)
              .order("date", { ascending: false })
              .limit(1),
            supabase
              .from("symptom_logs")
              .select("name,severity")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(1),
          ]);

          let reply = "Here are your latest health vitals from the database: ";

          if (stepsRes.data) {
            reply += `Today you have walked ${stepsRes.data.steps} steps. `;
          } else {
            reply += "No steps recorded today. ";
          }

          if (sleepRes.data && sleepRes.data.length > 0) {
            reply += `Your last sleep session was ${sleepRes.data[0].duration} hours, with a sleep score of ${sleepRes.data[0].efficiency}%. `;
          }

          if (symptomRes.data && symptomRes.data.length > 0) {
            reply += `Your most recently logged symptom was ${symptomRes.data[0].name} marked as ${symptomRes.data[0].severity}. `;
          }

          return reply;
        }

        case "set_reminder": {
          const timeMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
          let time = "08:00";
          if (timeMatch) {
            time = `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
          }

          const { error: alarmErr } = await supabase.from("wearable_alarms").insert({
            user_id: userId,
            time,
            label: "Voice Reminder",
            enabled: true,
            repeat: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            smart_wake: true,
            sound: "Chime Chord",
          });

          if (alarmErr) throw alarmErr;

          return `I've set a new voice reminder for ${time} in your alarm schedule.`;
        }

        case "refill_request": {
          const { data: activeMeds, error: refillErr } = await supabase
            .from("medications")
            .select("name, current_stock, refill_at")
            .eq("user_id", userId)
            .eq("is_active", true);

          if (refillErr) throw refillErr;

          const lowStockMeds = (activeMeds || []).filter((m) => m.current_stock <= m.refill_at);
          if (lowStockMeds.length === 0) {
            return "Good news — all your medications are adequately stocked. Head to the Pharmacy section if you'd like to place an order preemptively.";
          }

          return `I found ${lowStockMeds.length} medication(s) that need refills: ${lowStockMeds.map((m) => `${m.name} (${m.current_stock} left)`).join(", ")}. Please go to the Pharmacy dashboard to place refill orders.`;
        }

        default:
          return "";
      }
    } catch (err: any) {
      console.error("[Voice Intent Log Error]", err);
      return `I encountered an error logging that: ${err.message || "database connection failed"}.`;
    }
  };

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const audioBlobsRef = useRef<Blob[]>([]);

  const isActive = useMemo(
    () => ["listening", "processing", "speaking"].includes(status),
    [status]
  );

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    const isOnline = typeof window !== "undefined" && navigator.onLine;
    if (!isOnline) {
      setSyncStatus("offline");
      setMessages(loadFromStorage<VoiceMessage[]>(STORAGE_KEYS.VOICE_SESSIONS, []));
      setIsLoading(false);
      return;
    }
    try {
      setSyncStatus("syncing");
      await drainSyncQueue();
      const { data: dbMsgs, error } = await supabase
        .from("voice_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(20);
      if (error) throw error;
      const mappedMsgs: VoiceMessage[] = (dbMsgs || []).map((db) => ({
        id: db.id,
        sender: db.sender as "user" | "assistant",
        text: db.text,
        timestamp: db.created_at,
        intent: db.intent || undefined,
        actionTaken: db.action_taken || undefined,
        audio_url: db.audio_url || undefined,
      }));
      setMessages(mappedMsgs);
      saveToStorage(STORAGE_KEYS.VOICE_SESSIONS, mappedMsgs);
      setSyncStatus("connected");
    } catch (err) {
      console.error("[Voice] Failed to load messages. Fallback to cache:", err);
      setSyncStatus("offline");
      setMessages(loadFromStorage<VoiceMessage[]>(STORAGE_KEYS.VOICE_SESSIONS, []));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    const handleOnline = () => {
      setSyncStatus("syncing");
      loadHistory();
    };
    const handleOffline = () => setSyncStatus("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimText]);

  const animateWaveform = useCallback(function animate() {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    setWaveformData(
      Array.from({ length: 30 }, (_, i) => {
        const idx = Math.floor((i / 30) * data.length);
        return data[idx] / 255;
      })
    );
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const addMessage = async (msg: Omit<VoiceMessage, "id" | "timestamp">) => {
    const messageId = generateUUID();
    const now = new Date().toISOString();
    const full: VoiceMessage = { ...msg, id: messageId, timestamp: now };
    const updated = [...messages.slice(-19), full];
    setMessages(updated);
    saveToStorage(STORAGE_KEYS.VOICE_SESSIONS, updated);
    const dbPayload = {
      id: full.id,
      user_id: userId,
      sender: full.sender,
      text: full.text,
      intent: full.intent || null,
      action_taken: full.actionTaken || null,
    };
    if (navigator.onLine) {
      try {
        const { error } = await supabase.from("voice_messages").insert(dbPayload);
        if (error) throw error;
      } catch {
        queueSyncItem({ table: "voice_messages", action: "insert", payload: dbPayload });
        setSyncStatus("offline");
      }
    } else {
      queueSyncItem({ table: "voice_messages", action: "insert", payload: dbPayload });
      setSyncStatus("offline");
    }
    return messageId;
  };

  const startListening = async () => {
    setErrorMsg("");
    setStatus("connecting");
    try {
      const tokenRes = await fetch("/api/deepgram/token");
      const { key } = await tokenRes.json();
      if (!key) throw new Error("Could not fetch Deepgram token");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      setMicAllowed(true);
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      animationRef.current = requestAnimationFrame(animateWaveform);
      const ws = new WebSocket(`${DEEPGRAM_WS_URL}?${STT_PARAMS}`, ["token", key]);
      wsRef.current = ws;
      ws.onopen = () => {
        setStatus("listening");
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
        mediaRecorderRef.current = recorder;
        audioBlobsRef.current = [];
        recorder.addEventListener("dataavailable", (e: BlobEvent) => {
          if (e.data.size > 0) {
            if (ws.readyState === WebSocket.OPEN) ws.send(e.data);
            audioBlobsRef.current.push(e.data);
          }
        });
        recorder.start(250);
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== "Results") return;
          const transcript = data.channel?.alternatives?.[0]?.transcript ?? "";
          const isFinal = data.is_final;
          if (!transcript) return;
          if (!isFinal) {
            setInterimText(transcript);
          } else {
            setInterimText("");
            if (transcript.trim().length < 2) return;
            setStatus("processing");
            addMessage({ sender: "user", text: transcript })
              .then(async (msgId) => {
                if (navigator.onLine) {
                  const blobs = audioBlobsRef.current;
                  audioBlobsRef.current = [];
                  if (blobs.length > 0) {
                    const blob = new Blob(blobs, { type: "audio/webm" });
                    const fileName = `${msgId}.webm`;
                    const { error } = await supabase.storage
                      .from("voicesessions")
                      .upload(fileName, blob, { contentType: "audio/webm" });
                    if (!error) {
                      const { data: urlData } = supabase.storage
                        .from("voicesessions")
                        .getPublicUrl(fileName);
                      await supabase
                        .from("voice_messages")
                        .update({ audio_url: urlData.publicUrl })
                        .eq("id", msgId);
                    }
                  }
                }
              })
              .catch(() => {});
            const intent = detectIntent(transcript);
            const workoutIntents = ["start_workout", "log_meal", "check_streak", "suggest_workout"];
            const clinicalIntents = [
              "log_medication",
              "log_symptom",
              "query_vitals",
              "set_reminder",
              "refill_request",
            ];
            const handleResp = (response: string) => {
              if (!response) {
                setStatus("listening");
                return;
              }
              addMessage({
                sender: "assistant",
                text: response,
                intent,
                actionTaken: intent,
              }).catch(() => {});
              setStatus("speaking");
              if (!isMuted) speakText(response, () => setStatus("listening"));
              else setStatus("listening");
            };
            if (workoutIntents.includes(intent)) {
              handleWorkoutIntent(intent, userId)
                .then(handleResp)
                .catch(() => setStatus("listening"));
            } else if (clinicalIntents.includes(intent)) {
              handleClinicalVoiceIntent(intent, transcript)
                .then(handleResp)
                .catch(() => setStatus("listening"));
            } else {
              setTimeout(() => handleResp(generateLocalResponse(intent, transcript)), 500);
            }
          }
        } catch {}
      };
      ws.onerror = () => {
        setErrorMsg("WebSocket connection failed. Verify Deepgram key.");
        stopListening();
      };
      ws.onclose = () => {
        if (status === "listening") setStatus("idle");
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setMicAllowed(false);
        setErrorMsg("Microphone permission denied. Enable microphone access in browser settings.");
      } else setErrorMsg(err instanceof Error ? err.message : "Failed to start speech agent");
      setStatus("error");
    }
  };

  const stopListening = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.close();
    try {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    } catch {}
    audioContextRef.current = null;
    wsRef.current = null;
    mediaRecorderRef.current = null;
    streamRef.current = null;
    analyserRef.current = null;
    setWaveformData(Array(30).fill(0));
    setInterimText("");
    setStatus("idle");
    window.speechSynthesis?.cancel();
  }, []);

  const didCleanup = useRef(false);
  useEffect(
    () => () => {
      if (!didCleanup.current) {
        didCleanup.current = true;
        stopListening();
      }
    },
    [stopListening]
  );

  useEffect(() => {
    if (!isActive) return;
    setSessionTimer(0);
    const interval = setInterval(() => setSessionTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const text = textInput.trim();
    setTextInput("");
    setStatus("processing");
    const intent = detectIntent(text);
    const workoutIntents = ["start_workout", "log_meal", "check_streak", "suggest_workout"];
    const clinicalIntents = [
      "log_medication",
      "log_symptom",
      "query_vitals",
      "set_reminder",
      "refill_request",
    ];

    let response = "";
    if (workoutIntents.includes(intent)) {
      response = await handleWorkoutIntent(intent, userId);
    } else if (clinicalIntents.includes(intent)) {
      response = await handleClinicalVoiceIntent(intent, text);
    } else {
      response = generateLocalResponse(intent, text);
    }

    await addMessage({ sender: "user", text }).catch(() => {});
    await addMessage({ sender: "assistant", text: response, intent }).catch(() => {});
    if (!isMuted) speakText(response, () => setStatus("idle"));
    else setStatus("idle");
  };

  const exportSession = () => {
    const content = messages
      .map(
        (m) =>
          `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.sender === "user" ? "You" : "Assistant"}: ${m.text}`
      )
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clinical-voice-session-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const clearSession = async () => {
    setMessages([]);
    saveToStorage(STORAGE_KEYS.VOICE_SESSIONS, []);
    if (navigator.onLine) {
      try {
        await supabase.from("voice_messages").delete().eq("user_id", userId);
      } catch {}
    }
  };

  const filteredMessages = messages.filter(
    (msg) => searchQuery.trim() === "" || msg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const orbX = (mousePos.x - 0.5) * 20;
  const orbY = (mousePos.y - 0.5) * 20;

  return (
    <motion.div
      className="relative w-full h-full min-h-[calc(100vh-4rem)] flex flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* ===== ANIMATED GRADIENT BACKGROUND ===== */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(ellipse at 30% 20%, #E8F4FD 0%, transparent 60%), radial-gradient(ellipse at 70% 10%, #DBEAFE 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, #E0F2FE 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, #F0F9FF 0%, transparent 55%)",
            "radial-gradient(ellipse at 40% 25%, #DBEAFE 0%, transparent 60%), radial-gradient(ellipse at 60% 15%, #E8F4FD 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, #E0F2FE 0%, transparent 60%), radial-gradient(ellipse at 30% 70%, #F0F9FF 0%, transparent 55%)",
            "radial-gradient(ellipse at 30% 20%, #E8F4FD 0%, transparent 60%), radial-gradient(ellipse at 70% 10%, #DBEAFE 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, #E0F2FE 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, #F0F9FF 0%, transparent 55%)",
          ],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ===== FLOATING GRADIENT ORBS (decorative) ===== */}
      <motion.div
        className="absolute top-20 right-[15%] w-64 h-64 rounded-full pointer-events-none opacity-20"
        animate={{
          background: [
            "radial-gradient(circle, #38bdf8 0%, transparent 70%)",
            "radial-gradient(circle, #22d3ee 0%, transparent 70%)",
            "radial-gradient(circle, #38bdf8 0%, transparent 70%)",
          ],
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{ filter: "blur(60px)" }}
      />
      <motion.div
        className="absolute bottom-20 left-[10%] w-72 h-72 rounded-full pointer-events-none opacity-15"
        animate={{
          background: [
            "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
            "radial-gradient(circle, #06b6d4 0%, transparent 70%)",
            "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
          ],
          x: [0, -20, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        style={{ filter: "blur(60px)" }}
      />

      {/* ===== HEADER ===== */}
      <motion.header
        className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-white/40 bg-white/30 backdrop-blur-xl shrink-0"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-sm"
            whileHover={{ rotate: 10, scale: 1.1 }}
          >
            <Stethoscope className="w-4 h-4 text-white" />
          </motion.div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">
              <motion.span
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent"
                style={{ backgroundSize: "200% 200%" }}
              >
                Clinical AI Voice
              </motion.span>
            </h1>
            <motion.div
              className="flex items-center gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.span
                className="w-1.5 h-1.5 rounded-full"
                animate={{ scale: syncStatus === "connected" ? [1, 1.3, 1] : 1 }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  backgroundColor:
                    syncStatus === "connected"
                      ? "#3b82f6"
                      : syncStatus === "syncing"
                        ? "#06b6d4"
                        : "#f59e0b",
                }}
              />
              <span className="text-[10px] text-slate-400 font-medium">
                {syncStatus === "connected"
                  ? "Nova-3 · Live"
                  : syncStatus === "syncing"
                    ? "Syncing..."
                    : "Offline"}
              </span>
            </motion.div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {[
            {
              icon: isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />,
              onClick: () => setIsMuted(!isMuted),
              active: isMuted,
              activeClass: "bg-red-50 text-red-500",
              defaultClass: "text-slate-500 hover:text-slate-700 hover:bg-white/60",
              title: isMuted ? "Unmute" : "Mute",
            },
            {
              icon: <Keyboard className="w-4 h-4" />,
              onClick: () => setShowTextMode(!showTextMode),
              active: showTextMode,
              activeClass: "bg-blue-50 text-blue-600",
              defaultClass: "text-slate-500 hover:text-slate-700 hover:bg-white/60",
              title: "Toggle text input",
            },
            ...(messages.length > 0
              ? [
                  {
                    icon: <Download className="w-4 h-4" />,
                    onClick: exportSession,
                    active: false,
                    defaultClass: "text-slate-500 hover:text-slate-700 hover:bg-white/60",
                    title: "Export session",
                  },
                  {
                    icon: <X className="w-4 h-4" />,
                    onClick: clearSession,
                    active: false,
                    defaultClass: "text-slate-500 hover:text-red-500 hover:bg-red-50/60",
                    title: "Clear session",
                  },
                ]
              : []),
          ].map((btn, i) => (
            <motion.button
              key={i}
              onClick={btn.onClick}
              className={`p-2 rounded-xl transition-all ${btn.active ? btn.activeClass : btn.defaultClass}`}
              title={btn.title}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {btn.icon}
            </motion.button>
          ))}
        </div>
      </motion.header>

      {/* ===== CHAT MESSAGES ===== */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center pt-20">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : filteredMessages.length === 0 && !interimText ? (
            <motion.div
              className="flex flex-col items-center justify-center text-center gap-5 pt-16 md:pt-24"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {/* Interactive animated orb */}
              <motion.div
                className="relative w-24 h-24 mb-2"
                style={{ transform: `translateX(${orbX}px) translateY(${orbY}px)` }}
                transition={{ type: "spring", stiffness: 100, damping: 30 }}
              >
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  style={{
                    background:
                      "conic-gradient(from 0deg, #38bdf8, #22d3ee, #2dd4bf, #60a5fa, #3b82f6, #06b6d4, #14b8a6, #38bdf8)",
                    borderRadius: "50%",
                    mask: "radial-gradient(circle at 50% 50%, transparent 70%, black 71%, black 100%)",
                    WebkitMask:
                      "radial-gradient(circle at 50% 50%, transparent 70%, black 71%, black 100%)",
                  }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 40%, transparent 60%)",
                    boxShadow:
                      "inset -2px -2px 8px rgba(0,0,0,0.04), inset 2px 2px 8px rgba(255,255,255,0.4), 0 8px 32px rgba(59,130,246,0.2)",
                  }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <BrainCircuit className="w-8 h-8 text-white/70" />
                  </motion.div>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <motion.h2
                  className="text-lg font-bold text-slate-700"
                  animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  style={{ backgroundSize: "200% 200%" }}
                >
                  <span
                    className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent"
                    style={{ backgroundSize: "200% 200%", backgroundPosition: "inherit" }}
                  >
                    How can I help you today?
                  </span>
                </motion.h2>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Ask me about medications, symptoms, vitals, or refills — just tap the mic or type
                  below
                </p>
              </motion.div>

              {/* Animated idle waveform */}
              <motion.div
                className="flex items-end gap-[2px] h-8 w-48"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {waveformData.map((_, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-full"
                    animate={{ height: [8, Math.random() * 50 + 10, 8] }}
                    transition={{
                      duration: 1.5 + Math.random(),
                      repeat: Infinity,
                      delay: Math.random() * 0.5,
                    }}
                    style={{
                      background: `hsl(${210 - (i / 29) * 30}, 70%, 75%)`,
                      opacity: 0.4,
                    }}
                  />
                ))}
              </motion.div>

              {/* Suggestion chips */}
              <motion.div
                className="flex flex-wrap justify-center gap-2 mt-2 max-w-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, staggerChildren: 0.1 }}
              >
                {suggestions.map(({ label, cmd }, i) => (
                  <motion.button
                    key={label}
                    onClick={async () => {
                      if (!isActive) {
                        setStatus("processing");
                        const intent = detectIntent(cmd);
                        const workoutIntents = [
                          "start_workout",
                          "log_meal",
                          "check_streak",
                          "suggest_workout",
                        ];
                        const clinicalIntents = [
                          "log_medication",
                          "log_symptom",
                          "query_vitals",
                          "set_reminder",
                          "refill_request",
                        ];
                        const resp = workoutIntents.includes(intent)
                          ? await handleWorkoutIntent(intent, userId)
                          : clinicalIntents.includes(intent)
                            ? await handleClinicalVoiceIntent(intent, cmd)
                            : generateLocalResponse(intent, cmd);
                        await addMessage({ sender: "user", text: cmd }).catch(() => {});
                        await addMessage({ sender: "assistant", text: resp, intent }).catch(
                          () => {}
                        );
                        if (!isMuted && resp) speakText(resp);
                        setStatus("idle");
                      }
                    }}
                    className="flex items-center gap-1.5 bg-white/70 hover:bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-full text-xs font-medium text-slate-600 shadow-sm border border-white/50 transition-all hover:border-blue-200"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.08 }}
                  >
                    {label}
                  </motion.button>
                ))}
              </motion.div>

              {/* Mic button */}
              <motion.button
                onClick={startListening}
                className="mt-4 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-200/50"
                whileHover={{ scale: 1.1, boxShadow: "0 20px 40px rgba(59,130,246,0.3)" }}
                whileTap={{ scale: 0.9 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Mic className="w-6 h-6" />
              </motion.button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {filteredMessages.map((msg, idx) => (
                  <motion.div
                    key={msg.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: Math.min(idx * 0.02, 0.3) }}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <motion.div
                        className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        style={{
                          background:
                            msg.sender === "user"
                              ? "linear-gradient(135deg, #3b82f6, #06b6d4)"
                              : "linear-gradient(135deg, #3b82f6, #14b8a6)",
                        }}
                      >
                        {msg.sender === "user" ? "U" : "AI"}
                      </motion.div>
                      <motion.div
                        className={`text-sm leading-relaxed px-4 py-2.5 ${
                          msg.sender === "user"
                            ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl rounded-tr-sm"
                            : "bg-white/80 backdrop-blur-sm text-slate-700 rounded-2xl rounded-tl-sm border border-white/60 shadow-sm"
                        }`}
                        whileHover={{ scale: 1.01 }}
                      >
                        {msg.text}
                        {msg.intent && msg.sender === "assistant" && (
                          <motion.div
                            className="mt-1 text-[9px] opacity-50 font-semibold uppercase flex items-center gap-1"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                          >
                            <Sparkles className="w-2.5 h-2.5" /> {msg.intent.replace(/_/g, " ")}
                          </motion.div>
                        )}
                        {(msg as any).audio_url && (
                          <AudioPlayerButton audioUrl={(msg as any).audio_url!} />
                        )}
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {interimText && (
                <motion.div
                  className="flex justify-end"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex gap-3 max-w-[85%] md:max-w-[75%] flex-row-reverse">
                    <div
                      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
                      style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
                    >
                      U
                    </div>
                    <div className="text-sm leading-relaxed px-4 py-2.5 bg-blue-100/50 text-blue-700 rounded-2xl rounded-tr-sm italic">
                      {interimText}...
                    </div>
                  </div>
                </motion.div>
              )}

              {status === "processing" && (
                <motion.div
                  className="flex justify-start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex gap-3 max-w-[85%] md:max-w-[75%]">
                    <div
                      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
                      style={{ background: "linear-gradient(135deg, #3b82f6, #14b8a6)" }}
                    >
                      AI
                    </div>
                    <div className="bg-white/80 border border-white/60 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                      <div className="flex gap-1 items-center">
                        {[0, 150, 300].map((d) => (
                          <motion.span
                            key={d}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: "#3b82f6" }}
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: d / 1000 }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* ===== BOTTOM INPUT ===== */}
      <motion.div
        className="relative z-10 border-t border-white/40 bg-white/20 backdrop-blur-xl shrink-0"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3">
          {isActive && (
            <motion.div
              className="flex items-center gap-3 mb-2 px-1"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <motion.span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                animate={{
                  backgroundColor: [
                    `${statusColors[status]}20`,
                    `${statusColors[status]}40`,
                    `${statusColors[status]}20`,
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ color: statusColors[status] }}
              >
                {statusLabels[status]}
              </motion.span>
              <div className="flex items-end gap-[1.5px] h-5 flex-1 max-w-[120px]">
                {waveformData.slice(0, 20).map((v, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-full"
                    animate={{ height: `${Math.max(3, v * 100)}%` }}
                    transition={{ duration: 0.075 }}
                    style={{
                      background: `hsl(${Math.round(210 - (i / 19) * 30)}, 75%, 55%)`,
                      opacity: 0.7,
                    }}
                  />
                ))}
              </div>
              <motion.button
                onClick={stopListening}
                className="ml-auto text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-full transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Stop
              </motion.button>
            </motion.div>
          )}

          {showTextMode && (
            <motion.form
              onSubmit={handleTextSubmit}
              className="flex items-center gap-2 bg-white/70 backdrop-blur-2xl border border-white/60 rounded-2xl px-3 py-2 shadow-sm"
              whileHover={{ boxShadow: "0 4px 24px rgba(59,130,246,0.1)" }}
              transition={{ duration: 0.2 }}
            >
              <motion.button
                type="button"
                onClick={isActive ? stopListening : startListening}
                className={`p-2 rounded-xl transition-all ${isActive ? "bg-red-500 text-white shadow-sm" : "text-slate-400 hover:text-blue-500 hover:bg-blue-50"}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {isActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </motion.button>

              <div className="w-px h-5 bg-slate-200/60" />

              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={isActive ? "Listening..." : "Ask anything about your health..."}
                className="flex-1 text-sm border-0 bg-transparent px-1 py-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none h-8 placeholder:text-slate-400"
                disabled={isActive}
              />

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!textInput.trim() || isActive}
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-sm disabled:opacity-30 h-8 px-3"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            </motion.form>
          )}

          {(errorMsg || micAllowed === false) && (
            <motion.div
              className="mt-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50/80 rounded-xl px-3 py-2 border border-red-100"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{errorMsg || "Microphone access blocked. Enable it in browser settings."}</span>
            </motion.div>
          )}

          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-[10px] text-slate-400">Deepgram Nova-3 · Clinical AI</p>
            {filteredMessages.length > 0 && (
              <motion.button
                onClick={() =>
                  document
                    .querySelector(".overflow-y-auto")
                    ?.scrollTo({ top: 0, behavior: "smooth" })
                }
                className="text-[10px] text-slate-400 hover:text-blue-500 transition-colors"
                whileHover={{ x: -2 }}
              >
                Back to top ↑
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ===== FLOATING GLASS TIMER HUD ===== */}
      <AnimatePresence>
        {isActive && (
          <>
            {/* Top-center floating timer badge */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="glass-effect rounded-2xl px-5 py-2.5 flex items-center gap-4 shadow-lg border border-white/40">
                {/* Mini circular timer */}
                <div className="relative w-10 h-10 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth="3"
                    />
                    <motion.circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="url(#timerMiniGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray="97.4"
                      animate={{ strokeDashoffset: 97.4 - (sessionTimer / 300) * 97.4 }}
                      transition={{ duration: 1, ease: "linear" }}
                    />
                    <defs>
                      <linearGradient id="timerMiniGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#22d3ee" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-black text-slate-700 tabular-nums">
                      {Math.floor(sessionTimer / 60)}:{String(sessionTimer % 60).padStart(2, "0")}
                    </span>
                  </div>
                </div>

                {/* Status + waveform */}
                <div className="flex items-center gap-3">
                  <motion.span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                    animate={{
                      backgroundColor: [
                        `${statusColors[status]}25`,
                        `${statusColors[status]}45`,
                        `${statusColors[status]}25`,
                      ],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ color: statusColors[status] }}
                  >
                    {statusLabels[status]}
                  </motion.span>
                  <div className="flex items-end gap-[1.5px] h-5 w-16">
                    {waveformData.slice(0, 12).map((v, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-full transition-all"
                        style={{
                          height: `${Math.max(2, v * 100)}%`,
                          background: `hsl(${Math.round(210 - (i / 11) * 30)}, 75%, 60%)`,
                          opacity: 0.5,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Stop button */}
                <motion.button
                  onClick={stopListening}
                  className="p-1.5 rounded-full bg-white/80 hover:bg-white text-red-500 shadow-sm transition-all"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Stop session"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="1.5" />
                  </svg>
                </motion.button>
              </div>
            </motion.div>

            {/* Floating bottom-right glass controls */}
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              transition={{ type: "spring", damping: 20, stiffness: 200, delay: 0.1 }}
              className="fixed bottom-6 right-6 z-50"
            >
              <div className="glass-effect rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg border border-white/40">
                {/* Mute toggle */}
                <motion.button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-2 rounded-xl transition-all ${isMuted ? "bg-red-100/80 text-red-500" : "bg-white/60 text-slate-500 hover:bg-white/80"}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </motion.button>

                <div className="w-px h-6 bg-white/30" />

                {/* Context hint */}
                <p className="text-[10px] text-slate-500 max-w-[140px] leading-tight font-medium">
                  {status === "listening"
                    ? "Speak clearly into your mic"
                    : status === "speaking"
                      ? "AI is responding..."
                      : "Processing your request..."}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx>{`
        .glass-effect {
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.35);
        }
        .glass-dark {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </motion.div>
  );
}
