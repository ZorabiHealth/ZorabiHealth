"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  X,
  Save,
  TrendingDown,
  Upload,
  Download,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  GripHorizontal,
  Eye,
  Pill,
  AlertCircle,
  Check,
  Loader2,
  Trash2,
} from "lucide-react";

interface InventoryItem {
  id: string;
  pharmacy_id: string;
  drug_id: string;
  stock_quantity: number;
  price: number;
  drug_name: string;
  drug_category: string;
  auto_refill_threshold?: number;
  storeProduct?: {
    id: string;
    image_url: string;
    description: string;
    manufacturer: string;
    is_active: boolean;
  } | null;
}

const LOW_STOCK_THRESHOLD = 10;
const STALE_THRESHOLD_MS = 120000;

export default function PharmacyInventoryPage() {
  const { role, userId } = useUserRole();
  const router = useRouter();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Add form
  const [drugSearch, setDrugSearch] = useState("");
  const [drugs, setDrugs] = useState<
    { id: string; name: string; category: string; source: string }[]
  >([]);
  const [selectedDrugs, setSelectedDrugs] = useState<
    { id: string; name: string; source: string }[]
  >([]);
  const [stockQty, setStockQty] = useState(0);
  const [price, setPrice] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");

  // CSV upload state
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const downloadCsvTemplate = () => {
    const headers = "drug_name,category,stock_quantity,price\n";
    const sample =
      "Paracetamol 500mg,Analgesics,100,2.5\nAmoxicillin 250mg,Antibiotics,50,8.0\nVitamin D3 60K,Supplements,200,15.0\n";
    const blob = new Blob([headers + sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pharmacyId) return;

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setCsvResult({
        ok: false,
        msg: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 5MB.`,
      });
      e.target.value = "";
      return;
    }

    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setCsvResult({ ok: false, msg: "Invalid file type. Please upload a .csv file." });
      e.target.value = "";
      return;
    }

    setCsvUploading(true);
    setCsvResult(null);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());

      if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");
      if (lines.length > 1001) throw new Error("Maximum 1000 rows per upload");

      const header = lines[0]
        .toLowerCase()
        .split(",")
        .map((h) => h.trim());
      const nameIdx = header.indexOf("drug_name");
      const catIdx = header.indexOf("category");
      const qtyIdx = header.indexOf("stock_quantity");
      const priceIdx = header.indexOf("price");

      if (nameIdx === -1 || qtyIdx === -1 || priceIdx === -1) {
        throw new Error("CSV must have columns: drug_name, category, stock_quantity, price");
      }

      const rows: { drugName: string; category: string; stockQty: number; price: number }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        if (cols.length < 4) continue;
        const drugName = cols[nameIdx];
        const stockQtyVal = parseInt(cols[qtyIdx]) || 0;
        const priceVal = parseFloat(cols[priceIdx]) || 0;
        if (!drugName || stockQtyVal <= 0) continue;
        rows.push({
          drugName,
          category: catIdx >= 0 ? cols[catIdx] : "General",
          stockQty: stockQtyVal,
          price: priceVal,
        });
      }

      if (rows.length === 0) throw new Error("No valid data rows found in CSV");

      const deduped = new Map<string, (typeof rows)[0]>();
      for (const row of rows) deduped.set(row.drugName.toLowerCase(), row);
      const uniqueRows = Array.from(deduped.values());

      const BATCH_SIZE = 25;
      let imported = 0;
      let errors = 0;
      const seenDrugs = new Map<string, string>();

      for (let batchStart = 0; batchStart < uniqueRows.length; batchStart += BATCH_SIZE) {
        const batch = uniqueRows.slice(batchStart, batchStart + BATCH_SIZE);
        for (const row of batch) {
          try {
            let drugId = seenDrugs.get(row.drugName.toLowerCase());
            if (!drugId) {
              const { data: existingDrug } = await supabase
                .from("drug_catalog")
                .select("id")
                .eq("name", row.drugName)
                .maybeSingle();
              if (existingDrug) {
                drugId = existingDrug.id;
              } else {
                const { data: newDrug, error: drugErr } = await supabase
                  .from("drug_catalog")
                  .insert({ name: row.drugName, category: row.category })
                  .select("id")
                  .single();
                if (drugErr || !newDrug) {
                  errors++;
                  continue;
                }
                drugId = newDrug.id;
              }
              seenDrugs.set(row.drugName.toLowerCase(), drugId!);
            }
            const { error: invErr } = await supabase
              .from("pharmacy_inventory")
              .upsert(
                {
                  pharmacy_id: pharmacyId,
                  drug_id: drugId,
                  stock: row.stockQty,
                  price_per_unit: row.price,
                },
                { onConflict: "pharmacy_id, drug_id" }
              );
            if (invErr) {
              errors++;
              continue;
            }
            imported++;
          } catch {
            errors++;
          }
        }
      }

      setCsvResult({
        ok: true,
        msg: `Imported ${imported} item${imported !== 1 ? "s" : ""}${errors > 0 ? ` (${errors} error${errors !== 1 ? "s" : ""})` : ""}`,
      });
      fetchPharmacyAndInventory();
    } catch (err: any) {
      setCsvResult({ ok: false, msg: err.message || "CSV import failed" });
    } finally {
      setCsvUploading(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    if (role === null) return;
    if (role !== "pharmacy_vendor") {
      router.push("/dashboard");
      return;
    }
    fetchPharmacyAndInventory();
  }, [role, userId, router]);

  const fetchPharmacyAndInventory = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const { data: profile, error: profileErr } = await supabase
        .from("pharmacy_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (profileErr || !profile) {
        setLoading(false);
        return;
      }

      setPharmacyId(profile.id);

      const [{ data: invData, error: invErr }, { data: storeData, error: storeErr }] =
        await Promise.all([
          supabase
            .from("pharmacy_inventory")
            .select(
              `id, pharmacy_id, drug_id, stock, price_per_unit, auto_refill_threshold, drugs:drug_id(name, category)`
            )
            .eq("pharmacy_id", profile.id),
          supabase
            .from("store_products")
            .select("id, name, description, manufacturer, image_url, is_active")
            .eq("is_active", true),
        ]);

      if (invErr) throw new Error(invErr.message);
      if (storeErr) console.warn("[Inv] Store products fetch failed:", storeErr.message);

      const storeMap = new Map<
        string,
        {
          id: string;
          description: string;
          manufacturer: string;
          image_url: string;
          is_active: boolean;
        }
      >();
      (storeData ?? []).forEach((sp: Record<string, unknown>) => {
        const key = ((sp.name as string) ?? "").toLowerCase().trim();
        storeMap.set(key, {
          id: sp.id as string,
          description: (sp.description as string) || "",
          manufacturer: (sp.manufacturer as string) || "",
          image_url: (sp.image_url as string) || "",
          is_active: sp.is_active as boolean,
        });
      });

      const items: InventoryItem[] = (invData ?? []).map((d: Record<string, unknown>) => {
        const drugData = d.drugs as { name: string; category: string } | undefined;
        const drugName = drugData?.name ?? "Unknown";
        const storeMatch = storeMap.get(drugName.toLowerCase().trim());
        return {
          id: d.id as string,
          pharmacy_id: d.pharmacy_id as string,
          drug_id: d.drug_id as string,
          stock_quantity: (d.stock ?? 0) as number,
          price: (d.price_per_unit ?? 0) as number,
          drug_name: drugName,
          drug_category: drugData?.category ?? "Unknown",
          auto_refill_threshold: d.auto_refill_threshold as number | undefined,
          storeProduct: storeMatch
            ? {
                id: storeMatch.id,
                image_url: storeMatch.image_url,
                description: storeMatch.description,
                manufacturer: storeMatch.manufacturer,
                is_active: storeMatch.is_active,
              }
            : null,
        };
      });

      setInventory(items);
      setLastFetchTime(Date.now());
    } catch (err: any) {
      console.error("[Inv] Failed to fetch inventory:", err);
      setFetchError(err.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const searchDrugs = async (q: string) => {
    setDrugSearch(q);
    if (q.length < 2) {
      setDrugs([]);
      return;
    }
    try {
      const [catalogRes, storeRes] = await Promise.allSettled([
        supabase
          .from("drug_catalog")
          .select("id, name, category")
          .ilike("name", `%${q}%`)
          .limit(10),
        supabase
          .from("store_products")
          .select("id, name, category")
          .ilike("name", `%${q}%`)
          .eq("is_active", true)
          .limit(10),
      ]);

      const catalogDrugs = (
        catalogRes.status === "fulfilled" ? (catalogRes.value.data ?? []) : []
      ).map((d: any) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        source: "catalog" as const,
      }));
      const storeDrugs = (storeRes.status === "fulfilled" ? (storeRes.value.data ?? []) : []).map(
        (d: any) => ({ id: d.id, name: d.name, category: d.category, source: "store" as const })
      );

      const seen = new Set<string>();
      const merged = [...catalogDrugs, ...storeDrugs].filter((d) => {
        const key = d.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setDrugs(merged);
    } catch {
      setDrugs([]);
    }
  };

  const addMultipleToInventory = async () => {
    if (!selectedDrugs.length || !pharmacyId || stockQty <= 0) return;
    setSaving(true);
    let added = 0;
    let errors = 0;
    try {
      for (const drug of selectedDrugs) {
        try {
          let drugId = drug.id;
          if (drug.source === "store") {
            const { data: existing } = await supabase
              .from("drug_catalog")
              .select("id")
              .ilike("name", `%${drug.name.split(" (")[0]}%`)
              .limit(1)
              .maybeSingle();
            if (existing) {
              drugId = existing.id;
            } else {
              const cleanName = drug.name.split(" (")[0].trim();
              const { data: newDrug, error: createErr } = await supabase
                .from("drug_catalog")
                .insert({ name: cleanName, category: "General" })
                .select("id")
                .single();
              if (createErr || !newDrug) {
                errors++;
                continue;
              }
              drugId = newDrug.id;
            }
          }
          const { error } = await supabase
            .from("pharmacy_inventory")
            .upsert(
              { pharmacy_id: pharmacyId, drug_id: drugId, stock: stockQty, price_per_unit: price },
              { onConflict: "pharmacy_id, drug_id" }
            );
          if (error) {
            errors++;
            continue;
          }
          added++;
        } catch {
          errors++;
        }
      }
      // Sync store_products.in_stock for all added drugs
      if (added > 0 && stockQty > 0) {
        const session = (await supabase.auth.getSession()).data.session;
        if (session) {
          const apiUrl = typeof window !== "undefined" ? window.location.origin : "";
          for (const drug of selectedDrugs) {
            const cleanName = drug.name.split(" (")[0].trim();
            await fetch(`${apiUrl}/api/store/products/sync`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ name: cleanName, in_stock: true }),
            });
          }
        }
      }
      setShowAddForm(false);
      setSelectedDrugs([]);
      setDrugSearch("");
      setStockQty(0);
      setPrice(0);
      fetchPharmacyAndInventory();
    } finally {
      setSaving(false);
    }
  };

  const deleteInventoryItem = async (itemId: string) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;
    setInventory((prev) => prev.filter((i) => i.id !== itemId));
    const { error } = await supabase.from("pharmacy_inventory").delete().eq("id", itemId);
    if (error) {
      setInventory((prev) => [...prev, item]);
      console.error("[Inv] Failed to delete:", error);
    } else {
      const session = (await supabase.auth.getSession()).data.session;
      if (session) {
        const apiUrl = typeof window !== "undefined" ? window.location.origin : "";
        await fetch(`${apiUrl}/api/store/products/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ name: item.drug_name, in_stock: false }),
        });
      }
    }
    setDeleteConfirm(null);
  };

  const updateStock = async (itemId: string, newQty: number) => {
    const qty = Math.max(0, newQty);
    const orig = inventory.find((i) => i.id === itemId);
    if (!orig) return;
    setInventory((prev) => prev.map((i) => (i.id === itemId ? { ...i, stock_quantity: qty } : i)));
    const { error } = await supabase
      .from("pharmacy_inventory")
      .update({ stock: qty, is_available: qty > 0 })
      .eq("id", itemId);
    if (error) {
      setInventory((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, stock_quantity: orig.stock_quantity } : i))
      );
      console.error("[Inv] Failed to update stock:", error);
    } else {
      syncStoreProduct(orig, { in_stock: qty > 0 });
    }
  };

  const updatePrice = async (itemId: string, newPrice: number) => {
    const val = Math.max(0, newPrice);
    const orig = inventory.find((i) => i.id === itemId);
    if (!orig) return;
    setInventory((prev) => prev.map((i) => (i.id === itemId ? { ...i, price: val } : i)));
    const { error } = await supabase
      .from("pharmacy_inventory")
      .update({ price_per_unit: val })
      .eq("id", itemId);
    if (error) {
      setInventory((prev) => prev.map((i) => (i.id === itemId ? { ...i, price: orig.price } : i)));
      console.error("[Inv] Failed to update price:", error);
    } else {
      syncStoreProduct(orig, { price: val, mrp: val * 1.2, in_stock: true });
    }
    setEditingPrice(null);
  };

  async function syncStoreProduct(item: InventoryItem, updates: Record<string, unknown>) {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return;
    const apiUrl = typeof window !== "undefined" ? window.location.origin : "";
    await fetch(`${apiUrl}/api/store/products/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: item.drug_name,
        ...updates,
      }),
    });
  }

  useEffect(() => {
    if (!pharmacyId || loading) return;
    const interval = setInterval(() => {
      if (Date.now() - lastFetchTime > STALE_THRESHOLD_MS) fetchPharmacyAndInventory();
    }, 30000);
    return () => clearInterval(interval);
  }, [pharmacyId, loading, lastFetchTime]);

  const filteredInventory = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return inventory.filter(
      (i) => i.drug_name.toLowerCase().includes(q) || i.drug_category.toLowerCase().includes(q)
    );
  }, [searchTerm, inventory]);

  const lowStock = useMemo(
    () => inventory.filter((i) => i.stock_quantity < LOW_STOCK_THRESHOLD),
    [inventory]
  );
  const linkedToStore = useMemo(() => inventory.filter((i) => i.storeProduct), [inventory]);

  const addToStoreProducts = async (item: InventoryItem) => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return;
    const apiUrl = typeof window !== "undefined" ? window.location.origin : "";
    try {
      const res = await fetch(`${apiUrl}/api/store/products/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: item.drug_name,
          price: item.price,
          mrp: item.price * 1.2,
          in_stock: item.stock_quantity > 0,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Sync failed");
      fetchPharmacyAndInventory();
    } catch (err: any) {
      console.error("[Inv] Failed to sync to store:", err);
    }
  };

  if (role === null) {
    return <div className="flex items-center justify-center h-full text-slate-500">Loading...</div>;
  }

  if (!pharmacyId && !loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 border border-white/40 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
            <Package className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-700">No Pharmacy Profile</h2>
          <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
            You need to register your pharmacy first before managing inventory and listing products
            on the store.
          </p>
          <button
            onClick={() => router.push("/dashboard/pharmacy/register")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700"
          >
            <Building2Icon />
            Register Pharmacy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">
            {inventory.length} item{inventory.length !== 1 ? "s" : ""} in stock
            {linkedToStore.length > 0 && (
              <span className="ml-1.5 text-emerald-600">· {linkedToStore.length} on store</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              disabled={csvUploading || !pharmacyId}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              title="Upload CSV"
            />
            <button
              disabled={csvUploading || !pharmacyId}
              className="flex items-center gap-2 px-3 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {csvUploading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {csvUploading ? "..." : "CSV"}
            </button>
          </div>
          <button
            onClick={downloadCsvTemplate}
            className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Template
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Drug
          </button>
        </div>
      </div>

      {/* CSV Import Result */}
      {csvResult && (
        <div
          className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold border ${
            csvResult.ok
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {csvResult.ok ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <span className="flex-1">{csvResult.msg}</span>
          <button
            onClick={() => setCsvResult(null)}
            className="text-xs underline opacity-60 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {lowStock.length} drug{lowStock.length !== 1 ? "s" : ""} low in stock
            </p>
            <p className="mt-0.5 text-xs text-amber-700 truncate">
              {lowStock.map((i) => i.drug_name).join(", ")}
            </p>
          </div>
          <button
            onClick={() => setSearchTerm("")}
            className="shrink-0 text-xs font-medium text-amber-700 underline hover:text-amber-900"
          >
            Show all
          </button>
        </div>
      )}

      {/* Error State */}
      {fetchError && !loading && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Failed to load inventory</p>
            <p className="text-xs text-red-600 mt-0.5">{fetchError}</p>
          </div>
          <button
            onClick={fetchPharmacyAndInventory}
            className="shrink-0 flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by drug name or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-white/40 shadow-sm text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Add Drug Modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setShowAddForm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-white/40 w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                Add to Inventory
                {selectedDrugs.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-blue-600">
                    ({selectedDrugs.length} selected)
                  </span>
                )}
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Search Drugs
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Type at least 2 characters to search..."
                    value={drugSearch}
                    onChange={(e) => searchDrugs(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                {drugs.length > 0 && (
                  <div className="mt-1 border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {drugs.map((d) => {
                      const isSelected = selectedDrugs.some(
                        (s) => s.id === d.id && s.source === d.source
                      );
                      return (
                        <button
                          key={`${d.source}-${d.id}`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedDrugs((prev) =>
                                prev.filter((s) => !(s.id === d.id && s.source === d.source))
                              );
                            } else {
                              setSelectedDrugs((prev) => [
                                ...prev,
                                { id: d.id, name: `${d.name} (${d.category})`, source: d.source },
                              ]);
                            }
                          }}
                          className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                            isSelected
                              ? "bg-blue-50 text-blue-700"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected ? "bg-blue-600 border-blue-600" : "border-slate-300"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="flex-1">{d.name}</span>
                          <span className="text-[10px] text-slate-400">{d.category}</span>
                          {d.source === "store" && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                              Store
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {selectedDrugs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedDrugs.map((d) => (
                      <span
                        key={`${d.source}-${d.id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium"
                      >
                        {d.name}
                        <button
                          onClick={() =>
                            setSelectedDrugs((prev) =>
                              prev.filter((s) => !(s.id === d.id && s.source === d.source))
                            )
                          }
                          className="text-blue-400 hover:text-blue-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  min={0}
                  value={stockQty}
                  onChange={(e) => setStockQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Price (₹)</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-between items-center">
              {selectedDrugs.length > 0 && (
                <button
                  onClick={() => setSelectedDrugs([])}
                  className="text-xs text-slate-400 hover:text-red-500 underline"
                >
                  Clear all
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={addMultipleToInventory}
                  disabled={saving || selectedDrugs.length === 0 || stockQty <= 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Adding..." : `Add (${selectedDrugs.length})`}
                </button>
              </div>
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
              <h2 className="text-lg font-bold text-slate-800">Delete Inventory Item</h2>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600">
                Are you sure you want to remove this drug from your inventory? This action cannot be
                undone.
                {inventory.find((i) => i.id === deleteConfirm)?.storeProduct && (
                  <span className="block mt-2 text-amber-600 font-medium">
                    This drug is listed on the store and will be marked out of stock.
                  </span>
                )}
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
                onClick={() => deleteInventoryItem(deleteConfirm)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-slate-100 bg-white overflow-hidden"
            >
              <div className="h-40 bg-slate-100" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="flex gap-2">
                  <div className="h-6 bg-slate-100 rounded w-16" />
                  <div className="h-6 bg-slate-100 rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
            <Package className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            {searchTerm ? `No items matching "${searchTerm}"` : "No inventory yet"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {searchTerm ? "Try a different search term" : "Add your first drug to get started"}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Drug
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredInventory.map((item) => {
            const isLow = item.stock_quantity < LOW_STOCK_THRESHOLD;
            const isOut = item.stock_quantity === 0;
            return (
              <div
                key={item.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-lg hover:shadow-emerald-500/5"
              >
                {/* Image */}
                <Link
                  href={item.storeProduct ? `/zobraipharm/product/${item.storeProduct.id}` : "#"}
                  className="relative flex h-40 items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50/30 p-4"
                >
                  {item.storeProduct?.image_url &&
                  item.storeProduct.image_url !== "/images/placeholder.svg" ? (
                    <img
                      src={item.storeProduct.image_url}
                      alt={item.drug_name}
                      className="h-28 w-28 object-contain transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-200">
                      <span className="text-4xl font-bold text-white/90 drop-shadow-sm">
                        {item.drug_name ? item.drug_name.charAt(0).toUpperCase() : "?"}
                      </span>
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute left-2 top-2 flex flex-col gap-1">
                    {item.storeProduct && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 shadow-sm">
                        <ShoppingBag className="h-3 w-3" />
                        On Store
                      </span>
                    )}
                  </div>
                </Link>

                {/* Content */}
                <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-600">
                    {item.drug_category}
                  </p>
                  <h3 className="mt-0.5 text-sm font-bold text-slate-800 line-clamp-2">
                    {item.drug_name}
                  </h3>
                  {item.storeProduct?.manufacturer && (
                    <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                      {item.storeProduct.manufacturer}
                    </p>
                  )}
                  {item.storeProduct?.description && (
                    <p className="mt-1 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {item.storeProduct.description}
                    </p>
                  )}

                  {/* Stock indicator */}
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        isOut
                          ? "bg-red-50 text-red-700"
                          : isLow
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isOut ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      />
                      {isOut ? "Out of Stock" : `${item.stock_quantity}`}
                    </div>
                    {!isOut && <span className="text-[10px] text-slate-400">in stock</span>}
                  </div>

                  <div className="mt-1">
                    {editingPrice === item.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">₹</span>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={priceInput}
                          onChange={(e) => setPriceInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              updatePrice(item.id, parseFloat(priceInput) || 0);
                            if (e.key === "Escape") setEditingPrice(null);
                          }}
                          className="w-20 px-1.5 py-0.5 rounded-lg border border-emerald-300 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-200"
                          autoFocus
                        />
                        <button
                          onClick={() => updatePrice(item.id, parseFloat(priceInput) || 0)}
                          className="text-emerald-600 hover:text-emerald-800"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingPrice(item.id);
                          setPriceInput(item.price.toString());
                        }}
                        className="text-sm font-bold text-slate-700 hover:text-emerald-600 transition-colors"
                      >
                        ₹{item.price.toFixed(2)}
                      </button>
                    )}
                    <span className="ml-1 text-[10px] text-slate-400">/ unit</span>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => updateStock(item.id, item.stock_quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-sm font-medium text-slate-600 transition-colors hover:bg-red-100 hover:text-red-600 disabled:opacity-30"
                        disabled={item.stock_quantity <= 0}
                      >
                        -
                      </button>
                      <span className="flex h-7 min-w-[24px] items-center justify-center text-xs font-bold text-slate-800">
                        {item.stock_quantity}
                      </span>
                      <button
                        onClick={() => updateStock(item.id, item.stock_quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-sm font-medium text-slate-600 transition-colors hover:bg-emerald-100 hover:text-emerald-600"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex gap-0.5">
                      {item.storeProduct ? (
                        <Link
                          href={`/zobraipharm/product/${item.storeProduct.id}`}
                          target="_blank"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <button
                          onClick={() => addToStoreProducts(item)}
                          className="flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                          title="List on Store"
                        >
                          <Plus className="h-3 w-3" />
                          Store
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteConfirm(item.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Delete from inventory"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 font-semibold text-slate-600">Drug</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Category</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Stock</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Price</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Store</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => {
                const isLow = item.stock_quantity < LOW_STOCK_THRESHOLD;
                const isOut = item.stock_quantity === 0;
                return (
                  <tr
                    key={item.id}
                    className="border-b border-slate-50 transition-colors hover:bg-slate-50/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-emerald-50">
                          {item.storeProduct?.image_url &&
                          item.storeProduct.image_url !== "/images/placeholder.svg" ? (
                            <img
                              src={item.storeProduct.image_url}
                              alt=""
                              className="h-8 w-8 object-contain"
                            />
                          ) : (
                            <span className="text-sm font-bold text-emerald-500">
                              {item.drug_name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-slate-900">{item.drug_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{item.drug_category}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          isOut
                            ? "bg-red-50 text-red-700"
                            : isLow
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${isOut ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-emerald-500"}`}
                        />
                        {isOut ? "Out" : item.stock_quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {editingPrice === item.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">₹</span>
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={priceInput}
                            onChange={(e) => setPriceInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                updatePrice(item.id, parseFloat(priceInput) || 0);
                              if (e.key === "Escape") setEditingPrice(null);
                            }}
                            className="w-20 px-1.5 py-0.5 rounded-lg border border-emerald-300 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-200"
                            autoFocus
                          />
                          <button
                            onClick={() => updatePrice(item.id, parseFloat(priceInput) || 0)}
                            className="text-emerald-600 hover:text-emerald-800"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingPrice(item.id);
                            setPriceInput(item.price.toString());
                          }}
                          className="font-medium text-slate-900 hover:text-emerald-600 transition-colors"
                        >
                          ₹{item.price.toFixed(2)}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.storeProduct ? (
                        <Link
                          href={`/zobraipharm/product/${item.storeProduct.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-800"
                        >
                          <ShoppingBag className="h-3 w-3" />
                          View
                        </Link>
                      ) : (
                        <button
                          onClick={() => addToStoreProducts(item)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-emerald-700"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateStock(item.id, item.stock_quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-sm font-medium text-slate-600 hover:bg-red-100 hover:text-red-600 disabled:opacity-30"
                          disabled={item.stock_quantity <= 0}
                        >
                          -
                        </button>
                        <span className="flex h-7 min-w-[24px] items-center justify-center text-xs font-bold text-slate-800">
                          {item.stock_quantity}
                        </span>
                        <button
                          onClick={() => updateStock(item.id, item.stock_quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-sm font-medium text-slate-600 hover:bg-emerald-100 hover:text-emerald-600"
                        >
                          +
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-600 ml-1"
                          title="Delete from inventory"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Building2Icon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 21h18M3 7V3l6 3V3l6 3V3l6 3v4M5 21V11h4v10M13 21V11h4v10" />
    </svg>
  );
}
