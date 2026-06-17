"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Bookmark,
  Check,
  Calendar,
  Send,
  Sparkles,
  Trash2,
  Apple,
  Zap,
  Activity,
  Target,
  Leaf,
  User,
  Play,
  TrendingUp,
  Utensils,
  Wind,
  ChevronRight,
  Flame,
  Clock,
  Dumbbell,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

interface WorkoutItem {
  id: string;
  title: string;
  category: "HIIT" | "Strength" | "Focus" | "Agility";
  body_area: "Lower Leg" | "Upper Leg" | "Chest" | "Bicep";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  calories: number;
  duration: number;
  coach: string;
  is_bookmarked: boolean;
}

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  type: string;
  completed: boolean;
}

interface NutritionItem {
  id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  time: string;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  streak_days: Record<string, boolean>;
  last_workout_date: string | null;
}

interface MealSuggestion {
  id: string;
  title: string;
  description: string;
  foods: string[];
  avoid: string[];
  severity: "info" | "warning" | "critical";
}

let USER_ID = "";

const CategoryIcon = ({
  cat,
  size = 14,
  className = "",
}: {
  cat: string;
  size?: number;
  className?: string;
}) => {
  if (cat === "HIIT") return <Flame size={size} className={className} />;
  if (cat === "Strength") return <Dumbbell size={size} className={className} />;
  if (cat === "Focus") return <Zap size={size} className={className} />;
  if (cat === "Agility") return <Wind size={size} className={className} />;
  return <Activity size={size} className={className} />;
};

const BodyAreaIcon = ({
  area,
  size = 18,
  className = "",
}: {
  area: string;
  size?: number;
  className?: string;
}) => {
  if (area === "Lower Leg") return <Activity size={size} className={className} />;
  if (area === "Upper Leg") return <TrendingUp size={size} className={className} />;
  if (area === "Chest") return <Target size={size} className={className} />;
  if (area === "Bicep") return <Dumbbell size={size} className={className} />;
  return <Activity size={size} className={className} />;
};

const difficultyColor: Record<string, string> = {
  Beginner: "bg-emerald-100 text-emerald-700",
  Intermediate: "bg-amber-100 text-amber-700",
  Advanced: "bg-red-100 text-red-700",
};

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let json: any;
  try {
    json = await res.json();
  } catch {
    const text = await res.text();
    throw new Error(`Server error: ${text.slice(0, 100)}`);
  }
  if (!res.ok) throw new Error(json.error || "API error");
  return json;
}

