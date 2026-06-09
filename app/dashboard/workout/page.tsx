"use client";

import React, { useState, useEffect } from "react";
import {
  Dumbbell,
  Plus,
  Flame,
  Clock,
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
  BarChart2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getSuggestionsBasedOnSymptoms,
  DEMO_MEDICATIONS,
  type SymptomClassification,
  type MealSuggestion,
} from "@/lib/medications";

interface WorkoutItem {
  id: string;
  title: string;
  category: "HIIT" | "Strength" | "Focus" | "Agility";
  bodyArea: "Lower Leg" | "Upper Leg" | "Chest" | "Bicep";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  calories: number;
  duration: number;
  coach: string;
  isBookmarked?: boolean;
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
  macros: { p: number; c: number; f: number };
  time: string;
  emoji: string;
}

const initialWorkouts: WorkoutItem[] = [
  {
    id: "w1",
    title: "Core Crusher Abs & Obliques",
    category: "HIIT",
    bodyArea: "Chest",
    difficulty: "Beginner",
    calories: 551,
    duration: 25,
    coach: "Coach Arnold White",
    isBookmarked: false,
  },
  {
    id: "w2",
    title: "Total Body Circuit",
    category: "Strength",
    bodyArea: "Upper Leg",
    difficulty: "Beginner",
    calories: 420,
    duration: 35,
    coach: "Coach Arnold White",
    isBookmarked: true,
  },
  {
    id: "w3",
    title: "Upper Body Boxing",
    category: "Agility",
    bodyArea: "Bicep",
    difficulty: "Intermediate",
    calories: 300,
    duration: 20,
    coach: "Coach Sarah Jenkins",
    isBookmarked: false,
  },
  {
    id: "w4",
    title: "Leg Strength Blast",
    category: "Strength",
    bodyArea: "Lower Leg",
    difficulty: "Advanced",
    calories: 620,
    duration: 40,
    coach: "Coach Tatum Smith",
    isBookmarked: false,
  },
];

const initialSchedule: ScheduleItem[] = [
  {
    id: "s1",
    time: "08:00 AM",
    title: "Morning Cardio Warmup",
    type: "Intense • 30 min • Cardio",
    completed: true,
  },
  {
    id: "s2",
    time: "11:00 AM",
    title: "Upper Body Stretching",
    type: "Mild • 15 min • Focus",
    completed: false,
  },
];

const initialNutrition: NutritionItem[] = [
  {
    id: "n1",
    name: "Morning Oatmeal",
    calories: 285,
    macros: { p: 12, c: 23, f: 8 },
    time: "Jan 23",
    emoji: "grain",
  },
  {
    id: "n2",
    name: "Classic Bread Toast",
    calories: 128,
    macros: { p: 4, c: 20, f: 2 },
    time: "Jan 23",
    emoji: "grain",
  },
];

// Category icon mapper
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

// Body area icon mapper
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

