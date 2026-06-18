"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Check,
  AlertCircle,
  Pill,
  Package,
  Save,
  Loader2,
  ImageUp,
  FlaskConical,
  Tag,
  Shield,
  Warehouse,
  GripHorizontal,
  Eye,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/pharmacy-store-data";

interface StoreProduct {
  id: string;
  user_id: string;
  name: string;
  generic_name: string;
  manufacturer: string;
  category: string;
  description: string;
  composition: string;
  dosage: string;
  usage: string;
  side_effects: string;
  safety: string[];
  storage: string;
  price: number;
  mrp: number;
  image_url: string;
  is_pinned: boolean;
  is_active: boolean;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
}

const STORE_CATEGORIES = CATEGORIES.filter((c) => c.id !== "all").map((c) => c.id);

type FormTab = "basic" | "details" | "pricing" | "safety";

const tabs: { key: FormTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: "basic", label: "Basic Info", icon: Tag },
  { key: "details", label: "Medicine Details", icon: FlaskConical },
  { key: "pricing", label: "Pricing & Stock", icon: Warehouse },
  { key: "safety", label: "Safety & Storage", icon: Shield },
];

const emptyForm: Omit<StoreProduct, "id" | "user_id" | "created_at" | "updated_at"> = {
  name: "",
  generic_name: "",
  manufacturer: "",
  category: "Analgesic",
  description: "",
  composition: "",
  dosage: "",
  usage: "",
  side_effects: "",
  safety: [],
  storage: "",
  price: 0,
  mrp: 0,
  image_url: "/images/placeholder.svg",
  is_pinned: false,
  is_active: true,
  in_stock: true,
};

