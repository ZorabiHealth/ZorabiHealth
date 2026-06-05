"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  HeartPulse,
  Plus,
  Play,
  Pause,
  Activity,
  Calendar,
  X,
  AlertCircle,
  ExternalLink,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function DashboardOverview() {
  // 1. Vitals telemetry states
  const [heartRate, setHeartRate] = useState(72);
  const [spO2, setSpO2] = useState(97);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [inputHR, setInputHR] = useState("72");
  const [inputSpO2, setInputSpO2] = useState("97");

  // 2. Music Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(206); // 3m 26s
  const totalDuration = 300; // 5m total

  // 3. News Article details modal state
  const [activeArticle, setActiveArticle] = useState<{ title: string; content: string } | null>(
    null
  );

  // 4. Clinical Valve details alert modal state
  const [isValveDetailOpen, setIsValveDetailOpen] = useState(false);

  // 5. Calendar info state
  const [currentDate, setCurrentDate] = useState({
    day: "24",
    weekday: "Wednesday",
    month: "July",
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
    const d = new Date();
    setCurrentDate({
      day: d.getDate().toString(),
      weekday: days[d.getDay()],
      month: months[d.getMonth()],
    });
  }, []);

  // Music Player interval countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsPlaying(false);
      setTimeLeft(totalDuration);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeLeft]);

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
    setIsVitalsModalOpen(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = ((totalDuration - timeLeft) / totalDuration) * 100;

  return (
    <div
      className="w-full min-h-full bg-[#f0f5ff] flex flex-col animate-slide-up p-6"
      data-purpose="overview-grid"
    >
      {/* 4/3 Grid Core Layout */}
      <div className="grid grid-cols-12 gap-4 flex-grow shrink-0 min-h-full">
        {/* BEGIN: Heart Health Card (Top Left - 9 Cols, 3 Rows) */}
        <section className="col-span-12 lg:col-span-9 bg-gradient-to-br from-[#7dd3fc] via-[#38bdf8] to-[#1d4ed8]/90 rounded-[32px] relative overflow-hidden p-8 flex flex-col justify-between text-white border border-white/20 shadow-md min-h-[350px]">
          {/* Background image overlay with mix blend screen */}
          <div className="absolute inset-0 z-0 select-none pointer-events-none">
            <Image
              alt="Clinical Heart Visualization"
              src="/images/dashbaordheart.png"
              fill
              className="object-cover opacity-60 mix-blend-screen"
              sizes="(max-width: 1024px) 100vw, 800px"
              priority
            />
          </div>

          <header className="relative z-10">
            <h2 className="text-2xl font-bold tracking-tight leading-snug">
              Welcome back, Dr. Jenkins
              <br />
              <span className="text-base font-medium opacity-85">
                Your personalized health summary
              </span>
            </h2>
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
        <section className="col-span-12 lg:col-span-3 bg-gradient-to-br from-[#1e40af] to-[#60a5fa] rounded-[32px] relative overflow-hidden p-6 text-white border border-white/10 shadow-md flex flex-col justify-between min-h-[350px]">
          <div className="flex justify-between items-start">
            <h1 className="text-3xl font-black tracking-tight font-mono">12:45</h1>
            <div className="text-right">
              <p className="text-[10px] opacity-80 font-bold uppercase tracking-wider">
                {currentDate.weekday}
              </p>
              <p className="text-xs font-black">
                {currentDate.day} {currentDate.month}
              </p>
            </div>
          </div>

          <div className="mt-auto space-y-4">
            <div className="bg-white/15 p-3 rounded-2xl flex items-center gap-3 border border-white/20">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform shrink-0 cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>
              <div className="flex-grow min-w-0">
                <p className="text-[10px] font-bold leading-tight truncate">Rustle of petals</p>
                <p className="text-[9px] opacity-70 truncate mt-0.5">Flower meditation</p>
                {/* Progress bar */}
                <div className="w-full bg-white/25 rounded-full h-1 mt-1.5 overflow-hidden">
                  <div
                    className="bg-white h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <span className="text-[9px] opacity-80 font-mono shrink-0">
                -{formatTime(timeLeft)}
              </span>
            </div>
            <div className="flex justify-center gap-1">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
              <div className="w-1.5 h-1.5 bg-white/30 rounded-full" />
            </div>
          </div>
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
              <Image
                alt="Clinical Visualization"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBrhLgiDEyI1UaTgJAFjF3Iyyf80wU3MlQvgyOoccezi8YSUHql5QyLGZZgm5ycFhfPnroM-ndlGD4YCmQ7fsg3nebNQ9PMigW77ZZasPcI060kNgQZbmxuxYVrsJz44YOpqP_lXujKvN1w3V_JI2FLR6StVUJwd64wxUbn32BEpi2z0goBPtcrGFIlLeMWTzN-WyUoLewkR9zOjKZBFxbV09G5iFBI62PmhTC_OkrXi02W7qbEtnfFWIiYA9B2-xPlI4cUeqPcHMk"
                fill
                sizes="(max-width: 768px) 100vw, 300px"
              />
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
        <section className="col-span-12 lg:col-span-3 bg-gradient-to-b from-[#1e3a8a] to-[#3b0764] rounded-[32px] p-6 flex flex-col justify-between text-white relative overflow-hidden shadow-md min-h-[350px]">
          <div className="absolute inset-0 z-0 select-none pointer-events-none">
            <Image
              alt="Clinical Floral Background"
              className="w-full h-full object-cover opacity-50"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFLBhzm-CgR-Ql3tBbf8b3HTOjSMk4AJ_oMii291DUZM7y_eJ5S2-NN2QioGaVQ_d0oAhO_eyZV3Qeai8UOJhQed3imQzBUQjIFZrrHBKTPUFkSpVXrrRr0G8YNH709Bw43-HJv9whVy0IonZXDLprBP4NXgkA60RSDJFqk8hMJMXHvAaFIPhruHX87ogQYrtq8hjAqW0HvpmDPuqj0nGkEF_hix0GsedOI4b55NKAebs3FQ5LRktpvMo1RkHJpCtI3kOy0iv75Q0"
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

          <div className="mt-auto z-10 flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity p-2 rounded-xl bg-white/10 border border-white/10">
            <div className="w-8 h-8 rounded-lg border border-white/30 flex items-center justify-center bg-white/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] font-bold">Download companion app</span>
          </div>
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
