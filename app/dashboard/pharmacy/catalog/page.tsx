"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import { BookOpen, Search, Filter } from "lucide-react";

interface Drug {
  id: string;
  name: string;
  generic_name: string;
  category: string;
  dosage_form: string;
  strength: string;
  manufacturer: string;
}

const categories = [
  "All",
  "Cardiovascular",
  "Antibiotic",
  "Pain Relief",
  "Diabetes",
  "Mental Health",
  "Vitamin",
  "Respiratory",
  "Gastrointestinal",
];

export default function DrugCatalogPage() {
  const { role } = useUserRole();
  const router = useRouter();
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    if (role === null) return;
    if (role !== "pharmacy_vendor") {
      router.push("/dashboard");
      return;
    }
    fetchDrugs();
  }, [role, router]);

  const fetchDrugs = async () => {
    setLoading(true);
    try {
      let query = supabase.from("drug_catalog").select("*").order("name");

      if (selectedCategory !== "All") {
        query = query.eq("category", selectedCategory);
      }

      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDrugs(data ?? []);
    } catch (err) {
      console.error("Failed to fetch drug catalog:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrugs();
  }, [selectedCategory]);

  if (role === null) {
    return <div className="flex items-center justify-center h-full text-slate-500">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Drug Catalog</h1>
        <p className="text-sm text-slate-500 mt-1">Browse the master drug reference database</p>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search drugs by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchDrugs()}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-white/40 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <button
          onClick={fetchDrugs}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === cat
                ? "bg-blue-600 text-white"
                : "bg-white/60 text-slate-600 hover:bg-white/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Drug Grid */}
      {loading ? (
        <div className="text-center text-slate-400 text-sm py-8">Loading catalog...</div>
      ) : drugs.length === 0 ? (
        <div className="text-center text-slate-400 text-sm py-8">
          {searchTerm ? "No drugs match your search" : "No drugs in catalog"}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drugs.map((drug) => (
            <div
              key={drug.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-white/40 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-800">{drug.name}</h3>
                  {drug.generic_name && (
                    <p className="text-xs text-slate-500">{drug.generic_name}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Category</span>
                  <span className="text-slate-700 font-medium">{drug.category}</span>
                </div>
                {drug.dosage_form && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Form</span>
                    <span className="text-slate-700 font-medium">{drug.dosage_form}</span>
                  </div>
                )}
                {drug.strength && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Strength</span>
                    <span className="text-slate-700 font-medium">{drug.strength}</span>
                  </div>
                )}
                {drug.manufacturer && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Manufacturer</span>
                    <span className="text-slate-700 font-medium">{drug.manufacturer}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