export default function PharmacyProductsPage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState<FormTab>("basic");
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [safetyInput, setSafetyInput] = useState("");
  const [success, setSuccess] = useState("");
  const [previewUrl, setPreviewUrl] = useState(emptyForm.image_url);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const blobUrlRef = useRef("");

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const fetchProducts = async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;
      const res = await fetch(`${apiUrl}/api/store/products?vendor=true`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.products) setProducts(json.products);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchProducts();
    };
    load();
  }, []);

  useEffect(() => {
    if (blobUrlRef.current && form.image_url !== blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = "";
    }
  }, [form.image_url]);

  const uploadImage = async (file: File): Promise<string> => {
    if (!file.type.startsWith("image/")) throw new Error("Only image files allowed");
    if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5MB");

    setUploadingImage(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop() || "png";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("pharmacy_products")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("pharmacy_products").getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Revoke the temporary blob URL and replace with the permanent one
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = "";
      }
      return publicUrl;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    blobUrlRef.current = localUrl;
    setPreviewUrl(localUrl);
    try {
      const url = await uploadImage(file);
      setForm((prev) => ({ ...prev, image_url: url }));
      setPreviewUrl(url);
    } catch (err: unknown) {
      setPreviewUrl("");
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    blobUrlRef.current = localUrl;
    setPreviewUrl(localUrl);
    try {
      const url = await uploadImage(file);
      setForm((prev) => ({ ...prev, image_url: url }));
      setPreviewUrl(url);
    } catch (err: unknown) {
      setPreviewUrl("");
      setError(err instanceof Error ? err.message : "An error occurred");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setSafetyInput("");
    setError("");
    setActiveTab("basic");
    setShowForm(true);
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = "";
    }
    setPreviewUrl("");
  };

  const openEdit = (p: StoreProduct) => {
    setForm({
      name: p.name,
      generic_name: p.generic_name,
      manufacturer: p.manufacturer,
      category: p.category,
      description: p.description,
      composition: p.composition,
      dosage: p.dosage,
      usage: p.usage,
      side_effects: p.side_effects,
      safety: p.safety || [],
      storage: p.storage,
      price: p.price,
      mrp: p.mrp,
      image_url: p.image_url,
      is_pinned: p.is_pinned,
      is_active: p.is_active,
      in_stock: p.in_stock,
    });
    setEditingId(p.id);
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = "";
    }
    setPreviewUrl(p.image_url || "");
    setSafetyInput("");
    setError("");
    setActiveTab("basic");
    setShowForm(true);
  };

  const addSafety = () => {
    const val = safetyInput.trim();
    if (val && !form.safety.includes(val)) {
      setForm({ ...form, safety: [...form.safety, val] });
    }
    setSafetyInput("");
  };

  const removeSafety = (idx: number) => {
    setForm({ ...form, safety: form.safety.filter((_, i) => i !== idx) });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Product name is required");
      setActiveTab("basic");
      return;
    }
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;

      const body = { ...form, safety: form.safety };
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(`${apiUrl}/api/store/products`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(editingId ? { id: editingId, ...body } : body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");

      setSuccess(editingId ? "Product updated successfully" : "Product created successfully");
      setShowForm(false);
      fetchProducts();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;
      await fetch(`${apiUrl}/api/store/products?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      fetchProducts();
    } catch {}
  };

  const toggleActive = async (p: StoreProduct) => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;
      await fetch(`${apiUrl}/api/store/products`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: p.id, is_active: !p.is_active }),
      });
      fetchProducts();
    } catch {}
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.generic_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.manufacturer?.toLowerCase().includes(search.toLowerCase())
  );

  const renderFormTab = () => {
    switch (activeTab) {
      case "basic":
        return (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Product Image
              </label>
              <div
                ref={dropRef}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleImageDrop}
                onClick={() => fileInputRef.current?.click()}
                className="relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 transition-colors hover:border-emerald-300 hover:bg-emerald-50/30"
              >
                {uploadingImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                    <span className="text-sm text-slate-500">Uploading...</span>
                  </div>
                ) : previewUrl && previewUrl !== "/images/placeholder.svg" ? (
                  <div className="relative w-full max-w-[200px]">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="mx-auto h-40 w-40 rounded-xl object-contain"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        URL.revokeObjectURL(previewUrl);
                        blobUrlRef.current = "";
                        setPreviewUrl("");
                        setForm({ ...form, image_url: "" });
                      }}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <p className="mt-2 text-center text-xs text-slate-400">
                      Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
                      <ImageUp className="h-6 w-6 text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">
                      Drop product image here or click to browse
                    </p>
                    <p className="text-xs text-slate-400">PNG, JPG, WebP up to 5MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleImagePick}
                  className="hidden"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="e.g. Dolo 650mg"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Generic Name
              </label>
              <input
                type="text"
                value={form.generic_name}
                onChange={(e) => setForm({ ...form, generic_name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="e.g. Paracetamol"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Manufacturer
              </label>
              <input
                type="text"
                value={form.manufacturer}
                onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="e.g. Micro Labs"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                {STORE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="Brief description of the medicine..."
              />
            </div>
          </div>
        );

      case "details":
        return (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Composition
              </label>
              <input
                type="text"
                value={form.composition}
                onChange={(e) => setForm({ ...form, composition: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="e.g. Each tablet contains Paracetamol IP 650mg"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Dosage</label>
              <input
                type="text"
                value={form.dosage}
                onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="e.g. 1 tablet every 6 hours"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Therapeutic Usage
              </label>
              <input
                type="text"
                value={form.usage}
                onChange={(e) => setForm({ ...form, usage: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="e.g. Fever, Headache, Toothache"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Side Effects
              </label>
              <textarea
                value={form.side_effects}
                onChange={(e) => setForm({ ...form, side_effects: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="e.g. Nausea, rash, liver damage with overdose"
              />
            </div>
          </div>
        );

      case "pricing":
        return (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Selling Price (Rs) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  Rs.
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">MRP (Rs)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  Rs.
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.mrp}
                  onChange={(e) => setForm({ ...form, mrp: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              {form.mrp > form.price && (
                <p className="mt-1 text-xs text-emerald-600">
                  Customer saves Rs.{(form.mrp - form.price).toFixed(2)} (
                  {(100 - (form.price / form.mrp) * 100).toFixed(0)}% off)
                </p>
              )}
            </div>

            <div className="flex items-end gap-6">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={form.in_stock}
                  onChange={(e) => setForm({ ...form, in_stock: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-700">In Stock</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={form.is_pinned}
                  onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-700">Featured</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-700">Active</span>
              </label>
            </div>
          </div>
        );

      case "safety":
        return (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Safety Warnings
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={safetyInput}
                  onChange={(e) => setSafetyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSafety())}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Type a warning and press Enter..."
                />
                <button
                  onClick={addSafety}
                  className="rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  Add
                </button>
              </div>
              {form.safety.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.safety.map((s, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800"
                    >
                      {s}
                      <button
                        onClick={() => removeSafety(i)}
                        className="text-amber-500 hover:text-amber-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Storage Instructions
              </label>
              <input
                type="text"
                value={form.storage}
                onChange={(e) => setForm({ ...form, storage: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="e.g. Store below 30C, protect from light and moisture"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Products</h1>
          <p className="mt-1 text-sm text-slate-500">
            {products.length} product{products.length !== 1 ? "s" : ""} in your catalog
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex overflow-hidden rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${viewMode === "grid" ? "bg-emerald-50 text-emerald-600" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <GripHorizontal className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors ${viewMode === "list" ? "bg-emerald-50 text-emerald-600" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <Check className="h-4 w-4 text-emerald-600" />
          {success}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, generic, or manufacturer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg">
          {/* Form Tabs */}
          <div className="flex border-b border-slate-100">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3.5 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
                      : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => setShowForm(false)}
              className="px-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                <AlertCircle className="h-4 w-4 text-red-500" />
                {error}
              </div>
            )}

            {renderFormTab()}

            <div className="mt-6 flex justify-between border-t border-slate-100 pt-5">
              <div className="flex gap-2">
                {activeTab !== "basic" && (
                  <button
                    onClick={() =>
                      setActiveTab(tabs[tabs.findIndex((t) => t.key === activeTab) - 1].key)
                    }
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Previous
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {activeTab !== "safety" ? (
                  <button
                    onClick={() =>
                      setActiveTab(tabs[tabs.findIndex((t) => t.key === activeTab) + 1].key)
                    }
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {editingId ? "Update Product" : "Create Product"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-20 text-center">
          <Package className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            {search ? "No products match your search" : "No products yet"}
          </p>
          {!search && (
            <button
              onClick={openNew}
              className="mt-3 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Add your first product
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:shadow-lg hover:shadow-emerald-100/40"
            >
              <div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50/30 p-6">
                <img
                  src={p.image_url || "/images/placeholder.svg"}
                  alt={p.name}
                  className="h-32 w-32 object-contain transition-transform duration-300 group-hover:scale-110"
                />
                {p.is_pinned && (
                  <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-900 shadow">
                    FEATURED
                  </span>
                )}
                <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Link
                    href={`/zobraipharm/product/${p.id}`}
                    target="_blank"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow transition-colors hover:bg-blue-50 hover:text-blue-600"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => openEdit(p)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    {p.category}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                      p.in_stock ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    }`}
                  >
                    {p.in_stock ? "In Stock" : "Out of Stock"}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900">{p.name}</h3>
                {p.generic_name && <p className="text-xs text-slate-500">{p.generic_name}</p>}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-lg font-bold text-emerald-700">Rs.{p.price}</span>
                  {p.mrp > p.price && (
                    <span className="text-xs text-slate-400 line-through">Rs.{p.mrp}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3.5 font-semibold text-slate-600">Product</th>
                <th className="px-5 py-3.5 font-semibold text-slate-600">Category</th>
                <th className="px-5 py-3.5 font-semibold text-slate-600">Price</th>
                <th className="px-5 py-3.5 font-semibold text-slate-600">Stock</th>
                <th className="px-5 py-3.5 font-semibold text-slate-600">Status</th>
                <th className="px-5 py-3.5 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-50 transition-colors hover:bg-slate-50/50"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-emerald-50">
                        <img
                          src={p.image_url || "/images/placeholder.svg"}
                          alt={p.name}
                          className="h-10 w-10 object-contain"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        {p.generic_name && (
                          <p className="mt-0.5 text-xs text-slate-500">{p.generic_name}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{p.category}</td>
                  <td className="px-5 py-4">
                    <span className="font-semibold text-slate-900">Rs.{p.price}</span>
                    {p.mrp > 0 && (
                      <span className="ml-1.5 text-xs text-slate-400 line-through">Rs.{p.mrp}</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${p.in_stock ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                    >
                      {p.in_stock ? "In Stock" : "Out of Stock"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => toggleActive(p)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        p.is_active
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {p.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/zobraipharm/product/${p.id}`}
                        target="_blank"
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        title="View in Store"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
