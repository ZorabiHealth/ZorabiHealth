"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  HeartPulse,
  Play,
  Pause,
  Activity,
  Calendar,
  X,
  AlertCircle,
  Sparkles,
  BookOpen,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function DashboardOverview() {
  // Missed Medication Alerts State
  const [session, setSession] = useState<any>(null);
  const [missedMeds, setMissedMeds] = useState<any[]>([]);
  const [loginTime, setLoginTime] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("zh_login_time");
    if (saved) setLoginTime(saved);

    const fetchSessionAndMeds = async () => {
      try {
        const {
          data: { session: s },
        } = await supabase.auth.getSession();
        if (!s) return;
        setSession(s);

        // Fetch medications
        const { data: medications } = await supabase
          .from("medications")
          .select("*")
          .eq("user_id", s.user.id)
          .eq("is_active", true);

        // Fetch today's logs
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { data: logs } = await supabase
          .from("medication_logs")
          .select("*")
          .eq("status", "taken")
          .gte("scheduled_at", todayStart.toISOString());

        // Find missed medications
        const missed: any[] = [];
        const now = new Date();

        (medications || []).forEach((med) => {
          const times = med.scheduled_times || [];
          times.forEach((time: string) => {
            const [hours, minutes] = time.split(":").map(Number);
            const scheduledDate = new Date();
            scheduledDate.setHours(hours, minutes, 0, 0);

            if (now > scheduledDate) {
              // Check if logged as taken for today
              const hasLogged = (logs || []).some(
                (log) =>
                  log.medication_id === med.id &&
                  new Date(log.scheduled_at).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  }) === time
              );

              if (!hasLogged) {
                missed.push({
                  id: med.id,
                  name: med.name,
                  dosage: med.dosage,
                  time,
                  currentStock: med.current_stock,
                });
              }
            }
          });
        });

        setMissedMeds(missed);
      } catch (e) {
        console.error("Failed to load dashboard sync logs:", e);
      }
    };

    fetchSessionAndMeds();
    const interval = setInterval(fetchSessionAndMeds, 10000); // Check every 10s for updates
    return () => clearInterval(interval);
  }, []);

  const handleTakeMissedMed = async (med: any) => {
    if (!session?.user?.id) return;
    const now = new Date();
    const [hours, minutes] = med.time.split(":").map(Number);
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    try {
      const { error: logError } = await supabase.from("medication_logs").insert({
        medication_id: med.id,
        medication_name: med.name,
        scheduled_at: scheduledTime.toISOString(),
        taken_at: now.toISOString(),
        status: "taken",
        dose: med.dosage,
      });

      if (logError) throw logError;

      // Decrement stock
      const newStock = Math.max(0, med.currentStock - 1);
      const { error: stockError } = await supabase
        .from("medications")
        .update({ current_stock: newStock })
        .eq("id", med.id);

      if (stockError) throw stockError;

      // Filter local state
      setMissedMeds((prev) => prev.filter((m) => !(m.id === med.id && m.time === med.time)));

      // Pendo Track: missed_medication_taken
      if (typeof window !== 'undefined' && (window as any).pendo) {
        (window as any).pendo.track('missed_medication_taken', {
          medication_id: med.id,
          medication_name: med.name,
          dosage: med.dosage,
          scheduled_time: med.time,
          current_stock: newStock,
        });
      }

      alert(`Dose logged successfully for ${med.name}!`);
    } catch (e) {
      console.error(e);
      alert("Failed to log dose.");
    }
  };

  // 1. Vitals telemetry states
  const [heartRate, setHeartRate] = useState(72);
  const [spO2, setSpO2] = useState(97);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [inputHR, setInputHR] = useState("72");
  const [inputSpO2, setInputSpO2] = useState("97");

  // 2. Music Player & JioSaavn API states
  const [currentSong, setCurrentSong] = useState<{
    name: string;
    artist: string;
    image: string;
    audioUrl: string;
    duration: number;
  }>({
    name: "Rustle of petals",
    artist: "Flower meditation",
    image: "",
    audioUrl: "",
    duration: 300,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // 3. News Article details modal state
  const [activeArticle, setActiveArticle] = useState<{ title: string; content: string } | null>(
    null
  );

  // 4. Clinical Valve details alert modal state
  const [isValveDetailOpen, setIsValveDetailOpen] = useState(false);

  // 5. Dynamic Time and Calendar state
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState({
    day: "5",
    weekday: "Friday",
    month: "June",
  });

  useEffect(() => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
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

    const updateDateTime = () => {
      const d = new Date();
      setCurrentDate({
        day: d.getDate().toString(),
        weekday: days[d.getDay()],
        month: months[d.getMonth()],
      });

      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const seconds = d.getSeconds().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      setCurrentTime(`${hours.toString().padStart(2, "0")}:${minutes}:${seconds} ${ampm}`);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Client-side HTML5 Audio event listeners
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setAudioCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setAudioDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setAudioCurrentTime(0);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, []);

  // Fetch a default meditation song from JioSaavn on mount
  useEffect(() => {
    fetch("/api/saavn/search?q=meditation")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data?.results?.length > 0) {
          const first = res.data.results[0];
          const name = first.name;
          const artist = first.artists?.primary?.[0]?.name || "JioSaavn";
          const image =
            first.image?.[2]?.url || first.image?.[1]?.url || first.image?.[0]?.url || "";
          const audioUrl =
            first.downloadUrl?.[4]?.url ||
            first.downloadUrl?.[3]?.url ||
            first.downloadUrl?.[2]?.url ||
            "";
          const duration = parseInt(first.duration) || 300;
          setCurrentSong({ name, artist, image, audioUrl, duration });
        }
      })
      .catch((err) => console.error("Error fetching default JioSaavn song:", err));
  }, []);

  // Load and play song stream when audioUrl updates
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentSong.audioUrl && audio.src !== currentSong.audioUrl) {
      audio.src = currentSong.audioUrl;
      audio.load();
      if (isPlaying) {
        audio.play().catch((e) => console.warn("Failed to play audio stream:", e));
      }
    }
  }, [currentSong.audioUrl, isPlaying]);

  // Sync play/pause actions
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      if (audio.src) {
        audio.play().catch((e) => {
          console.warn("Failed to play audio stream:", e);
          setIsPlaying(false);
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // JioSaavn search triggers
  const handleSearchSong = async (query: string) => {
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/saavn/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success && data.data?.results) {
        setSearchResults(data.data.results);
      } else {
        setSearchResults([]);
      }

      // Pendo Track: music_search_executed
      if (typeof window !== 'undefined' && (window as any).pendo) {
        (window as any).pendo.track('music_search_executed', {
          search_query: query.substring(0, 100),
          results_count: data.data?.results?.length || 0,
        });
      }
    } catch (e) {
      console.error("Failed to search song from JioSaavn proxy:", e);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectSong = (song: any) => {
    const name = song.name;
    const artist = song.artists?.primary?.[0]?.name || "JioSaavn";
    const image = song.image?.[2]?.url || song.image?.[1]?.url || song.image?.[0]?.url || "";
    const audioUrl =
      song.downloadUrl?.[4]?.url || song.downloadUrl?.[3]?.url || song.downloadUrl?.[2]?.url || "";
    const duration = parseInt(song.duration) || 300;

    setCurrentSong({ name, artist, image, audioUrl, duration });
    setIsPlaying(true);
    setShowSearch(false);

    // Pendo Track: music_song_selected
    if (typeof window !== 'undefined' && (window as any).pendo) {
      (window as any).pendo.track('music_song_selected', {
        song_name: name.substring(0, 100),
        artist_name: artist.substring(0, 100),
        duration_seconds: duration,
      });
    }
    setSearchResults([]);
    setSearchQuery("");
  };

  // Form Submit Handler
  const handleVitalsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedHR = parseInt(inputHR);
    const parsedSpO2 = parseInt(inputSpO2);

    if (!isNaN(parsedHR) && parsedHR > 30 && parsedHR < 250) {
      setHeartRate(parsedHR);
    }
    if (!isNaN(parsedSpO2) && parsedSpO2 > 50 && parsedSpO2 <= 100) {
      setSpO2(parsedSpO2);
    }

    // Pendo Track: vitals_submitted
    if (typeof window !== 'undefined' && (window as any).pendo) {
      (window as any).pendo.track('vitals_submitted', {
        heart_rate_bpm: parsedHR,
        spo2_percent: parsedSpO2,
      });
    }

    setIsVitalsModalOpen(false);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = audioDuration ? (audioCurrentTime / audioDuration) * 100 : 0;

  return (
    <div
      className="w-full min-h-full bg-[#f0f5ff] flex flex-col animate-slide-up p-6"
      data-purpose="overview-grid"
    >
      {/* Dynamic Missed Medication Sync Alerts */}
      <AnimatePresence>
        {missedMeds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600 animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-950">Missed Medication Reminders</h3>
                <p className="text-xs text-red-700 font-semibold mt-1">
                  You have missed taking the following scheduled doses:
                  <span className="block mt-1 font-bold text-red-800">
                    {missedMeds
                      .map((m) => `${m.name} ${m.dosage} (scheduled at ${m.time})`)
                      .join(", ")}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {missedMeds.map((med, index) => (
                <Button
                  key={index}
                  onClick={() => handleTakeMissedMed(med)}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold px-4 py-2 cursor-pointer shadow-sm"
                >
                  Take {med.name}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4/3 Grid Core Layout */}
      <div className="grid grid-cols-12 gap-4 flex-grow shrink-0 min-h-full">
        {/* BEGIN: Heart Health Card (Top Left - 9 Cols, 3 Rows) */}
        <section className="col-span-12 lg:col-span-9 bg-slate-950 rounded-[32px] relative overflow-hidden p-8 flex flex-col justify-between text-white border border-white/20 shadow-md min-h-[350px]">
          {/* Loop background video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-0 select-none pointer-events-none"
          >
            <source src="/video/in_first_image_you_create_your.mp4" type="video/mp4" />
          </video>

          <header className="relative z-10">
            <h2 className="text-2xl font-bold tracking-tight leading-snug">
              Welcome back, Dr. Jenkins
              <br />
              <span className="text-base font-medium opacity-85">
                Your personalized health summary
              </span>
            </h2>
            {loginTime && (
              <p className="text-[11px] text-white/70 font-semibold mt-2">
                Last login: {new Date(loginTime).toLocaleString()}
              </p>
            )}
          </header>

          <div className="relative z-10 flex flex-col md:flex-row gap-6 mt-4 items-end justify-between">
            {/* Info Box Left */}
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-[24px] max-w-xs border border-white/20 shadow-sm flex flex-col justify-between">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white/90 leading-tight">
                    Sleep Telemetry Alert
                  </p>
                  <div className="flex gap-1 mt-1">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/30 font-bold border border-white/40">
                      Quality
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 font-bold">
                      Time
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] leading-relaxed text-white/80 font-medium">
                A healthy heart is the basis for a long and active life. Log daily indicators to
                maintain records.
              </p>
              <button
                onClick={() => {
                  setInputHR(heartRate.toString());
                  setInputSpO2(spO2.toString());
                  setIsVitalsModalOpen(true);
                }}
                className="mt-4 bg-white/25 hover:bg-white/35 border border-white/40 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                Add info <span className="text-sm font-black">+</span>
              </button>
            </div>

            {/* SpO2 Graph / Telemetry Visuals (Right Side) */}
            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-white/80 font-semibold uppercase tracking-wider">
                  SpO2 Level
                </span>
                <span className="text-2xl font-black">{spO2}%</span>
              </div>

              {/* Animated cardiac wave path */}
              <div className="h-16 w-48 relative">
                <svg
                  className="w-full h-full text-white/60"
                  fill="none"
                  preserveAspectRatio="none"
                  viewBox="0 0 200 60"
                >
                  <motion.path
                    animate={{
                      d: [
                        "M0 40 Q 25 20, 50 40 T 100 40 T 150 40 T 200 40",
                        "M0 40 Q 25 10, 50 40 T 100 40 T 150 20 T 200 40",
                        "M0 40 Q 25 35, 50 40 T 100 40 T 150 45 T 200 40",
                        "M0 40 Q 25 20, 50 40 T 100 40 T 150 40 T 200 40",
                      ],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    d="M0 40 Q 25 20, 50 40 T 100 40 T 150 40 T 200 40"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <circle cx="150" cy="40" fill="white" r="4.5" />
                </svg>
              </div>

              {/* Daily Workout Badge */}
              <div className="bg-white/15 border border-white/20 p-2.5 rounded-2xl flex items-center gap-3 shadow-sm hover:bg-white/20 transition-colors cursor-pointer select-none">
                <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold">Daily Workout</p>
                  <p className="text-[8px] opacity-80 font-medium">45 mins completed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Valve Sticker */}
          <div
            onClick={() => setIsValveDetailOpen(true)}
            className="relative z-10 self-start mt-6 bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-3 rounded-2xl flex flex-col cursor-pointer transition-colors"
          >
            <span className="text-xs font-bold leading-normal">
              The valve is not
              <br />
              working perfectly!
            </span>
            <span className="text-[9px] text-white/70 mt-1 underline">Click to expand details</span>
          </div>
        </section>
        {/* END: Heart Health Card */}

        {/* BEGIN: Time/Music Card (Top Right - 3 Cols, 3 Rows) */}
        <section className="col-span-12 lg:col-span-3 rounded-[32px] relative overflow-hidden p-6 text-white border border-white/10 shadow-md flex flex-col justify-between min-h-[350px]">
          {/* Background Video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-0"
          >
            <source src="/video/try_do.mp4" type="video/mp4" />
          </video>

          {/* Clock & Date Header */}
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black tracking-tight font-mono leading-none drop-shadow-md">
                {currentTime || "12:45:00 PM"}
              </h1>
              <p className="text-[10px] opacity-90 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1.5 drop-shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                {currentDate.weekday}, {currentDate.day} {currentDate.month}
              </p>
            </div>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm"
              title="Search JioSaavn Music"
            >
              {showSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
          </div>

          {showSearch ? (
            <div className="relative z-10 flex-grow flex flex-col mt-4 bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 p-3 overflow-hidden">
              <div className="flex gap-1.5">
                <Input
                  placeholder="Search JioSaavn..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearchSong(searchQuery);
                  }}
                  className="h-8 text-[11px] bg-white/10 border-white/15 text-white placeholder-white/40 focus-visible:ring-white/20 rounded-lg py-1 px-2.5"
                />
                <Button
                  onClick={() => handleSearchSong(searchQuery)}
                  className="h-8 text-xs px-2.5 bg-white text-blue-600 hover:bg-white/90 rounded-lg font-bold cursor-pointer"
                >
                  Go
                </Button>
              </div>

              <div className="flex-grow overflow-y-auto mt-2 space-y-1.5 pr-1 max-h-[140px] custom-scrollbar">
                {isLoading ? (
                  <div className="text-center py-6 text-xs opacity-75 animate-pulse">
                    Searching JioSaavn...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((song: any) => {
                    const songName = song.name;
                    const artistName = song.artists?.primary?.[0]?.name || "JioSaavn";
                    const imgUrl = song.image?.[1]?.url || song.image?.[0]?.url || "";
                    return (
                      <div
                        key={song.id}
                        onClick={() => selectSong(song)}
                        className="flex items-center gap-2.5 p-1.5 hover:bg-white/15 rounded-lg cursor-pointer transition-all border border-transparent hover:border-white/5"
                      >
                        {imgUrl ? (
                          <Image
                            src={imgUrl}
                            alt={songName}
                            width={32}
                            height={32}
                            className="rounded object-cover shadow-sm"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-[10px]">
                            🎵
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold truncate leading-tight">{songName}</p>
                          <p className="text-[9px] opacity-70 truncate leading-none mt-0.5">
                            {artistName}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-xs opacity-50 font-medium">
                    {searchQuery ? "No results found" : "Type above and press Go"}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative z-10 mt-auto space-y-4">
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl flex items-center gap-3.5 border border-white/15 shadow-md">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform shrink-0 cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-4.5 h-4.5 fill-current text-blue-600" />
                  ) : (
                    <Play className="w-4.5 h-4.5 fill-current text-blue-600 ml-0.5" />
                  )}
                </button>
                <div className="flex-grow min-w-0">
                  <p className="text-[11px] font-bold leading-tight truncate">{currentSong.name}</p>
                  <p className="text-[9px] opacity-80 truncate mt-0.5 font-medium">
                    {currentSong.artist}
                  </p>
                  {/* Progress bar */}
                  <div className="w-full bg-white/20 rounded-full h-1 mt-2 overflow-hidden">
                    <div
                      className="bg-white h-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-1">
                  {currentSong.image ? (
                    <Image
                      src={currentSong.image}
                      alt={currentSong.name}
                      width={32}
                      height={32}
                      className="rounded-lg object-cover shadow-sm border border-white/15"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs border border-white/10">
                      🎵
                    </div>
                  )}
                  <span className="text-[8px] opacity-75 font-mono">
                    {formatTime(audioCurrentTime)} /{" "}
                    {formatTime(audioDuration || currentSong.duration)}
                  </span>
                </div>
              </div>
              <div className="flex justify-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                <div className="w-1.5 h-1.5 bg-white/30 rounded-full" />
              </div>
            </div>
          )}
        </section>
        {/* END: Time/Music Card */}

        {/* BEGIN: Clinical Visualization Card (Bottom Left - 5 Cols, 3 Rows) */}
        <section className="col-span-12 lg:col-span-5 bg-white/40 backdrop-blur-xl border border-white/30 rounded-[32px] p-6 flex flex-col justify-between shadow-md min-h-[350px]">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Medical Imagery
            </span>
            <h2 className="text-xl font-bold text-slate-800 leading-snug mt-1">
              Clinical Visualization
            </h2>
          </div>

          <div className="flex gap-3 justify-center py-2">
            <div className="w-full h-32 rounded-2xl overflow-hidden border border-white/30 shadow-md relative group select-none pointer-events-none">
              <div className="w-full h-full bg-gradient-to-br from-brand-400 via-brand-600 to-purple-700 transition-transform duration-700 group-hover:scale-105"></div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-1 justify-center">
              <div className="w-1 h-1 bg-slate-300 rounded-full" />
              <div className="w-1.5 h-1 bg-blue-500 rounded-full" />
              <div className="w-1 h-1 bg-slate-300 rounded-full" />
              <div className="w-1 h-1 bg-slate-300 rounded-full" />
            </div>
            <Link
              href="/dashboard/analytics"
              className="w-full block text-center bg-white/80 border border-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-xs hover:bg-white transition-colors cursor-pointer shadow-sm"
            >
              Explore analysis
            </Link>
          </div>
        </section>
        {/* END: Clinical Visualization Card */}

        {/* BEGIN: Sleep Tracking Card (Bottom Middle - 3 Cols, 3 Rows) */}
        <section className="col-span-12 lg:col-span-3 bg-slate-900 rounded-[32px] p-6 flex flex-col justify-between text-white relative overflow-hidden shadow-md min-h-[350px]">
          <div className="absolute inset-0 z-0 select-none pointer-events-none">
            <Image
              alt="Clinical Floral Background"
              className="w-full h-full object-cover"
              src="/images/pngtree-flowers-pink-flowers-image_13248117.png"
              fill
              sizes="(max-width: 768px) 100vw, 250px"
            />
          </div>

          <div className="flex justify-between items-start z-10">
            <h2 className="text-base font-bold leading-tight">
              Personal sleep
              <br />
              tracking
            </h2>
            <div className="flex gap-1.5">
              <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px]">
                ⌚
              </div>
              <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px]">
                ⏰
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/sleep"
            className="mt-auto z-10 flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity p-2 rounded-xl bg-white/10 border border-white/10"
          >
            <div className="w-8 h-8 rounded-lg border border-white/30 flex items-center justify-center bg-white/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] font-bold">Download companion app</span>
          </Link>
        </section>
        {/* END: Sleep Tracking Card */}

        {/* BEGIN: Medical News Card (Bottom Right - 4 Cols, 3 Rows) */}
        <section className="col-span-12 lg:col-span-4 bg-white/40 backdrop-blur-xl border border-white/30 rounded-[32px] p-6 flex flex-col gap-4 shadow-md min-h-[350px]">
          <header className="flex justify-between items-start">
            <h2 className="text-xl font-bold text-slate-800 leading-tight">
              Medical
              <br />
              News
            </h2>
            <span className="text-[10px] text-brand-600 font-bold px-2 py-0.5 bg-brand-50 border border-brand-100 rounded-full">
              Latest
            </span>
          </header>

          <div className="flex flex-col gap-3 mt-2">
            {/* Article 1 */}
            <div
              onClick={() =>
                setActiveArticle({
                  title: "New AI Diagnostics",
                  content:
                    "Clinical trials published in the Journal of Medicine show a 99% accuracy rate in early diagnostic detections using advanced convolutional networks. Dr. Jenkins comments: 'This signals a paradigm shift in diagnostic telemetry.'",
                })
              }
              className="p-3.5 bg-white/50 rounded-2xl border border-slate-100 hover:bg-white/80 transition-all cursor-pointer shadow-sm hover:shadow"
            >
              <p className="text-xs font-bold text-slate-800">New AI Diagnostics</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                Clinical trials show 99% accuracy in early detection...
              </p>
            </div>

            {/* Article 2 */}
            <div
              onClick={() =>
                setActiveArticle({
                  title: "Heart Health Study",
                  content:
                    "Recent clinical findings suggest that a 15% increase in sleep duration matches better cardiovascular endurance and optimizes heart valve telemetry. Log records daily to assess personal correlation statistics.",
                })
              }
              className="p-3.5 bg-white/50 rounded-2xl border border-slate-100 hover:bg-white/80 transition-all cursor-pointer shadow-sm hover:shadow"
            >
              <p className="text-xs font-bold text-slate-800">Heart Health Study</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                Recent findings on the impact of sleep quality on valve function...
              </p>
            </div>
          </div>
        </section>
        {/* END: Medical News Card */}
      </div>

      {/* ================= MODALS & OVERLAYS ================= */}

      <AnimatePresence>
        {/* 1. Log Vitals Modal Popup */}
        {isVitalsModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl relative"
            >
              <button
                onClick={() => setIsVitalsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <HeartPulse className="w-6 h-6 text-brand-500" />
                <h3 className="text-lg font-bold text-slate-800">Log Daily Telemetry Vitals</h3>
              </div>

              <form onSubmit={handleVitalsSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    Pulse Rate (bpm)
                  </label>
                  <Input
                    type="number"
                    value={inputHR}
                    onChange={(e) => setInputHR(e.target.value)}
                    min="30"
                    max="250"
                    className="h-10 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    Oxygen Saturation SpO2 (%)
                  </label>
                  <Input
                    type="number"
                    value={inputSpO2}
                    onChange={(e) => setInputSpO2(e.target.value)}
                    min="50"
                    max="100"
                    className="h-10 rounded-xl"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#1e4a46] hover:bg-[#153633] text-white font-bold py-2.5 rounded-xl cursor-pointer shadow-md"
                >
                  Confirm Vitals Log Entry
                </Button>
              </form>
            </motion.div>
          </div>
        )}

        {/* 2. News Article Detailed Modal */}
        {activeArticle && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl relative"
            >
              <button
                onClick={() => setActiveArticle(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-brand-500" />
                <h3 className="text-lg font-bold text-slate-800">{activeArticle.title}</h3>
              </div>

              <div className="text-xs leading-relaxed text-slate-600 font-medium">
                {activeArticle.content}
              </div>

              <button
                onClick={() => setActiveArticle(null)}
                className="mt-6 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Article
              </button>
            </motion.div>
          </div>
        )}

        {/* 3. Valve Warning detailed Modal */}
        {isValveDetailOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl relative"
            >
              <button
                onClick={() => setIsValveDetailOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-bold text-slate-800">Heart Valve Telemetry Warning</h3>
              </div>

              <p className="text-xs leading-relaxed text-slate-600 font-medium space-y-2">
                <span>The diagnostic model has flagged an anomalous cardiac rhythm profile:</span>
                <br />
                <br />
                <span className="block p-3 bg-red-50 text-red-700 rounded-xl border border-red-100">
                  <strong>Indicator Warning</strong>: Mitral valve pressure wave fluctuations
                  registered during active workouts.
                </span>
                <br />
                <span>
                  We suggest scheduling a consultation with your cardiologist, Dr. Fleming, and
                  avoiding excessive HIIT lifting routines until cleared.
                </span>
              </p>

              <div className="mt-6 flex gap-3">
                <Link
                  href="/dashboard/analytics"
                  onClick={() => setIsValveDetailOpen(false)}
                  className="flex-1 text-center bg-[#1e4a46] hover:bg-[#153633] text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-md"
                >
                  View Trends
                </Link>
                <button
                  onClick={() => setIsValveDetailOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Acknowledge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
