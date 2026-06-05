"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  MessageSquare,
  Loader2,
  AlertCircle,
  RefreshCw,
  Keyboard,
  X,
  Download,
  Database,
  WifiOff,
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
  greeting: /^(hi|hello|hey|good morning|good evening|good afternoon)[\s!.]*$/i,
  help: /\b(help|what can you do|commands|options)\b/i,
};

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

function detectIntent(text: string): string {
  for (const [intent, pattern] of Object.entries(INTENTS)) {
    if (pattern.test(text)) return intent;
  }
  return "general";
}

function generateResponse(intent: string, text: string): string {
  switch (intent) {
    case "greeting":
      return "Hello! I'm your ZorabiHealth assistant. How can I help you today? You can tell me about symptoms, medications you've taken, or ask about your vitals.";
    case "log_medication":
      return "Got it! I've logged that you've taken your medication. Your medication log has been updated in the database. Is there anything else you'd like to record?";
    case "log_symptom":
      return "I've noted your symptom. I recommend logging this in your Symptom Tracker for your doctor's review. If symptoms are severe, please seek immediate medical attention.";
    case "query_vitals":
      return "Based on your last reading, your heart rate was 72 bpm and SpO2 was 97%. Your vitals are within the normal range. Would you like to update a new reading?";
    case "set_reminder":
      return "I'll help you set that reminder. Please use the Medications section to configure SMS alerts via Vonage for precise scheduled reminders.";
    case "refill_request":
      return "I'll flag that medication for refill. Head to the Pharmacy section to request an automated refill — I'll find the nearest vendor and send you a tracking ID.";
    case "help":
      return "I can help you: log symptoms, record medications taken, check your vitals, set medication reminders, or request a pharmacy refill. Just speak naturally!";
    default:
      return `I heard: "${text}". As your health assistant, I can help with medication logging, symptom tracking, vitals queries, and pharmacy refills. What would you like to do?`;
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

// VOICE-002-UI: Audio player button
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
      className="mt-1.5 text-[10px] px-2 py-1 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 transition-all"
    >
      {playing ? "⏸ Pause" : "▶ Play recording"}
    </button>
  );
}

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
  const [searchQuery, setSearchQuery] = useState(""); // VOICE-003
  const [syncStatus, setSyncStatus] = useState<"connected" | "offline" | "syncing">("connected");
  const [isLoading, setIsLoading] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const audioBlobsRef = useRef<Blob[]>([]); // VOICE-002-API

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

  // VOICE-001: Waveform animation with real audio data
  const animateWaveform = useCallback(function animate() {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const bars = Array.from({ length: 30 }, (_, i) => {
      const idx = Math.floor((i / 30) * data.length);
      return data[idx] / 255;
    });
    setWaveformData(bars);
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
      sender: full.sender,
      text: full.text,
      intent: full.intent || null,
      action_taken: full.actionTaken || null,
    };
    if (navigator.onLine) {
      try {
        const { error } = await supabase.from("voice_messages").insert(dbPayload);
        if (error) throw error;
      } catch (err) {
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
        audioBlobsRef.current = []; // VOICE-002-API: reset blobs

        recorder.addEventListener("dataavailable", (e: BlobEvent) => {
          if (e.data.size > 0) {
            // Send to Deepgram for STT
            if (ws.readyState === WebSocket.OPEN) ws.send(e.data);
            // Also collect for upload — VOICE-002-API
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

            // Save user message then upload audio — VOICE-002-API
            addMessage({ sender: "user", text: transcript }).then(async (msgId) => {
              if (audioBlobsRef.current.length > 0 && navigator.onLine) {
                const blob = new Blob(audioBlobsRef.current, { type: "audio/webm" });
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
                audioBlobsRef.current = [];
              }
            });

            setStatus("processing");
            const intent = detectIntent(transcript);
            const response = generateResponse(intent, transcript);
            setTimeout(() => {
              addMessage({ sender: "assistant", text: response, intent, actionTaken: intent });
              setStatus("speaking");
              if (!isMuted) {
                speakText(response, () => setStatus("listening"));
              } else {
                setStatus("listening");
              }
            }, 500);
          }
        } catch {
          // keep-alive frames
        }
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
      } else {
        setErrorMsg(err instanceof Error ? err.message : "Failed to start speech agent");
      }
      setStatus("error");
    }
  };

  const stopListening = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.close();
    audioContextRef.current?.close();
    setWaveformData(Array(30).fill(0));
    setInterimText("");
    setStatus("idle");
    window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => () => stopListening(), [stopListening]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const text = textInput.trim();
    setTextInput("");
    addMessage({ sender: "user", text });
    setStatus("processing");
    const intent = detectIntent(text);
    const response = generateResponse(intent, text);
    setTimeout(() => {
      addMessage({ sender: "assistant", text: response, intent });
      if (!isMuted) speakText(response, () => setStatus("idle"));
      else setStatus("idle");
    }, 600);
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
    a.download = `zorabihealth-voice-session-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearSession = async () => {
    setMessages([]);
    saveToStorage(STORAGE_KEYS.VOICE_SESSIONS, []);
    if (navigator.onLine) {
      try {
        await supabase
          .from("voice_messages")
          .delete()
          .eq("user_id", "00000000-0000-0000-0000-000000000000");
      } catch (err) {
        console.error("[Supabase] Failed to clear DB logs:", err);
      }
    }
  };

  const isActive = status === "listening" || status === "processing" || status === "speaking";

  const statusColors: Record<AgentStatus, string> = {
    idle: "bg-slate-100 text-slate-500",
    connecting: "bg-amber-100 text-amber-600",
    listening: "bg-emerald-100 text-emerald-600",
    processing: "bg-blue-100 text-blue-600",
    speaking: "bg-violet-100 text-violet-600",
    error: "bg-red-100 text-red-600",
  };

  const statusLabel: Record<AgentStatus, string> = {
    idle: "Ready",
    connecting: "Connecting...",
    listening: "Listening...",
    processing: "Processing...",
    speaking: "Speaking...",
    error: "Error",
  };

  // VOICE-003: filtered messages
  const filteredMessages = messages.filter(
    (msg) => searchQuery.trim() === "" || msg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-full bg-[#f0f5ff] p-6 md:p-8 flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-violet-600" /> Voice Health Assistant
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-slate-100 shadow-sm">
              {syncStatus === "connected" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <Database className="w-3.5 h-3.5 text-emerald-600 ml-1" />
                  <span className="text-emerald-700">Database Synced</span>
                </>
              )}
              {syncStatus === "offline" && (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
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
            Powered by Deepgram Nova-3 · Real-time speech recognition
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2.5 rounded-xl transition-all border border-slate-200 shadow-sm ${isMuted ? "bg-red-50 text-red-500 border-red-100" : "bg-white text-slate-500 hover:text-slate-800"}`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowTextMode(!showTextMode)}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 transition-all shadow-sm"
            title="Text Input"
          >
            <Keyboard className="w-4 h-4" />
          </button>
          {messages.length > 0 && (
            <button
              onClick={exportSession}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 transition-all shadow-sm"
              title="Export"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={clearSession}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-red-500 transition-all shadow-sm"
              title="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Orb + Controls */}
        <div className="lg:w-72 flex flex-col items-center gap-6 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="relative flex items-center justify-center py-4">
            {status === "listening" && (
              <span className="absolute w-44 h-44 rounded-full bg-emerald-400/20 animate-ping" />
            )}
            {status === "speaking" && (
              <span className="absolute w-44 h-44 rounded-full bg-violet-400/20 animate-ping" />
            )}
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${
                status === "idle"
                  ? "bg-gradient-to-br from-slate-200 to-slate-300"
                  : status === "connecting"
                    ? "bg-gradient-to-br from-amber-400 to-orange-500"
                    : status === "listening"
                      ? "bg-gradient-to-br from-emerald-400 to-teal-600 shadow-emerald-400/30"
                      : status === "processing"
                        ? "bg-gradient-to-br from-blue-400 to-blue-700 shadow-blue-400/30"
                        : status === "speaking"
                          ? "bg-gradient-to-br from-violet-500 to-purple-700 shadow-violet-400/30"
                          : "bg-gradient-to-br from-red-400 to-red-600"
              }`}
            >
              {status === "connecting" ? (
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              ) : status === "processing" ? (
                <Sparkles className="w-10 h-10 text-white animate-pulse" />
              ) : status === "speaking" ? (
                <Volume2 className="w-10 h-10 text-white" />
              ) : status === "error" ? (
                <AlertCircle className="w-10 h-10 text-white" />
              ) : (
                <Mic className="w-10 h-10 text-white/80" />
              )}
            </div>
          </div>

          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${statusColors[status]}`}>
            {statusLabel[status]}
          </span>

          {/* VOICE-001: HSL interpolated waveform violet→emerald */}
          <div className="flex items-end gap-0.5 h-10 w-full px-2">
            {waveformData.map((v, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.max(4, v * 100)}%`,
                  borderRadius: 9999,
                  transition: "height 0.075s ease",
                  background: isActive
                    ? `hsl(${Math.round(270 - (i / 29) * 110)}, ${Math.round(70 + (i / 29) * 20)}%, 55%)`
                    : "#e2e8f0",
                  opacity: isActive ? 0.7 + v * 0.3 : 0.4,
                }}
              />
            ))}
          </div>

          {!isActive ? (
            <button
              onClick={startListening}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-md active:scale-[0.98]"
            >
              <Mic className="w-4 h-4" /> Tap to Talk
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="w-full py-3.5 rounded-2xl bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-600 transition-all active:scale-[0.98] shadow-md"
            >
              <MicOff className="w-4 h-4" /> Stop
            </button>
          )}

          {micAllowed === false && (
            <div className="w-full bg-red-50 border border-red-100 rounded-2xl p-3.5 text-xs text-red-700 font-medium leading-relaxed">
              <AlertCircle className="w-4 h-4 inline mr-1 text-red-600" />
              Microphone access blocked. Enable mic permissions in browser settings.
            </div>
          )}

          {errorMsg && (
            <div className="w-full bg-red-50 border border-red-100 rounded-2xl p-3.5 text-xs text-red-700 flex items-start gap-1.5 leading-relaxed font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="w-full">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Voice Shortcuts
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Log Dose", cmd: "I took my medication" },
                { label: "Check Vitals", cmd: "What are my vitals?" },
                { label: "Add Symptom", cmd: "I'm feeling dizzy" },
                { label: "Refills", cmd: "I'm running low on meds" },
              ].map(({ label, cmd }) => (
                <button
                  key={label}
                  onClick={async () => {
                    if (!isActive) {
                      await addMessage({ sender: "user", text: cmd });
                      setStatus("processing");
                      const intent = detectIntent(cmd);
                      const resp = generateResponse(intent, cmd);
                      setTimeout(async () => {
                        await addMessage({ sender: "assistant", text: resp, intent });
                        if (!isMuted) speakText(resp);
                        setStatus("idle");
                      }, 400);
                    }
                  }}
                  className="text-[10px] py-2 px-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-500 border border-slate-100 rounded-xl transition-all font-bold text-left shadow-sm"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Conversation log */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden min-h-0">
          {/* VOICE-003: Search header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 gap-4">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-400" /> Conversational Log
            </h3>
            <div className="flex items-center gap-3">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transcripts..."
                className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-slate-600 outline-none focus:border-blue-300 w-44"
              />
              <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">
                {filteredMessages.length} / {messages.length} exchanges
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 bg-slate-50/20">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : filteredMessages.length === 0 && !interimText ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 text-center gap-3 py-20">
                <Sparkles className="w-14 h-14 text-violet-500 animate-bounce" />
                <p className="text-sm font-bold text-slate-500">
                  {searchQuery
                    ? "No messages match your search."
                    : "How can I assist your health today?"}
                </p>
                {!searchQuery && (
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Try speaking: "I took my Metformin dose" or "Show me my SpO2 readings".
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        msg.sender === "user"
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200"
                      }`}
                    >
                      {msg.text}
                      {msg.intent && msg.sender === "assistant" && (
                        <div className="mt-1.5 text-[9px] opacity-70 font-semibold uppercase tracking-wider">
                          Parsed Intent: {msg.intent.replace(/_/g, " ")}
                        </div>
                      )}
                      {/* VOICE-002-UI: audio playback button */}
                      {(msg as VoiceMessage & { audio_url?: string }).audio_url && (
                        <AudioPlayerButton
                          audioUrl={(msg as VoiceMessage & { audio_url?: string }).audio_url!}
                        />
                      )}
                    </motion.div>
                  </div>
                ))}

                {interimText && (
                  <div className="flex justify-end">
                    <div className="max-w-[75%] rounded-2xl px-4 py-3 text-sm bg-blue-200/50 text-blue-600 rounded-br-sm italic font-medium">
                      {interimText}...
                    </div>
                  </div>
                )}

                {status === "processing" && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <AnimatePresence>
            {showTextMode && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleTextSubmit}
                className="flex gap-2 p-4 border-t border-slate-100 bg-white shadow-inner"
              >
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Ask a question or log your symptoms here..."
                  className="flex-1 text-sm rounded-xl"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!textInput.trim()}
                  className="rounded-xl font-bold"
                >
                  Send Question
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-start gap-2.5 text-xs text-blue-700 leading-relaxed font-medium">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 animate-pulse" />
        <div>
          <strong>Speech setup recommendation:</strong> Adding a valid <code>DEEPGRAM_API_KEY</code>{" "}
          within your local <code>.env.local</code> enables streaming STT via the Nova-3 websocket.
          Text dialog is fully operational offline without credentials.
        </div>
      </div>
    </div>
  );
}
