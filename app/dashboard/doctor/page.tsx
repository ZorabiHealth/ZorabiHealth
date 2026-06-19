"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  FileText,
  Clock,
  ChevronRight,
  Plus,
  Pill,
  Search,
  Activity,
  HeartPulse,
  Settings,
  Trash2,
  Edit2,
  Calendar,
  Sparkles,
  RefreshCw,
  Globe,
  Eye,
  Printer,
  Save,
  CheckCircle,
  X,
  Stethoscope,
  BriefcaseMedical,
  ClipboardList,
  FileDown,
  Loader2,
  LogOut,
} from "lucide-react";

const safeUUID = (): string => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
};

interface Patient {
  id: string;
  name: string;
  email: string;
  code: string;
  avatar: string;
}

interface PrescribedMedication {
  id?: string;
  drug_id: string | null;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
  morning: number;
  afternoon: number;
  night: number;
}

interface CatalogDrug {
  id: string;
  name: string;
  generic_name: string;
  category: string;
}

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

interface PastVisitItem {
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

interface PastVisit {
  id: string;
  date: string;
  diagnosis: string;
  doctor: string;
  notes: string;
  items: PastVisitItem[];
  hasPdf: boolean;
}

export default function DoctorDashboard() {
  const { role, userId } = useUserRole();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Doctor Profile
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [doctorName, setDoctorName] = useState("Dr. [Loading...]");
  const [loadingDoctor, setLoadingDoctor] = useState(true);
  // Allergy data
  const [patientAllergies, setPatientAllergies] = useState<string[]>([]);

  // Patients states
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");

  // Vitals states
  const [systolicBP, setSystolicBP] = useState("120");
  const [diastolicBP, setDiastolicBP] = useState("80");
  const [spO2, setSpO2] = useState("98");
  const [pulseRate, setPulseRate] = useState("72");
  const [temp, setTemp] = useState("98.6");
  const [height, setHeight] = useState("175");
  const [weight, setWeight] = useState("70");
  // bmi is derived via useMemo below

  // Symptoms & Diagnosis states
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  // Medications search states
  const [drugSearchQuery, setDrugSearchQuery] = useState("");
  const [catalogSuggestions, setCatalogSuggestions] = useState<CatalogDrug[]>([]);
  const [, setIsSearchingDrugs] = useState(false);

  // Dosing form state
  const [selectedDrug, setSelectedDrug] = useState<CatalogDrug | null>(null);
  const [customDrugName, setCustomDrugName] = useState("");
  const [dosage, setDosage] = useState("500mg");
  const [frequency, setFrequency] = useState("1x Daily");
  const [duration, setDuration] = useState("7 Days");
  const [medNotes, setMedNotes] = useState("After Food");
  const [morningDose, setMorningDose] = useState(true);
  const [afternoonDose, setAfternoonDose] = useState(false);
  const [nightDose, setNightDose] = useState(false);

  // Prescribed Medications list
  const [prescribedMeds, setPrescribedMeds] = useState<PrescribedMedication[]>([]);
  const [editingMedIndex, setEditingMedIndex] = useState<number | null>(null);

  // Internal Notes & Follow-up
  const [internalNotes, setInternalNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  // Create patient modal
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientEmail, setNewPatientEmail] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [creatingPatient, setCreatingPatient] = useState(false);

  // Past Visits & AI warnings
  const [pastVisits, setPastVisits] = useState<PastVisit[]>([]);
  const [loadingPastVisits, setLoadingPastVisits] = useState(false);
  const [selectedPastVisit, setSelectedPastVisit] = useState<PastVisit | null>(null);

  // UI status overlays
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [languagePopupOpen, setLanguagePopupOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");

  // Profile edit modal
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editWorkspaceName, setEditWorkspaceName] = useState("");
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [editSignature, setEditSignature] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [editSignaturePreview, setEditSignaturePreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Inline profile edit state
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [editSpecialization, setEditSpecialization] = useState("");
  const [editQualification, setEditQualification] = useState("");
  const [editHospitalAffiliation, setEditHospitalAffiliation] = useState("");
  const [editConsultationFee, setEditConsultationFee] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLanguages, setEditLanguages] = useState("");

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Auto calculate BMI when height/weight changes
  const bmi = useMemo(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (h > 0 && w > 0) {
      return (w / ((h / 100) * (h / 100))).toFixed(1);
    }
    return "";
  }, [height, weight]);

  // Fetch / Create doctor profile and load patients
  useEffect(() => {
    if (role === null) return;
    if (role !== "doctor") {
      router.push("/dashboard");
      return;
    }

    const initDoctor = async () => {
      setLoadingDoctor(true);
      try {
        // Fetch or create profile
        const { data: profileData, error: profileErr } = await supabase
          .from("doctor_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (profileErr) throw profileErr;

        let profile = profileData;

        if (!profile) {
          const { data: newProfile, error: createErr } = await supabase
            .from("doctor_profiles")
            .insert({
              user_id: userId,
              license_number: `LIC-${userId?.slice(0, 8).toUpperCase()}`,
              specialization: "General Medicine",
              qualification: "MD, MBBS",
              hospital_affiliation: "Zorabi Health Center",
              consultation_fee: 500,
              is_verified: true,
            })
            .select()
            .single();

          if (createErr) throw createErr;
          profile = newProfile;
        }
        setDoctorProfile(profile);

        // Doctor display name: doctor_name is the primary source (set during onboarding)
        if (profile?.doctor_name) {
          const dn = profile.doctor_name.startsWith("Dr. ")
            ? profile.doctor_name
            : `Dr. ${profile.doctor_name}`;
          setDoctorName(dn);
        } else if (profile?.workspace_name) {
          setDoctorName(`Dr. ${profile.workspace_name}`);
        } else {
          // Fallback to auth metadata, then email
          const { data: authData } = await supabase.auth.getUser();
          const authUser = authData?.user;
          const metaName = authUser?.user_metadata?.full_name;
          const emailName = authUser?.email
            ? authUser.email.split("@")[0].replace(/[._]/g, " ")
            : null;
          const fallbackName = metaName || emailName || profile?.qualification || "Doctor";
          const displayName = fallbackName.startsWith("Dr. ")
            ? fallbackName
            : `Dr. ${fallbackName}`;
          setDoctorName(displayName);
        }

        if (!profile.onboarding_completed) {
          router.push("/dashboard/doctor/onboarding");
          return;
        }

        // Fetch patients from patient_profiles
        const { data: ppData } = await supabase
          .from("patient_profiles")
          .select("id, full_name, email")
          .order("full_name", { ascending: true });

        const list: Patient[] = (ppData || []).map((p) => {
          return {
            id: p.id,
            name: p.full_name,
            email: p.email || "",
            code: `#VP-${p.id.slice(0, 4).toUpperCase()}`,
            avatar: `/images/doctor${((p.id.charCodeAt(0) || 65) % 4) + 1}.jpg`,
          };
        });

        setPatients(list);
        // Check URL param for patient pre-selection
        const urlPid = searchParams.get("patient_id");
        const preselected = urlPid ? list.find((p) => p.id === urlPid) : null;
        setActivePatient(preselected || list[0]);
      } catch (err) {
        console.error("Failed to initialize doctor dashboard:", err);
      } finally {
        setLoadingDoctor(false);
      }
    };

    initDoctor();
  }, [role, userId, router, searchParams]);

  // Derived image URLs from doctor profile (used in preview, print, and PDF)
  const doctorAvatarUrl = doctorProfile?.avatar_url
    ? supabase.storage.from("doctor_assets").getPublicUrl(doctorProfile.avatar_url).data.publicUrl
    : null;
  const doctorSigUrl = doctorProfile?.signature_url
    ? supabase.storage.from("doctor_assets").getPublicUrl(doctorProfile.signature_url).data
        .publicUrl
    : null;

  // Fetch allergy data for the selected patient
  useEffect(() => {
    if (!activePatient) {
      return;
    }
    const fetchAllergies = async () => {
      try {
        const { data } = await supabase
          .from("patient_medical_history")
          .select("condition")
          .eq("patient_id", activePatient.id)
          .ilike("condition", "%allergy%");
        setPatientAllergies((data ?? []).map((r) => r.condition.toLowerCase()));
      } catch {
        setPatientAllergies([]);
      }
    };
    fetchAllergies();
  }, [activePatient]);

  // Fetch past visits for the selected patient
  useEffect(() => {
    if (!activePatient) return;
    const fetchPastVisits = async () => {
      setLoadingPastVisits(true);
      try {
        const { data, error } = await supabase
          .from("prescriptions")
          .select(
            `
            id,
            diagnosis,
            notes,
            created_at,
            prescription_items (
              id,
              drug_name,
              dosage,
              frequency,
              duration,
              notes
            )
          `
          )
          .eq("patient_id", activePatient.id)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          const rxIds = data.map((rx: Record<string, unknown>) => String(rx.id));
          const { data: docData } = await supabase
            .from("prescription_documents")
            .select("prescription_id")
            .in("prescription_id", rxIds);
          const hasPdfSet = new Set(docData?.map((d) => d.prescription_id) ?? []);

          setPastVisits(
            data.map((rx: Record<string, unknown>) => ({
              id: String(rx.id ?? ""),
              date: new Date(String(rx.created_at)).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "2-digit",
              }),
              diagnosis: String(rx.diagnosis || "General Consult"),
              doctor: "Dr. Sarah Smith",
              notes: String(rx.notes || ""),
              items: (rx.prescription_items || []) as PastVisitItem[],
              hasPdf: hasPdfSet.has(String(rx.id)),
            }))
          );
        } else {
          setPastVisits([]);
        }
      } catch (err) {
        console.error("Failed to fetch past visits:", err);
      } finally {
        setLoadingPastVisits(false);
      }
    };