export default function WorkoutDashboardPage() {
  const [workouts, setWorkouts] = useState<WorkoutItem[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [nutrition, setNutrition] = useState<NutritionItem[]>([]);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<
    "All" | "HIIT" | "Strength" | "Focus" | "Agility"
  >("All");
  const [activeBodyArea, setActiveBodyArea] = useState<
    "All" | "Lower Leg" | "Upper Leg" | "Chest" | "Bicep"
  >("All");

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "ai"; text: string }[]>([
    {
      sender: "ai",
      text: "Hey! I'm your AI workout assistant. Ask me anything about your routine!",
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  const [newMealName, setNewMealName] = useState("");
  const [newMealCalories, setNewMealCalories] = useState("");
  const [newMealProtein, setNewMealProtein] = useState("12");
  const [newMealCarbs, setNewMealCarbs] = useState("23");
  const [newMealFat, setNewMealFat] = useState("8");

  const [newScheduleTitle, setNewScheduleTitle] = useState("");
  const newScheduleTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const [geminiLoading, setGeminiLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [sessionMinutes, setSessionMinutes] = useState(20);
  const [sessionPaused, setSessionPaused] = useState(false);
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [youtubeVideos, setYoutubeVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);

  const [mealSuggestions, setMealSuggestions] = useState<MealSuggestion[]>([]);
  const [mealLoading, setMealLoading] = useState(false);
  const [activeSymptoms, setActiveSymptoms] = useState<string[]>([]);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const d = new Date(selectedDate + "T12:00:00");
  const currentDate = {
    day: d.getDate().toString(),
    weekday: days[d.getDay()],
    month: months[d.getMonth()],
  };

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wRes, sRes, nRes, stRes] = await Promise.all([
        apiFetch(`/api/workouts?userId=${USER_ID}`),
        apiFetch(`/api/workouts/schedule?userId=${USER_ID}&date=${selectedDate}`),
        apiFetch(`/api/workouts/nutrition?userId=${USER_ID}&date=${selectedDate}`),
        apiFetch(`/api/workouts/streaks?userId=${USER_ID}`),
      ]);
      setWorkouts(wRes.data || []);
      setSchedule(sRes.data || []);
      setNutrition(nRes.data || []);
      setStreak(stRes.data || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        USER_ID = session.user.id;
      }
    });
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [selectedDate, fetchAllData]);

  const changeDate = (offset: number) => {
    const next = new Date(d);
    next.setDate(next.getDate() + offset);
    setSelectedDate(next.toISOString().split("T")[0]);
  };

  useEffect(() => {
    const fetchVideos = async () => {
      setLoadingVideos(true);
      try {
        let q = "workout physical training";
        if (activeCategory !== "All" && activeBodyArea !== "All")
          q = `${activeCategory} ${activeBodyArea} workout`;
        else if (activeCategory !== "All") q = `${activeCategory} workout`;
        else if (activeBodyArea !== "All") q = `${activeBodyArea} exercises`;
        const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setYoutubeVideos(data.items || []);
      } catch {
        /* ignore */
      } finally {
        setLoadingVideos(false);
      }
    };
    fetchVideos();
  }, [activeCategory, activeBodyArea]);

  const toggleBookmark = async (id: string) => {
    const w = workouts.find((x) => x.id === id);
    if (!w) return;
    const next = !w.is_bookmarked;
    setWorkouts((prev) => prev.map((x) => (x.id === id ? { ...x, is_bookmarked: next } : x)));
    await apiFetch(`/api/workouts`, {
      method: "PUT",
      body: JSON.stringify({ id, is_bookmarked: next }),
    }).catch(() => fetchAllData());
  };

  const toggleScheduleComplete = async (id: string) => {
    const item = schedule.find((x) => x.id === id);
    if (!item) return;
    const next = !item.completed;
    setSchedule((prev) => prev.map((x) => (x.id === id ? { ...x, completed: next } : x)));
    await apiFetch(`/api/workouts/schedule`, {
      method: "PUT",
      body: JSON.stringify({ id, completed: next }),
    }).catch(() => fetchAllData());
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleTitle.trim()) return;
    const tempId = `tmp-${Date.now()}`;
    const newItem = {
      id: tempId,
      time: newScheduleTime,
      title: newScheduleTitle,
      type: "Custom Session",
      completed: false,
    };
    setSchedule((prev) => [...prev, newItem]);
    setNewScheduleTitle("");
    const res = await apiFetch(`/api/workouts/schedule`, {
      method: "POST",
      body: JSON.stringify({
        user_id: USER_ID,
        date: selectedDate,
        time: newScheduleTime,
        title: newScheduleTitle,
      }),
    }).catch(() => null);
    if (res?.data) {
      setSchedule((prev) => prev.map((x) => (x.id === tempId ? { ...x, id: res.data.id } : x)));
    }
  };

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMealName || !newMealCalories) return;
    const cal = parseInt(newMealCalories);
    if (isNaN(cal)) return;
    const tempId = `tmp-${Date.now()}`;
    const newEntry = {
      id: tempId,
      name: newMealName,
      calories: cal,
      protein_g: parseInt(newMealProtein) || 0,
      carbs_g: parseInt(newMealCarbs) || 0,
      fat_g: parseInt(newMealFat) || 0,
      time: "Today",
    };
    setNutrition((prev) => [newEntry, ...prev]);
    setNewMealName("");
    setNewMealCalories("");
    const res = await apiFetch(`/api/workouts/nutrition`, {
      method: "POST",
      body: JSON.stringify({
        user_id: USER_ID,
        date: selectedDate,
        name: newMealName,
        calories: cal,
        protein_g: parseInt(newMealProtein) || 0,
        carbs_g: parseInt(newMealCarbs) || 0,
        fat_g: parseInt(newMealFat) || 0,
      }),
    }).catch(() => null);
    if (res?.data) {
      setNutrition((prev) => prev.map((x) => (x.id === tempId ? { ...x, id: res.data.id } : x)));
    }
  };

  const handleDeleteMeal = async (id: string) => {
    setNutrition((prev) => prev.filter((n) => n.id !== id));
    await apiFetch(`/api/workouts/nutrition?id=${id}`, { method: "DELETE" }).catch(() =>
      fetchAllData()
    );
  };

  const handleGeminiSuggest = async () => {
    setGeminiLoading(true);
    try {
      const res = await apiFetch("/api/gemini/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "Suggest a quick workout for today based on my profile.",
        }),
      });
      const text = res.title
        ? `${res.emoji} ${res.title} — ${res.description}`
        : "Try a 20-min HIIT or focus session today!";
      setChatMessages((prev) => [...prev, { sender: "ai", text }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Try a 20-min HIIT or focus session today!" },
      ]);
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await apiFetch("/api/gemini/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMsg }),
      });
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: res.title
            ? `${res.emoji} ${res.title}: ${res.description}`
            : "Try a 20-min HIIT or focus session today!",
        },
      ]);
    } catch {
      let reply =
        "Based on your profile, I suggest a moderate 20-min cardio or focus session today.";
      if (userMsg.toLowerCase().includes("tired") || userMsg.toLowerCase().includes("fatigue"))
        reply = "Since you feel tired, try a 10-min light stretch instead of heavy training.";
      else if (userMsg.toLowerCase().includes("chest") || userMsg.toLowerCase().includes("pain"))
        reply = "Please avoid strenuous activity and consult your physician.";
      else if (userMsg.toLowerCase().includes("hiit"))
        reply = "Great choice! Try a 20-min HIIT session at a beginner pace.";
      setChatMessages((prev) => [...prev, { sender: "ai", text: reply }]);
    } finally {
      setChatLoading(false);
    }
  };

  const fetchGeminiMeals = async (symptoms: string[]) => {
    setActiveSymptoms(symptoms);
    if (symptoms.length === 0) {
      setMealSuggestions([]);
      return;
    }
    setMealLoading(true);
    try {
      const res = await apiFetch("/api/gemini/meals", {
        method: "POST",
        body: JSON.stringify({ symptoms, medications: [] }),
      });
      setMealSuggestions(res.suggestions || []);
    } catch {
      setMealSuggestions([]);
    } finally {
      setMealLoading(false);
    }
  };

  const startSession = (minutes: number) => {
    setSessionMinutes(minutes);
    setSessionTimer(minutes * 60);
    setSessionActive(true);
    setSessionPaused(false);
    if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current);
    sessionIntervalRef.current = setInterval(() => {
      setSessionTimer((prev) => {
        if (prev <= 1) {
          completeSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const toggleSessionPause = () => {
    setSessionPaused((p) => !p);
    if (sessionIntervalRef.current) {
      if (!sessionPaused) {
        clearInterval(sessionIntervalRef.current);
        sessionIntervalRef.current = null;
      } else {
        sessionIntervalRef.current = setInterval(() => {
          setSessionTimer((prev) => {
            if (prev <= 1) {
              completeSession();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
  };

  const completeSession = async () => {
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current);
      sessionIntervalRef.current = null;
    }
    setSessionActive(false);
    setSessionTimer(0);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    await apiFetch("/api/workouts/schedule", {
      method: "POST",
      body: JSON.stringify({
        user_id: USER_ID,
        date: new Date().toISOString().split("T")[0],
        time: timeStr,
        title: `${sessionMinutes}-min Workout Session`,
        type: "Completed",
        completed: true,
      }),
    }).catch(() => {});
    await apiFetch("/api/workouts/streaks", {
      method: "PUT",
      body: JSON.stringify({ user_id: USER_ID, completed: true }),
    }).catch(() => {});
    fetchAllData();
    setChatMessages((prev) => [
      ...prev,
      {
        sender: "ai",
        text: `Session complete! You crushed ${sessionMinutes} minutes. Streak updated.`,
      },
    ]);
  };

  const cancelSession = () => {
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current);
      sessionIntervalRef.current = null;
    }
    setSessionActive(false);
    setSessionTimer(0);
  };

  const toggleSymptom = (sym: string) => {
    const next = activeSymptoms.includes(sym)
      ? activeSymptoms.filter((s) => s !== sym)
      : [...activeSymptoms, sym];
    fetchGeminiMeals(next);
  };

  const AVAILABLE_SYMPTOMS = [
    "fatigue",
    "hypertension",
    "hyperglycemia",
    "high_cholesterol",
    "inflammation",
    "muscle_soreness",
    "dehydration",
    "low_energy",
    "digestive_issues",
    "anxiety",
  ];

  const filteredWorkouts = workouts.filter((w) => {
    const catMatch = activeCategory === "All" || w.category === activeCategory;
    const bodyMatch = activeBodyArea === "All" || w.body_area === activeBodyArea;
    return catMatch && bodyMatch;
  });

  const totalCalories = nutrition.reduce((sum, n) => sum + n.calories, 0);
  const totalProtein = nutrition.reduce((sum, n) => sum + n.protein_g, 0);
  const totalCarbs = nutrition.reduce((sum, n) => sum + n.carbs_g, 0);
  const totalFat = nutrition.reduce((sum, n) => sum + n.fat_g, 0);
  const streakDays = streak?.streak_days || {};
  const streakCount = Object.values(streakDays).filter(Boolean).length;
  const completedCount = schedule.filter((s) => s.completed).length;
  const progressPct =
    schedule.length > 0 ? Math.round((completedCount / schedule.length) * 100) : 0;

  if (loading) {
    return (
      <div className="font-sans bg-[#f0f5ff] w-full min-h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#1e4a46] animate-spin" />
          <p className="text-sm text-slate-500">Loading your workout dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="font-sans bg-[#f0f5ff] w-full min-h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-2xl shadow-sm border border-red-100">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-sm text-red-600 font-medium">Failed to load data</p>
          <p className="text-xs text-slate-400">{error}</p>
          <button
            onClick={fetchAllData}
            className="flex items-center gap-1.5 text-xs text-[#1e4a46] font-semibold mt-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="font-sans bg-[#f0f5ff] w-full min-h-full flex flex-col gap-6 p-8 relative animate-slide-up"
      data-purpose="workout-dashboard"
    >
      {/* ─── Page Header ─── */}
      <div className="flex justify-between items-center relative">
        <div>
          <h2 className="text-3xl font-semibold text-slate-800">Workout & Diet</h2>
          <p className="text-base text-slate-400 font-light mt-0.5">
            <Calendar className="w-4 h-4 inline -mt-0.5 mr-1 text-slate-300" />
            {currentDate.weekday}, {currentDate.month} {currentDate.day}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Navigator */}
          <div className="flex items-center bg-white rounded-2xl shadow-sm border border-slate-100 px-2 py-1.5 gap-0">
            <button
              onClick={() => changeDate(-1)}
              className="w-8 h-8 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
              title="Previous day"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100 mx-0.5"
              title="Change date"
            >
              <Calendar className="w-4 h-4 text-[#1e4a46]" />
              <span className="text-xs font-semibold text-slate-700 min-w-[60px] text-center">
                {currentDate.weekday}, {currentDate.month.slice(0, 3)} {currentDate.day}
              </span>
              <svg
                className="w-3 h-3 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <button
              onClick={() => changeDate(1)}
              className="w-8 h-8 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
              title="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-slate-100 mx-1.5" />
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
              className="px-2.5 py-1.5 rounded-xl text-[10px] font-semibold text-[#1e4a46] hover:bg-[#1e4a46]/5 transition-colors cursor-pointer"
              title="Go to today"
            >
              Today
            </button>
          </div>

          {showDatePicker && (
            <div className="absolute top-14 right-44 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 p-3">
              <input
                ref={dateRef}
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setShowDatePicker(false);
                }}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 outline-none focus:border-[#1e4a46] cursor-pointer"
                autoFocus
              />
            </div>
          )}

          <div className="h-8 w-px bg-slate-200" />

          <button
            onClick={handleGeminiSuggest}
            disabled={geminiLoading}
            className="bg-[#1e4a46] hover:bg-[#153633] text-white px-5 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
          >
            {geminiLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            AI Suggest
          </button>
        </div>
      </div>

      {/* ─── Clinical Meal Suggestions ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Apple className="w-4 h-4 text-[#1e4a46]" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              AI Meal Suggestions
            </span>
            <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
              GEMINI
            </span>
          </div>
          {activeSymptoms.length > 0 && (
            <button
              onClick={() => fetchGeminiMeals([])}
              className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_SYMPTOMS.map((sym) => {
            const active = activeSymptoms.includes(sym);
            return (
              <button
                key={sym}
                onClick={() => toggleSymptom(sym)}
                className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${active ? "bg-[#1e4a46] text-white border-[#1e4a46]" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"}`}
              >
                {sym.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            );
          })}
        </div>
        {mealLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Gemini is analyzing your symptoms...
          </div>
        )}
        {mealSuggestions.length > 0 && !mealLoading && (
          <div className="flex flex-col gap-2 mt-1">
            {mealSuggestions.map((s: MealSuggestion) => (
              <div
                key={s.id}
                className={`rounded-xl p-3 border flex flex-col gap-1.5 ${s.severity === "critical" ? "bg-red-50 border-red-200" : s.severity === "warning" ? "bg-amber-50 border-amber-200" : "bg-teal-50 border-teal-100"}`}
              >
                <span
                  className={`text-xs font-bold ${s.severity === "critical" ? "text-red-700" : s.severity === "warning" ? "text-amber-700" : "text-teal-700"}`}
                >
                  {s.title}
                </span>
                <p className="text-[9px] text-slate-600">{s.description}</p>
                <div className="flex flex-wrap gap-3 mt-0.5">
                  <div>
                    <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">
                      Recommended
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {s.foods.map((f) => (
                        <span
                          key={f}
                          className="text-[8px] bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md font-medium"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-red-400 uppercase mb-1">Avoid</p>
                    <div className="flex flex-wrap gap-1">
                      {s.avoid.map((a) => (
                        <span
                          key={a}
                          className="text-[8px] bg-red-50 border border-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-medium"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Main Content Grid ─── */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-9 grid grid-cols-3 gap-6">
          {/* ── Column 1 ── */}
          <div className="flex flex-col gap-5">
            <div
              onClick={handleGeminiSuggest}
              className="bg-[#1e4a46] rounded-2xl p-4 text-white relative overflow-hidden h-24 flex flex-col justify-center cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="relative z-10 w-3/4">
                <p className="text-xs font-bold mb-0.5">Get the best workout with AI.</p>
                <p className="text-[10px] text-white/60">Autosuggest with Gemini</p>
              </div>
              <div className="absolute right-0 bottom-0 w-16 h-16 bg-orange-400 rounded-tl-full opacity-70 blur-sm" />
              <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-white/30" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-800">Browse By Body Area</h3>
                <span
                  onClick={() => setActiveBodyArea("All")}
                  className="text-xs text-[#1e4a46] font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  All <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {(["Lower Leg", "Upper Leg", "Chest", "Bicep"] as const).map((area) => {
                  const isSelected = activeBodyArea === area;
                  return (
                    <div
                      key={area}
                      onClick={() => setActiveBodyArea(area)}
                      className="cursor-pointer group flex flex-col items-center gap-1"
                    >
                      <div
                        className={`rounded-xl aspect-[3/4] w-full flex items-center justify-center p-2 transition-all ${isSelected ? "bg-[#1e4a46] text-white shadow-sm" : "bg-white border border-slate-100 group-hover:bg-slate-50 text-slate-500"}`}
                      >
                        <BodyAreaIcon area={area} size={16} />
                      </div>
                      <span className="text-[9px] text-slate-500 font-medium truncate w-full text-center">
                        {area}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-slate-800">Daily Schedule</h3>
              <div className="flex flex-col gap-2 relative pl-3 border-l-2 border-slate-100">
                {schedule.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleScheduleComplete(item.id)}
                    className={`flex items-start gap-2 cursor-pointer transition-all ${item.completed ? "opacity-55" : ""}`}
                  >
                    <span className="text-[9px] text-slate-400 font-medium pt-2 text-right w-12 shrink-0">
                      {item.time}
                    </span>
                    <div
                      className={`bg-white rounded-xl p-2.5 shadow-sm border flex-grow flex items-center gap-2 transition-colors ${item.completed ? "border-emerald-200 bg-emerald-50/20" : "border-slate-100 hover:border-slate-200"}`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${item.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"}`}
                      >
                        {item.completed && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-[10px] font-semibold text-slate-800 truncate ${item.completed ? "line-through text-slate-400" : ""}`}
                        >
                          {item.title}
                        </p>
                        <p className="text-[8px] text-slate-400 truncate mt-0.5">{item.type}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {schedule.length === 0 && (
                  <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4 text-center">
                    <span className="text-xs text-slate-400">No schedule yet</span>
                  </div>
                )}
              </div>
              <form onSubmit={handleAddSchedule} className="flex gap-1.5 mt-1">
                <Input
                  value={newScheduleTitle}
                  onChange={(e) => setNewScheduleTitle(e.target.value)}
                  placeholder="Add session..."
                  className="h-8 text-[10px] rounded-lg bg-white border-slate-200 text-slate-800"
                  required
                />
                <button
                  type="submit"
                  className="bg-[#1e4a46] hover:bg-[#153633] text-white font-bold px-3 py-1 rounded-lg text-[10px] transition-colors shrink-0 cursor-pointer"
                >
                  Add
                </button>
              </form>
            </div>
          </div>

          {/* ── Column 2 ── */}
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-800">Trending</h3>
                <span className="text-xs text-[#1e4a46] font-semibold hover:underline cursor-pointer flex items-center gap-0.5">
                  See All <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              {youtubeVideos[0] ? (
                <div
                  onClick={() => setSelectedVideo(youtubeVideos[0])}
                  className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-800 text-white p-4 flex flex-col justify-end group cursor-pointer shadow-sm"
                >
                  <Image
                    src={
                      youtubeVideos[0].snippet.thumbnails.high?.url ||
                      youtubeVideos[0].snippet.thumbnails.medium?.url
                    }
                    alt={youtubeVideos[0].snippet.title}
                    fill
                    className="absolute inset-0 object-cover z-0 group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent z-10 group-hover:from-black/90 transition-colors" />
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[9px] font-bold z-20 bg-red-600 text-white">
                    Trending
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(workouts[0]?.id);
                    }}
                    className="absolute top-3 right-3 w-7 h-7 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center z-20 hover:bg-white/40 transition-colors cursor-pointer"
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${workouts[0]?.is_bookmarked ? "fill-white text-white" : "text-white"}`}
                    />
                  </button>
                  <div className="relative z-20 transform group-hover:translate-y-[-3px] transition-transform duration-300">
                    <h4 className="text-sm font-bold leading-tight mb-1 line-clamp-1">
                      {youtubeVideos[0].snippet.title}
                    </h4>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center">
                        <User className="w-2.5 h-2.5 text-white" />
                      </div>
                      <span className="text-[9px] opacity-75">
                        {youtubeVideos[0].snippet.channelTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] font-medium opacity-90">
                      <Play className="w-3 h-3 text-red-400" /> Watch Now
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-slate-700 to-slate-900 text-white p-4 flex flex-col items-center justify-center shadow-sm">
                  <Flame className="w-10 h-10 text-white/20 mb-2" />
                  <p className="text-[10px] text-white/40">No trending videos</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Featured</h3>
              {youtubeVideos[1] ? (
                <div
                  onClick={() => setSelectedVideo(youtubeVideos[1])}
                  className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-800 text-white p-4 flex flex-col justify-end group cursor-pointer shadow-sm"
                >
                  <Image
                    src={
                      youtubeVideos[1].snippet.thumbnails.high?.url ||
                      youtubeVideos[1].snippet.thumbnails.medium?.url
                    }
                    alt={youtubeVideos[1].snippet.title}
                    fill
                    className="absolute inset-0 object-cover z-0 group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent z-10 group-hover:from-black/90 transition-colors" />
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[9px] font-bold z-20 bg-[#1e4a46] text-white">
                    Featured
                  </span>
                  <div className="relative z-20 transform group-hover:translate-y-[-3px] transition-transform duration-300">
                    <h4 className="text-sm font-bold leading-tight mb-1 line-clamp-1">
                      {youtubeVideos[1].snippet.title}
                    </h4>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center">
                        <User className="w-2.5 h-2.5 text-white" />
                      </div>
                      <span className="text-[9px] opacity-75">
                        {youtubeVideos[1].snippet.channelTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] font-medium opacity-90">
                      <Play className="w-3 h-3 text-cyan-300" /> Watch Now
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-[#1e4a46] to-[#0d2b28] text-white p-4 flex flex-col items-center justify-center shadow-sm">
                  <Dumbbell className="w-10 h-10 text-white/20 mb-2" />
                  <p className="text-[10px] text-white/40">No featured videos</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Column 3 ── */}
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-800">Category</h3>
                <span
                  onClick={() => setActiveCategory("All")}
                  className="text-xs text-[#1e4a46] font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  All <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {(["HIIT", "Strength", "Focus", "Agility"] as const).map((cat) => {
                  const isSelected = activeCategory === cat;
                  return (
                    <div
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className="cursor-pointer group flex flex-col items-center gap-1"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isSelected ? "bg-[#1e4a46] text-white shadow-sm" : "bg-white border border-slate-100 group-hover:bg-slate-50 text-slate-500"}`}
                      >
                        <CategoryIcon cat={cat} size={14} />
                      </div>
                      <span className="text-[9px] font-medium text-slate-600">{cat}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-800">Short Workouts</h3>
                <span className="text-xs text-[#1e4a46] font-semibold hover:underline cursor-pointer flex items-center gap-0.5">
                  See All <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {youtubeVideos.slice(2, 4).map((video) => (
                  <div
                    key={video.id.videoId}
                    onClick={() => setSelectedVideo(video)}
                    className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow group"
                  >
                    <div className="aspect-video rounded-xl mb-2.5 relative overflow-hidden bg-slate-200">
                      <Image
                        src={video.snippet.thumbnails.medium?.url}
                        alt={video.snippet.title}
                        fill
                        className="absolute inset-0 object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      <div className="absolute top-2 left-2 bg-[#1e4a46]/90 text-white text-[8px] px-2 py-0.5 rounded-full font-bold backdrop-blur-sm">
                        {activeCategory !== "All" ? activeCategory : video.snippet.channelTitle}
                      </div>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                      {video.snippet.title}
                    </h4>
                    <p className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <User className="w-3 h-3" /> {video.snippet.channelTitle}
                    </p>
                  </div>
                ))}
                {youtubeVideos.length < 3 && (
                  <>
                    <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
                      <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl mb-2.5 flex items-center justify-center">
                        <Target className="w-8 h-8 text-slate-400" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">Upper Body Boxing</h4>
                      <p className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 20 min
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
                      <div className="aspect-video bg-gradient-to-br from-emerald-50 to-teal-100 rounded-xl mb-2.5 flex items-center justify-center">
                        <Leaf className="w-8 h-8 text-emerald-400" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">Mindfulness Basics</h4>
                      <p className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 20 min
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── YouTube Workout Guides ── */}
          <div className="col-span-3 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-red-500" /> YouTube Workout Guides
                  <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black font-mono">
                    LIVE API
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Top guides for &quot;{activeCategory !== "All" ? activeCategory : "All"}{" "}
                  {activeBodyArea !== "All" ? activeBodyArea : ""} Workout&quot;
                </p>
              </div>
              {loadingVideos && (
                <span className="text-xs text-slate-400 font-semibold animate-pulse flex items-center gap-1">
                  Fetching...
                </span>
              )}
            </div>
            {loadingVideos ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-slate-50 border border-slate-100 rounded-xl p-3 animate-pulse h-40"
                  />
                ))}
              </div>
            ) : youtubeVideos.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                No workout videos found. Try selecting another category filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {youtubeVideos.map((video) => (
                  <div
                    key={video.id.videoId}
                    onClick={() => setSelectedVideo(video)}
                    className="bg-slate-50/50 hover:bg-white border border-slate-100 rounded-xl p-2.5 cursor-pointer hover:shadow hover:scale-[1.01] transition-all flex flex-col gap-2 group"
                  >
                    <div className="aspect-video relative rounded-lg overflow-hidden bg-slate-200 shadow-sm">
                      <Image
                        src={video.snippet.thumbnails.medium.url}
                        alt={video.snippet.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, 25vw"
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                        <div className="w-7 h-7 rounded-full bg-white/90 group-hover:bg-red-600 flex items-center justify-center shadow transition-colors">
                          <Play className="w-3 h-3 text-slate-800 group-hover:text-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <h4 className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight">
                        {video.snippet.title}
                      </h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                        {video.snippet.channelTitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Column ─── */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" /> Calories
              </span>
              <span className="text-xs font-bold text-[#1e4a46]">{totalCalories} kcal</span>
            </div>
            <svg viewBox="0 0 200 45" className="w-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e4a46" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#1e4a46" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,38 C20,33 30,14 50,18 C70,22 80,6 100,10 C120,14 130,26 150,22 C170,18 180,6 200,2"
                fill="none"
                stroke="#1e4a46"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M0,38 C20,33 30,14 50,18 C70,22 80,6 100,10 C120,14 130,26 150,22 C170,18 180,6 200,2 L200,45 L0,45 Z"
                fill="url(#calGrad)"
              />
            </svg>
            <div className="flex justify-between text-[8px] text-slate-400 font-bold px-0.5">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 flex items-center gap-3">
              <div className="relative w-12 h-12 shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#1e4a46"
                    strokeDasharray={`${(streakCount / 5) * 100}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#1e4a46]">
                  {streakCount}
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">
                  Day Streak
                </p>
                <div className="flex gap-1 justify-between">
                  {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
                    <div key={day} className="flex flex-col items-center gap-0.5">
                      <span className="text-[7px] text-slate-400 font-bold">
                        {day.substring(0, 1)}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-full text-[7px] font-bold border flex items-center justify-center ${streakDays[day] ? "bg-[#1e4a46] border-[#1e4a46] text-white" : "bg-slate-50 border-slate-200 text-slate-400"}`}
                      >
                        {streakDays[day] ? <Check className="w-2.5 h-2.5" /> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-around text-center pt-1 border-t border-slate-50">
              <div>
                <p className="text-sm font-bold text-orange-500">{progressPct}%</p>
                <p className="text-[8px] text-slate-400 font-bold">Progress</p>
              </div>
              <div className="w-px bg-slate-100" />
              <div>
                <p className="text-sm font-bold text-[#1e4a46]">{completedCount}</p>
                <p className="text-[8px] text-slate-400 font-bold">Done</p>
              </div>
              <div className="w-px bg-slate-100" />
              <div>
                <p className="text-sm font-bold text-slate-800">{streak?.longest_streak || 0}</p>
                <p className="text-[8px] text-slate-400 font-bold">Longest</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Nutrition Log
                </h3>
                <p className="text-[8px] text-slate-400 mt-0.5">
                  Track your daily meals and macros
                </p>
              </div>
              <Utensils className="w-4 h-4 text-[#1e4a46]" />
            </div>

            {/* Macro Summary Boxes */}
            {nutrition.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
                  <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wide">
                    Protein
                  </p>
                  <p className="text-lg font-black text-emerald-800">{totalProtein}g</p>
                  <p className="text-[7px] text-emerald-500 font-semibold">
                    {nutrition.length > 0 ? Math.round(totalProtein / nutrition.length) : 0}g avg
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center">
                  <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wide">
                    Carbs
                  </p>
                  <p className="text-lg font-black text-amber-800">{totalCarbs}g</p>
                  <p className="text-[7px] text-amber-500 font-semibold">
                    {nutrition.length > 0 ? Math.round(totalCarbs / nutrition.length) : 0}g avg
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-center">
                  <p className="text-[9px] font-bold text-blue-700 uppercase tracking-wide">Fat</p>
                  <p className="text-lg font-black text-blue-800">{totalFat}g</p>
                  <p className="text-[7px] text-blue-500 font-semibold">
                    {nutrition.length > 0 ? Math.round(totalFat / nutrition.length) : 0}g avg
                  </p>
                </div>
              </div>
            )}

            {/* Add Meal Form */}
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={newMealName}
                  onChange={(e) => setNewMealName(e.target.value)}
                  placeholder="Meal name..."
                  className="h-7 text-[9px] bg-white rounded-lg text-slate-800"
                />
                <Input
                  type="number"
                  value={newMealCalories}
                  onChange={(e) => setNewMealCalories(e.target.value)}
                  placeholder="Calories (kcal)"
                  className="h-7 text-[9px] bg-white rounded-lg text-slate-800"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[7px] font-bold text-emerald-600 uppercase tracking-wider px-0.5">
                    Protein
                  </label>
                  <Input
                    type="number"
                    value={newMealProtein}
                    onChange={(e) => setNewMealProtein(e.target.value)}
                    placeholder="grams"
                    className="h-7 text-[9px] bg-white rounded-lg text-slate-800 border-emerald-200 focus-visible:ring-emerald-300"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[7px] font-bold text-amber-600 uppercase tracking-wider px-0.5">
                    Carbs
                  </label>
                  <Input
                    type="number"
                    value={newMealCarbs}
                    onChange={(e) => setNewMealCarbs(e.target.value)}
                    placeholder="grams"
                    className="h-7 text-[9px] bg-white rounded-lg text-slate-800 border-amber-200 focus-visible:ring-amber-300"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[7px] font-bold text-blue-600 uppercase tracking-wider px-0.5">
                    Fat
                  </label>
                  <Input
                    type="number"
                    value={newMealFat}
                    onChange={(e) => setNewMealFat(e.target.value)}
                    placeholder="grams"
                    className="h-7 text-[9px] bg-white rounded-lg text-slate-800 border-blue-200 focus-visible:ring-blue-300"
                  />
                </div>
              </div>
              <button
                onClick={handleAddMeal as any}
                className="w-full bg-[#1e4a46] hover:bg-[#153633] text-white font-bold py-1.5 rounded-lg text-[9px] transition-colors cursor-pointer"
              >
                Log Meal
              </button>
            </div>

            {/* Meal List */}
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {nutrition.length === 0 && (
                <p className="text-[10px] text-slate-400 text-center py-4">
                  No meals logged for this date
                </p>
              )}
              {nutrition.map((item, idx) => {
                const badgeColors = [
                  "bg-teal-100 text-teal-700",
                  "bg-amber-100 text-amber-700",
                  "bg-blue-100 text-blue-700",
                  "bg-rose-100 text-rose-700",
                ];
                return (
                  <div
                    key={item.id}
                    className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${badgeColors[idx % badgeColors.length]}`}
                      >
                        <Utensils className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[9px] text-slate-500 font-semibold">
                          {item.calories} kcal
                        </p>
                        <div className="flex gap-1.5 mt-1">
                          <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                            P {item.protein_g}g
                          </span>
                          <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                            C {item.carbs_g}g
                          </span>
                          <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                            F {item.fat_g}g
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[8px] text-slate-400 font-bold">{item.time}</span>
                      <button
                        onClick={() => handleDeleteMeal(item.id)}
                        className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Assistant
              <span className="text-[9px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                GEMINI
              </span>
            </h3>
            <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 h-32 overflow-y-auto space-y-2 text-[10px]">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-xl leading-relaxed max-w-[88%] ${msg.sender === "user" ? "bg-[#1e4a46] text-white rounded-br-none ml-auto" : "bg-white text-slate-700 rounded-bl-none border border-slate-100"}`}
                >
                  {msg.text}
                </div>
              ))}
              {chatLoading && (
                <div className="p-2 rounded-xl bg-white text-slate-400 border border-slate-100 max-w-[88%] flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                </div>
              )}
            </div>
            <form onSubmit={handleSendChatMessage} className="flex gap-1.5">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about your workout..."
                className="h-8 text-[9px] rounded-lg bg-slate-50 border-slate-100 text-slate-800"
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="w-8 h-8 bg-[#1e4a46] hover:bg-[#153633] text-white rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-50"
              >
                {chatLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Start Session FAB ── */}
      {!sessionActive && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2 items-end">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-2 flex gap-1">
            {[10, 20, 30, 45].map((m) => (
              <button
                key={m}
                onClick={() => startSession(m)}
                className="px-3 py-2 rounded-xl text-[10px] font-bold bg-[#1e4a46] hover:bg-[#153633] text-white transition-colors cursor-pointer"
              >
                {m} min
              </button>
            ))}
          </div>
          <div className="bg-[#1e4a46] text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold">
            <Play className="w-4 h-4" /> Start Session
          </div>
        </div>
      )}

      {/* ── Session Timer Modal ── */}
      {sessionActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={cancelSession}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full relative z-10 border border-slate-100 shadow-2xl flex flex-col items-center gap-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#1e4a46"
                  strokeDasharray={`${(sessionTimer / (sessionMinutes * 60)) * 283}, 283`}
                  strokeWidth="6"
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-800">
                  {Math.floor(sessionTimer / 60)}:{String(sessionTimer % 60).padStart(2, "0")}
                </span>
                <span className="text-[10px] text-slate-400 font-bold mt-1">
                  /{sessionMinutes}:00
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={toggleSessionPause}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors cursor-pointer"
              >
                {sessionPaused ? "Resume" : "Pause"}
              </button>
              <button
                onClick={completeSession}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors cursor-pointer"
              >
                Complete Early
              </button>
              <button
                onClick={cancelSession}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-red-100 text-red-600 hover:bg-red-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              Keep going! Every completed session builds your streak.
            </p>
          </div>
        </div>
      )}

      {/* ── YouTube Player Modal ── */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedVideo(null)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <div className="bg-white rounded-2xl p-5 max-w-2xl w-full relative z-10 border border-slate-100 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 truncate pr-6">
                {selectedVideo.snippet.title}
              </h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-sm font-bold shrink-0"
              >
                Close
              </button>
            </div>
            <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-100 shadow-md bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.id.videoId}?autoplay=1`}
                title={selectedVideo.snippet.title}
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className="text-xs text-slate-400 font-medium">
              YouTube Data API (v3) &bull; {selectedVideo.snippet.channelTitle}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
