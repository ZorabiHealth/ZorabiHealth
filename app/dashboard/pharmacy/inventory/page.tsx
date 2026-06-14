"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
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
  FileSpreadsheet,
  RefreshCw,
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
}

export default function PharmacyInventoryPage() {
  const { role, userId } = useUserRole();
  const router = useRouter();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);

  // Add form
  const [drugSearch, setDrugSearch] = useState("");
  const [drugs, setDrugs] = useState<{ id: string; name: string; category: string }[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<{ id: string; name: string } | null>(null);
  const [stockQty, setStockQty] = useState(0);
  const [price, setPrice] = useState(0);
  const [saving, setSaving] = useState(false);

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

    // File guard: reject files over 5MB
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setCsvResult({
        ok: false,
        msg: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 5MB.`,
      });
      e.target.value = "";
      return;
    }

    // File guard: must be CSV
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

      if (lines.length < 2) {
        throw new Error("CSV must have a header row and at least one data row");
      }

      // Max 1000 rows per upload
      if (lines.length > 1001) {
        throw new Error("Maximum 1000 rows per upload");
      }

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

      // Parse all rows first (fail-fast on bad data)
      interface CsvRow {
        drugName: string;
        category: string;
        stockQty: number;
        price: number;
        line: number;
      }
      const rows: CsvRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        if (cols.length < 4) {
          continue;
        }
        const drugName = cols[nameIdx];
        const stockQtyVal = parseInt(cols[qtyIdx]) || 0;
        const priceVal = parseFloat(cols[priceIdx]) || 0;
        if (!drugName || stockQtyVal <= 0) {
          continue;
        }
        rows.push({
          drugName,
          category: catIdx >= 0 ? cols[catIdx] : "General",
          stockQty: stockQtyVal,
          price: priceVal,
          line: i + 1,
        });
      }

      if (rows.length === 0) {
        throw new Error("No valid data rows found in CSV");
      }

      // Deduplicate by drug_name (last wins within this batch)
      const deduped = new Map<string, CsvRow>();
      for (const row of rows) {
        deduped.set(row.drugName.toLowerCase(), row);
      }
      const uniqueRows = Array.from(deduped.values());

      // Process in batches of 25 (avoids Supabase payload limits)
      const BATCH_SIZE = 25;
      let imported = 0;
      let errors = 0;
      const seenDrugs = new Map<string, string>();

      for (let batchStart = 0; batchStart < uniqueRows.length; batchStart += BATCH_SIZE) {
        const batch = uniqueRows.slice(batchStart, batchStart + BATCH_SIZE);

        for (const row of batch) {
          try {
            // Look up or create drug in catalog
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

            // Upsert inventory (handles duplicates: same pharmacy + drug = update stock/price)
            const { error: invErr } = await supabase.from("pharmacy_inventory").upsert(
              {
                pharmacy_id: pharmacyId,
                drug_id: drugId,
                stock_quantity: row.stockQty,
                price: row.price,
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
        msg: `Imported ${imported} item${imported !== 1 ? "s" : ""}${errors > 0 ? ` (${errors} error${errors !== 1 ? "s" : ""})` : ""}${uniqueRows.length !== rows.length ? ` · ${rows.length - uniqueRows.length} duplicate${rows.length - uniqueRows.length !== 1 ? "s" : ""} merged` : ""}`,
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
    try {
      const { data: profile } = await supabase
        .from("pharmacy_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!profile) {
        // No pharmacy profile yet
        setLoading(false);
        return;
      }

      setPharmacyId(profile.id);

      const { data } = await supabase
        .from("pharmacy_inventory")
        .select(
          `
          id,
          pharmacy_id,
          drug_id,
          stock_quantity,
          price,
          drugs:drug_id(name, category)
        `
        )
        .eq("pharmacy_id", profile.id);

      const items: InventoryItem[] = (data ?? []).map((d: Record<string, unknown>) => {
        const drugData = d.drugs as { name: string; category: string } | undefined;
        return {
          id: d.id as string,
          pharmacy_id: d.pharmacy_id as string,
          drug_id: d.drug_id as string,
          stock_quantity: d.stock_quantity as number,
          price: d.price as number,
          drug_name: drugData?.name ?? "Unknown",
          drug_category: drugData?.category ?? "Unknown",
          auto_refill_threshold: (d as any).auto_refill_threshold as number | undefined,
        };
      });

      setInventory(items);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  const searchDrugs = async (q: string) => {
    setDrugSearch(q);
    if (q.length < 2) return;
    try {
      const { data } = await supabase
        .from("drug_catalog")
        .select("id, name, category")
        .ilike("name", `%${q}%`)
        .limit(10);

      setDrugs(data ?? []);
    } catch {
      setDrugs([]);
    }
  };

  const addToInventory = async () => {
    if (!selectedDrug || !pharmacyId || stockQty <= 0) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("pharmacy_inventory").insert({
        pharmacy_id: pharmacyId,
        drug_id: selectedDrug.id,
        stock_quantity: stockQty,
        price,
        auto_refill_threshold: 0,
      });
      if (error) throw error;

      setShowAddForm(false);
      setSelectedDrug(null);
      setStockQty(0);
      setPrice(0);
      fetchPharmacyAndInventory();
    } catch (err) {
      console.error("Failed to add inventory:", err);
    } finally {
      setSaving(false);
    }
  };

  const updateStock = async (itemId: string, newQty: number) => {
    const { error } = await supabase
      .from("pharmacy_inventory")
      .update({ stock_quantity: Math.max(0, newQty) })
      .eq("id", itemId);

    if (!error) {
      setInventory((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, stock_quantity: Math.max(0, newQty) } : i))
      );
    }
  };

  const filteredInventory = inventory.filter((i) =>
    i.drug_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStock = inventory.filter((i) => i.stock_quantity < 10);

  if (role === null) {
    return <div className="flex items-center justify-center h-full text-slate-500">Loading...</div>;
  }

  if (!pharmacyId) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/40 shadow-sm text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-700">No Pharmacy Profile</h2>
          <p className="text-sm text-slate-500 mt-1">
            Register your pharmacy first to manage inventory
          </p>
          <button
            onClick={() => router.push("/dashboard/pharmacy")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm"
          >
            Register Pharmacy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your pharmacy stock levels</p>
        </div>
        <div className="flex items-center gap-2">
          {/* CSV Import */}
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
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-500/25 text-sm font-medium disabled:opacity-50"
            >
              {csvUploading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {csvUploading ? "Uploading..." : "Import CSV"}
            </button>
          </div>
          <button
            onClick={downloadCsvTemplate}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Template
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/25 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Drug
          </button>
        </div>
      </div>

      {/* CSV Import Result */}
      {csvResult && (
        <div
          className={`rounded-2xl px-5 py-4 text-sm font-semibold border ${csvResult.ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}
        >
          {csvResult.ok ? "✅" : "❌"} {csvResult.msg}
          <button onClick={() => setCsvResult(null)} className="ml-3 text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {lowStock.length} drug{lowStock.length !== 1 ? "s" : ""} low in stock
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {lowStock.map((i) => i.drug_name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search inventory..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-white/40 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      {/* Add Drug Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/40 w-full max-w-md mx-4 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Add to Inventory</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Drug Search */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Drug</label>
                {selectedDrug ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm">
                    <span>{selectedDrug.name}</span>
                    <button
                      onClick={() => setSelectedDrug(null)}
                      className="ml-auto text-blue-400 hover:text-blue-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search drug catalog..."
                      value={drugSearch}
                      onChange={(e) => searchDrugs(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    {drugs.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-200 max-h-40 overflow-y-auto z-10">
                        {drugs.map((d) => (
                          <button
                            key={d.id}
                            onClick={() => {
                              setSelectedDrug({ id: d.id, name: `${d.name} (${d.category})` });
                              setDrugSearch("");
                              setDrugs([]);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-slate-700"
                          >
                            {d.name} <span className="text-slate-400">({d.category})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Stock Qty */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  min={0}
                  value={stockQty}
                  onChange={(e) => setStockQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              {/* Price */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Price (₹)</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
                onClick={addToInventory}
                disabled={saving || !selectedDrug || stockQty <= 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Adding..." : "Add to Inventory"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory List */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/40 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-white/30 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            {filteredInventory.length} Item{filteredInventory.length !== 1 ? "s" : ""}
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading inventory...</div>
        ) : filteredInventory.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            {searchTerm ? "No matching items" : "No inventory yet — add your first drug"}
          </div>
        ) : (
          <div className="divide-y divide-white/20">
            {filteredInventory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-white/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{item.drug_name}</p>
                    <p className="text-xs text-slate-500">{item.drug_category}</p>
                    {item.auto_refill_threshold && item.auto_refill_threshold > 0 && (
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                        Auto-refill at ≤{item.auto_refill_threshold}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateStock(item.id, item.stock_quantity - 1)}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-sm"
                    >
                      -
                    </button>
                    <span
                      className={`w-10 text-center text-sm font-semibold ${
                        item.stock_quantity < 10 ? "text-red-500" : "text-slate-700"
                      }`}
                    >
                      {item.stock_quantity}
                    </span>
                    <button
                      onClick={() => updateStock(item.id, item.stock_quantity + 1)}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-sm"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-[9px] text-slate-400 font-semibold cursor-pointer select-none">
                      Auto
                    </label>
                    <input
                      type="checkbox"
                      checked={!!item.auto_refill_threshold && item.auto_refill_threshold > 0}
                      onChange={async () => {
                        const newThreshold = item.auto_refill_threshold ? 0 : 20;
                        try {
                          const { error } = await supabase
                            .from("pharmacy_inventory")
                            .update({ auto_refill_threshold: newThreshold })
                            .eq("id", item.id);
                          if (error && error.code === "42703") {
                            console.warn(
                              "auto_refill_threshold column not available yet — run the migration"
                            );
                            return;
                          }
                          if (error) throw error;
                          setInventory((prev) =>
                            prev.map((i) =>
                              i.id === item.id ? { ...i, auto_refill_threshold: newThreshold } : i
                            )
                          );
                        } catch (err) {
                          console.error("Failed to toggle auto-refill:", err);
                        }
                      }}
                      className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-700 w-16 text-right">
                    ₹{item.price.toFixed(2)}
                  </span>
                  {item.stock_quantity < 10 && <TrendingDown className="w-4 h-4 text-red-400" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
