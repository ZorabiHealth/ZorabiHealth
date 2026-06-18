"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  Truck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function PharmacyRegisterPage() {
  const router = useRouter();
  const { role, userId, loading: roleLoading } = useUserRole();

  const [businessName, setBusinessName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [operatingHours, setOperatingHours] = useState("Mon-Sat 09:00-21:00");
  const [deliveryRadius, setDeliveryRadius] = useState(7);
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const checkExistingProfile = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("pharmacy_profiles")
        .select("id, business_name")
        .eq("user_id", userId!)
        .maybeSingle();
      if (data) {
        setAlreadyRegistered(true);
        setBusinessName(data.business_name);
      }
    } catch {
    } finally {
      setCheckingExisting(false);
    }
  }, [userId]);

  useEffect(() => {
    if (roleLoading) return;
    if (!userId) {
      router.push("/login");
      return;
    }
    const check = async () => {
      await checkExistingProfile();
    };
    check();
  }, [userId, roleLoading, checkExistingProfile, router]);

  useEffect(() => {
    if (pincode.length !== 6) return;
    const geocode = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&limit=1`
        );
        const json = await res.json();
        if (json?.[0]) {
          setLat(Number(json[0].lat));
          setLng(Number(json[0].lon));
        }
      } catch {
        // geocode failed silently, user can still submit
      }
    };
    geocode();
  }, [pincode]);

  const handleSubmit = async () => {
    if (!businessName.trim() || !licenseNumber.trim() || !address.trim() || !pincode.trim()) {
      setError("Business name, license number, address, and pincode are required");
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (alreadyRegistered) {
        const { error: updateError } = await supabase
          .from("pharmacy_profiles")
          .update({
            business_name: businessName.trim(),
            license_number: licenseNumber.trim(),
            address: address.trim(),
            pincode: pincode.trim(),
            phone: phone.trim(),
            operating_hours: operatingHours,
            delivery_radius_km: deliveryRadius,
            lat,
            lng,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId!);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("pharmacy_profiles").insert({
          user_id: userId!,
          business_name: businessName.trim(),
          license_number: licenseNumber.trim(),
          address: address.trim(),
          pincode: pincode.trim(),
          phone: phone.trim(),
          operating_hours: operatingHours,
          delivery_radius_km: deliveryRadius,
          lat,
          lng,
        });

        if (insertError) throw insertError;

        if (role !== "pharmacy_vendor") {
          await supabase
            .from("user_roles")
            .upsert({ user_id: userId!, role: "pharmacy_vendor" }, { onConflict: "user_id" });
        }
      }

      setSuccess(true);
      setTimeout(() => router.push("/dashboard/pharmacy/inventory"), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to register pharmacy";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (checkingExisting || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          {alreadyRegistered ? "Profile Updated!" : "Pharmacy Registered!"}
        </h2>
        <p className="text-sm text-slate-500">Redirecting to inventory...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/pharmacy/inventory"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {alreadyRegistered ? "Edit Pharmacy Profile" : "Register Your Pharmacy"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {alreadyRegistered
              ? "Update your business details"
              : "Fill in your pharmacy details to start managing inventory"}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertCircle className="h-4 w-4 text-red-500" />
          {error}
        </div>
      )}

      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">
            Business Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              placeholder="e.g. City Medical Store"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">
            License Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            placeholder="e.g. DL-1234-56789"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">
            Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              placeholder="Full address with landmark"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Pincode <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              placeholder="6-digit pincode"
              maxLength={6}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="10-digit mobile"
                maxLength={10}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Operating Hours</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={operatingHours}
              onChange={(e) => setOperatingHours(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              placeholder="Mon-Sat 09:00-21:00"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Delivery Radius (km)</label>
          <div className="relative">
            <Truck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="number"
              min="1"
              max="50"
              value={deliveryRadius}
              onChange={(e) => setDeliveryRadius(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link
          href="/dashboard/pharmacy/inventory"
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          Cancel
        </Link>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Building2 className="h-4 w-4" />
          )}
          {alreadyRegistered ? "Update Profile" : "Register Pharmacy"}
        </button>
      </div>
    </div>
  );
}
