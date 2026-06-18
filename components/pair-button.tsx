"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Smartphone, QrCode, Loader2, CheckCircle2, X, ChevronDown, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";

interface PairedDevice {
  id: string;
  device_name: string;
  is_active: boolean;
  last_active_at: string;
}

export function PairButton() {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [codeExpiresIn, setCodeExpiresIn] = useState(0);
  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [session, setSession] = useState<import("@supabase/supabase-js").Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
    });
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const {
        data: { session: fresh },
      } = await supabase.auth.refreshSession();
      const token = fresh?.access_token;
      if (!token) return;
      const res = await fetch("/api/notifications/devices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.devices) setPairedDevices(json.devices);
    } catch {
      console.warn("[catch] Non-critical operation failed at pair-button.tsx");
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    const loadDevices = async () => {
      if (!session) {
        setLoadingDevices(false);
        return;
      }
      try {
        const {
          data: { session: fresh },
        } = await supabase.auth.refreshSession();
        const token = fresh?.access_token;
        if (!token) return;
        const res = await fetch("/api/notifications/devices", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.devices) setPairedDevices(json.devices);
      } catch {
        console.warn("[catch] Non-critical operation failed at pair-button.tsx");
      } finally {
        setLoadingDevices(false);
      }
    };
    loadDevices();
  }, [session, fetchDevices]);

  const getFreshToken = async (): Promise<string | null> => {
    const {
      data: { session: fresh },
    } = await supabase.auth.refreshSession();
    return fresh?.access_token ?? null;
  };

  const generatePairingCode = async () => {
    const token = await getFreshToken();
    if (!token) return;
    setGenerating(true);
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
      console.warn("[catch] Non-critical operation failed at pair-button.tsx");
    } finally {
      setGenerating(false);
    }
  };

  const handleOpen = () => {
    setOpen(!open);
    if (!open) {
      generatePairingCode();
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
    return () => clearInterval(interval);
  }, [pairingCode, codeExpiresIn]);

  useEffect(() => {
    if (!open) return;
    const poll = setInterval(fetchDevices, 5000);
    return () => clearInterval(poll);
  }, [open, fetchDevices]);

  const pairingUrl = pairingCode ? `zorabihealth://pair?c=${pairingCode}` : "";

  const isPaired = pairedDevices.some((d) => d.is_active);

  if (!session) return null;

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className={`flex items-center gap-3 w-full px-2.5 py-2.5 rounded-xl transition-all duration-200 ${
          isPaired
            ? "text-emerald-600 hover:bg-emerald-50"
            : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
        }`}
        title="Pair Mobile Device"
      >
        {isPaired ? (
          <CheckCircle2 className="w-5 h-5 shrink-0" />
        ) : (
          <Smartphone className="w-5 h-5 shrink-0" />
        )}
        <span className="text-sm font-medium flex-1 text-left">
          {isPaired ? `${pairedDevices.filter((d) => d.is_active).length} Paired` : "Pair Mobile"}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 space-y-3 z-50 min-w-[260px]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800">Pair Mobile Device</h4>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
            <LogIn className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-emerald-800">Using the same email?</p>
              <p className="text-[8px] text-emerald-600 font-medium leading-relaxed">
                Open the mobile app → <span className="font-bold">Settings</span> → tap{" "}
                <span className="font-bold">&quot;Quick Pair (same email)&quot;</span>. No QR
                needed.
              </p>
            </div>
          </div>

          {pairingCode ? (
            <div className="flex flex-col items-center gap-2 bg-slate-50 rounded-xl p-3">
              <QRCodeSVG value={pairingUrl} size={100} />
              <div className="text-center space-y-0.5">
                <p className="text-[10px] text-slate-400 font-medium">Pairing Code</p>
                <p className="text-xl font-black text-blue-600 tracking-[0.25em] select-all">
                  {pairingCode}
                </p>
                <p className="text-[8px] text-slate-400 font-semibold">
                  Enter this code in the mobile app
                </p>
                <p className="text-[8px] text-amber-600 font-bold">
                  Expires in {Math.floor(codeExpiresIn / 60)}:
                  {String(codeExpiresIn % 60).padStart(2, "0")}
                </p>
              </div>
            </div>
          ) : generating ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <button
              onClick={generatePairingCode}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" /> Generate Pairing Code
            </button>
          )}

          <div className="border-t border-slate-100 pt-2">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Paired Devices ({pairedDevices.length})
            </p>
            {loadingDevices ? (
              <div className="flex justify-center py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-300" />
              </div>
            ) : pairedDevices.length === 0 ? (
              <p className="text-[10px] text-slate-400 text-center py-1">No devices paired</p>
            ) : (
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {pairedDevices.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-700 font-medium truncate">{d.device_name}</span>
                    <span
                      className={`flex items-center gap-1 ${d.is_active ? "text-emerald-600" : "text-slate-400"}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${d.is_active ? "bg-emerald-500" : "bg-slate-300"}`}
                      />
                      {d.is_active ? "Active" : "Offline"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isPaired && (
            <button
              onClick={fetchDevices}
              className="w-full text-[9px] text-blue-600 font-bold hover:text-blue-800 transition-colors cursor-pointer"
            >
              Refresh status
            </button>
          )}
        </div>
      )}
    </div>
  );
}
