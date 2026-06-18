"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  BookOpen,
  Search,
  X,
  Plus,
  Check,
  Loader2,
  AlertCircle,
  Pill,
  Building2,
  Package,
  Trash2,
  Save,
} from "lucide-react";

interface Drug {
  id: string;
  name: string;
  generic_name: string;
  category: string;
  manufacturer: string;
  storeProduct?: {
    id: string;
    image_url: string;
    description: string;
    is_active: boolean;
  } | null;
}

const CATEGORIES = [
  "All",
  "Cardiovascular",
  "Antibiotic",
  "Pain Relief",
  "Diabetes",
  "Mental Health",
  "Vitamin",
  "Respiratory",
  "Gastrointestinal",
  "Analgesic",
  "Antidiabetic",
  "Statin",
  "ACE Inhibitor",
  "Calcium Channel Blocker",
  "ARB",
  "Proton Pump Inhibitor",
  "Antihistamine",
  "NSAID",
  "Supplement",
];

export default function DrugCatalogPage() {
  const { role, userId } = useUserRole();
  const router = useRouter();
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [fetchError, setFetchError] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDrug, setNewDrug] = useState({
    name: "",
    generic_name: "",
    category: "General",
    manufacturer: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [addToStorePrice, setAddToStorePrice] = useState<{ id: string; price: string } | null>(
    null
  );

  const getCatalogData = useCallback(async () => {
    let query = supabase.from("drug_catalog").select("*").order("name");
    if (selectedCategory !== "All") query = query.eq("category", selectedCategory);
    if (searchTerm) query = query.ilike("name", `%${searchTerm}%`);

    const [{ data: catalogData, error: catalogErr }, { data: storeData, error: storeErr }] =
      await Promise.all([
        query,
        supabase
          .from("store_products")
          .select("id, name, description, image_url, is_active")
          .eq("is_active", true),
      ]);

    if (catalogErr) throw new Error(catalogErr.message);
    if (storeErr) console.warn("[Catalog] Store fetch:", storeErr.message);

    const storeMap = new Map<
      string,
      { id: string; image_url: string; description: string; is_active: boolean }
    >();
    (storeData ?? []).forEach((sp: Record<string, unknown>) => {
      const key = ((sp.name as string) ?? "").toLowerCase().trim();
      storeMap.set(key, {
        id: sp.id as string,
        image_url: (sp.image_url as string) || "",
        description: (sp.description as string) || "",
        is_active: sp.is_active as boolean,
      });
    });

    return (catalogData ?? []).map((d: Record<string, unknown>) => {
      const drugName = (d.name as string) || "";
      const storeMatch = storeMap.get(drugName.toLowerCase().trim());
      return {
        id: d.id as string,
        name: drugName,
        generic_name: (d.generic_name as string) || "",
        category: (d.category as string) || "",
        manufacturer: (d.manufacturer as string) || "",
        storeProduct: storeMatch
          ? {
              id: storeMatch.id,
              image_url: storeMatch.image_url,
              description: storeMatch.description,
              is_active: storeMatch.is_active,
            }
          : null,
      };
    });
  }, [selectedCategory, searchTerm]);

  const fetchCatalog = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const drugs = await getCatalogData();
      setDrugs(drugs);
    } catch (err: unknown) {
      console.error("[Catalog] Failed:", err);
      const message = err instanceof Error ? err.message : "Failed to load catalog";
      setFetchError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === null) return;
    if (role !== "pharmacy_vendor") {
      router.push("/dashboard");
      return;
    }
    const load = async () => {
      setLoading(true);
      setFetchError("");
      try {
        const drugs = await getCatalogData();
        setDrugs(drugs);
      } catch (err: unknown) {
        console.error("[Catalog] Failed:", err);
        const message = err instanceof Error ? err.message : "Failed to load catalog";
        setFetchError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [role, router, selectedCategory, searchTerm, getCatalogData]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setFetchError("");
      try {
        const drugs = await getCatalogData();
        setDrugs(drugs);
      } catch (err: unknown) {
        console.error("[Catalog] Failed:", err);
        const message = err instanceof Error ? err.message : "Failed to load catalog";
        setFetchError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedCategory, searchTerm, getCatalogData]);

  const addToInventory = async (drug: Drug) => {
    setAddingId(drug.id);
    try {
      const { data: profile } = await supabase
        .from("pharmacy_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();
      if (!profile) throw new Error("No pharmacy profile");
      const { error } = await supabase
        .from("pharmacy_inventory")
        .upsert(
          { pharmacy_id: profile.id, drug_id: drug.id, stock: 0, price_per_unit: 0 },
          { onConflict: "pharmacy_id, drug_id" }
        );
      if (error) throw error;
    } catch {
      console.error("[Catalog] Add to inventory failed:");
    } finally {
      setAddingId(null);
    }
  };

  const addToStore = async (drug: Drug, price?: number) => {
    setAddingId(drug.id);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;
      const res = await fetch(
        `${typeof window !== "undefined" ? window.location.origin : ""}/api/store/products`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            name: drug.name,
            generic_name: drug.generic_name,
            manufacturer: drug.manufacturer,
            category: drug.category,
            price: price || 0,
            mrp: price ? price * 1.2 : 0,
            in_stock: true,
            image_url: "/images/placeholder.svg",
          }),
        }
      );
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Failed");
      }
      setAddToStorePrice(null);
      fetchCatalog();
    } catch {
      console.error("[Catalog] Add to store failed:");
    } finally {
      setAddingId(null);
    }
  };

  const addNewDrug = async () => {
    if (!newDrug.name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("drug_catalog").insert({
        name: newDrug.name.trim(),
        generic_name: newDrug.generic_name.trim(),
        category: newDrug.category,
        manufacturer: newDrug.manufacturer.trim(),
      });
      if (error) throw error;
      setShowAddForm(false);
      setNewDrug({ name: "", generic_name: "", category: "General", manufacturer: "" });
      fetchCatalog();
    } catch {
      console.error("[Catalog] Add drug failed:");
    } finally {
      setSaving(false);
    }
  };

  const deleteDrug = async (drugId: string) => {
    setDrugs((prev) => prev.filter((d) => d.id !== drugId));
    const { error } = await supabase.from("drug_catalog").delete().eq("id", drugId);
    if (error) {
      fetchCatalog();
      console.error("[Catalog] Delete failed:", error);
    }
    setDeleteConfirm(null);
  };

  if (role === null) {
    return <div className="flex items-center justify-center h-full text-slate-500">Loading...</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-800">Drug Catalog</h1>
          <p className="text-sm text-slate-500">
            {drugs.length} drug{drugs.length !== 1 ? "s" : ""} in master reference
            {drugs.length > 0 && (
              <span className="ml-1.5 text-emerald-600">
                · {drugs.filter((d) => d.storeProduct).length} on store
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          New Drug
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by drug name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchCatalog()}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                fetchCatalog();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={fetchCatalog}
          className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
        >
          Search
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
              selectedCategory === cat
                ? "bg-emerald-600 text-white shadow"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Error */}
      {fetchError && !loading && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Failed to load catalog</p>
            <p className="text-xs text-red-600 mt-0.5">{fetchError}</p>
          </div>
          <button
            onClick={fetchCatalog}
            className="shrink-0 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-slate-100 bg-white overflow-hidden"
            >
              <div className="h-36 bg-slate-100" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-8 bg-slate-100 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && drugs.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
            <BookOpen className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            {searchTerm ? `No drugs matching "${searchTerm}"` : "No drugs in catalog"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {searchTerm
              ? "Try a different search term or category"
              : "The catalog may need to be populated"}
          </p>
        </div>
      )}

      {/* Grid */}
      {!loading && drugs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {drugs.map((drug) => (
            <div
              key={drug.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-lg hover:shadow-emerald-500/5"
            >
              {/* Image area */}
              <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50/30 p-4">
                {drug.storeProduct?.image_url &&
                drug.storeProduct.image_url !== "/images/placeholder.svg" ? (
                  <Image
                    src={drug.storeProduct.image_url}
                    alt={drug.name}
                    width={96}
                    height={96}
                    className="h-24 w-24 object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-200">
                    <span className="text-3xl font-bold text-white/90 drop-shadow-sm">
                      {drug.name ? drug.name.charAt(0).toUpperCase() : "?"}
                    </span>
                  </div>
                )}
                {drug.storeProduct && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 shadow-sm">
                    <Package className="h-3 w-3" />
                    Listed
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-800 line-clamp-2">{drug.name}</h3>
                    {drug.generic_name && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{drug.generic_name}</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                {drug.storeProduct?.description && (
                  <p className="mt-1.5 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {drug.storeProduct.description}
                  </p>
                )}

                {/* Details */}
                <div className="mt-2.5 space-y-1.5">
                  {drug.category && (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        <Pill className="h-3 w-3" />
                        {drug.category}
                      </span>
                    </div>
                  )}
                  {drug.manufacturer && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">{drug.manufacturer}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-auto flex items-center gap-2 pt-3 border-t border-slate-50">
                  <button
                    onClick={() => addToInventory(drug)}
                    disabled={addingId === drug.id}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
                  >
                    {addingId === drug.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    Inventory
                  </button>
                  {drug.storeProduct ? (
                    <span className="flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
                      <Check className="h-3 w-3" />
                      Store
                    </span>
                  ) : (
                    <button
                      onClick={() => setAddToStorePrice({ id: drug.id, price: "" })}
                      disabled={addingId === drug.id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {addingId === drug.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <BookOpen className="h-3 w-3" />
                      )}
                      List on Store
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(drug.id)}
                    className="flex items-center justify-center rounded-xl p-2 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Delete from catalog"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Drug Modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setShowAddForm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-white/40 w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Add New Drug</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Drug Name *
                </label>
                <input
                  type="text"
                  value={newDrug.name}
                  onChange={(e) => setNewDrug({ ...newDrug, name: e.target.value })}
                  placeholder="e.g. Paracetamol 500mg"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Generic Name
                </label>
                <input
                  type="text"
                  value={newDrug.generic_name}
                  onChange={(e) => setNewDrug({ ...newDrug, generic_name: e.target.value })}
                  placeholder="e.g. Paracetamol"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Category</label>
                <select
                  value={newDrug.category}
                  onChange={(e) => setNewDrug({ ...newDrug, category: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Manufacturer
                </label>
                <input
                  type="text"
                  value={newDrug.manufacturer}
                  onChange={(e) => setNewDrug({ ...newDrug, manufacturer: e.target.value })}
                  placeholder="e.g. Cipla"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={addNewDrug}
                disabled={saving || !newDrug.name.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Adding..." : "Add Drug"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-white/40 w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Delete Drug</h2>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600">
                Are you sure you want to delete this drug from the catalog? This will also remove it
                from all pharmacy inventories.
              </p>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteDrug(deleteConfirm)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Price for Store Modal */}
      {addToStorePrice && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setAddToStorePrice(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-white/40 w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">List on Store</h2>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-500">
                Set the selling price for this drug. MRP will be set at 20% higher.
              </p>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Selling Price (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={addToStorePrice.price}
                  onChange={(e) =>
                    setAddToStorePrice({ ...addToStorePrice, price: e.target.value })
                  }
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              {addToStorePrice.price && parseFloat(addToStorePrice.price) > 0 && (
                <p className="text-xs text-emerald-600 font-medium">
                  MRP: ₹{(parseFloat(addToStorePrice.price) * 1.2).toFixed(2)}
                </p>
              )}
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setAddToStorePrice(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const drug = drugs.find((d) => d.id === addToStorePrice.id);
                  if (drug) addToStore(drug, parseFloat(addToStorePrice.price) || 0);
                }}
                disabled={!addToStorePrice.price || parseFloat(addToStorePrice.price) <= 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50"
              >
                <BookOpen className="w-4 h-4" />
                List on Store
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