export default function WorkoutDashboardPage() {
  const [workouts, setWorkouts] = useState<WorkoutItem[]>(initialWorkouts);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(initialSchedule);
  const [nutrition, setNutrition] = useState<NutritionItem[]>(initialNutrition);

  const [activeCategory, setActiveCategory] = useState<
    "All" | "HIIT" | "Strength" | "Focus" | "Agility"
  >("All");
  const [activeBodyArea, setActiveBodyArea] = useState<
    "All" | "Lower Leg" | "Upper Leg" | "Chest" | "Bicep"
  >("All");

  const [dayStreak, setDayStreak] = useState(3);
  const [streakDays, setStreakDays] = useState({
    Mon: false,
    Tue: true,
    Wed: true,
    Thu: true,
    Fri: false,
  });

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "ai"; text: string }[]>([
    { sender: "ai", text: "Hey! Need help finding the best routine today? Just ask me anything!" },
  ]);

  const [newMealName, setNewMealName] = useState("");
  const [newMealCalories, setNewMealCalories] = useState("");
  const [newMealProtein, setNewMealProtein] = useState("12");
  const [newMealCarbs, setNewMealCarbs] = useState("23");
  const [newMealFat, setNewMealFat] = useState("8");

  const [newScheduleTitle, setNewScheduleTitle] = useState("");
  const [newScheduleTime, setNewScheduleTime] = useState("09:00 AM");

  const [currentDate, setCurrentDate] = useState({ day: "19", weekday: "Tue", month: "December" });
  const [suggestedWorkout, setSuggestedWorkout] = useState<string | null>(null);

  const [youtubeVideos, setYoutubeVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);

  // WORK-004 — Clinical Meal Suggestion Engine
  const AVAILABLE_SYMPTOMS: { key: SymptomClassification; label: string }[] = [
    { key: "fatigue", label: "Fatigue" },
    { key: "hypertension", label: "Hypertension" },
    { key: "hyperglycemia", label: "High Blood Sugar" },
    { key: "high_cholesterol", label: "High Cholesterol" },
    { key: "inflammation", label: "Inflammation" },
    { key: "muscle_soreness", label: "Muscle Soreness" },
    { key: "dehydration", label: "Dehydration" },
    { key: "low_energy", label: "Low Energy" },
    { key: "digestive_issues", label: "Digestive Issues" },
    { key: "anxiety", label: "Anxiety" },
  ];
  const [activeSymptoms, setActiveSymptoms] = useState<SymptomClassification[]>([]);
  const mealSuggestions: MealSuggestion[] = activeSymptoms.length > 0
    ? getSuggestionsBasedOnSymptoms(activeSymptoms, DEMO_MEDICATIONS)
    : [];
  const toggleSymptom = (sym: SymptomClassification) => {
    setActiveSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  useEffect(() => {
    const fetchVideos = async () => {
      setLoadingVideos(true);
      try {
        let q = "workout physical training";
        if (activeCategory !== "All" && activeBodyArea !== "All") {
          q = `${activeCategory} ${activeBodyArea} workout`;
        } else if (activeCategory !== "All") {
          q = `${activeCategory} workout`;
        } else if (activeBodyArea !== "All") {
          q = `${activeBodyArea} exercises`;
        }
        const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setYoutubeVideos(data.items || []);
      } catch (err) {
        console.error("[YouTube Fetch Error] Client retrieval failed:", err);
      } finally {
        setLoadingVideos(false);
      }
    };
    fetchVideos();
  }, [activeCategory, activeBodyArea]);

  useEffect(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const d = new Date();
    setCurrentDate({
      day: d.getDate().toString(),
      weekday: days[d.getDay()],
      month: months[d.getMonth()],
    });
  }, []);

  const handleAutosuggest = () => {
    const suggestions = [
      "15 min HIIT Burner with Coach Arnold",
      "30 min Upper Body Focus with Coach Tatum",
      "20 min Core Crusher Abs Workout",
      "45 min Leg Strength Blast",
    ];
    const randomIdx = Math.floor(Math.random() * suggestions.length);
    setSuggestedWorkout(suggestions[randomIdx]);
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setTimeout(() => {
      let reply =
        "Based on your clinical record, I suggest a moderate-intensity 20 min cardio or focus session today.";
      if (userMsg.toLowerCase().includes("fatigue") || userMsg.toLowerCase().includes("tired")) {
        reply = "Since you feel tired, I suggest a 10 min mild focus stretch instead of heavy weight sessions.";
      } else if (userMsg.toLowerCase().includes("chest") || userMsg.toLowerCase().includes("pain")) {
        reply = "Please avoid strenuous lifting and contact your physician before performing workouts.";
      } else if (userMsg.toLowerCase().includes("hiit") || userMsg.toLowerCase().includes("abs")) {
        reply = "Core Crusher Abs is highly recommended today! Go beginner-paced for 25 minutes.";
      }
      setChatMessages((prev) => [...prev, { sender: "ai", text: reply }]);
    }, 800);
  };

  const toggleStreakDay = (day: keyof typeof streakDays) => {
    const nextDays = { ...streakDays, [day]: !streakDays[day] };
    setStreakDays(nextDays);
    const count = Object.values(nextDays).filter(Boolean).length;
    setDayStreak(count + 19);
  };

  const toggleBookmark = (id: string) => {
    setWorkouts((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isBookmarked: !w.isBookmarked } : w))
    );
  };

  const toggleScheduleComplete = (id: string) => {
    setSchedule((prev) => prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)));
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleTitle) return;
    const newEntry: ScheduleItem = {
      id: Math.random().toString(36).substring(7),
      time: newScheduleTime,
      title: newScheduleTitle,
      type: "Custom Session",
      completed: false,
    };
    setSchedule((prev) => [...prev, newEntry]);
    setNewScheduleTitle("");
  };

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMealName || !newMealCalories) return;
    const cal = parseInt(newMealCalories);
    if (isNaN(cal)) return;
    const newEntry: NutritionItem = {
      id: Math.random().toString(36).substring(7),
      name: newMealName,
      calories: cal,
      macros: {
        p: parseInt(newMealProtein) || 0,
        c: parseInt(newMealCarbs) || 0,
        f: parseInt(newMealFat) || 0,
      },
      time: "Today",
      emoji: "meal",
    };
    setNutrition((prev) => [...prev, newEntry]);
    setNewMealName("");
    setNewMealCalories("");
  };

  const handleDeleteMeal = (id: string) => {
    setNutrition((prev) => prev.filter((n) => n.id !== id));
  };

  const filteredWorkouts = workouts.filter((w) => {
    const catMatch = activeCategory === "All" || w.category === activeCategory;
    const bodyMatch = activeBodyArea === "All" || w.bodyArea === activeBodyArea;
    return catMatch && bodyMatch;
  });

  const totalCalories = nutrition.reduce((sum, n) => sum + n.calories, 0);
  const streakCount = Object.values(streakDays).filter(Boolean).length;
  const completedCount = schedule.filter((s) => s.completed).length;
  const progressPct = schedule.length > 0 ? Math.round((completedCount / schedule.length) * 100) : 0;

  return (
    <div
      className="font-sans bg-[#f0f5ff] w-full min-h-full flex flex-col gap-6 p-8 relative animate-slide-up"
      data-purpose="workout-dashboard"
    >
      {/* ─── Page Header ─── */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-semibold text-slate-800">Workout & Diet</h2>
          <p className="text-base text-slate-400 font-light mt-0.5">
            {currentDate.weekday}, {currentDate.month} {currentDate.day}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-300 to-cyan-100 shadow-inner flex items-center justify-center relative overflow-hidden animate-pulse">
            <div className="absolute inset-1 bg-white/40 rounded-full blur-sm" />
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <button
            onClick={handleAutosuggest}
            className="bg-[#1e4a46] hover:bg-[#153633] text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer shadow-md"
          >
            AI Suggest
          </button>
          <button
            onClick={() =>
              setChatMessages((prev) => [
                ...prev,
                { sender: "ai", text: "Today's schedule contains " + schedule.length + " logged tasks." },
              ])
            }
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-600 shadow-sm hover:bg-slate-50 transition-colors border border-slate-100 cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* AI Suggestion Banner */}
      {suggestedWorkout && (
        <div className="bg-[#1e4a46] text-white rounded-2xl px-5 py-3 flex items-center gap-3 shadow-md">
          <Sparkles className="w-4 h-4 shrink-0 text-cyan-300" />
          <span className="text-sm font-medium">{suggestedWorkout}</span>
          <button
            onClick={() => setSuggestedWorkout(null)}
            className="ml-auto text-white/60 hover:text-white text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ─── WORK-004 Symptom Selector + Meal Suggestion Banner ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Apple className="w-4 h-4 text-[#1e4a46]" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Clinical Meal Suggestions</span>
            <span className="text-[9px] bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full font-bold">WORK-004</span>
          </div>
          {activeSymptoms.length > 0 && (
            <button onClick={() => setActiveSymptoms([])} className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer">
              Clear all
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_SYMPTOMS.map(({ key, label }) => {
            const active = activeSymptoms.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleSymptom(key)}
                className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                  active
                    ? "bg-[#1e4a46] text-white border-[#1e4a46]"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {mealSuggestions.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            {mealSuggestions.map((s) => (
              <div
                key={s.id}
                className={`rounded-xl p-3 border flex flex-col gap-1.5 ${
                  s.severity === "critical"
                    ? "bg-red-50 border-red-200"
                    : s.severity === "warning"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-teal-50 border-teal-100"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold ${
                    s.severity === "critical" ? "text-red-700" : s.severity === "warning" ? "text-amber-700" : "text-teal-700"
                  }`}>
                    {s.title}
                  </span>
                  {s.medicationTrigger && (
                    <span className="text-[8px] bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold shrink-0">
                      Rx: {s.medicationTrigger}
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-slate-600">{s.description}</p>
                <div className="flex flex-wrap gap-3 mt-0.5">
                  <div>
                    <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Recommended</p>
                    <div className="flex flex-wrap gap-1">
                      {s.foods.map((f) => (
                        <span key={f} className="text-[8px] bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md font-medium">{f}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-red-400 uppercase mb-1">Avoid</p>
                    <div className="flex flex-wrap gap-1">
                      {s.avoid.map((a) => (
                        <span key={a} className="text-[8px] bg-red-50 border border-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-medium">{a}</span>
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

        {/* ─── Left 9 cols ─── */}
        <div className="col-span-12 lg:col-span-9 grid grid-cols-3 gap-6">

          {/* ── Column 1 ── */}
          <div className="flex flex-col gap-5">

            {/* Suggest Workout CTA */}
            <div
              onClick={handleAutosuggest}
              className="bg-[#1e4a46] rounded-2xl p-4 text-white relative overflow-hidden h-24 flex flex-col justify-center cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="relative z-10 w-3/4">
                <p className="text-xs font-bold mb-0.5">Get the best workout with AI.</p>
                <p className="text-[10px] text-white/60">Autosuggest with AI</p>
              </div>
              <div className="absolute right-0 bottom-0 w-16 h-16 bg-orange-400 rounded-tl-full opacity-70 blur-sm" />
              <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-white/30" />
            </div>

            {/* Browse By Body Area */}
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
                        className={`rounded-xl aspect-[3/4] w-full flex items-center justify-center p-2 transition-all ${
                          isSelected
                            ? "bg-[#1e4a46] text-white shadow-sm"
                            : "bg-white border border-slate-100 group-hover:bg-slate-50 text-slate-500"
                        }`}
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

            {/* Workout Schedule */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-slate-800">Daily Schedule</h3>
              <div className="flex flex-col gap-2 relative pl-3 border-l-2 border-slate-100">
                {schedule.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleScheduleComplete(item.id)}
                    className={`flex items-start gap-2 cursor-pointer transition-all ${
                      item.completed ? "opacity-55" : ""
                    }`}
                  >
                    <span className="text-[9px] text-slate-400 font-medium pt-2 text-right w-12 shrink-0">
                      {item.time}
                    </span>
                    <div
                      className={`bg-white rounded-xl p-2.5 shadow-sm border flex-grow flex items-center gap-2 transition-colors ${
                        item.completed ? "border-emerald-200 bg-emerald-50/20" : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          item.completed
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {item.completed && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[10px] font-semibold text-slate-800 truncate ${item.completed ? "line-through text-slate-400" : ""}`}>
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

            {/* Trending Workout Card */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-800">Trending</h3>
                <span className="text-xs text-[#1e4a46] font-semibold hover:underline cursor-pointer flex items-center gap-0.5">
                  See All <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-slate-700 to-slate-900 text-white p-4 flex flex-col justify-end group cursor-pointer shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 group-hover:from-black/90 transition-colors" />
                <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-[9px] font-bold z-20 ${difficultyColor["Beginner"]}`}>
                  Beginner
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleBookmark("w1"); }}
                  className="absolute top-3 right-3 w-7 h-7 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center z-20 hover:bg-white/40 transition-colors cursor-pointer"
                >
                  <Bookmark className={`w-3.5 h-3.5 ${workouts.find((w) => w.id === "w1")?.isBookmarked ? "fill-white text-white" : "text-white"}`} />
                </button>
                {/* Decorative icon */}
                <div className="absolute inset-0 flex items-center justify-center z-0">
                  <Flame className="w-20 h-20 text-white/5" />
                </div>
                <div className="relative z-20 transform group-hover:translate-y-[-3px] transition-transform duration-300">
                  <h4 className="text-sm font-bold leading-tight mb-1">Core Crusher Abs & Obliques</h4>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center">
                      <User className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="text-[9px] opacity-75">Coach Arnold White</span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] font-medium opacity-90">
                    <div className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" /> 551 kcal
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-300" /> 25 min
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Featured Workout Card */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Featured</h3>
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-[#1e4a46] to-[#0d2b28] text-white p-4 flex flex-col justify-end group cursor-pointer shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10 group-hover:from-black/80 transition-colors" />
                <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-[9px] font-bold z-20 ${difficultyColor["Intermediate"]}`}>
                  Intermediate
                </span>
                <div className="absolute inset-0 flex items-center justify-center z-0">
                  <Dumbbell className="w-20 h-20 text-white/5" />
                </div>
                <div className="relative z-20 transform group-hover:translate-y-[-3px] transition-transform duration-300">
                  <h4 className="text-sm font-bold leading-tight mb-1">Total Body Circuit</h4>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center">
                      <User className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="text-[9px] opacity-75">Coach Arnold White</span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] font-medium opacity-90">
                    <div className="flex items-center gap-1">
                      <Dumbbell className="w-3 h-3 text-cyan-300" /> 420 kcal
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-300" /> 35 min
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Column 3 ── */}
          <div className="flex flex-col gap-5">

            {/* Workout Category */}
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
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-[#1e4a46] text-white shadow-sm"
                            : "bg-white border border-slate-100 group-hover:bg-slate-50 text-slate-500"
                        }`}
                      >
                        <CategoryIcon cat={cat} size={14} />
                      </div>
                      <span className="text-[9px] font-medium text-slate-600">{cat}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Short Workouts */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-800">Short Workouts</h3>
                <span className="text-xs text-[#1e4a46] font-semibold hover:underline cursor-pointer flex items-center gap-0.5">
                  See All <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {/* Boxing Card */}
                <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl mb-2.5 relative overflow-hidden flex items-center justify-center">
                    <Target className="w-8 h-8 text-slate-400" />
                    <div className="absolute top-2 left-2 bg-[#1e4a46] text-white text-[8px] px-2 py-0.5 rounded-full font-bold">
                      Upper Body
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Upper Body Boxing</h4>
                  <p className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 20 min &bull; Easy
                  </p>
                </div>

                {/* Mindfulness Card */}
                <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="aspect-video bg-gradient-to-br from-emerald-50 to-teal-100 rounded-xl mb-2.5 relative overflow-hidden flex items-center justify-center">
                    <Leaf className="w-8 h-8 text-emerald-400" />
                    <div className="absolute top-2 left-2 bg-[#1e4a46] text-white text-[8px] px-2 py-0.5 rounded-full font-bold">
                      Lower Body
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Mindfulness Basics</h4>
                  <p className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 20 min &bull; Easy
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── YouTube Workout Guides (full width, 3 cols) ── */}
          <div className="col-span-3 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-red-500" />
                  YouTube Workout Guides
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
                  <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3 animate-pulse h-40" />
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
                      <img
                        src={video.snippet.thumbnails.medium.url}
                        alt={video.snippet.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
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

        {/* ─── Right Column (3 cols) ─── */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">

          {/* ── Calories + Streak Block ── */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
            {/* Calories header */}
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" /> Calories
              </span>
              <span className="text-xs font-bold text-[#1e4a46]">{totalCalories} kcal</span>
            </div>

            {/* SVG Curve */}
            <svg viewBox="0 0 200 45" className="w-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e4a46" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#1e4a46" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,38 C20,33 30,14 50,18 C70,22 80,6 100,10 C120,14 130,26 150,22 C170,18 180,6 200,2"
                fill="none" stroke="#1e4a46" strokeWidth="2" strokeLinecap="round"
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

            {/* Streak section */}
            <div className="border-t border-slate-100 pt-3 flex items-center gap-3">
              <div className="relative w-12 h-12 shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="#f1f5f9" strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="#1e4a46"
                    strokeDasharray={`${(streakCount / 5) * 100}, 100`}
                    strokeWidth="3.5" strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#1e4a46]">
                  {streakCount}
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">Day Streak</p>
                <div className="flex gap-1 justify-between">
                  {(Object.keys(streakDays) as Array<keyof typeof streakDays>).map((day) => (
                    <div key={day} className="flex flex-col items-center gap-0.5">
                      <span className="text-[7px] text-slate-400 font-bold">{day.substring(0, 1)}</span>
                      <button
                        onClick={() => toggleStreakDay(day)}
                        className={`w-5 h-5 rounded-full text-[7px] font-bold border transition-all cursor-pointer flex items-center justify-center ${
                          streakDays[day]
                            ? "bg-[#1e4a46] border-[#1e4a46] text-white"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        {streakDays[day] ? <Check className="w-2.5 h-2.5" /> : null}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats row */}
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
                <p className="text-sm font-bold text-slate-800">{dayStreak}</p>
                <p className="text-[8px] text-slate-400 font-bold">Longest</p>
              </div>
            </div>
          </div>

          {/* ── Nutrition History ── */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Nutrition Log
                </h3>
                <p className="text-[8px] text-slate-400 mt-0.5">Calorie macro logs</p>
              </div>
              <Utensils className="w-4 h-4 text-[#1e4a46]" />
            </div>

            {/* Meal logging form */}
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
                  placeholder="Calories"
                  className="h-7 text-[9px] bg-white rounded-lg text-slate-800"
                />
              </div>
              <div className="grid grid-cols-3 gap-1">
                <Input
                  type="number"
                  value={newMealProtein}
                  onChange={(e) => setNewMealProtein(e.target.value)}
                  placeholder="Pro (g)"
                  className="h-7 text-[8px] bg-white rounded-lg text-slate-800"
                />
                <Input
                  type="number"
                  value={newMealCarbs}
                  onChange={(e) => setNewMealCarbs(e.target.value)}
                  placeholder="Carb (g)"
                  className="h-7 text-[8px] bg-white rounded-lg text-slate-800"
                />
                <Input
                  type="number"
                  value={newMealFat}
                  onChange={(e) => setNewMealFat(e.target.value)}
                  placeholder="Fat (g)"
                  className="h-7 text-[8px] bg-white rounded-lg text-slate-800"
                />
              </div>
              <button
                onClick={handleAddMeal as any}
                className="w-full bg-[#1e4a46] hover:bg-[#153633] text-white font-bold py-1.5 rounded-lg text-[9px] transition-colors cursor-pointer"
              >
                Log Meal
              </button>
            </div>

            {/* Meal logs list */}
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {nutrition.map((item, idx) => {
                const colors = [
                  "bg-teal-100 text-teal-700",
                  "bg-amber-100 text-amber-700",
                  "bg-blue-100 text-blue-700",
                  "bg-rose-100 text-rose-700",
                ];
                const colorClass = colors[idx % colors.length];
                return (
                  <div
                    key={item.id}
                    className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                        <Utensils className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[9px] text-slate-500 font-semibold">{item.calories} kcal</p>
                        <div className="flex gap-1.5 mt-0.5 text-[8px] text-slate-400">
                          <span>P {item.macros.p}g</span>
                          <span>C {item.macros.c}g</span>
                          <span>F {item.macros.f}g</span>
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

          {/* ── Chatbot Assistant ── */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Assistant
            </h3>
            <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 h-32 overflow-y-auto space-y-2 text-[10px]">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-xl leading-relaxed max-w-[88%] ${
                    msg.sender === "user"
                      ? "bg-[#1e4a46] text-white rounded-br-none ml-auto"
                      : "bg-white text-slate-700 rounded-bl-none border border-slate-100"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
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
                className="w-8 h-8 bg-[#1e4a46] hover:bg-[#153633] text-white rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

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
