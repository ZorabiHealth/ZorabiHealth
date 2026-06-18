"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MessageSquare,
  Send,
  Search,
  FileText,
  CheckCheck,
  Loader2,
  X,
  Stethoscope,
  Pill,
} from "lucide-react";
import { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";

interface Conversation {
  id: string;
  doctor_id: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_patient: number;
  doctor_name?: string;
  doctor_specialization?: string;
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

export default function PatientMessages() {
  const { role, userId } = useUserRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const doctorParam = searchParams.get("doctor");
  const doctorUserParam = searchParams.get("doctorUser");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribingRef = useRef(false);

  const getConversations = async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("patient_id", userId)
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (error) throw error;

    const doctorIds = [...new Set((data ?? []).map((c) => c.doctor_id))];
    const { data: docData } = await supabase
      .from("doctor_profiles")
      .select("user_id, workspace_name, specialization")
      .in("user_id", doctorIds.length > 0 ? doctorIds : ["00000000-0000-0000-0000-000000000000"]);
    const nameMap = new Map(
      (docData ?? []).map((d) => [
        d.user_id,
        { name: d.workspace_name || "Doctor", spec: d.specialization },
      ])
    );

    return (data ?? []).map((conv) => {
      const info = nameMap.get(conv.doctor_id);
      return {
        ...conv,
        doctor_name: info?.name || `Doctor ${conv.doctor_id.slice(0, 6)}`,
        doctor_specialization: info?.spec || "",
      };
    });
  };

  const ensureConversation = async (docId: string, docUserId: string) => {
    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .eq("doctor_id", docUserId)
      .eq("patient_id", userId)
      .maybeSingle();

    if (existing) return existing;

    const { data: newConv, error: insertErr } = await supabase
      .from("conversations")
      .insert({
        doctor_id: docUserId,
        patient_id: userId,
      })
      .select()
      .maybeSingle();

    if (insertErr) {
      const { data: retryConv } = await supabase
        .from("conversations")
        .select("*")
        .eq("doctor_id", docUserId)
        .eq("patient_id", userId)
        .single();
      return retryConv;
    }
    return newConv;
  };

  useEffect(() => {
    if (role === null) return;
    if (role !== "patient") {
      router.push("/dashboard");
      return;
    }

    const init = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const convs = await getConversations();
        setConversations(convs);

        if (doctorParam && doctorUserParam && userId) {
          const conv = await ensureConversation(doctorParam, doctorUserParam);
          if (conv) {
            const enriched = await getConversations();
            setConversations(enriched);
            const found = enriched.find((c) => c.id === conv.id);
            if (found) {
              setActiveConv(found);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch conversations:", err);
        setFetchError("Failed to load conversations.");
      } finally {
        setLoading(false);
      }
    };

    init();
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [role, userId, router, doctorParam, doctorUserParam]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openConversation = async (conv: Conversation) => {
    if (subscribingRef.current) return;
    subscribingRef.current = true;
    try {
      setActiveConv(conv);

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });
      if (!error) setMessages(data ?? []);

      if (conv.unread_patient > 0) {
        await supabase.from("conversations").update({ unread_patient: 0 }).eq("id", conv.id);
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unread_patient: 0 } : c))
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
    } finally {
      subscribingRef.current = false;
    }
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
    setInput("");

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
      setInput(text);
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredConvs = conversations.filter((c) =>
    c.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (role !== "patient") return null;

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-600" />
          Messages
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">Chat with your doctors</p>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Conversation List */}
        <div className="w-72 shrink-0 border-r border-slate-200 bg-white flex flex-col">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search doctors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {fetchError ? (
              <div className="p-6 text-center text-xs text-red-500">{fetchError}</div>
            ) : loading ? (
              <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading...
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                {searchTerm ? "No matches" : "No conversations yet"}
              </div>
            ) : (
              filteredConvs.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv)}
                  className={`w-full text-left px-4 py-3 transition-colors hover:bg-slate-50 ${
                    activeConv?.id === conv.id ? "bg-emerald-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {conv.doctor_name?.charAt(0).toUpperCase() || "D"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {conv.doctor_name}
                        </p>
                        {conv.unread_patient > 0 && (
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[8px] font-bold flex items-center justify-center shrink-0">
                            {conv.unread_patient}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
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

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
                  {activeConv.doctor_name?.charAt(0).toUpperCase() || "D"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{activeConv.doctor_name}</p>
                  <p className="text-[10px] text-slate-500">{activeConv.doctor_specialization}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50/50">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm font-medium">Start a conversation</p>
                    <p className="text-xs text-slate-300 mt-1">
                      Send a message to {activeConv.doctor_name}
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === userId;
                    const isPrescription = msg.attachment_type === "prescription";
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            isMine
                              ? "bg-emerald-600 text-white rounded-br-md"
                              : "bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-sm"
                          }`}
                        >
                          {isPrescription ? (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Pill className="w-4 h-4" />
                                <span className="text-xs font-bold">Prescription</span>
                              </div>
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                              {msg.attachment_url && msg.attachment_url.startsWith("http") ? (
                                <Link
                                  href={msg.attachment_url}
                                  target="_blank"
                                  className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ${
                                    isMine
                                      ? "bg-emerald-700 text-white"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  <FileText className="w-3 h-3" />
                                  View Prescription
                                </Link>
                              ) : msg.attachment_url ? (
                                <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed">
                                  <FileText className="w-3 h-3" />
                                  Prescription unavailable
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                          )}
                          <div
                            className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}
                          >
                            <span
                              className={`text-[9px] ${isMine ? "text-emerald-200" : "text-slate-400"}`}
                            >
                              {formatTime(msg.created_at)}
                            </span>
                            {isMine && (
                              <CheckCheck
                                className={`w-3 h-3 ${msg.read_at ? "text-blue-300" : "text-emerald-200"}`}
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
              <div className="bg-white border-t border-slate-200 px-5 py-3 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sendingMessage}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sendingMessage}
                    className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center text-white disabled:opacity-40 shrink-0 transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-slate-500">Select a conversation</p>
              <p className="text-xs text-slate-400 mt-1">Choose a doctor from the left panel</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
