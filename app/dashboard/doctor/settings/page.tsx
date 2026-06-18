"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Settings,
  Save,
  Loader2,
  User,
  FileText,
  Camera,
  PenLine,
  Bell,
  Clock,
  HeartPulse,
  CheckCircle,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";

interface DoctorProfile {
  id: string;
  doctor_name: string;
  workspace_name: string;
  avatar_url: string;
  signature_url: string;
  specialization: string;
  qualification: string;
  hospital_affiliation: string;
  consultation_fee: number;
  bio: string;
  languages: string;
  [key: string]: unknown;
}

function Section({
  id,
  title,
  icon,
  children,
  isOpen,
  onToggle,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => onToggle(isOpen ? "" : id)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0c4381]/10 flex items-center justify-center text-[#0c4381]">
            {icon}
          </div>
          <span className="text-sm font-semibold text-gray-900">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isOpen && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

export default function DoctorSettings() {
  const { role, userId, loading: authLoading } = useUserRole();
  const router = useRouter();

  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Profile fields
  const [doctorName, setDoctorName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [qualification, setQualification] = useState("");
  const [hospitalAffiliation, setHospitalAffiliation] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");

  // Notification prefs
  const [medReminders, setMedReminders] = useState(true);
  const [refillAlerts, setRefillAlerts] = useState(true);
  const [apptReminders, setApptReminders] = useState(true);

  // Prescriptions list
  const [prescriptions, setPrescriptions] = useState<
    { id: string; diagnosis: string; status: string; created_at: string; hasPdf: boolean }[]
  >([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

  // Avatar & Signature
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [sigFile, setSigFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [sigPreview, setSigPreview] = useState<string | null>(null);
  const [doctorEmail, setDoctorEmail] = useState("");

  // Accordion
  const [openSection, setOpenSection] = useState<string>("profile");

  useEffect(() => {
    if (!authLoading && !userId) {
      router.push("/login");
      return;
    }
    if (!authLoading && role !== "doctor") {
      router.push("/dashboard");
      return;
    }
  }, [authLoading, role, userId, router]);

  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async (): Promise<{ id: string } | null> => {
      try {
        setLoading(true);
        const { data: profile } = await supabase
          .from("doctor_profiles")
          .select("*")
          .eq("user_id", userId)
          .single();
        if (profile) {
          setDoctorProfile(profile);
          setDoctorName(profile.doctor_name || "");
          setSpecialization(profile.specialization || "");
          setQualification(profile.qualification || "");
          setHospitalAffiliation(profile.hospital_affiliation || "");
          setConsultationFee(profile.consultation_fee?.toString() || "");
          setBio(profile.bio || "");
          setLanguages(
            Array.isArray(profile.languages)
              ? profile.languages.join(", ")
              : profile.languages || ""
          );
          setWorkspaceName(profile.workspace_name || "");

          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user?.email) setDoctorEmail(user.email);

          if (profile.avatar_url) {
            const { data } = supabase.storage
              .from("doctor_assets")
              .getPublicUrl(profile.avatar_url);
            setAvatarPreview(data.publicUrl);
          }
          if (profile.signature_url) {
            const { data } = supabase.storage
              .from("doctor_assets")
              .getPublicUrl(profile.signature_url);
            setSigPreview(data.publicUrl);
          }

          return profile;
        }

        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", userId)
          .single();
        if (prefs) {
          setMedReminders(prefs.medication_reminders ?? true);
          setRefillAlerts(prefs.refill_alerts ?? true);
          setApptReminders(prefs.vital_alerts ?? true);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        return null;
      } finally {
        setLoading(false);
      }
      return null;
    };
    fetchProfile().then(async (profile) => {
      if (profile?.id) {
        const doctorId = profile.id;
        setLoadingPrescriptions(true);
        try {
          const { data: rxData } = await supabase
            .from("prescriptions")
            .select("id, diagnosis, status, created_at")
            .eq("doctor_id", doctorId)
            .order("created_at", { ascending: false })
            .limit(50);

          if (rxData) {
            const rxIds = rxData.map((r) => r.id);
            const { data: docData } = await supabase
              .from("prescription_documents")
              .select("prescription_id")
              .in("prescription_id", rxIds);

            const hasPdfSet = new Set(docData?.map((d) => d.prescription_id) ?? []);

            setPrescriptions(
              rxData.map((r) => ({
                ...r,
                hasPdf: hasPdfSet.has(r.id),
              }))
            );
          }
        } catch (err) {
          console.error("Failed to load prescriptions:", err);
        } finally {
          setLoadingPrescriptions(false);
        }
      }
    });
  }, [userId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarFile, avatarPreview]);

  useEffect(() => {
    return () => {
      if (sigPreview?.startsWith("blob:")) URL.revokeObjectURL(sigPreview);
    };
  }, [sigFile, sigPreview]);

  const handleSaveProfile = async () => {
    if (!doctorProfile) return;
    setSaving(true);
    try {
      let avatarUrl = doctorProfile.avatar_url;
      let sigUrl = doctorProfile.signature_url;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${userId}/avatar.${ext}`;
        await supabase.storage.from("doctor_assets").upload(path, avatarFile, { upsert: true });
        avatarUrl = path;
      }
      if (sigFile) {
        const ext = sigFile.name.split(".").pop();
        const path = `${userId}/signature.${ext}`;
        await supabase.storage.from("doctor_assets").upload(path, sigFile, { upsert: true });
        sigUrl = path;
      }

      const { error: profileErr } = await supabase
        .from("doctor_profiles")
        .update({
          doctor_name: doctorName.trim() || doctorProfile.doctor_name,
          specialization: specialization.trim() || doctorProfile.specialization,
          qualification: qualification.trim() || doctorProfile.qualification,
          hospital_affiliation: hospitalAffiliation.trim() || doctorProfile.hospital_affiliation,
          consultation_fee: consultationFee
            ? parseFloat(consultationFee)
            : doctorProfile.consultation_fee,
          bio: bio.trim(),
          languages: languages.trim()
            ? languages
                .split(",")
                .map((l) => l.trim())
                .filter(Boolean)
            : [],
          workspace_name: workspaceName.trim() || doctorProfile.workspace_name,
          avatar_url: avatarUrl,
          signature_url: sigUrl,
        })
        .eq("id", doctorProfile.id);

      if (profileErr) throw profileErr;

      await supabase.from("notification_preferences").upsert(
        {
          user_id: userId,
          medication_reminders: medReminders,
          refill_alerts: refillAlerts,
          vital_alerts: apptReminders,
        },
        { onConflict: "user_id" }
      );

      setDoctorProfile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          doctor_name: doctorName.trim() || prev.doctor_name,
          specialization: specialization.trim() || prev.specialization,
          qualification: qualification.trim() || prev.qualification,
          hospital_affiliation: hospitalAffiliation.trim() || prev.hospital_affiliation,
          consultation_fee: consultationFee ? parseFloat(consultationFee) : prev.consultation_fee,
          bio: bio.trim(),
          languages: languages.trim()
            ? languages
                .split(",")
                .map((l) => l.trim())
                .filter(Boolean)
                .join(", ")
            : "",
          workspace_name: workspaceName.trim() || prev.workspace_name,
          avatar_url: avatarUrl,
          signature_url: sigUrl,
        };
      });
      setToast({ message: "Settings saved successfully!", type: "success" });
    } catch (err: unknown) {
      console.error("Failed to save settings:", err);
      setToast({
        message: err instanceof Error ? err.message : "Failed to save settings.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        (await supabase.auth.getUser()).data.user?.email || "",
        { redirectTo: `${window.location.origin}/auth/callback` }
      );
      if (error) throw error;
      setToast({ message: "Password reset email sent!", type: "success" });
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : "Failed to send reset email.",
        type: "error",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0c4381]" />
          <p className="text-sm text-gray-500 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 p-6 pb-28">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 rounded-2xl px-6 py-4 flex items-center gap-3 shadow-xl animate-slide-up ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <X className="w-5 h-5" />
          )}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Settings className="w-6 h-6 text-[#0c4381]" /> Settings
            </h1>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">
              Manage your profile, preferences, and workspace
            </p>
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0c4381] text-white rounded-xl hover:bg-[#093262] transition-colors shadow-md shadow-[#0c4381]/20 text-xs font-bold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>

        {/* Profile Picture & Signature Summary */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100">
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Avatar"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <User className="w-8 h-8" />
                  </div>
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="w-6 h-6 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setAvatarFile(f);
                      setAvatarPreview(URL.createObjectURL(f));
                    }
                  }}
                />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-gray-900">
                {doctorProfile?.doctor_name ||
                  doctorProfile?.workspace_name ||
                  "ZorabiHealth Center"}
              </p>
              <p className="text-sm text-gray-500">
                {doctorProfile?.specialization || "General Medicine"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                License: {String(doctorProfile?.license_number ?? "")}
              </p>
            </div>
            <div className="text-center">
              <div className="w-28 border-b-2 border-gray-300 mb-1">
                {sigPreview ? (
                  <Image
                    src={sigPreview}
                    alt="Signature"
                    width={160}
                    height={48}
                    className="h-12 mx-auto object-contain border-b-2 border-gray-300"
                  />
                ) : (
                  <div className="h-12"></div>
                )}
              </div>
              <label className="text-[10px] text-[#0c4381] font-semibold cursor-pointer hover:underline flex items-center justify-center gap-1">
                <PenLine className="w-3 h-3" /> {sigPreview ? "Change Signature" : "Add Signature"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setSigFile(f);
                      setSigPreview(URL.createObjectURL(f));
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <Section
          id="profile"
          title="Profile Information"
          icon={<User className="w-4 h-4" />}
          isOpen={openSection === "profile"}
          onToggle={(id) => setOpenSection(id)}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field label="Your Full Name">
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="e.g. Dr. Alexander Flemming"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
              />
            </Field>
            <Field label="Workspace / Clinic Name">
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g. ZorabiHealth Center"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
              />
            </Field>
            <Field label="Specialization">
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Cardiology"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
              />
            </Field>
            <Field label="Qualification">
              <input
                type="text"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="e.g. MD, MBBS"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
              />
            </Field>
            <Field label="Hospital Affiliation">
              <input
                type="text"
                value={hospitalAffiliation}
                onChange={(e) => setHospitalAffiliation(e.target.value)}
                placeholder="e.g. City Hospital"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
              />
            </Field>
            <Field label="Consultation Fee (₹)">
              <input
                type="number"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                placeholder="e.g. 500"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
              />
            </Field>
            <Field label="Languages (comma-separated)">
              <input
                type="text"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="e.g. English, Hindi, Kannada"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Professional Bio">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Short professional bio..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20 resize-none"
              />
            </Field>
          </div>
        </Section>

        {/* Notifications Section */}
        <Section
          id="notifications"
          title="Notification Preferences"
          icon={<Bell className="w-4 h-4" />}
          isOpen={openSection === "notifications"}
          onToggle={(id) => setOpenSection(id)}
        >
          <div className="space-y-3 mt-4">
            <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-[#0c4381]" />
                <span className="text-sm font-medium text-gray-700">Medication Reminders</span>
              </div>
              <input
                type="checkbox"
                checked={medReminders}
                onChange={(e) => setMedReminders(e.target.checked)}
                className="rounded border-gray-300 text-[#0c4381] focus:ring-[#0c4381]/25 w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-[#0c4381]" />
                <span className="text-sm font-medium text-gray-700">Refill Alerts</span>
              </div>
              <input
                type="checkbox"
                checked={refillAlerts}
                onChange={(e) => setRefillAlerts(e.target.checked)}
                className="rounded border-gray-300 text-[#0c4381] focus:ring-[#0c4381]/25 w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <HeartPulse className="w-4 h-4 text-[#0c4381]" />
                <span className="text-sm font-medium text-gray-700">
                  Appointment & Vital Alerts
                </span>
              </div>
              <input
                type="checkbox"
                checked={apptReminders}
                onChange={(e) => setApptReminders(e.target.checked)}
                className="rounded border-gray-300 text-[#0c4381] focus:ring-[#0c4381]/25 w-5 h-5"
              />
            </label>
          </div>
        </Section>

        {/* Prescriptions & Documents Section */}
        <Section
          id="prescriptions"
          title="Prescriptions &amp; Documents"
          icon={<FileText className="w-4 h-4" />}
          isOpen={openSection === "prescriptions"}
          onToggle={(id) => setOpenSection(id)}
        >
          <div className="mt-4 space-y-3">
            {loadingPrescriptions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[#0c4381]" />
              </div>
            ) : prescriptions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No prescriptions yet.</p>
            ) : (
              prescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {rx.diagnosis || "No diagnosis"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-400">
                        {new Date(rx.created_at).toLocaleDateString()}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          rx.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : rx.status === "active"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {rx.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {rx.hasPdf && (
                      <button
                        onClick={async () => {
                          try {
                            const { data: docData } = await supabase
                              .from("prescription_documents")
                              .select("storage_path")
                              .eq("prescription_id", rx.id)
                              .single();
                            if (docData?.storage_path) {
                              const { data: signed } = await supabase.storage
                                .from("prescription_pdfs")
                                .createSignedUrl(docData.storage_path, 3600);
                              if (signed?.signedUrl) {
                                window.open(signed.signedUrl, "_blank");
                              }
                            }
                          } catch (err) {
                            console.error("Failed to open PDF:", err);
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-[#0c4381]/10 text-[#0c4381] rounded-lg text-[10px] font-semibold hover:bg-[#0c4381]/20 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" /> PDF
                      </button>
                    )}
                    <Link
                      href={`/dashboard/doctor?edit=${rx.id}`}
                      className="text-[10px] text-gray-400 hover:text-[#0c4381] font-semibold transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </Section>

        {/* Account Section */}
        <Section
          id="account"
          title="Account & Security"
          icon={<FileText className="w-4 h-4" />}
          isOpen={openSection === "account"}
          onToggle={(id) => setOpenSection(id)}
        >
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-xl bg-gray-50">
              <p className="text-sm font-medium text-gray-900">Email Address</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {doctorEmail || String(doctorProfile?.user_id ?? userId)}
              </p>
            </div>
            <button
              onClick={resetPassword}
              className="w-full px-4 py-3 rounded-xl bg-[#0c4381]/10 text-[#0c4381] font-bold text-sm hover:bg-[#0c4381]/20 transition-colors"
            >
              Send Password Reset Email
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
