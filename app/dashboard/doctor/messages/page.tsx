"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Send,
  Search,
  Phone,
  Video,
  Paperclip,
  FileText,
  Calendar,
  CheckCheck,
  Clock,
  Stethoscope,
  Activity,
  HeartPulse,
  X,
  Circle,
} from "lucide-react";
import { RealtimeChannel } from "@supabase/supabase-js";

interface Conversation {
  id: string;
  patient_id: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_doctor: number;
  patient_name?: string;
  patient_avatar?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  created_at: string;
  read_at: string | null;
}

const AVATARS = [
  "/images/doctor1.jpg",
  "/images/doctor2.jpg",
  "/images/doctor3.jpg",
  "/images/doctor4.jpg",
  "/images/adam_bridges.jpg",
];

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export default function DoctorMessages() {
  const { role, userId } = useUserRole();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const activePatientData = activeConv
    ? {
        name: activeConv.patient_name || "Patient",
        avatar: AVATARS[hashId(activeConv.patient_id) % AVATARS.length],
        bp: "—",
        pulse: "—",
        spO2: "—",
        temp: "—",
        condition: "—",
        lastVisit: "—",
      }
    : null;

  useEffect(() => {
    if (role === null) return;
    if (role !== "doctor") {
      router.push("/dashboard");
      return;
    }
    fetchConversations();
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [role, userId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("doctor_id", userId)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;

      // Resolve patient names from patient_profiles
      const patientIds = [...new Set((data ?? []).map((c) => c.patient_id))];
      const { data: ppData } = await supabase
        .from("patient_profiles")
        .select("id, full_name")
        .in("id", patientIds.length > 0 ? patientIds : ["00000000-0000-0000-0000-000000000000"]);
      const nameMap = new Map((ppData ?? []).map((p) => [p.id, p.full_name]));

      const enriched = (data ?? []).map((conv) => ({
        ...conv,
        patient_name: nameMap.get(conv.patient_id) || `Patient ${conv.patient_id.slice(0, 6)}`,
        patient_avatar: AVATARS[hashId(conv.patient_id) % AVATARS.length],
      }));
      setConversations(enriched);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      setFetchError("Failed to load conversations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openConversation = async (conv: Conversation) => {
    setActiveConv(conv);

    // Fetch messages first, then subscribe to avoid race
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });
    if (!error) setMessages(data ?? []);
    // If error, messages stays as-is (empty or stale)

    if (conv.unread_doctor > 0) {
      await supabase.from("conversations").update({ unread_doctor: 0 }).eq("id", conv.id);
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unread_doctor: 0 } : c))
      );
    }

    channelRef.current?.unsubscribe();
    const channel = supabase.channel(`messages:${conv.id}`);
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conv.id}`,
      },
      (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => {
          // Deduplicate by id to avoid race with fetch
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conv.id
              ? { ...c, last_message: newMsg.content, last_message_at: newMsg.created_at }
              : c
          )
        );
      }
    );
    channel.subscribe();
    channelRef.current = channel;
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !activeConv || !userId) return;
    setSendingMessage(true);

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConv.id,
      sender_id: userId,
      content: text,
      attachment_url: null,
      attachment_type: null,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput(""); // safe to clear now — revert on error

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeConv.id,
        sender_id: userId,
        content: text,
      });
      if (error) throw error;

      await supabase
        .from("conversations")
        .update({
          last_message: text,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", activeConv.id);
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(text); // restore input text on failure
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredConvs = conversations.filter((c) =>
    c.patient_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (role !== "doctor") return null;

  return (
    <div className="h-full clinical-bg-gradient flex">
      {/* ============================================================
          LEFT: Patient Inbox List (280px)
          ============================================================ */}
      <div className="w-[280px] shrink-0 bg-[#f8f9ff]/70 backdrop-blur-xl border-r border-white/30 flex flex-col">
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-[#0c4381]" />
            <h2 className="font-bold text-[#0c4381] text-sm">Messages</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/80 border border-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/10">
          {fetchError ? (
            <div className="p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-2">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-xs text-red-500 font-semibold mb-2">{fetchError}</p>
              <button
                onClick={fetchConversations}
                className="text-xs text-[#0c4381] font-bold hover:underline"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="p-6 text-center text-slate-400 text-xs">Loading...</div>
          ) : filteredConvs.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              {searchTerm ? "No matches" : "No conversations yet"}
            </div>
          ) : (
            filteredConvs.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`w-full text-left px-4 py-3 transition-all hover:bg-white/50 ${
                  activeConv?.id === conv.id ? "bg-white/80 shadow-sm" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={conv.patient_avatar || AVATARS[0]}
                      alt={conv.patient_name}
                      className="w-9 h-9 rounded-full object-cover border border-white/60"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {conv.patient_name}
                      </p>
                      {conv.unread_doctor > 0 && (
                        <span className="w-5 h-5 rounded-full bg-[#0c4381] text-white text-[8px] font-bold flex items-center justify-center shrink-0">
                          {conv.unread_doctor}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                      {conv.last_message || (
                        <span className="italic text-slate-300">No messages yet</span>
                      )}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ============================================================
          CENTER: Chat Area
          ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="glass-panel-sm rounded-none border-b border-white/30 px-5 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src={activePatientData?.avatar || AVATARS[0]}
                  alt={activeConv.patient_name}
                  className="w-9 h-9 rounded-full object-cover border border-white/60"
                />
                <div>
                  <p className="text-sm font-bold text-slate-800">{activeConv.patient_name}</p>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] text-slate-500 font-medium">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowPatientPanel(!showPatientPanel)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    showPatientPanel
                      ? "bg-[#0c4381] text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                  title="Patient Details"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  className="w-8 h-8 rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center"
                  title="Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>
                <button
                  className="w-8 h-8 rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center"
                  title="Voice Call"
                >
                  <Phone className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 custom-scrollbar bg-[rgba(248,249,255,0.3)]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm font-medium">Start a conversation</p>
                  <p className="text-xs text-slate-300 mt-1">
                    Send a message to {activeConv.patient_name}
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === userId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"} animate-slide-up`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                          isMine
                            ? "bg-[#0c4381] text-white rounded-br-md shadow-md shadow-[#0c4381]/10"
                            : "bg-white/90 backdrop-blur-sm border border-white/40 text-slate-800 rounded-bl-md shadow-sm"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <div
                          className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}
                        >
                          <span
                            className={`text-[9px] ${isMine ? "text-blue-200" : "text-slate-400"}`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isMine && (
                            <CheckCheck
                              className={`w-3 h-3 ${msg.read_at ? "text-blue-300" : "text-blue-200"}`}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="glass-panel-sm rounded-none border-t border-white/30 px-5 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <button className="w-9 h-9 rounded-xl hover:bg-white/80 flex items-center justify-center text-slate-400 shrink-0">
                  <Paperclip className="w-4 h-4" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sendingMessage}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/80 border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sendingMessage}
                  className="w-9 h-9 rounded-xl bg-[#0c4381] hover:bg-[#093262] flex items-center justify-center text-white disabled:opacity-40 shrink-0 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <div className="w-16 h-16 rounded-2xl glass-panel flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-[#0c4381]" />
            </div>
            <p className="text-sm font-bold text-slate-500">Select a conversation</p>
            <p className="text-xs text-slate-400 mt-1">Choose a patient from the left panel</p>
          </div>
        )}
      </div>

      {/* ============================================================
          RIGHT: Patient Details Sidebar (280px)
          ============================================================ */}
      {activeConv && showPatientPanel && activePatientData && (
        <div className="w-[280px] shrink-0 bg-[#f8f9ff]/70 backdrop-blur-xl border-l border-white/30 flex flex-col overflow-hidden animate-slide-up">
          <div className="p-4 border-b border-white/20 flex items-center justify-between">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Patient Details
            </h3>
            <button
              onClick={() => setShowPatientPanel(false)}
              className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {/* Patient profile summary */}
            <div className="flex flex-col items-center text-center glass-panel-sm rounded-2xl p-5">
              <img
                src={activePatientData.avatar}
                alt={activePatientData.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md mb-3"
              />
              <h4 className="text-sm font-bold text-slate-800">{activePatientData.name}</h4>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                {activePatientData.condition}
              </p>
              <span className="mt-2 text-[8px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                Active Patient
              </span>
            </div>

            {/* Quick Vitals */}
            <div>
              <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Vitals
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="glass-panel-sm rounded-xl p-3 text-center">
                  <HeartPulse className="w-4 h-4 text-red-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-800">{activePatientData.bp}</p>
                  <p className="text-[8px] text-slate-400">BP</p>
                </div>
                <div className="glass-panel-sm rounded-xl p-3 text-center">
                  <Activity className="w-4 h-4 text-[#0c4381] mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-800">{activePatientData.pulse}</p>
                  <p className="text-[8px] text-slate-400">Pulse</p>
                </div>
                <div className="glass-panel-sm rounded-xl p-3 text-center">
                  <Circle className="w-4 h-4 text-emerald-500 mx-auto mb-1 fill-current" />
                  <p className="text-xs font-bold text-slate-800">{activePatientData.spO2}%</p>
                  <p className="text-[8px] text-slate-400">SpO2</p>
                </div>
                <div className="glass-panel-sm rounded-xl p-3 text-center">
                  <Clock className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-800">{activePatientData.temp}°F</p>
                  <p className="text-[8px] text-slate-400">Temp</p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Recent Activity
              </h4>
              <div className="glass-panel-sm rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0c4381]" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-700">Last Visit</p>
                    <p className="text-[9px] text-slate-400">{activePatientData.lastVisit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Stethoscope className="w-3.5 h-3.5 text-[#0c4381]" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-700">
                      {activePatientData.condition}
                    </p>
                    <p className="text-[9px] text-slate-400">Diagnosis</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <FileText className="w-3.5 h-3.5 text-[#0c4381]" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-700">3 Prescriptions</p>
                    <p className="text-[9px] text-slate-400">Last 6 months</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-1.5">
              <button className="w-full glass-panel-sm rounded-xl py-2.5 text-[10px] font-bold text-[#0c4381] hover:bg-white transition-all flex items-center justify-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Schedule Appointment
              </button>
              <button
                onClick={() => router.push(`/dashboard/doctor?patient_id=${activeConv.patient_id}`)}
                className="w-full glass-panel-sm rounded-xl py-2.5 text-[10px] font-bold text-[#0c4381] hover:bg-white transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-3.5 h-3.5" /> New Prescription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
