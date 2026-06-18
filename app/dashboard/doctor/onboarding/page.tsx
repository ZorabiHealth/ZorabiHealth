"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Stethoscope,
  ChevronRight,
  CheckCircle,
  Shield,
  FileText,
  Bell,
  Loader2,
  AlertCircle,
} from "lucide-react";

const SPECIALIZATIONS = [
  "General Medicine",
  "Cardiology",
  "Dermatology",
  "Orthopedics",
  "Pediatrics",
  "Neurology",
  "Psychiatry",
  "Ophthalmology",
  "ENT",
  "Gynecology",
  "Gastroenterology",
  "Pulmonology",
  "Endocrinology",
  "Rheumatology",
  "Urology",
  "Oncology",
  "Nephrology",
  "Family Medicine",
  "Internal Medicine",
  "Emergency Medicine",
];

const CONSULTATION_TYPES = [
  { value: "physical", label: "In-Clinic", desc: "Patients visit your clinic" },
  { value: "video", label: "Video Call", desc: "Online consultations via video" },
  { value: "chat", label: "Chat", desc: "Text-based consultations" },
];

const LANGUAGES = [
  "English",
  "Hindi",
  "Kannada",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Marathi",
  "Gujarati",
  "Bengali",
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const PERMISSIONS = [
  {
    id: "data_access",
    label: "Patient Data Access",
    desc: "Access patient medical records, vitals, and history for clinical decisions.",
  },
  {
    id: "prescription",
    label: "Prescription Management",
    desc: "Create, modify, and digitally sign prescriptions for patients.",
  },
  {
    id: "communication",
    label: "Patient Communication",
    desc: "Send messages, alerts, and notifications to your patients.",
  },
  {
    id: "analytics",
    label: "Practice Analytics",
    desc: "View your consultation metrics, patient outcomes, and revenue reports.",
  },
  {
    id: "notifications",
    label: "Push Notifications",
    desc: "Receive real-time alerts for appointments, messages, and prescription updates.",
  },
];

export default function DoctorOnboarding() {
  const { role, userId } = useUserRole();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const [workspaceName, setWorkspaceName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [qualification, setQualification] = useState("");
  const [bio, setBio] = useState("");

  const [consultationTypes, setConsultationTypes] = useState<string[]>(["physical"]);
  const [consultationFee, setConsultationFee] = useState("500");
  const [hospitalAffiliation, setHospitalAffiliation] = useState("");

  const [availability, setAvailability] = useState<
    { day: number; start: string; end: string; enabled: boolean }[]
  >(
    Array.from({ length: 7 }, (_, i) => ({
      day: i,
      start: "09:00",
      end: "17:00",
      enabled: i >= 1 && i <= 5,
    }))
  );

  const [languages, setLanguages] = useState<string[]>(["English"]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (role === null) return;
    if (role !== "doctor") {
      router.push("/dashboard");
      return;
    }
    supabase
      .from("doctor_profiles")
      .select("onboarding_completed")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        if (data?.onboarding_completed) router.push("/dashboard/doctor");
      });
  }, [role, userId, router]);

  const toggleConsultationType = (type: string) =>
    setConsultationTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );

  const toggleLanguage = (lang: string) =>
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );

  const togglePermission = (id: string) =>
    setPermissions((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const toggleAvailabilityDay = (day: number) =>
    setAvailability((prev) => prev.map((a) => (a.day === day ? { ...a, enabled: !a.enabled } : a)));

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const completeOnboarding = async () => {
    if (!userId || !agreed) return;
    setSaving(true);
    setError(null);
    try {
      const { data: profile } = await supabase
        .from("doctor_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();
      if (!profile) throw new Error("No doctor profile found");
      const profileId = profile.id;

      const { error: profileErr } = await supabase
        .from("doctor_profiles")
        .update({
          doctor_name: doctorName,
          workspace_name: workspaceName,
          license_number: licenseNumber,
          specialization,
          qualification,
          bio,
          consultation_types: consultationTypes,
          consultation_fee: parseFloat(consultationFee) || 0,
          hospital_affiliation: hospitalAffiliation,
          languages,
          onboarding_completed: true,
        })
        .eq("id", profileId);
      if (profileErr) throw profileErr;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const avatarPath = `doctor-avatars/${userId}/profile.${ext}`;
        await supabase.storage
          .from("doctor_assets")
          .upload(avatarPath, avatarFile, { upsert: true });
        await supabase
          .from("doctor_profiles")
          .update({ avatar_url: avatarPath })
          .eq("id", profileId);
      }

      const availRows = availability
        .filter((a) => a.enabled)
        .map((a) => ({
          doctor_id: profileId,
          day_of_week: a.day,
          start_time: a.start,
          end_time: a.end,
        }));
      for (const row of availRows) {
        await supabase
          .from("doctor_availability")
          .upsert(row, { onConflict: "doctor_id, day_of_week, start_time" });
      }

      await supabase.from("notifications").insert({
        user_id: userId,
        type: "system",
        title: "Welcome to ZorabiHealth!",
        message: `Welcome Dr. ${workspaceName || "Doctor"}! Your clinic workspace is ready. Start by adding patients and scheduling consultations.`,
        read: false,
      });

      setStep(6);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to complete onboarding");
    } finally {
      setSaving(false);
    }
  };

  if (role !== "doctor") return null;

  const canProceedStep1 =
    doctorName && workspaceName && licenseNumber && specialization && qualification;
  const canProceedStep2 = consultationTypes.length > 0;
  const canProceedStep3 = availability.some((a) => a.enabled);
  const canProceedStep4 = languages.length > 0;
  const canProceedStep5 = agreed && permissions.length > 0;

  return (
    <div className="min-h-screen w-full flex">
      {/* LEFT: Video + Brand */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-gradient-to-br from-[#0c4381] via-[#0a3674] to-[#082a66] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <video autoPlay muted loop playsInline className="w-full h-full object-cover">
            <source src="/logo/video/logo_animation.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="relative z-10 px-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-6">
            <Stethoscope className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Welcome to ZorabiHealth</h2>
          <p className="text-white/70 text-sm leading-relaxed max-w-sm mx-auto">
            Set up your clinical workspace and start managing patients with AI-powered voice
            logging, automated refills, and real-time telemetry.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { icon: FileText, label: "Digital Rx" },
              { icon: Bell, label: "Smart Alerts" },
              { icon: Shield, label: "HIPAA Secure" },
            ].map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-white/80" />
                </div>
                <span className="text-xs text-white/60">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Form */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-slate-100 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800">
                {step <= 5 ? "Set Up Your Clinic Workspace" : "You're All Set!"}
              </h1>
              <p className="text-xs text-slate-400">
                {step <= 5 ? `Step ${step} of 5` : "Onboarding complete"}
              </p>
            </div>
          </div>
          {step <= 5 && (
            <div className="flex gap-1 w-48">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? "bg-blue-600" : "bg-slate-100"}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-8 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {step === 1 && (
            <div className="space-y-5 max-w-lg">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Clinic Information</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Set up your professional workspace details
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Your Full Name *
                </label>
                <input
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Alexander Flemming"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Clinic / Workspace Name *
                </label>
                <input
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. City Health Clinic"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Medical License Number *
                </label>
                <input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. MCI-12345-2024"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Specialization *
                  </label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="">Select...</option>
                    {SPECIALIZATIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Qualification *
                  </label>
                  <input
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    placeholder="e.g. MBBS, MD"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Bio / About You
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Brief description of your practice..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 max-w-lg">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Consultation Settings</h2>
                <p className="text-sm text-slate-500 mt-1">How do you provide consultations?</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-2 block">
                  Consultation Types *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {CONSULTATION_TYPES.map((ct) => (
                    <button
                      key={ct.value}
                      onClick={() => toggleConsultationType(ct.value)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        consultationTypes.includes(ct.value)
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <p className="font-semibold text-sm">{ct.label}</p>
                      <p className="text-xs mt-1 opacity-70">{ct.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Consultation Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Hospital / Clinic Affiliation
                  </label>
                  <input
                    value={hospitalAffiliation}
                    onChange={(e) => setHospitalAffiliation(e.target.value)}
                    placeholder="e.g. City Hospital"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 max-w-lg">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Weekly Availability</h2>
                <p className="text-sm text-slate-500 mt-1">Set your regular weekly schedule</p>
              </div>
              <div className="space-y-2">
                {availability.map((slot) => (
                  <div
                    key={slot.day}
                    className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                      slot.enabled
                        ? "border-blue-200 bg-blue-50/50"
                        : "border-slate-200 bg-slate-50/50"
                    }`}
                  >
                    <button
                      onClick={() => toggleAvailabilityDay(slot.day)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        slot.enabled ? "bg-blue-600 border-blue-600" : "border-slate-300"
                      }`}
                    >
                      {slot.enabled && <CheckCircle className="w-4 h-4 text-white" />}
                    </button>
                    <span
                      className={`text-sm font-medium w-24 ${slot.enabled ? "text-slate-800" : "text-slate-400"}`}
                    >
                      {DAYS[slot.day]}
                    </span>
                    {slot.enabled ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) =>
                            setAvailability((prev) =>
                              prev.map((a) =>
                                a.day === slot.day ? { ...a, start: e.target.value } : a
                              )
                            )
                          }
                          className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-sm"
                        />
                        <span className="text-slate-400 text-sm">to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) =>
                            setAvailability((prev) =>
                              prev.map((a) =>
                                a.day === slot.day ? { ...a, end: e.target.value } : a
                              )
                            )
                          }
                          className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Unavailable</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 max-w-lg">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Languages & Profile Photo</h2>
                <p className="text-sm text-slate-500 mt-1">
                  How would you like your profile to appear?
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-2 block">
                  Languages You Speak *
                </label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => toggleLanguage(lang)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        languages.includes(lang)
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-2 block">
                  Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Stethoscope className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <label className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors">
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6 max-w-lg">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Agreement & Permissions</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Review terms and grant necessary permissions
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 max-h-48 overflow-y-auto">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">Terms of Service</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  By using ZorabiHealth, you agree to comply with all applicable healthcare
                  regulations including HIPAA, local medical board guidelines, and data protection
                  laws. You are responsible for maintaining the confidentiality of patient data,
                  using the platform only for legitimate clinical purposes, and reporting any
                  security incidents immediately. ZorabiHealth reserves the right to suspend
                  accounts that violate these terms. Your practice data is encrypted at rest and in
                  transit. You retain ownership of all patient records created through the platform.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Required Permissions</h3>
                <div className="space-y-2">
                  {PERMISSIONS.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        permissions.includes(p.id)
                          ? "border-blue-200 bg-blue-50/50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={permissions.includes(p.id)}
                        onChange={() => togglePermission(p.id)}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{p.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-dashed border-slate-300 cursor-pointer hover:border-blue-400 transition-colors">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    I agree to the Terms of Service and Privacy Policy
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    I confirm that I am a licensed medical practitioner and all information provided
                    is accurate.
                  </p>
                </div>
              </label>
            </div>
          )}

          {step === 6 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome to ZorabiHealth!</h2>
              <p className="text-sm text-slate-500 max-w-md mb-8">
                Your clinic workspace is ready. You can now start adding patients, scheduling
                consultations, and writing digital prescriptions.
              </p>
              <button
                onClick={() => router.push("/dashboard/doctor")}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Footer nav */}
        {step <= 5 && (
          <div className="border-t border-slate-100 px-8 py-4 flex justify-between">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Back
            </button>
            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2) ||
                  (step === 3 && !canProceedStep3) ||
                  (step === 4 && !canProceedStep4)
                }
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-all"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={completeOnboarding}
                disabled={saving || !canProceedStep5}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-all"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {saving ? "Setting Up..." : "Go Live — Start Practice"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
