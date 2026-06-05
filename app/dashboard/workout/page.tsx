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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface WorkoutItem {
  id: string;
  title: string;
  category: "HIIT" | "Strength" | "Focus" | "Agility";
  bodyArea: "Lower Leg" | "Upper Leg" | "Chest" | "Bicep";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  calories: number;
  duration: number; // mins
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
    title: "Homemade Plain Waffles",
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
    emoji: "🥣",
  },
  {
    id: "n2",
    name: "Classic Bread Toast",
    calories: 128,
    macros: { p: 4, c: 20, f: 2 },
    time: "Jan 23",
    emoji: "🍞",
  },
];

export default function WorkoutDashboardPage() {
  const [workouts, setWorkouts] = useState<WorkoutItem[]>(initialWorkouts);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(initialSchedule);
  const [nutrition, setNutrition] = useState<NutritionItem[]>(initialNutrition);

  // Selection/Filtering states
  const [activeCategory, setActiveCategory] = useState<
    "All" | "HIIT" | "Strength" | "Focus" | "Agility"
  >("All");
  const [activeBodyArea, setActiveBodyArea] = useState<
    "All" | "Lower Leg" | "Upper Leg" | "Chest" | "Bicep"
  >("All");

  // Streak states
  const [dayStreak, setDayStreak] = useState(3);
  const [streakDays, setStreakDays] = useState({
    Mon: false,
    Tue: true,
    Wed: true,
    Thu: true,
    Fri: false,
  });

  // Chatbot State
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "ai"; text: string }[]>([
    { sender: "ai", text: "Hey! Need help finding the best routine today? Just ask me anything!" },
  ]);

  // Form Inputs
  const [newMealName, setNewMealName] = useState("");
  const [newMealCalories, setNewMealCalories] = useState("");
  const [newMealProtein, setNewMealProtein] = useState("12");
  const [newMealCarbs, setNewMealCarbs] = useState("23");
  const [newMealFat, setNewMealFat] = useState("8");
  const [newMealEmoji, setNewMealEmoji] = useState("🥣");

  const [newScheduleTitle, setNewScheduleTitle] = useState("");
  const [newScheduleTime, setNewScheduleTime] = useState("09:00 AM");

  const [currentDate, setCurrentDate] = useState({ day: "19", weekday: "Tue", month: "December" });
  const [suggestedWorkout, setSuggestedWorkout] = useState<string | null>(null);

  // YouTube Data API states
  const [youtubeVideos, setYoutubeVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);

  // Fetch YouTube Workout Videos dynamically based on active filter criteria
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
    const d = new Date();
    setCurrentDate({
      day: d.getDate().toString(),
      weekday: days[d.getDay()],
      month: months[d.getMonth()],
    });
  }, []);

  // AI Suggestion Handler
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

  // Chat message Handler
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");

    setTimeout(() => {
      let reply =
        "Based on your clinical record, I suggest doing a moderate-intensity 20 min cardio or focus session today.";
      if (userMsg.toLowerCase().includes("fatigue") || userMsg.toLowerCase().includes("tired")) {
        reply =
          "Since you feel tired, I suggest a 10 min mild focus stretch instead of heavy weight sessions.";
      } else if (
        userMsg.toLowerCase().includes("chest") ||
        userMsg.toLowerCase().includes("pain")
      ) {
        reply =
          "Please avoid strenuous lifting and contact your personal physician before performing workouts.";
      } else if (userMsg.toLowerCase().includes("hiit") || userMsg.toLowerCase().includes("abs")) {
        reply = "Core Crusher Abs is highly recommended today! Go beginner-paced for 25 minutes.";
      }
      setChatMessages((prev) => [...prev, { sender: "ai", text: reply }]);
    }, 800);
  };

  // Toggle Day Streak
  const toggleStreakDay = (day: keyof typeof streakDays) => {
    const nextDays = { ...streakDays, [day]: !streakDays[day] };
    setStreakDays(nextDays);
    const count = Object.values(nextDays).filter(Boolean).length;
    setDayStreak(count + 19); // Base 19 streak offset
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
      emoji: newMealEmoji,
    };

    setNutrition((prev) => [...prev, newEntry]);
    setNewMealName("");
    setNewMealCalories("");
  };

  const handleDeleteMeal = (id: string) => {
    setNutrition((prev) => prev.filter((n) => n.id !== id));
  };

  // Filter workouts
  const filteredWorkouts = workouts.filter((w) => {
    const catMatch = activeCategory === "All" || w.category === activeCategory;
    const bodyMatch = activeBodyArea === "All" || w.bodyArea === activeBodyArea;
    return catMatch && bodyMatch;
  });

  return (
    <div
      className="font-sans bg-[#f0f5ff] w-full min-h-full flex flex-col gap-8 p-8 relative animate-slide-up"
      data-purpose="workout-dashboard"
    >
      {/* Section Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-semibold text-slate-800">Hey, Need help?</h2>
          <p className="text-2xl text-slate-400 font-light mt-1">Just ask me anything!</p>
        </div>
        <div className="flex items-center gap-6">
          {/* AI Orb placeholder */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-300 to-cyan-100 shadow-inner flex items-center justify-center relative overflow-hidden animate-pulse">
            <div className="absolute inset-1 bg-white/40 rounded-full blur-sm" />
            <Sparkles className="w-5 h-5 text-brand-600" />
          </div>
          <div className="h-12 w-px bg-slate-200" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-xl font-semibold text-slate-800 shadow-sm border border-slate-100">
              {currentDate.day}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{currentDate.weekday},</p>
              <p className="text-sm text-slate-800 font-semibold">{currentDate.month}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <button
              onClick={handleAutosuggest}
              className="bg-[#1e4a46] hover:bg-[#153633] text-white px-6 py-3 rounded-full text-sm font-medium transition-colors cursor-pointer shadow-md"
            >
              Show my Task
            </button>
            <button
              onClick={() => {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    sender: "ai",
                    text: "Today's schedule contains " + schedule.length + " logged tasks.",
                  },
                ]);
              }}
              className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-600 shadow-sm hover:bg-slate-50 transition-colors border border-slate-100 cursor-pointer"
            >
              <Calendar className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left Columns Container (9 Cols) */}
        <div className="col-span-12 lg:col-span-9 grid grid-cols-3 gap-8">
          {/* Column 1 */}
          <div className="flex flex-col gap-6">
            {/* Suggest Workout */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3">Suggest Workout</h3>
              <div
                onClick={handleAutosuggest}
                className="bg-[#1e4a46] rounded-2xl p-4 text-white relative overflow-hidden h-28 flex flex-col justify-center cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="relative z-10 w-2/3">
                  <p className="text-xs font-bold mb-1">Get the best workout with AI.</p>
                  <p className="text-[10px] text-white/70">Autosuggest with AI</p>
                </div>
                <div className="absolute right-0 bottom-0 w-20 h-20 bg-orange-400 rounded-tl-full opacity-80 blur-sm" />
              </div>
            </div>

            {/* Browse By Body Area */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-800">Browse By Body Area</h3>
                <span
                  onClick={() => setActiveBodyArea("All")}
                  className="text-xs text-[#1e4a46] font-semibold hover:underline cursor-pointer"
                >
                  See All
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {(["Lower Leg", "Upper Leg", "Chest", "Bicep"] as const).map((area) => {
                  const isSelected = activeBodyArea === area;
                  return (
                    <div
                      key={area}
                      onClick={() => setActiveBodyArea(area)}
                      className={`cursor-pointer group flex flex-col items-center`}
                    >
                      <div
                        className={`rounded-xl aspect-[3/4] w-full flex items-center justify-center p-2 mb-1 transition-colors ${
                          isSelected
                            ? "bg-brand-100 border border-brand-300"
                            : "bg-slate-50 group-hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-xl">
                          {area === "Lower Leg"
                            ? "🦵"
                            : area === "Upper Leg"
                              ? "🍗"
                              : area === "Chest"
                                ? "👕"
                                : "💪"}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-medium truncate w-full">
                        {area}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Workout Schedule (Daily) */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-800">Workout Schedule (Daily)</h3>

              <div className="flex flex-col gap-3 relative pl-4 border-l border-slate-100">
                {schedule.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleScheduleComplete(item.id)}
                    className={`flex items-start gap-3 group cursor-pointer transition-all ${
                      item.completed ? "opacity-60" : ""
                    }`}
                  >
                    <span className="text-[9px] text-slate-400 font-medium pt-1 text-right w-10 shrink-0">
                      {item.time}
                    </span>
                    <div
                      className={`bg-white rounded-2xl p-3 shadow-sm border flex-grow flex items-center gap-3 transition-colors ${
                        item.completed
                          ? "border-emerald-300 bg-emerald-50/10"
                          : "border-slate-100 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                          item.completed
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {item.completed && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-[10px] font-bold text-slate-800 truncate ${item.completed ? "line-through text-slate-450" : ""}`}
                        >
                          {item.title}
                        </p>
                        <p className="text-[8px] text-slate-400 truncate mt-0.5">{item.type}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {schedule.length === 0 && (
                  <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4 text-center">
                    <span className="text-xs text-slate-400 font-medium">No Schedule</span>
                  </div>
                )}
              </div>

              {/* Add schedule input form */}
              <form onSubmit={handleAddSchedule} className="flex gap-1.5 mt-2">
                <Input
                  value={newScheduleTitle}
                  onChange={(e) => setNewScheduleTitle(e.target.value)}
                  placeholder="Task title..."
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

          {/* Column 2 */}
          <div className="flex flex-col gap-6">
            {/* Trending Workouts */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-800">Trending Workouts</h3>
                <span className="text-xs text-[#1e4a46] font-semibold hover:underline cursor-pointer">
                  See All
                </span>
              </div>
              <div className="relative rounded-[24px] overflow-hidden aspect-[4/3] bg-slate-800 text-white p-4 flex flex-col justify-end group cursor-pointer border border-slate-200 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 group-hover:from-black/90 transition-colors" />
                <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-medium z-20">
                  Beginner
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark("w1");
                  }}
                  className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center z-20 hover:bg-white/40 transition-colors cursor-pointer border border-white/10"
                >
                  <Bookmark
                    className={`w-4 h-4 ${workouts.find((w) => w.id === "w1")?.isBookmarked ? "fill-white" : ""}`}
                  />
                </button>
                <div className="relative z-20 transform group-hover:translate-y-[-4px] transition-transform duration-300">
                  <h4 className="text-sm font-bold leading-tight mb-1">
                    Core Crusher Abs & Obliques
                  </h4>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 bg-slate-400 rounded-full flex items-center justify-center text-[8px]">
                      👤
                    </div>
                    <span className="text-[9px] opacity-80">Coach Arnold White</span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] font-medium opacity-90">
                    <div className="flex items-center gap-0.5">🔥 551 kcal</div>
                    <div className="flex items-center gap-0.5">⏱ 25 min</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Featured Workout */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3">Featured Workout</h3>
              <div className="relative rounded-[24px] overflow-hidden aspect-[4/3] bg-slate-700 text-white p-4 flex flex-col justify-end group cursor-pointer border border-slate-200 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 group-hover:from-black/90 transition-colors" />
                <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-medium z-20">
                  Intermediate
                </div>
                <div className="relative z-20 transform group-hover:translate-y-[-4px] transition-transform duration-300">
                  <h4 className="text-sm font-bold leading-tight mb-1">Total Body Circuit</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 bg-slate-400 rounded-full flex items-center justify-center text-[8px]">
                      👤
                    </div>
                    <span className="text-[9px] opacity-80">Coach Arnold White</span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] font-medium opacity-90">
                    <div className="flex items-center gap-0.5">🏋️ 420 kcal</div>
                    <div className="flex items-center gap-0.5">⏱ 35 min</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3 */}
          <div className="flex flex-col gap-6">
            {/* Workout Category */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-800">Workout Category</h3>
                <span
                  onClick={() => setActiveCategory("All")}
                  className="text-xs text-[#1e4a46] font-semibold hover:underline cursor-pointer"
                >
                  See All
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {(["HIIT", "Strength", "Focus", "Agility"] as const).map((cat) => {
                  const isSelected = activeCategory === cat;
                  return (
                    <div
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className="cursor-pointer group flex flex-col items-center"
                    >
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center mb-1 transition-colors ${
                          isSelected
                            ? "bg-[#1e4a46] text-white shadow-sm"
                            : "bg-slate-50 group-hover:bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span className="text-base">
                          {cat === "HIIT"
                            ? "🔥"
                            : cat === "Strength"
                              ? "🏋️"
                              : cat === "Focus"
                                ? "⚡"
                                : "🏃"}
                        </span>
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
                <h3 className="text-sm font-bold text-slate-800">Short Workouts</h3>
                <span className="text-xs text-[#1e4a46] font-semibold hover:underline cursor-pointer">
                  See All
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {/* Upper Body Boxing */}
                <div className="bg-white rounded-3xl p-3 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow relative">
                  <div className="aspect-video bg-slate-100 rounded-2xl mb-3 relative overflow-hidden flex items-center justify-center text-xl">
                    🥊
                    <div className="absolute top-2 left-2 bg-[#1e4a46] text-white text-[8px] px-2 py-0.5 rounded-full z-10 font-bold">
                      Upper Body
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Upper Body Boxing</h4>
                  <p className="text-[9px] text-slate-500 mt-1">20min • Easy</p>
                </div>
                {/* Mindfulness Basics */}
                <div className="bg-white rounded-3xl p-3 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow relative">
                  <div className="aspect-video bg-slate-100 rounded-2xl mb-3 relative overflow-hidden flex items-center justify-center text-xl">
                    🌿
                    <div className="absolute top-2 left-2 bg-[#1e4a46] text-white text-[8px] px-2 py-0.5 rounded-full z-10 font-bold">
                      Lower Body
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">Mindfulness Basics</h4>
                  <p className="text-[9px] text-slate-500 mt-1">20min • Easy</p>
                </div>
              </div>
            </div>
          </div>

          {/* BEGIN: YouTube Workout Guides (Dynamically changes with category / body area selection) */}
          <div className="col-span-3 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  🎥 YouTube Workout Guides
                  <span className="text-[9px] bg-red-100 text-red-650 px-2 py-0.5 rounded-full font-black font-mono">
                    LIVE API
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  Top guides for "{activeCategory !== "All" ? activeCategory : ""}{" "}
                  {activeBodyArea !== "All" ? activeBodyArea : ""} Workout"
                </p>
              </div>
              {loadingVideos && (
                <span className="text-xs text-slate-405 font-semibold animate-pulse flex items-center gap-1">
                  Fetching latest...
                </span>
              )}
            </div>

            {loadingVideos ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-slate-50 border border-slate-100 rounded-2xl p-3 animate-pulse space-y-3 h-44"
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
                    className="bg-slate-50/50 hover:bg-white border border-slate-150 rounded-2xl p-3 cursor-pointer hover:shadow hover:scale-[1.01] transition-all flex flex-col gap-2 group"
                  >
                    <div className="aspect-video relative rounded-xl overflow-hidden bg-slate-200 shadow-sm">
                      <img
                        src={video.snippet.thumbnails.medium.url}
                        alt={video.snippet.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                        <div className="w-8 h-8 rounded-full bg-white/90 group-hover:bg-red-600 flex items-center justify-center shadow transition-colors text-slate-800 group-hover:text-white">
                          ▶
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <h4 className="text-[11px] font-bold text-slate-850 line-clamp-2 leading-tight group-hover:text-blue-650 transition-colors">
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
          {/* END: YouTube Workout Guides */}
        </div>

        {/* Right Columns Container / Column 4 (3 Cols) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
          {/* Day Streak */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center">
            <div className="w-20 h-20 mb-3 relative hover:scale-105 transition-transform duration-300">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="text-[#1e4a46] transition-all duration-500"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={`${(Object.values(streakDays).filter(Boolean).length / 5) * 100}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-[#1e4a46]">
                {Object.values(streakDays).filter(Boolean).length}
              </div>
            </div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              day streak this week!
            </h3>

            {/* Week Tracker Buttons */}
            <div className="flex gap-2.5 justify-center mt-4 w-full">
              {(Object.keys(streakDays) as Array<keyof typeof streakDays>).map((day) => {
                const isActive = streakDays[day];
                return (
                  <div key={day} className="flex flex-col items-center gap-1 flex-grow">
                    <span className="text-[8px] text-slate-400 font-bold uppercase">
                      {day.substring(0, 1)}
                    </span>
                    <button
                      onClick={() => toggleStreakDay(day)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold border transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#1e4a46] border-[#1e4a46] text-white shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                      }`}
                    >
                      {isActive ? "✓" : "✕"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-50 w-full pt-4 mt-4 text-center">
              <p className="text-xl font-bold text-slate-800 font-mono">{dayStreak}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Longest Streak</p>
              <p className="text-[9px] text-slate-400 leading-normal px-2 mt-2">
                Keep active to retaining your clinical parameters!
              </p>
            </div>
          </div>

          {/* Nutrition History */}
          <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Nutrition History
                </h3>
                <p className="text-[8px] text-slate-400 mt-0.5">Calorie macro logs</p>
              </div>
              <Apple className="w-4 h-4 text-[#1e4a46]" />
            </div>

            {/* Meal logging form */}
            <form
              onSubmit={handleAddMeal}
              className="bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-2"
            >
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={newMealName}
                  onChange={(e) => setNewMealName(e.target.value)}
                  placeholder="Oatmeal..."
                  className="h-7 text-[9px] bg-white rounded-lg text-slate-800"
                  required
                />
                <Input
                  type="number"
                  value={newMealCalories}
                  onChange={(e) => setNewMealCalories(e.target.value)}
                  placeholder="Calories..."
                  className="h-7 text-[9px] bg-white rounded-lg text-slate-800"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-1">
                <Input
                  type="number"
                  value={newMealProtein}
                  onChange={(e) => setNewMealProtein(e.target.value)}
                  placeholder="Pro (g)"
                  className="h-6.5 text-[8px] bg-white rounded-lg text-slate-800"
                />
                <Input
                  type="number"
                  value={newMealCarbs}
                  onChange={(e) => setNewMealCarbs(e.target.value)}
                  placeholder="Carb (g)"
                  className="h-6.5 text-[8px] bg-white rounded-lg text-slate-800"
                />
                <Input
                  type="number"
                  value={newMealFat}
                  onChange={(e) => setNewMealFat(e.target.value)}
                  placeholder="Fat (g)"
                  className="h-6.5 text-[8px] bg-white rounded-lg text-slate-800"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#1e4a46] hover:bg-[#153633] text-white font-bold py-1.5 rounded-lg text-[9px] transition-colors cursor-pointer"
              >
                Log Meal Entry
              </button>
            </form>

            {/* Meal history logs */}
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {nutrition.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[9px] text-slate-500 font-bold">{item.calories} kcal</p>
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
                      className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Chat Assistance */}
          <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              Chatbot Assistant <Sparkles className="w-3 h-3 text-brand-500" />
            </h3>

            <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 h-32 overflow-y-auto space-y-2 text-[10px]">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl leading-normal max-w-[85%] ${
                    msg.sender === "user"
                      ? "bg-brand-500 text-white rounded-br-none ml-auto"
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
                placeholder="Ask about workout..."
                className="h-8.5 text-[9px] rounded-lg bg-slate-50 border-slate-100 text-slate-800"
              />
              <button
                type="submit"
                className="w-8.5 h-8.5 bg-[#1e4a46] hover:bg-[#153633] text-white rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* YouTube Video Player Iframe Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedVideo(null)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full relative z-10 border border-slate-100 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-805 truncate pr-6">
                {selectedVideo.snippet.title}
              </h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-sm font-bold"
              >
                ✕ Close
              </button>
            </div>

            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-100 shadow-md relative bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.id.videoId}?autoplay=1`}
                title={selectedVideo.snippet.title}
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Source: YouTube Data API (v3) · Channel: {selectedVideo.snippet.channelTitle}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
