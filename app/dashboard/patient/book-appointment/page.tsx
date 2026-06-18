"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  IndianRupee,
  Globe,
  ShieldCheck,
  Video,
  MessageSquare,
  User,
  X,
  ChevronLeft,
  Loader2,
  CheckCircle,
  Calendar,
  ArrowRight,
} from "lucide-react";

interface Doctor {
  id: string;
  user_id: string;
  license_number: string;
  specialization: string;
  qualification: string;
  hospital_affiliation: string | null;
  consultation_fee: number;
  is_verified: boolean;
  workspace_name: string | null;
  consultation_types: string[];
  bio: string | null;
  languages: string[];
  avatar_url: string | null;
}

export default function BookAppointment() {
  const { role, userId, loading: authLoading } = useUserRole();
  const router = useRouter();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Booking form
  const [bookingDate, setBookingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString("sv-SE");
  });
  const [bookingStart, setBookingStart] = useState("10:00");
  const [bookingEnd, setBookingEnd] = useState("10:30");
  const [bookingType, setBookingType] = useState<"physical" | "video" | "chat">("physical");
  const [bookingNotes, setBookingNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [doctorAvatars, setDoctorAvatars] = useState<Record<string, string>>({});

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from("doctor_profiles")
        .select("*")
        .order("is_verified", { ascending: false })
        .order("workspace_name", { ascending: true });

      if (error) throw error;

      const docs = (data || []) as Doctor[];
      setDoctors(docs);

      const specs = [...new Set(docs.map((d) => d.specialization).filter(Boolean))].sort();
      setSpecializations(specs);

      const avatars: Record<string, string> = {};
      for (const doc of docs) {
        if (doc.avatar_url) {
          const { data: urlData } = supabase.storage
            .from("doctor_assets")
            .getPublicUrl(doc.avatar_url);
          avatars[doc.id] = urlData.publicUrl;
        }
      }
      setDoctorAvatars(avatars);
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
      setFetchError("Failed to load doctors. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !userId) {
      router.push("/login");
      return;
    }
    if (!authLoading && role !== "patient") {
      router.push("/dashboard");
      return;
    }
  }, [authLoading, role, router, userId]);

  useEffect(() => {
    if (!userId) return;

    queueMicrotask(() => {
      void fetchDoctors();
    });
  }, [userId, fetchDoctors]);

  const filteredDoctors = doctors.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      (doc.workspace_name || "").toLowerCase().includes(q) ||
      doc.specialization.toLowerCase().includes(q) ||
      doc.qualification.toLowerCase().includes(q) ||
      (doc.hospital_affiliation || "").toLowerCase().includes(q) ||
      (doc.bio || "").toLowerCase().includes(q) ||
      (doc.languages || []).some((l) => l.toLowerCase().includes(q));
    const matchesSpec = !specializationFilter || doc.specialization === specializationFilter;
    return matchesSearch && matchesSpec;
  });

  const openBooking = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setShowBookingModal(true);
    setSuccess(false);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setBookingDate(tomorrow.toLocaleDateString("sv-SE"));
    setBookingStart("10:00");
    setBookingEnd("10:30");
    setBookingType("physical");
    setBookingNotes("");
  };

  const handleBook = async () => {
    if (!selectedDoctor || !userId) return;
    if (bookingEnd <= bookingStart) {
      const { showToast } = await import("@/components/ui/toast");
      showToast("End time must be after start time.", "error");
      return;
    }

    setSaving(true);
    try {
      const { data: patientProfile } = await supabase
        .from("patient_profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (!patientProfile) {
        const { showToast } = await import("@/components/ui/toast");
        showToast("Patient profile not found. Please complete your profile first.", "error");
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("appointments").insert({
        doctor_id: selectedDoctor.id,
        patient_id: patientProfile.id,
        scheduled_date: bookingDate,
        start_time: bookingStart,
        end_time: bookingEnd,
        type: bookingType,
        status: "scheduled",
        notes: bookingNotes || null,
      });

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => {
        setShowBookingModal(false);
        setSelectedDoctor(null);
      }, 2000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to book appointment. Please try again.";
      console.error("Failed to book appointment:", err);
      const { showToast } = await import("@/components/ui/toast");
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0c4381]" />
          <p className="text-sm text-gray-500 font-medium">Finding doctors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 p-6 pb-28">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-gray-900">Choose Your Doctor</h1>
          <p className="text-xs text-gray-500 font-semibold mt-0.5">
            Browse verified doctors and book your appointment
          </p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, specialization, hospital, or language..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSpecializationFilter("")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                !specializationFilter
                  ? "bg-[#0c4381] text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {specializations.map((spec) => (
              <button
                key={spec}
                onClick={() => setSpecializationFilter(spec)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  specializationFilter === spec
                    ? "bg-[#0c4381] text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {fetchError ? (
          <div className="text-center py-12">
            <p className="text-red-500 text-sm font-medium">{fetchError}</p>
            <button
              onClick={() => {
                setFetchError(null);
                fetchDoctors();
              }}
              className="mt-3 text-[#0c4381] text-xs font-semibold underline"
            >
              Try Again
            </button>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <User className="w-16 h-16 text-gray-200 mb-4" />
            <h4 className="text-base font-medium text-gray-900 mb-1">No doctors found</h4>
            <p className="text-sm text-gray-500 max-w-sm">
              {searchQuery || specializationFilter
                ? "Try adjusting your search or filters."
                : "No doctors are registered yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Card top: Avatar + Verified badge */}
                <div className="relative p-5 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-[#0c4381] to-[#006686] flex items-center justify-center text-white text-lg font-bold">
                        {doctorAvatars[doc.id] ? (
                          <img
                            src={doctorAvatars[doc.id]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (doc.workspace_name || doc.specialization).charAt(0).toUpperCase()
                        )}
                      </div>
                      {doc.is_verified && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                          <ShieldCheck className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-gray-900 truncate">
                        {doc.workspace_name || "Doctor"}
                      </h3>
                      <p className="text-[11px] text-gray-500 font-medium">{doc.specialization}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{doc.qualification}</p>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="px-5 pb-3 space-y-1.5">
                  {doc.hospital_affiliation && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{doc.hospital_affiliation}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <IndianRupee className="w-3 h-3 shrink-0" />
                    <span>₹{doc.consultation_fee || 0}</span>
                  </div>
                  {doc.languages && doc.languages.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Globe className="w-3 h-3 shrink-0" />
                      <span>{doc.languages.join(", ")}</span>
                    </div>
                  )}
                  {doc.bio && (
                    <p className="text-[11px] text-gray-400 line-clamp-2 mt-1">{doc.bio}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="px-5 pb-4 pt-1 flex gap-2">
                  <button
                    onClick={() => openBooking(doc)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0c4381] text-white rounded-xl hover:bg-[#093262] transition-colors text-xs font-bold shadow-sm"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Book
                  </button>
                  <button
                    onClick={() =>
                      router.push(
                        `/dashboard/patient/messages?doctor=${doc.id}&doctorUser=${doc.user_id}`
                      )
                    }
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-xs font-bold shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
                <h2 className="text-base font-bold text-gray-900">Book Appointment</h2>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {success ? (
              <div className="p-10 flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Appointment Booked!</h3>
                <p className="text-sm text-gray-500">
                  Your appointment with {selectedDoctor.workspace_name || "Doctor"} on {bookingDate}{" "}
                  at {bookingStart} has been scheduled.
                </p>
              </div>
            ) : (
              <div className="p-5 space-y-5">
                {/* Doctor summary */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#0c4381] to-[#006686] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {doctorAvatars[selectedDoctor.id] ? (
                      <img
                        src={doctorAvatars[selectedDoctor.id]}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (selectedDoctor.workspace_name || selectedDoctor.specialization)
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {selectedDoctor.workspace_name || "Doctor"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedDoctor.specialization} &middot; {selectedDoctor.qualification}
                    </p>
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Date
                  </label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={new Date().toLocaleDateString("sv-SE")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
                  />
                </div>

                {/* Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={bookingStart}
                      onChange={(e) => {
                        setBookingStart(e.target.value);
                        const [h, m] = e.target.value.split(":").map(Number);
                        const endH = h + (m >= 30 ? 1 : 0);
                        const endM = m >= 30 ? m - 30 : m + 30;
                        setBookingEnd(
                          `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`
                        );
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={bookingEnd}
                      onChange={(e) => setBookingEnd(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
                    />
                  </div>
                </div>

                {/* Consultation Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Consultation Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["physical", "video", "chat"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setBookingType(type)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                          bookingType === type
                            ? "border-[#0c4381] bg-[#0c4381]/5 text-[#0c4381]"
                            : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {type === "physical" ? (
                          <User className="w-4 h-4" />
                        ) : type === "video" ? (
                          <Video className="w-4 h-4" />
                        ) : (
                          <MessageSquare className="w-4 h-4" />
                        )}
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Notes (optional)
                  </label>
                  <textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Any specific concerns or symptoms..."
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20 resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleBook}
                  disabled={saving || !bookingDate || !bookingStart || !bookingEnd}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#0c4381] text-white rounded-xl hover:bg-[#093262] transition-colors text-sm font-bold shadow-lg disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {saving ? "Booking..." : "Confirm Appointment"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