    fetchPastVisits();
  }, [activePatient]);

  // Drug Catalog autocomplete search
  useEffect(() => {
    if (drugSearchQuery.trim().length < 2) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingDrugs(true);
      try {
        const { data, error } = await supabase
          .from("drug_catalog")
          .select("id, name, generic_name, category")
          .ilike("name", `%${drugSearchQuery}%`)
          .limit(5);

        if (!error && data) {
          setCatalogSuggestions(data);
        }
      } catch (err) {
        console.error("Drug search error:", err);
      } finally {
        setIsSearchingDrugs(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [drugSearchQuery]);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Dynamic DocAssist AI check for drug allergy conflicts
  const allergyAlertActive = useMemo(() => {
    if (!activePatient || patientAllergies.length === 0) return false;
    return prescribedMeds.some((m) =>
      patientAllergies.some((allergy) =>
        m.drug_name.toLowerCase().includes(allergy.replace(" allergy", "").trim())
      )
    );
  }, [activePatient, prescribedMeds, patientAllergies]);

  // Handle drug suggestion click
  const handleSelectDrug = (drug: CatalogDrug) => {
    setSelectedDrug(drug);
    setCustomDrugName("");
    setDrugSearchQuery("");
    setCatalogSuggestions([]);
  };

  // Add/Update medication to prescribed list
  const handleAddMedication = (e: React.FormEvent) => {
    e.preventDefault();
    const drugName = selectedDrug ? selectedDrug.name : customDrugName.trim();
    if (!drugName) return;

    const newMed: PrescribedMedication = {
      drug_id: selectedDrug ? selectedDrug.id : null,
      drug_name: drugName,
      dosage,
      frequency,
      duration,
      notes: medNotes,
      morning: morningDose ? 1 : 0,
      afternoon: afternoonDose ? 1 : 0,
      night: nightDose ? 1 : 0,
    };

    if (editingMedIndex !== null) {
      const updated = [...prescribedMeds];
      updated[editingMedIndex] = newMed;
      setPrescribedMeds(updated);
      setEditingMedIndex(null);
    } else {
      setPrescribedMeds([...prescribedMeds, newMed]);
    }

    // Reset dosing form
    setSelectedDrug(null);
    setCustomDrugName("");
    setDosage("500mg");
    setFrequency("1x Daily");
    setDuration("7 Days");
    setMedNotes("After Food");
    setMorningDose(true);
    setAfternoonDose(false);
    setNightDose(false);
  };

  // Set medication for edit
  const handleEditMed = (index: number) => {
    const med = prescribedMeds[index];
    setCustomDrugName(med.drug_name);
    setDosage(med.dosage);
    setFrequency(med.frequency);
    setDuration(med.duration);
    setMedNotes(med.notes);
    setMorningDose(med.morning > 0);
    setAfternoonDose(med.afternoon > 0);
    setNightDose(med.night > 0);
    setEditingMedIndex(index);
  };

  // Remove medication
  const handleRemoveMed = (index: number) => {
    setPrescribedMeds(prescribedMeds.filter((_, i) => i !== index));
    if (editingMedIndex === index) setEditingMedIndex(null);
  };

  // Replace penicillin allergy drug with Azithromycin alternative
  const handleResolveAllergyAlternative = () => {
    setPrescribedMeds(
      prescribedMeds.map((m) => {
        if (m.drug_name.toLowerCase().includes("amoxicillin")) {
          return {
            ...m,
            drug_name: "Azithromycin 500mg",
            dosage: "500mg",
            notes: "1 hour before food (penicillin alternative)",
          };
        }
        return m;
      })
    );
  };

  // Vitals autofill
  const handleAddPastVitals = () => {
    setSystolicBP("122");
    setDiastolicBP("78");
    setSpO2("97");
    setPulseRate("74");
    setTemp("98.4");
    setHeight("175");
    setWeight("69.5");
    setSuccessToast("Past vitals loaded successfully!");
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Profile Edit
  const openProfileEdit = () => {
    setEditWorkspaceName(doctorProfile?.workspace_name || "");
    setEditPhoto(null);
    setEditSignature(null);
    setEditPhotoPreview(
      doctorProfile?.avatar_url
        ? supabase.storage.from("doctor_assets").getPublicUrl(doctorProfile.avatar_url).data
            .publicUrl
        : null
    );
    setEditSignaturePreview(
      doctorProfile?.signature_url
        ? supabase.storage.from("doctor_assets").getPublicUrl(doctorProfile.signature_url).data
            .publicUrl
        : null
    );
    setShowProfileEdit(true);
  };

  const handleSaveProfile = async () => {
    if (!doctorProfile) return;
    setSavingProfile(true);
    try {
      let avatarUrl = doctorProfile.avatar_url;
      let signatureUrl = doctorProfile.signature_url;

      if (editPhoto) {
        const ext = editPhoto.name.split(".").pop();
        const path = `${userId}/avatar.${ext}`;
        await supabase.storage.from("doctor_assets").upload(path, editPhoto, { upsert: true });
        avatarUrl = path;
      }
      if (editSignature) {
        const ext = editSignature.name.split(".").pop();
        const path = `${userId}/signature.${ext}`;
        await supabase.storage.from("doctor_assets").upload(path, editSignature, { upsert: true });
        signatureUrl = path;
      }

      const { error } = await supabase
        .from("doctor_profiles")
        .update({
          workspace_name: editWorkspaceName.trim() || doctorProfile.workspace_name,
          avatar_url: avatarUrl,
          signature_url: signatureUrl,
        })
        .eq("id", doctorProfile.id);

      if (error) throw error;

      setDoctorProfile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          workspace_name: editWorkspaceName.trim() || prev.workspace_name,
          avatar_url: avatarUrl,
          signature_url: signatureUrl,
        };
      });

      setShowProfileEdit(false);
      setSuccessToast("Profile updated successfully!");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      console.error("Failed to save profile:", err);
      setToast({ message: "Failed to save profile.", type: "error" });
    } finally {
      setSavingProfile(false);
    }
  };

  // Save inline profile fields (specialization, qualification, etc.)
  const handleSaveProfileFields = async () => {
    if (!doctorProfile) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("doctor_profiles")
        .update({
          specialization: editSpecialization.trim() || doctorProfile.specialization,
          qualification: editQualification.trim() || doctorProfile.qualification,
          hospital_affiliation:
            editHospitalAffiliation.trim() || doctorProfile.hospital_affiliation,
          consultation_fee: editConsultationFee
            ? parseFloat(editConsultationFee)
            : doctorProfile.consultation_fee,
          bio: editBio.trim(),
          languages: editLanguages.trim()
            ? editLanguages
                .split(",")
                .map((l: string) => l.trim())
                .filter(Boolean)
            : [],
        })
        .eq("id", doctorProfile.id);

      if (error) throw error;

      setDoctorProfile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          specialization: editSpecialization.trim() || prev.specialization,
          qualification: editQualification.trim() || prev.qualification,
          hospital_affiliation: editHospitalAffiliation.trim() || prev.hospital_affiliation,
          consultation_fee: editConsultationFee
            ? parseFloat(editConsultationFee)
            : prev.consultation_fee,
          bio: editBio.trim(),
          languages: editLanguages.trim(),
        };
      });

      setProfileEditMode(false);
      setSuccessToast("Profile updated successfully!");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      console.error("Failed to save profile fields:", err);
      setToast({ message: "Failed to update profile.", type: "error" });
    } finally {
      setSavingProfile(false);
    }
  };

  // Clear Form
  const handleClearForm = () => {
    setSystolicBP("120");
    setDiastolicBP("80");
    setSpO2("98");
    setPulseRate("72");
    setTemp("98.6");
    setHeight("175");
    setWeight("70");
    setSymptoms("");
    setDiagnosis("");
    setPrescribedMeds([]);
    setInternalNotes("");
    setFollowUpDate("");
    setEditingMedIndex(null);
  };

  // Parse duration text to number of days
  const parseDays = (duration: string): number => {
    const trimmed = duration.trim().toLowerCase();
    if (trimmed === "prn" || trimmed === "as needed") return 1;
    const num = parseInt(trimmed);
    if (!isNaN(num)) {
      if (trimmed.includes("week")) return num * 7;
      if (trimmed.includes("month")) return num * 30;
      return num;
    }
    return 1;
  };

  // Save Prescription (draft or active)
  const savePrescription = async (status: "draft" | "active") => {
    if (!activePatient || !doctorProfile) {
      setToast({ message: "No patient selected or profile not loaded.", type: "error" });
      return;
    }
    if (prescribedMeds.length === 0) {
      setToast({ message: "Please add at least one medication before saving.", type: "error" });
      return;
    }

    // Validate no medication has zero daily intake
    for (const med of prescribedMeds) {
      const dailyIntake = med.morning + med.afternoon + med.night;
      if (dailyIntake === 0) {
        setToast({
          message: `"${med.drug_name}" has no dose times selected. Please check Morning/Afternoon/Night.`,
          type: "error",
        });
        return;
      }
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      // Build structured notes with vitals
      const vitalsBlock = `Vitals Summary:\n- Blood Pressure: ${systolicBP}/${diastolicBP} mmHg\n- SpO2: ${spO2}%\n- Pulse: ${pulseRate}/min\n- Temp: ${temp}°F\n- Height: ${height}cm\n- Weight: ${weight}kg\n- BMI: ${bmi} kg/m²`;
      const combinedNotes = `${vitalsBlock}\n\nClinical Notes:\n${internalNotes || "No notes provided."}`;

      // Insert prescription header
      const { data: rx, error: rxErr } = await supabase
        .from("prescriptions")
        .insert({
          doctor_id: doctorProfile.id,
          patient_id: activePatient.id,
          diagnosis: diagnosis || "General Consultation",
          notes: combinedNotes,
          status,
          ai_assisted: allergyAlertActive,
          followup_date: followUpDate || null,
        })
        .select()
        .single();

      if (rxErr) throw rxErr;

      // Calculate quantity per item
      const rxItems = prescribedMeds.map((med) => {
        const dailyIntake = med.morning + med.afternoon + med.night;
        const days = parseDays(med.duration);
        const quantity = dailyIntake * days;

        return {
          prescription_id: rx.id,
          drug_id: med.drug_id,
          drug_name: med.drug_name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          quantity,
          notes: med.notes,
        };
      });

      // Insert prescription items
      const { error: itemsErr } = await supabase.from("prescription_items").insert(rxItems);
      if (itemsErr) {
        // Rollback: delete the orphaned prescription header
        await supabase.from("prescriptions").delete().eq("id", rx.id);
        throw itemsErr;
      }

      // Save vitals to vital_signs table when finalizing
      if (status === "active") {
        const parsedH = parseFloat(height);
        const parsedW = parseFloat(weight);
        const bmiVal =
          parsedH > 0 && parsedW > 0
            ? parseFloat((parsedW / ((parsedH / 100) * (parsedH / 100))).toFixed(1))
            : null;
        await supabase
          .from("vital_signs")
          .insert({
            patient_id: activePatient.id,
            doctor_id: doctorProfile.id,
            prescription_id: rx.id,
            blood_pressure_systolic: parseInt(systolicBP) || null,
            blood_pressure_diastolic: parseInt(diastolicBP) || null,
            heart_rate: parseInt(pulseRate) || null,
            temperature: parseFloat(temp) || null,
            oxygen_saturation: parseInt(spO2) || null,
            weight: parsedW || null,
            height: parsedH || null,
            bmi: bmiVal,
            symptoms: symptoms || null,
          })
          .throwOnError();
      }

      if (status === "active") {
        // Pharmacy auto-refill: notify pharmacy vendors about new prescription
        try {
          const { data: pharmacies } = await supabase
            .from("pharmacy_profiles")
            .select("id, user_id, business_name, email")
            .limit(10);
          if (pharmacies && pharmacies.length > 0) {
            const prescriptionSummary = prescribedMeds
              .map((m) => `${m.drug_name} ${m.dosage} - ${m.frequency} (${m.duration})`)
              .join("; ");
            const notificationData = pharmacies.map((p) => ({
              user_id: p.user_id,
              title: "New Prescription Ready for Refill",
              body: `Prescription for ${activePatient.name}: ${prescriptionSummary}`,
              data: {
                prescription_id: rx.id,
                patient_id: activePatient.id,
                patient_name: activePatient.name,
                patient_email: activePatient.email,
                doctor_id: doctorProfile.id,
                medication_summary: prescriptionSummary,
                refill_type: "automatic",
              },
              category: "refill",
              priority: "normal",
            }));
            await supabase.from("notifications").insert(notificationData);

            // Also create an order in the orders table for each pharmacy
            // This ensures the order appears in the pharmacy's orders dashboard
            for (const pharmacy of pharmacies) {
              const totalAmount = prescribedMeds.reduce(
                (sum, m) => sum + (parseFloat(m.dosage) || 0) * (m.morning + m.afternoon + m.night),
                0
              );
              const { data: patientProfile } = await supabase
                .from("patient_profiles")
                .select("address, phone, email")
                .eq("id", activePatient.id)
                .single();

              const { data: orderRecord, error: orderErr } = await supabase
                .from("orders")
                .insert({
                  prescription_id: rx.id,
                  pharmacy_id: pharmacy.id,
                  patient_id: activePatient.id,
                  doctor_id: doctorProfile.id,
                  status: "PENDING",
                  total_amount: Math.max(totalAmount, 0),
                  delivery_address: patientProfile?.address || "To be confirmed",
                  patient_phone: patientProfile?.phone || "",
                  patient_email: patientProfile?.email || "",
                  notes: prescriptionSummary,
                })
                .select()
                .single();

              if (orderErr) {
                console.warn(
                  "[Doctor] Failed to create order for pharmacy:",
                  pharmacy.business_name,
                  orderErr
                );
              } else if (orderRecord) {
                // Create initial order event
                await supabase
                  .from("order_events")
                  .insert({
                    order_id: orderRecord.id,
                    status: "PENDING",
                    note: `Prescription finalized by Dr. ${doctorProfile.name || "Doctor"}`,
                  })
                  .throwOnError();
              }
            }
          }
        } catch (pharmErr) {
          console.error("Pharmacy notification + order creation failed (non-blocking):", pharmErr);
        }

        // Notify patient about new prescription
        try {
          await supabase.from("notifications").insert({
            user_id: activePatient.id,
            title: "New Prescription Issued",
            body: `Dr. ${doctorName} has issued a new prescription: ${diagnosis || "General Consultation"}`,
            data: { prescription_id: rx.id, doctor_id: doctorProfile.id },
            category: "prescription",
            priority: "high",
          });
        } catch (notifErr) {
          console.warn("Patient notification failed (non-blocking):", notifErr);
        }

        // Auto-mark prescription as completed
        try {
          await supabase.from("prescriptions").update({ status: "completed" }).eq("id", rx.id);
        } catch (statusErr) {
          console.warn("Failed to mark prescription as completed (non-blocking):", statusErr);
        }

        // Generate & upload PDF to bucket
        try {
          await generateAndUploadPdf(rx.id, false);
          console.log("PDF uploaded successfully for prescription:", rx.id);
        } catch (pdfErr) {
          console.error("PDF generation/upload failed:", pdfErr);
          setToast({
            message: "Prescription saved but PDF upload failed. Please use Save PDF in preview.",
            type: "error",
          });
        }
      }

      if (status === "active") {
        handleClearForm();
      }
      setSuccessToast(
        `Prescription successfully ${status === "active" ? "finalized" : "saved as draft"}!`
      );
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      console.error("Failed to save prescription:", err);
      setToast({ message: "Error saving prescription. Please try again.", type: "error" });
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  const [savingPdf, setSavingPdf] = useState(false);

  // Shared PDF generation: generates, uploads, and optionally opens the PDF
  const generateAndUploadPdf = async (rxId: string, openAfter: boolean): Promise<string | null> => {
    const fetchImageAsBase64 = async (
      storagePath: string | null | undefined
    ): Promise<string | null> => {
      if (!storagePath) return null;
      try {
        const { data } = supabase.storage.from("doctor_assets").getPublicUrl(storagePath);
        if (!data?.publicUrl) return null;
        const resp = await fetch(data.publicUrl, { cache: "no-cache" });
        if (!resp.ok) return null;
        const blob = await resp.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    };

    const [avatarDataUrl, sigDataUrl] = await Promise.all([
      fetchImageAsBase64(doctorProfile?.avatar_url),
      fetchImageAsBase64(doctorProfile?.signature_url),
    ]);

    const { default: jsPDF } = await import("jspdf");
    const autoTableModule = await import("jspdf-autotable");
    const autoTable =
      (
        autoTableModule as {
          default?: (doc: unknown, options: unknown) => void;
          autoTable?: (doc: unknown, options: unknown) => void;
        }
      ).default ?? autoTableModule.autoTable;
    if (!autoTable) throw new Error("PDF table renderer unavailable");

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = margin;

    const sectionTitle = (text: string) => {
      doc.setFontSize(12);
      doc.setTextColor(12, 67, 129);
      doc.setFont("helvetica", "bold");
      doc.text(text, margin, y);
      y += 2;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y);
      y += 6;
    };

    const bodyText = (text: string, indent = margin) => {
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(text, pageW - margin * 2 - (indent - margin));
      doc.text(lines, indent, y);
      y += lines.length * 5 + 2;
    };

    const headerLeftX = margin;
    const headerY = y;

    if (avatarDataUrl) {
      try {
        doc.addImage(avatarDataUrl, "PNG", headerLeftX, headerY - 4, 14, 14);
      } catch {
        /* ignore */
      }
    }
    const textX = avatarDataUrl ? headerLeftX + 18 : headerLeftX;
    doc.setFontSize(18);
    doc.setTextColor(12, 67, 129);
    doc.setFont("helvetica", "bold");
    doc.text(doctorProfile?.workspace_name || "ZorabiHealth Center", textX, headerY + 4);
    y = headerY + 9;

    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.text(doctorName, textX, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`License: ${doctorProfile?.license_number || "N/A"}`, textX, y);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageW - margin, y, { align: "right" });
    y += 12;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    sectionTitle("Patient Information");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text(`Name:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(activePatient?.name || "", margin + 20, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text(`Email:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(activePatient?.email || "", margin + 20, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    const vitalsLine = `BP: ${systolicBP}/${diastolicBP} mmHg | SpO2: ${spO2}% | Temp: ${temp}°F | BMI: ${bmi}`;
    doc.text(`Vitals:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(vitalsLine, margin + 20, y);
    y += 8;

    sectionTitle("Clinical Assessment");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Symptoms:", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    bodyText(symptoms || "None reported");
    doc.setFont("helvetica", "bold");
    doc.text("Diagnosis:", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    bodyText(diagnosis || "General Consultation");

    sectionTitle("Prescribed Medications");
    const tableHead = [["Drug Name", "Dosage", "Frequency", "Duration", "Instructions"]];
    const tableBody = prescribedMeds.map((m) => [
      m.drug_name,
      m.dosage,
      m.frequency,
      m.duration,
      m.notes || "—",
    ]);
    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: y,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [12, 67, 129], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
    };

    if (followUpDate && formatDate(followUpDate)) {
      doc.setFontSize(10);
      doc.setTextColor(12, 67, 129);
      doc.setFont("helvetica", "bold");
      doc.text(`Follow-up Date: ${formatDate(followUpDate)}`, margin, y);
      y += 10;
    }

    const pageH = doc.internal.pageSize.getHeight();
    if (y > pageH - 40) {
      doc.addPage();
      y = margin;
    }

    const sigX = pageW - margin - 50;
    if (sigDataUrl) {
      try {
        doc.addImage(sigDataUrl, "PNG", sigX, y - 8, 40, 16);
      } catch {
        doc.setDrawColor(200, 200, 200);
        doc.line(sigX, y, sigX + 50, y);
      }
    } else {
      doc.setDrawColor(200, 200, 200);
      doc.line(sigX, y, sigX + 50, y);
    }
    y += 2;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Authorized Signature", sigX + 25, y, { align: "center" });

    const refId = `VP-RX-${Date.now().toString().slice(-6)}`;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "normal");
    doc.text(`Ref: ${refId} | Generated by ZorabiHealth`, margin, 285);

    const pdfBlob = doc.output("blob");
    const fileName = `prescription-${Date.now()}.pdf`;
    const filePath = `prescriptions/${activePatient?.id || "unknown"}/${fileName}`;

    let signedUrl: string | null = null;

    try {
      const formData = new FormData();
      formData.append("file", new File([pdfBlob], fileName, { type: "application/pdf" }));
      formData.append("filePath", filePath);
      formData.append("fileName", fileName);
      formData.append("prescriptionId", rxId);

      const res = await fetch("/api/upload-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("PDF upload via API failed:", data.error);
      } else {
        signedUrl = data.signedUrl;
      }
    } catch (err) {
      console.error("PDF upload via API failed:", err);
    }

    if (openAfter) {
      if (signedUrl) {
        window.open(signedUrl, "_blank");
      } else {
        const pdfUrl = doc.output("datauristring");
        const a = document.createElement("a");
        a.href = pdfUrl;
        a.download = fileName;
        a.click();
      }
    }

    return signedUrl;
  };

  const handleSavePdf = async () => {
    if (!activePatient || !doctorProfile) return;
    setSavingPdf(true);
    try {
      const vitalsBlock = `Vitals Summary:\n- Blood Pressure: ${systolicBP}/${diastolicBP} mmHg\n- SpO2: ${spO2}%\n- Pulse: ${pulseRate}/min\n- Temp: ${temp}°F\n- Height: ${height}cm\n- Weight: ${weight}kg\n- BMI: ${bmi} kg/m²`;
      const combinedNotes = `${vitalsBlock}\n\nClinical Notes:\n${internalNotes || "No notes provided."}`;

      const { data: draftRx, error: draftErr } = await supabase
        .from("prescriptions")
        .insert({
          doctor_id: doctorProfile.id,
          patient_id: activePatient.id,
          diagnosis: diagnosis || "General Consultation",
          notes: combinedNotes,
          status: "draft",
          ai_assisted: allergyAlertActive,
          followup_date: followUpDate || null,
        })
        .select()
        .single();
      if (draftErr) throw draftErr;

      const rxItems = prescribedMeds.map((med) => ({
        prescription_id: draftRx.id,
        drug_id: med.drug_id,
        drug_name: med.drug_name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        quantity: (med.morning + med.afternoon + med.night) * parseDays(med.duration),
        notes: med.notes,
      }));
      if (rxItems.length > 0) {
        const { error: itemsErr } = await supabase.from("prescription_items").insert(rxItems);
        if (itemsErr) {
          await supabase.from("prescriptions").delete().eq("id", draftRx.id);
          throw itemsErr;
        }
      }

      await generateAndUploadPdf(draftRx.id, true);

      await supabase.from("prescriptions").update({ status: "completed" }).eq("id", draftRx.id);

      handleClearForm();
      setSuccessToast("Prescription saved as PDF!");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: unknown) {
      console.error("Failed to save PDF:", err);
      setToast({
        message: err instanceof Error ? err.message : "Failed to save PDF.",
        type: "error",
      });
    } finally {
      setSavingPdf(false);
    }
  };

  // Create new patient (for manual entry when search yields no results)
  const handleCreatePatient = async () => {
    if (!newPatientName.trim() || !doctorProfile) return;
    setCreatingPatient(true);
    try {
      const { data: newPp, error } = await supabase
        .from("patient_profiles")
        .insert({
          id: safeUUID(),
          full_name: newPatientName.trim(),
          email: newPatientEmail.trim() || null,
          phone: newPatientPhone.trim() || null,
          created_by: doctorProfile.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newPatient: Patient = {
        id: newPp.id,
        name: newPp.full_name,
        email: newPp.email || "",
        code: `#VP-${newPp.id.slice(0, 4).toUpperCase()}`,
        avatar: `/images/doctor${((newPp.id.charCodeAt(0) || 65) % 4) + 1}.jpg`,
      };

      setPatients((prev) => [...prev, newPatient]);
      setActivePatient(newPatient);
      setShowCreatePatient(false);
      setPatientDropdownOpen(false);
      setNewPatientName("");
      setNewPatientEmail("");
      setNewPatientPhone("");
      setSuccessToast(`Patient "${newPp.full_name}" created successfully!`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      console.error("Failed to create patient:", err);
      setToast({ message: "Failed to create patient. Please try again.", type: "error" });
    } finally {
      setCreatingPatient(false);
    }
  };

  // Filter patient list based on search
  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.email.toLowerCase().includes(patientSearch.toLowerCase())
  );

  if (loadingDoctor) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0c4381] to-[#006686] flex items-center justify-center shadow-lg animate-spin">
          <HeartPulse className="w-6 h-6 text-white" />
        </div>
        <p className="text-slate-500 font-bold text-sm">Initializing Clinical Workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full clinical-bg-gradient p-6 pb-28 relative">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 glass-panel-dark text-white rounded-2xl px-6 py-4 flex items-center gap-3 shadow-xl animate-slide-up">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
          <span className="font-bold text-sm">{successToast}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Top Header & Patient Selector */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <BriefcaseMedical className="w-6 h-6 text-[#0c4381]" /> Workspace
              </h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Clinical Prescription Pad
              </p>
            </div>

            {/* Patient Selector Dropdown */}
            {activePatient && (
              <div className="relative">
                <div
                  onClick={() => setPatientDropdownOpen(!patientDropdownOpen)}
                  className="flex items-center gap-3 bg-white/70 backdrop-blur border border-[#0c4381]/10 rounded-full px-5 py-2.5 cursor-pointer hover:bg-white/95 transition-all shadow-sm"
                >
                  <Image
                    className="w-8 h-8 rounded-full object-cover border border-[#0c4381]/15"
                    src={activePatient.avatar}
                    alt={activePatient.name}
                    width={32}
                    height={32}
                  />
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-bold text-slate-800 leading-tight">
                      {activePatient.name}
                    </span>
                    <span className="text-[10px] text-[#0c4381] opacity-75 font-mono">
                      {activePatient.code}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#0c4381]/60 rotate-90 ml-1" />
                </div>

                {patientDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-40 animate-slide-up">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search patient..."
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {filteredPatients.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setActivePatient(p);
                            handleClearForm();
                            setPatientDropdownOpen(false);
                            setPatientSearch("");
                          }}
                          className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${activePatient.id === p.id ? "bg-[#0c4381]/10 text-[#0c4381]" : "hover:bg-slate-50"}`}
                        >
                          <Image
                            className="w-7 h-7 rounded-full object-cover"
                            src={p.avatar}
                            alt={p.name}
                            width={28}
                            height={28}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{p.email}</p>
                          </div>
                        </div>
                      ))}
                      {filteredPatients.length === 0 && patientSearch.trim().length > 0 && (
                        <button
                          onClick={() => {
                            setNewPatientName(patientSearch.trim());
                            setShowCreatePatient(true);
                          }}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-[#0c4381]/10 text-[#0c4381] transition-colors border border-dashed border-[#0c4381]/20"
                        >
                          <div className="w-7 h-7 rounded-full bg-[#0c4381]/10 flex items-center justify-center shrink-0">
                            <Plus className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold">Create &quot;{patientSearch}&quot;</p>
                            <p className="text-[9px] text-slate-400">Add new patient record</p>
                          </div>
                        </button>
                      )}
                      {filteredPatients.length === 0 && patientSearch.trim().length === 0 && (
                        <p className="text-center text-xs text-slate-400 py-4 italic">
                          No patients found
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="flex items-center gap-2 bg-white/60 border border-white/40 rounded-full pl-1 pr-3 py-1 shadow-sm">
              {doctorAvatarUrl ? (
                <Image
                  src={doctorAvatarUrl}
                  alt={doctorName}
                  width={28}
                  height={28}
                  unoptimized
                  className="w-7 h-7 rounded-full object-cover border border-white/60"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0c4381] to-[#006686] flex items-center justify-center text-white text-[10px] font-bold">
                  {doctorName.charAt(4) || "D"}
                </div>
              )}
              <span className="text-xs font-semibold text-slate-600">
                {doctorName} | {doctorProfile?.qualification || "MD"} | License:{" "}
                {String(doctorProfile?.license_number ?? "")}
              </span>
            </div>
            <button
              onClick={openProfileEdit}
              className="p-2 bg-white/60 hover:bg-white/90 rounded-full border border-white/40 shadow-sm text-slate-600 transition-colors"
              title="Edit Profile"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                supabase.auth.signOut();
                router.push("/");
              }}
              className="p-2 bg-white/60 hover:bg-red-100 rounded-full border border-white/40 shadow-sm text-slate-500 hover:text-red-600 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Subtabs Bar */}
        <div className="border-b border-white/20 pb-1">
          <div className="flex gap-6">
            <button className="pb-3 text-[#0c4381] border-b-2 border-[#0c4381] font-bold text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Overview Workspace
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Workspace Grid */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Left/Middle Workspace Column (9 cols) */}
          <div className="col-span-12 lg:col-span-9 space-y-6">
            {/* Vitals Section Card */}
            <div className="glass-panel rounded-3xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2.5">
                  <Activity className="w-5 h-5 text-[#0c4381]" /> Vitals Tracker
                </h2>
                <button
                  onClick={handleAddPastVitals}
                  className="text-xs text-[#0c4381] font-bold flex items-center gap-1 hover:underline bg-white border border-[#0c4381]/10 px-3 py-1.5 rounded-full shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Autofill Standard Vitals
                </button>
              </div>

              {/* Vitals Input Fields */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Systolic BP
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={systolicBP}
                      onChange={(e) => setSystolicBP(e.target.value)}
                      className="w-full bg-white/40 border border-[#0c4381]/10 focus:border-[#0c4381] focus:bg-white/80 focus:ring-4 focus:ring-[#0c4381]/5 outline-none rounded-xl px-3.5 py-2 text-sm transition-all"
                      placeholder="120"
                    />
                    <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-slate-400">
                      mmHg
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Diastolic BP
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={diastolicBP}
                      onChange={(e) => setDiastolicBP(e.target.value)}
                      className="w-full bg-white/40 border border-[#0c4381]/10 focus:border-[#0c4381] focus:bg-white/80 focus:ring-4 focus:ring-[#0c4381]/5 outline-none rounded-xl px-3.5 py-2 text-sm transition-all"
                      placeholder="80"
                    />
                    <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-slate-400">
                      mmHg
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    SpO2
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={spO2}
                      onChange={(e) => setSpO2(e.target.value)}
                      className="w-full bg-white/40 border border-[#0c4381]/10 focus:border-[#0c4381] focus:bg-white/80 focus:ring-4 focus:ring-[#0c4381]/5 outline-none rounded-xl px-3.5 py-2 text-sm transition-all"
                      placeholder="98"
                    />
                    <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-slate-400">
                      %
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Pulse Rate
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={pulseRate}
                      onChange={(e) => setPulseRate(e.target.value)}
                      className="w-full bg-white/40 border border-[#0c4381]/10 focus:border-[#0c4381] focus:bg-white/80 focus:ring-4 focus:ring-[#0c4381]/5 outline-none rounded-xl px-3.5 py-2 text-sm transition-all"
                      placeholder="72"
                    />
                    <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-slate-400">
                      /min
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Temp
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={temp}
                      onChange={(e) => setTemp(e.target.value)}
                      className="w-full bg-white/40 border border-[#0c4381]/10 focus:border-[#0c4381] focus:bg-white/80 focus:ring-4 focus:ring-[#0c4381]/5 outline-none rounded-xl px-3.5 py-2 text-sm transition-all"
                      placeholder="98.6"
                    />
                    <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-slate-400">
                      °F
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Height
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full bg-white/40 border border-[#0c4381]/10 focus:border-[#0c4381] focus:bg-white/80 focus:ring-4 focus:ring-[#0c4381]/5 outline-none rounded-xl px-3.5 py-2 text-sm transition-all"
                      placeholder="175"
                    />
                    <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-slate-400">
                      cm
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Weight
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full bg-white/40 border border-[#0c4381]/10 focus:border-[#0c4381] focus:bg-white/80 focus:ring-4 focus:ring-[#0c4381]/5 outline-none rounded-xl px-3.5 py-2 text-sm transition-all"
                      placeholder="70"
                    />
                    <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-slate-400">
                      kg
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Calculated BMI
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={bmi}
                      readOnly
                      className="w-full bg-[#0c4381]/5 border-0 font-extrabold text-[#0c4381] rounded-xl px-3.5 py-2 text-sm focus:outline-none cursor-default"
                      placeholder="22.9"
                    />
                    <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-[#0c4381]/60">
                      kg/m²
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Symptoms & Diagnosis Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Symptoms Input */}
              <div className="glass-panel rounded-3xl p-6 flex flex-col h-full">
                <h2 className="text-base font-black text-slate-800 mb-3 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-[#0c4381]" /> Chief Symptoms
                </h2>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="flex-grow w-full bg-white/40 border border-[#0c4381]/10 focus:border-[#0c4381] focus:bg-white/80 focus:ring-4 focus:ring-[#0c4381]/5 outline-none rounded-2xl p-4 text-sm resize-none min-h-[100px] transition-all"
                  placeholder="Describe patient complaints and symptoms..."
                ></textarea>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <button
                    onClick={() =>
                      setSymptoms((prev) => (prev ? `${prev}, High Fever` : "High Fever"))
                    }
                    className="bg-white hover:bg-[#0c4381] hover:text-white border border-slate-200 text-slate-600 px-3.5 py-1 rounded-full text-xs font-bold transition-all shadow-sm"
                  >
                    + Fever
                  </button>
                  <button
                    onClick={() =>
                      setSymptoms((prev) => (prev ? `${prev}, Dry Cough` : "Dry Cough"))
                    }
                    className="bg-white hover:bg-[#0c4381] hover:text-white border border-slate-200 text-slate-600 px-3.5 py-1 rounded-full text-xs font-bold transition-all shadow-sm"
                  >
                    + Cough
                  </button>
                  <button
                    onClick={() =>
                      setSymptoms((prev) => (prev ? `${prev}, General Fatigue` : "General Fatigue"))
                    }
                    className="bg-white hover:bg-[#0c4381] hover:text-white border border-slate-200 text-slate-600 px-3.5 py-1 rounded-full text-xs font-bold transition-all shadow-sm"
                  >
                    + Fatigue
                  </button>
                </div>
              </div>

              {/* Diagnosis Input */}
              <div className="glass-panel rounded-3xl p-6 flex flex-col h-full">
                <h2 className="text-base font-black text-slate-800 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#0c4381]" /> Clinical Diagnosis
                </h2>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="flex-grow w-full bg-white/40 border border-[#0c4381]/10 focus:border-[#0c4381] focus:bg-white/80 focus:ring-4 focus:ring-[#0c4381]/5 outline-none rounded-2xl p-4 text-sm resize-none min-h-[100px] transition-all"
                  placeholder="Enter medical diagnosis..."
                ></textarea>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <button
                    onClick={() =>
                      setDiagnosis((prev) =>
                        prev ? `${prev}, Acute Sinusitis` : "Acute Sinusitis"
                      )
                    }
                    className="bg-white hover:bg-[#0c4381] hover:text-white border border-slate-200 text-slate-600 px-3.5 py-1 rounded-full text-xs font-bold transition-all shadow-sm"
                  >
                    + Acute Sinusitis
                  </button>
                  <button
                    onClick={() =>
                      setDiagnosis((prev) =>
                        prev ? `${prev}, Viral Infection` : "Viral Infection"
                      )
                    }
                    className="bg-white hover:bg-[#0c4381] hover:text-white border border-slate-200 text-slate-600 px-3.5 py-1 rounded-full text-xs font-bold transition-all shadow-sm"
                  >
                    + Viral Infection
                  </button>
                </div>
              </div>
            </div>

            {/* Prescribe Medications Section */}
            <div className="glass-panel rounded-3xl p-6 space-y-4">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Pill className="w-5 h-5 text-[#0c4381]" /> Prescribe Medications
              </h2>

              {/* Medication Add/Edit Form */}
              <form
                onSubmit={handleAddMedication}
                className="bg-white/40 border border-[#0c4381]/5 rounded-2xl p-4 space-y-3 shadow-inner"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2 space-y-1 relative">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Search Master Drug Catalog
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Type to search (e.g. Paracetamol, Dolo...)"
                        value={selectedDrug ? selectedDrug.name : customDrugName}
                        onChange={(e) => {
                          setSelectedDrug(null);
                          setCustomDrugName(e.target.value);
                          setDrugSearchQuery(e.target.value);
                        }}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-[#0c4381]/15 text-xs focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20 font-semibold"
                      />
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      {selectedDrug && (
                        <button
                          onClick={() => setSelectedDrug(null)}
                          className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Drug Autocomplete List */}
                    {catalogSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-2xl border border-slate-100 shadow-2xl z-30 overflow-hidden divide-y divide-slate-50 p-2">
                        {catalogSuggestions.map((drug) => (
                          <div
                            key={drug.id}
                            onClick={() => handleSelectDrug(drug)}
                            className="p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer text-left"
                          >
                            <p className="text-xs font-bold text-slate-800">{drug.name}</p>
                            <p className="text-[9px] text-slate-400 font-semibold">
                              {drug.generic_name} &middot; {drug.category}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Dosage
                    </label>
                    <input
                      type="text"
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                      placeholder="e.g. 500mg, 1 tab"
                      className="w-full py-2 px-3 bg-white border border-[#0c4381]/15 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Duration
                    </label>
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g. 7 Days"
                      className="w-full py-2 px-3 bg-white border border-[#0c4381]/15 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Frequency
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full py-2 px-2 bg-white border border-[#0c4381]/15 rounded-xl text-xs font-semibold focus:outline-none"
                    >
                      <option>1x Daily</option>
                      <option>Twice Daily</option>
                      <option>Three Times Daily</option>
                      <option>Weekly</option>
                      <option>As Needed</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Instructions / Notes
                    </label>
                    <input
                      type="text"
                      value={medNotes}
                      onChange={(e) => setMedNotes(e.target.value)}
                      placeholder="e.g. After Food, Empty Stomach"
                      className="w-full py-2 px-3 bg-white border border-[#0c4381]/15 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Checklist Dosing Schedule */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pt-2 border-t border-[#0c4381]/5">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={morningDose}
                        onChange={(e) => setMorningDose(e.target.checked)}
                        className="rounded border-slate-300 text-[#0c4381] focus:ring-[#0c4381]/25"
                      />{" "}
                      Morning
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={afternoonDose}
                        onChange={(e) => setAfternoonDose(e.target.checked)}
                        className="rounded border-slate-300 text-[#0c4381] focus:ring-[#0c4381]/25"
                      />{" "}
                      Afternoon
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={nightDose}
                        onChange={(e) => setNightDose(e.target.checked)}
                        className="rounded border-slate-300 text-[#0c4381] focus:ring-[#0c4381]/25"
                      />{" "}
                      Night
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="bg-[#0c4381] text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-[#093262] transition-colors shadow shadow-blue-500/10 flex items-center justify-center gap-1.5"
                  >
                    {editingMedIndex !== null ? (
                      <Edit2 className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    {editingMedIndex !== null ? "Update Medication" : "Add to Prescription"}
                  </button>
                </div>
              </form>

              {/* Active Prescribed Medications List */}
              <div className="space-y-3 pt-2">
                {prescribedMeds.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 italic py-4">
                    No medications added yet.
                  </p>
                ) : (
                  prescribedMeds.map((med, index) => (
                    <div
                      key={`${med.drug_name}-${index}`}
                      className="bg-white/80 border border-[#0c4381]/15 rounded-2xl p-4 flex justify-between items-center group hover:shadow-md transition-all animate-slide-up"
                    >
                      <div className="flex gap-3.5 items-start">
                        <div className="bg-[#0c4381]/10 w-9 h-9 rounded-full flex items-center justify-center text-[#0c4381] shrink-0">
                          <Pill className="w-4.5 h-4.5" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-sm font-bold text-[#0c4381]">{med.drug_name}</h3>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            {med.dosage} &middot; {med.frequency} &middot; {med.duration}
                          </p>
                          <div className="flex gap-3 mt-1.5">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded ${med.morning > 0 ? "bg-slate-100 text-slate-700" : "bg-slate-50 text-slate-300"}`}
                            >
                              Morning: {med.morning}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded ${med.afternoon > 0 ? "bg-slate-100 text-slate-700" : "bg-slate-50 text-slate-300"}`}
                            >
                              Afternoon: {med.afternoon}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded ${med.night > 0 ? "bg-slate-100 text-slate-700" : "bg-slate-50 text-slate-300"}`}
                            >
                              Night: {med.night}
                            </span>
                          </div>
                          {med.notes && (
                            <p className="text-[10px] text-slate-400 font-semibold mt-1 bg-slate-50 inline-block px-2 py-0.5 rounded border border-slate-100">
                              Instruction: {med.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditMed(index)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveMed(index)}
                          className="p-1.5 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notes & Follow-up Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Internal Clinical Notes */}
              <div className="glass-panel rounded-3xl p-6 flex flex-col h-full">
                <h2 className="text-base font-black text-slate-800 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#0c4381]" /> Internal Clinical Notes
                </h2>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="flex-grow w-full bg-white/40 border border-[#0c4381]/10 focus:border-[#0c4381] focus:bg-white/80 focus:ring-4 focus:ring-[#0c4381]/5 outline-none rounded-2xl p-4 text-sm resize-none min-h-[100px] transition-all italic text-slate-600"
                  placeholder="Enter internal doctor notes, diagnostics records, or recommendations..."
                ></textarea>
              </div>

              {/* Follow-up Scheduler */}
              <div className="glass-panel rounded-3xl p-6 space-y-4">
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#0c4381]" /> Follow-up Schedule
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 3);
                      setFollowUpDate(d.toISOString().split("T")[0]);
                    }}
                    className="bg-white hover:bg-[#0c4381]/10 border border-slate-200 py-2.5 rounded-xl text-xs font-bold text-slate-600 transition-colors shadow-sm"
                  >
                    3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      setFollowUpDate(d.toISOString().split("T")[0]);
                    }}
                    className="bg-white hover:bg-[#0c4381]/10 border border-slate-200 py-2.5 rounded-xl text-xs font-bold text-slate-600 transition-colors shadow-sm"
                  >
                    1 Week
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 30);
                      setFollowUpDate(d.toISOString().split("T")[0]);
                    }}
                    className="bg-white hover:bg-[#0c4381]/10 border border-slate-200 py-2.5 rounded-xl text-xs font-bold text-slate-600 transition-colors shadow-sm"
                  >
                    1 Month
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full bg-white border border-[#0c4381]/15 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!followUpDate) return;
                    setSuccessToast(`Follow-up slotted successfully for ${followUpDate}!`);
                    setTimeout(() => setSuccessToast(null), 3000);
                  }}
                  className="w-full bg-[#0c4381]/10 text-[#0c4381] font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-[#0c4381]/25 transition-all text-xs"
                >
                  <Plus className="w-4 h-4" /> Book Follow-up Slot
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (Sidebar Information Panel - 3 cols) */}
          <aside className="col-span-12 lg:col-span-3 space-y-6">
            {/* Past Visits Sidebar Card */}
            <div className="glass-panel rounded-3xl overflow-hidden text-left">
              <div className="bg-gradient-to-r from-[#0c4381] to-[#006686] px-5 py-4 text-white flex justify-between items-center">
                <h3 className="font-bold text-sm">Past Visits</h3>
                <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">
                  {pastVisits.length} Records
                </span>
              </div>
              <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto">
                {loadingPastVisits ? (
                  <p className="text-center text-xs text-slate-400 py-6 animate-pulse">
                    Loading records...
                  </p>
                ) : pastVisits.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">No history found.</p>
                ) : (
                  pastVisits.map((visit) => (
                    <div
                      key={visit.id}
                      onClick={() => setSelectedPastVisit(visit)}
                      className="border-l-4 border-[#006686] hover:bg-[#0c4381]/5 transition-colors pl-3 py-1 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#006686]">{visit.date}</span>
                        {visit.hasPdf && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              supabase
                                .from("prescription_documents")
                                .select("storage_path")
                                .eq("prescription_id", visit.id)
                                .single()
                                .then(({ data: docData }) => {
                                  if (docData?.storage_path) {
                                    supabase.storage
                                      .from("prescription_pdfs")
                                      .createSignedUrl(docData.storage_path, 3600)
                                      .then(({ data: signed }) => {
                                        if (signed?.signedUrl)
                                          window.open(signed.signedUrl, "_blank");
                                      });
                                  }
                                });
                            }}
                            className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Download PDF"
                          >
                            PDF
                          </button>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-800 leading-tight mt-0.5">
                        {visit.diagnosis}
                      </p>
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                        {visit.doctor}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* DocAssist AI Card */}
            <div className="bg-gradient-to-br from-[#0c4381]/5 to-[#006686]/5 rounded-3xl border border-[#0c4381]/10 p-5 ring-2 ring-[#0c4381]/15 text-left space-y-3">
              <h3 className="text-sm font-black text-[#0c4381] flex items-center gap-2">
                <Sparkles
                  className={`w-4 h-4 ${allergyAlertActive ? "text-red-500 animate-pulse" : "text-[#0c4381] animate-spin"}`}
                />{" "}
                DocAssist AI
              </h3>

              {patientAllergies.length > 0 ? (
                <>
                  <p
                    className={`text-xs leading-relaxed font-semibold ${allergyAlertActive ? "text-red-600 bg-red-50 border border-red-100 p-3 rounded-2xl" : "text-slate-600"}`}
                  >
                    {allergyAlertActive ? (
                      <span>
                        <strong>ALLERGY ALERT:</strong> {activePatient?.name} has a documented
                        allergy to {patientAllergies.join(", ")}. A prescribed medication may
                        conflict.
                      </span>
                    ) : (
                      `${activePatient?.name} has documented allergies: ${patientAllergies.join(", ")}. Currently no prescription conflicts detected.`
                    )}
                  </p>
                  {allergyAlertActive && (
                    <button
                      onClick={handleResolveAllergyAlternative}
                      className="w-full bg-white hover:bg-[#0c4381] hover:text-white border border-[#0c4381]/25 text-[#0c4381] py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                    >
                      Review Alternatives
                    </button>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  No documented drug allergies for {activePatient?.name}. AI monitoring is active.
                </p>
              )}
            </div>

            {/* Doctor Profile Info Card */}
            <div className="glass-panel rounded-3xl overflow-hidden text-left">
              <div className="bg-gradient-to-r from-[#0c4381] to-[#006686] px-5 py-4 text-white flex justify-between items-center">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" /> Profile
                </h3>
                <button
                  onClick={() => {
                    if (profileEditMode) {
                      setProfileEditMode(false);
                    } else {
                      setEditSpecialization(doctorProfile?.specialization || "");
                      setEditQualification(doctorProfile?.qualification || "");
                      setEditHospitalAffiliation(doctorProfile?.hospital_affiliation || "");
                      setEditConsultationFee(doctorProfile?.consultation_fee?.toString() || "");
                      setEditBio(doctorProfile?.bio || "");
                      setEditLanguages(
                        Array.isArray(doctorProfile?.languages)
                          ? doctorProfile.languages.join(", ")
                          : doctorProfile?.languages || ""
                      );
                      setProfileEditMode(true);
                    }
                  }}
                  className="bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
                >
                  {profileEditMode ? <X className="w-3 h-3" /> : <Edit2 className="w-3 h-3" />}
                  {profileEditMode ? "Cancel" : "Edit"}
                </button>
              </div>
              <div className="p-4 space-y-3">
                {!profileEditMode ? (
                  <>
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
                      {doctorAvatarUrl ? (
                        <Image
                          src={doctorAvatarUrl}
                          alt={doctorName}
                          width={40}
                          height={40}
                          unoptimized
                          className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0c4381] to-[#006686] flex items-center justify-center text-white font-bold text-sm">
                          {doctorName.charAt(4) || "D"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{doctorName}</p>
                        {doctorSigUrl && (
                          <Image
                            src={doctorSigUrl}
                            alt="Signature"
                            width={100}
                            height={28}
                            unoptimized
                            className="h-6 object-contain mt-0.5"
                          />
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Specialization
                      </span>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">
                        {doctorProfile?.specialization || "Not set"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Qualification
                      </span>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">
                        {doctorProfile?.qualification || "Not set"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Hospital
                      </span>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">
                        {doctorProfile?.hospital_affiliation || "Not set"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Consultation Fee
                      </span>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">
                        {doctorProfile?.consultation_fee
                          ? `₹${doctorProfile.consultation_fee}`
                          : "Not set"}
                      </p>
                    </div>
                    {doctorProfile?.bio && (
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Bio
                        </span>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                          {doctorProfile.bio}
                        </p>
                      </div>
                    )}
                    {doctorProfile?.languages && doctorProfile.languages.length > 0 && (
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Languages
                        </span>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">
                          {Array.isArray(doctorProfile.languages)
                            ? doctorProfile.languages.join(", ")
                            : doctorProfile.languages}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Specialization
                      </label>
                      <input
                        type="text"
                        value={editSpecialization}
                        onChange={(e) => setEditSpecialization(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Qualification
                      </label>
                      <input
                        type="text"
                        value={editQualification}
                        onChange={(e) => setEditQualification(e.target.value)}
                        placeholder="e.g. MD, MBBS"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Hospital Affiliation
                      </label>
                      <input
                        type="text"
                        value={editHospitalAffiliation}
                        onChange={(e) => setEditHospitalAffiliation(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Consultation Fee (₹)
                      </label>
                      <input
                        type="number"
                        value={editConsultationFee}
                        onChange={(e) => setEditConsultationFee(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Bio
                      </label>
                      <textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="Short professional bio..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20 resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Languages
                      </label>
                      <input
                        type="text"
                        value={editLanguages}
                        onChange={(e) => setEditLanguages(e.target.value)}
                        placeholder="e.g. English, Hindi"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
                      />
                    </div>
                    <button
                      onClick={handleSaveProfileFields}
                      disabled={savingProfile}
                      className="w-full bg-[#0c4381] text-white py-2 rounded-xl text-xs font-bold hover:bg-[#093262] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1"
                    >
                      {savingProfile ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      {savingProfile ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 md:left-20 right-0 h-20 glass-panel-dark flex items-center justify-between px-6 z-30 border-t border-white/10 shadow-2xl">
        <div className="flex gap-2">
          <button
            onClick={handleClearForm}
            className="px-4 py-2 rounded-full border border-white/20 text-white font-bold text-xs hover:bg-white/10 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Clear
          </button>

          <button
            onClick={() => router.push("/dashboard/doctor/prescriptions")}
            className="px-4 py-2 rounded-full border border-white/20 text-white font-bold text-xs hover:bg-white/10 transition-all flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" /> Prescriptions
          </button>

          <div className="relative">
            <button
              onClick={() => setLanguagePopupOpen(!languagePopupOpen)}
              className="px-4 py-2 rounded-full border border-white/20 text-white font-bold text-xs hover:bg-white/10 transition-all flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5" /> {selectedLanguage}
            </button>
            {languagePopupOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-36 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl overflow-hidden p-1 z-50">
                {["English", "Hindi", "Kannada", "Spanish"].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setSelectedLanguage(lang);
                      setLanguagePopupOpen(false);
                      setSuccessToast(`Language changed to ${lang}`);
                      setTimeout(() => setSuccessToast(null), 3000);
                    }}
                    className="w-full text-left p-2 rounded-xl text-xs font-bold text-white hover:bg-slate-800"
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="text-white/80 hover:text-white flex flex-col items-center gap-0.5 group"
            title="Preview Prescription Pad"
          >
            <Eye className="w-5 h-5 group-hover:scale-105 transition-transform" />
            <span className="text-[9px] uppercase tracking-wider font-extrabold">Preview</span>
          </button>
          <button
            onClick={() => {
              setIsPreviewOpen(true);
              setTimeout(() => window.print(), 500);
            }}
            className="text-white/80 hover:text-white flex flex-col items-center gap-0.5 group"
            title="Print Prescription"
          >
            <Printer className="w-5 h-5 group-hover:scale-105 transition-transform" />
            <span className="text-[9px] uppercase tracking-wider font-extrabold">Print Rx</span>
          </button>
          <button
            onClick={() => savePrescription("draft")}
            disabled={isSubmitting}
            className="text-white/80 hover:text-white flex flex-col items-center gap-0.5 group mr-2 disabled:opacity-50"
            title="Save Draft to Database"
          >
            <Save className="w-5 h-5 group-hover:scale-105 transition-transform" />
            <span className="text-[9px] uppercase tracking-wider font-extrabold">Save Draft</span>
          </button>
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Finalize this prescription? This will mark it as completed and notify the pharmacy and patient."
                )
              ) {
                savePrescription("active");
              }
            }}
            disabled={isSubmitting}
            className="bg-white text-[#0c4381] px-6 py-2.5 rounded-full font-bold text-xs shadow-xl hover:scale-[1.03] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Finalizing..." : "Finalize Prescription"}
          </button>
        </div>
      </footer>

      {/* Prescription Preview Modal */}
      {isPreviewOpen && activePatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <header className="bg-gradient-to-r from-[#0c4381] to-[#006686] px-6 py-4 text-white flex justify-between items-center shrink-0">
              <h2 className="font-bold text-sm flex items-center gap-2">
                <Eye className="w-4 h-4" /> Prescription Preview
              </h2>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Printable Prescription Content */}
            <div
              id="printable-rx"
              className="flex-grow overflow-y-auto p-8 space-y-6 text-left text-slate-800 text-xs"
            >
              {/* Doctor Details */}
              <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  {doctorAvatarUrl ? (
                    <Image
                      src={doctorAvatarUrl}
                      alt="Doctor"
                      width={48}
                      height={48}
                      unoptimized
                      className="w-12 h-12 rounded-full object-cover border-2 border-slate-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0c4381] to-[#006686] flex items-center justify-center text-white font-bold text-lg">
                      {doctorName.charAt(4) || "D"}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-black text-[#0c4381] tracking-tight">
                      {doctorProfile?.workspace_name || "ZorabiHealth Center"}
                    </h3>
                    <p className="font-bold mt-1">{doctorName}</p>
                    <p className="text-slate-500 mt-0.5">
                      License No: {String(doctorProfile?.license_number ?? "")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">Date: {new Date().toLocaleDateString()}</p>
                  <p className="text-slate-500 mt-0.5">
                    Ref ID: VP-RX-{new Date().getTime().toString().slice(-6)}
                  </p>
                </div>
              </div>

              {/* Patient Details */}
              <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-4 border border-slate-100">
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wide text-[9px]">
                    Patient
                  </p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{activePatient.name}</p>
                  <p className="text-slate-500 mt-0.5">{activePatient.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-slate-400 font-bold">BP:</span> {systolicBP}/{diastolicBP}{" "}
                    mmHg
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold">SpO2:</span> {spO2}%
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold">Temp:</span> {temp} °F
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold">BMI:</span> {bmi} kg/m²
                  </div>
                </div>
              </div>

              {/* Symptoms & Diagnosis */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold text-[#0c4381] border-b border-slate-100 pb-1">
                    Symptoms
                  </h4>
                  <p className="mt-1.5 leading-relaxed font-semibold text-slate-600">
                    {symptoms || "None reported."}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-[#0c4381] border-b border-slate-100 pb-1">
                    Diagnosis
                  </h4>
                  <p className="mt-1.5 leading-relaxed font-semibold text-slate-600">
                    {diagnosis || "General Consult."}
                  </p>
                </div>
              </div>

              {/* Medications Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-[#0c4381] border-b border-slate-100 pb-1">
                  Rx Medications
                </h4>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-3 font-bold text-slate-600">Drug Name</th>
                        <th className="p-3 font-bold text-slate-600">Dosage</th>
                        <th className="p-3 font-bold text-slate-600">Frequency</th>
                        <th className="p-3 font-bold text-slate-600">Duration</th>
                        <th className="p-3 font-bold text-slate-600">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {prescribedMeds.map((med, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-800">{med.drug_name}</td>
                          <td className="p-3 font-semibold text-slate-600">{med.dosage}</td>
                          <td className="p-3 font-semibold text-slate-600">{med.frequency}</td>
                          <td className="p-3 font-semibold text-slate-600">{med.duration}</td>
                          <td className="p-3 font-semibold text-slate-500 italic">
                            {med.notes || "None"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Follow-up & Footer */}
              <div className="flex justify-between items-end border-t border-slate-100 pt-6">
                <div>
                  {followUpDate && (
                    <p className="font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl inline-block">
                      Follow-up Date: {new Date(followUpDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="text-center w-44 space-y-1">
                  {doctorSigUrl ? (
                    <Image
                      src={doctorSigUrl}
                      alt="Signature"
                      width={160}
                      height={48}
                      unoptimized
                      className="h-12 mx-auto object-contain"
                    />
                  ) : (
                    <div className="border-b border-slate-300 h-10 w-full"></div>
                  )}
                  <p className="text-[10px] font-bold text-slate-500">Authorized Signature</p>
                </div>
              </div>
            </div>

            <footer className="bg-slate-50 px-6 py-4 flex justify-end gap-2 border-t border-slate-100 shrink-0">
              <button
                onClick={handleSavePdf}
                disabled={savingPdf}
                className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                {savingPdf ? "Saving..." : "Save PDF"}
              </button>
              <button
                onClick={() => window.print()}
                className="bg-[#0c4381] text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-[#093262] transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Prescription
              </button>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-2 rounded-xl text-xs font-bold transition-colors"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Create Patient Modal */}
      {showCreatePatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-scale-up">
            <header className="bg-gradient-to-r from-[#0c4381] to-[#006686] px-6 py-4 text-white flex justify-between items-center shrink-0">
              <h2 className="font-bold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> New Patient
              </h2>
              <button
                onClick={() => setShowCreatePatient(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  placeholder="Enter patient name"
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={newPatientEmail}
                  onChange={(e) => setNewPatientEmail(e.target.value)}
                  placeholder="patient@email.com"
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newPatientPhone}
                  onChange={(e) => setNewPatientPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
                />
              </div>
            </div>
            <footer className="bg-slate-50 px-6 py-4 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setShowCreatePatient(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePatient}
                disabled={creatingPatient || !newPatientName.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0c4381] hover:bg-[#093262] transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {creatingPatient ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                {creatingPatient ? "Creating..." : "Create Patient"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Past Visit Detail Modal */}
      {selectedPastVisit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <header className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center shrink-0">
              <h2 className="font-bold text-xs flex items-center gap-2">
                <Clock className="w-4 h-4" /> Visit Details ({selectedPastVisit.date})
              </h2>
              <button
                onClick={() => setSelectedPastVisit(null)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="p-6 space-y-4 text-left text-slate-800 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  Diagnosis
                </span>
                <p className="text-sm font-black text-[#006686] mt-0.5">
                  {selectedPastVisit.diagnosis}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  Visit Notes
                </span>
                <p className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-slate-600 mt-1 italic leading-relaxed font-semibold whitespace-pre-line">
                  {selectedPastVisit.notes || "No visit notes recorded."}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  Prescribed Medications
                </span>
                <div className="border border-slate-100 rounded-2xl overflow-hidden mt-1.5 divide-y divide-slate-100">
                  {selectedPastVisit.items && selectedPastVisit.items.length > 0 ? (
                    selectedPastVisit.items.map((item: PastVisitItem, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-white hover:bg-slate-50 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{item.drug_name}</p>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                            {item.dosage} &middot; {item.frequency} &middot; {item.duration}
                          </p>
                        </div>
                        {item.notes && (
                          <span className="text-[10px] italic text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                            {item.notes}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="p-4 text-center text-slate-400 italic">
                      No medications prescribed during this visit.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <footer className="bg-slate-50 px-6 py-4 flex justify-end gap-2 border-t border-slate-100 shrink-0">
              {selectedPastVisit.hasPdf && (
                <button
                  onClick={async () => {
                    try {
                      const { data: docData } = await supabase
                        .from("prescription_documents")
                        .select("storage_path")
                        .eq("prescription_id", selectedPastVisit.id)
                        .single();
                      if (docData?.storage_path) {
                        const { data: signed } = await supabase.storage
                          .from("prescription_pdfs")
                          .createSignedUrl(docData.storage_path, 3600);
                        if (signed?.signedUrl) window.open(signed.signedUrl, "_blank");
                      }
                    } catch (err) {
                      console.error("Failed to open PDF:", err);
                    }
                  }}
                  className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5" /> Download PDF
                </button>
              )}
              <button
                onClick={() => setSelectedPastVisit(null)}
                className="bg-slate-950 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <header className="bg-gradient-to-r from-[#0c4381] to-[#006686] px-6 py-4 text-white flex justify-between items-center shrink-0">
              <h2 className="font-bold text-sm flex items-center gap-2">
                <Settings className="w-4 h-4" /> Edit Profile
              </h2>
              <button
                onClick={() => setShowProfileEdit(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={editWorkspaceName}
                  onChange={(e) => setEditWorkspaceName(e.target.value)}
                  placeholder="e.g. ZorabiHealth Center"
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c4381]/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Profile Photo
                </label>
                <div className="mt-1 flex items-center gap-4">
                  {editPhotoPreview && (
                    <Image
                      src={editPhotoPreview}
                      alt="Preview"
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-full object-cover border-2 border-slate-200"
                    />
                  )}
                  <label className="cursor-pointer px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition-colors">
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setEditPhoto(f);
                          setEditPhotoPreview(URL.createObjectURL(f));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Signature
                </label>
                <div className="mt-1 flex items-center gap-4">
                  {editSignaturePreview && (
                    <Image
                      src={editSignaturePreview}
                      alt="Signature"
                      width={160}
                      height={48}
                      className="h-12 object-contain border border-slate-200 rounded-lg p-2 bg-white"
                    />
                  )}
                  <label className="cursor-pointer px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition-colors">
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setEditSignature(f);
                          setEditSignaturePreview(URL.createObjectURL(f));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <footer className="bg-slate-50 px-6 py-4 flex justify-end gap-2 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setShowProfileEdit(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0c4381] hover:bg-[#093262] transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingProfile ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all animate-slide-up ${
            toast.type === "error" ? "bg-red-500 text-white" : "bg-emerald-500 text-white"
          }`}
        >
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-3 opacity-70 hover:opacity-100">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
