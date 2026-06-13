"use client";

import React, { useState, useEffect } from "react";
import {
  UserCheck,
  BellRing,
  ShieldCheck,
  Save,
  CheckCircle2,
  Smartphone,
  Loader2,
  XCircle,
  LogIn,
  QrCode,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";

interface PairedDevice {
  id: string;
  device_name: string;
  platform: string;
  is_active: boolean;
  last_active_at: string;
  paired_at: string;
  is_same_account: boolean;
}

export default function SettingsPage() {
  const [name, setName] = useState("Dr. Sarah Jenkins");
  const [age, setAge] = useState("34");
  const [height, setHeight] = useState("168");
  const [weight, setWeight] = useState("62");

  // Alert Preferences State
  const [isHRAlertsOn, setIsHRAlertsOn] = useState(true);
  const [isSpO2AlertsOn, setIsSpO2AlertsOn] = useState(true);
  const [isDailyReportsOn, setIsDailyReportsOn] = useState(false);

  // Success Notification State
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Test push notification state
  const [sendingTestPush, setSendingTestPush] = useState(false);
  const [testPushResult, setTestPushResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Supabase session state
  const [session, setSession] = useState<any>(null);

  // Paired devices state
  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);

  // Pairing code state
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeExpiresIn, setCodeExpiresIn] = useState(0);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const {
          data: { session: s },
        } = await supabase.auth.getSession();
        if (s) {
          setSession(s);
          if (s.user) {
            const emailName = s.user.email ? s.user.email.split("@")[0] : "";
            const formattedName = emailName
              ? emailName.charAt(0).toUpperCase() + emailName.slice(1)
              : "Clinician";
            setName(s.user.user_metadata?.full_name || formattedName);
          }
        }
      } catch (e) {
        console.error("Failed to fetch session:", e);
      }
    };
    fetchSession();
  }, []);

  // Fetch devices + subscribe to Realtime for live updates
  useEffect(() => {
    if (!session) return;

    const fetchDevices = async () => {
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
      } catch (e) {
        console.error("Failed to fetch paired devices:", e);
      } finally {
        setLoadingDevices(false);
      }
    };

    fetchDevices();

    const deviceChannel = supabase
      .channel(`web-devices-${session.user?.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_pairings",
          filter: `web_user_id=eq.${session.user?.id}`,
        },
        () => {
          fetchDevices();
        }
      )
      .subscribe();

    return () => {
      deviceChannel.unsubscribe();
    };
  }, [session]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    // Pendo Track: settings_saved
    if (typeof window !== 'undefined' && (window as any).pendo) {
      (window as any).pendo.track('settings_saved', {
        hr_alerts_enabled: isHRAlertsOn,
        spo2_alerts_enabled: isSpO2AlertsOn,
        daily_reports_enabled: isDailyReportsOn,
      });
    }

    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 4000);
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
    setGeneratingCode(true);
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

        // Pendo Track: device_pairing_code_generated
        if (typeof window !== 'undefined' && (window as any).pendo) {
          (window as any).pendo.track('device_pairing_code_generated', {
            code_expires_in_seconds: json.expires_in || 600,
          });
        }
      }
    } catch (e) {
      console.error("Failed to generate pairing code:", e);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleTestPush = async () => {
    const token = await getFreshToken();
    if (!token) return;
    setSendingTestPush(true);
    setTestPushResult(null);

    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: "Test Push",
          body: "This is a test notification from your dashboard",
          category: "medication",
          priority: "high",
          data: { source: "dashboard_test" },
        }),
      });

      const json = await res.json();
      if (res.ok && json.notification_id) {
        // Pendo Track: test_push_notification_sent
        if (typeof window !== 'undefined' && (window as any).pendo) {
          (window as any).pendo.track('test_push_notification_sent', {
            dispatched_count: json.dispatched || 0,
            success: true,
          });
        }

        if (json.dispatched > 0) {
          setTestPushResult({ ok: true, msg: `Push sent to ${json.dispatched} device(s)` });
        } else {
          setTestPushResult({
            ok: true,
            msg: json.message || "Notification created. Mobile will receive it via Realtime.",
          });
        }
      } else {
        setTestPushResult({
          ok: false,
          msg: json.detail || json.error || "Failed to create notification",
        });
      }
    } catch (err: any) {
      setTestPushResult({ ok: false, msg: err.message || "Request failed" });
    } finally {
      setSendingTestPush(false);
    }
  };

  const pairingUrl = pairingCode ? `zorabihealth://pair?c=${pairingCode}` : "";

  return (
    <div className="p-8 space-y-8 w-full min-h-full bg-[#f0f5ff] relative">
      {/* Success Notification Alert */}
      {showSuccessToast && (
        <div className="fixed top-8 right-8 z-50 p-4 bg-emerald-500 text-white rounded-2xl flex items-center gap-3 shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-xs font-bold">Settings updated successfully!</span>
        </div>
      )}

      {/* Header Banner */}
      <header className="flex justify-between items-center bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Settings</h1>
          <p className="text-slate-500 text-sm font-semibold mt-1">
            Configure your clinician profile and notification thresholds database.
          </p>
        </div>
      </header>

      {/* Main Grid Forms */}
      <div className="grid grid-cols-12 gap-8">
        <form onSubmit={handleSaveSettings} className="col-span-12 space-y-8">
          {/* Profile Section Card */}
          <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex gap-2.5 items-center mb-2">
              <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <UserCheck className="text-brand-500 h-5.5 w-5.5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">Personal Profile</h3>
                <p className="text-slate-500 text-xs font-semibold">
                  Verify clinical account identifiers.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Age (yrs)
                </label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Height (cm)
                </label>
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Weight (kg)
                </label>
                <Input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                />
              </div>
            </div>
          </section>

          {/* Mobile App Pairing Section */}
          <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex gap-2.5 items-center mb-2">
              <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <ShieldCheck className="text-brand-500 h-5.5 w-5.5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">Pair Mobile Device</h3>
                <p className="text-slate-500 text-xs font-semibold">
                  Link the mobile app for notifications and alarm sync.
                </p>
              </div>
            </div>

            {/* Auto-pairing info banner — always shown when logged in */}
            {session && (
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <LogIn className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-800">Auto-pairing active</p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    Log into the mobile app with{" "}
                    <span className="font-black">{session.user?.email}</span> to automatically pair
                    — no QR needed. Devices appear below instantly.
                  </p>
                </div>
              </div>
            )}

            {/* Same-user pairing — quick code */}
            {session ? (
              <div className="flex flex-col md:flex-row items-center gap-8 bg-emerald-50 p-6 rounded-3xl border border-emerald-200">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100 shrink-0 flex flex-col items-center gap-3">
                  {pairingCode ? (
                    <>
                      <QRCodeSVG value={pairingUrl} size={160} />
                      <p className="text-xs font-bold text-slate-500">
                        Code:{" "}
                        <span className="text-blue-600 text-lg font-black tracking-[0.3em]">
                          {pairingCode}
                        </span>
                      </p>
                      <p className="text-[10px] text-amber-600 font-bold">
                        Expires in {Math.floor(codeExpiresIn / 60)}:
                        {String(codeExpiresIn % 60).padStart(2, "0")}
                      </p>
                    </>
                  ) : (
                    <button
                      onClick={generatePairingCode}
                      disabled={generatingCode}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm"
                    >
                      {generatingCode ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <QrCode className="h-4 w-4" />
                      )}
                      {generatingCode ? "Generating..." : "Show Pairing Code"}
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-emerald-800">
                    Pair your mobile (same email)
                  </h4>
                  <p className="text-xs text-emerald-700 font-semibold leading-relaxed">
                    Logged in with the same email on both devices? Use the code above to pair
                    instantly.
                  </p>
                  <ol className="list-decimal list-inside text-xs text-emerald-600 space-y-1.5 font-semibold">
                    <li>
                      Open the mobile app →{" "}
                      <span className="font-extrabold text-emerald-800">Settings</span>
                    </li>
                    <li>
                      Enter this code in the{" "}
                      <span className="font-extrabold text-emerald-800">pairing code</span> field
                    </li>
                    <li>
                      Tap <span className="font-extrabold text-emerald-800">Pair</span> — done!
                    </li>
                  </ol>
                  {pairingCode && (
                    <button
                      onClick={generatePairingCode}
                      className="text-[10px] text-emerald-600 font-bold underline"
                    >
                      Regenerate code
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 text-center py-10">
                <p className="text-sm text-emerald-700 font-bold">
                  Sign in to generate a pairing code.
                </p>
              </div>
            )}
          </section>

          {/* Paired Devices List */}
          {session && (
            <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
              <div className="flex gap-2.5 items-center mb-2">
                <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center">
                  <Smartphone className="text-brand-500 h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Paired Devices</h3>
                  <p className="text-slate-500 text-xs font-semibold">
                    Devices linked to your account for notifications and sync.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-3xl border border-slate-100 divide-y divide-slate-100">
                {loadingDevices ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : pairedDevices.length === 0 ? (
                  <div className="text-center py-10">
                    <Smartphone className="h-8 w-8 text-slate-300 mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-slate-500 font-bold">No devices paired yet.</p>
                    <p className="text-xs text-slate-400 font-semibold mt-1">
                      Use the QR code above to pair your mobile device.
                    </p>
                  </div>
                ) : (
                  pairedDevices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center ${device.is_active ? "bg-emerald-50" : "bg-slate-100"}`}
                        >
                          <Smartphone
                            className={`h-4.5 w-4.5 ${device.is_active ? "text-emerald-600" : "text-slate-400"}`}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{device.device_name}</p>
                          <p className="text-[11px] text-slate-500 font-semibold">
                            {device.platform}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {device.is_same_account && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-wider">
                            <LogIn className="h-2.5 w-2.5" /> Auto
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${device.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}
                        >
                          {device.is_active ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" /> Inactive
                            </>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {new Date(device.paired_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* Alerts / Vitals Thresholds Card */}
          <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex gap-2.5 items-center mb-2">
              <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <BellRing className="text-brand-500 h-5.5 w-5.5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">Alert Prefs &amp; Thresholds</h3>
                <p className="text-slate-500 text-xs font-semibold">
                  Alert settings for abnormal vitals triggers.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Heart Rate Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Heart Rate Alerts</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Notify immediately when heart rate falls below 50 or above 110 bpm.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isHRAlertsOn}
                  onChange={(e) => setIsHRAlertsOn(e.target.checked)}
                  className="w-5 h-5 accent-brand-500 border-slate-300 rounded cursor-pointer"
                />
              </div>

              {/* SpO2 Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Oxygen Level Warnings</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Alert immediately when oxygen saturation (SpO2) falls below 95%.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isSpO2AlertsOn}
                  onChange={(e) => setIsSpO2AlertsOn(e.target.checked)}
                  className="w-5 h-5 accent-brand-500 border-slate-300 rounded cursor-pointer"
                />
              </div>

              {/* Daily Reports Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Daily Telemetry Reports</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Send a comprehensive daily diagnosis analysis report to my email.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isDailyReportsOn}
                  onChange={(e) => setIsDailyReportsOn(e.target.checked)}
                  className="w-5 h-5 accent-brand-500 border-slate-300 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Test Push Notification */}
            <div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-200 rounded-2xl">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-brand-600" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Test Push Notification</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    Send a test push to all registered devices
                  </p>
                  {testPushResult && (
                    <p
                      className={`text-[10px] font-bold mt-1 ${testPushResult.ok ? "text-emerald-600" : "text-red-500"}`}
                    >
                      {testPushResult.msg}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleTestPush}
                disabled={sendingTestPush || !session}
                className="bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white font-bold py-2 px-4 rounded-xl text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm"
              >
                {sendingTestPush ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Smartphone className="h-3.5 w-3.5" />
                )}
                {sendingTestPush ? "Sending..." : "Send Test"}
              </button>
            </div>
          </section>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 px-8 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-brand-500/10"
            >
              <Save className="h-4 w-4" /> Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
