"use client";

import React, { useState } from "react";
import {
  Settings,
  UserCheck,
  BellRing,
  ShieldCheck,
  Save,
  HeartPulse,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 4000);
  };

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
