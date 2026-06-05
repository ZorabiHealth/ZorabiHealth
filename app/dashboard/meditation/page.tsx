"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Square,
  Sparkles,
  Brain,
  Heart,
  Compass,
  Timer,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Exercise {
  id: string;
  title: string;
  duration: number; // in minutes
  type: "breathing" | "mindfulness" | "sleep" | "focus";
  icon: any;
  color: string;
}

const exercises: Exercise[] = [
  {
    id: "1",
    title: "Deep Breathing",
    duration: 5,
    type: "breathing",
    icon: Compass,
    color: "from-sky-400 to-sky-600",
  },
  {
    id: "2",
    title: "Mindful Moment",
    duration: 10,
    type: "mindfulness",
    icon: Brain,
    color: "from-indigo-400 to-indigo-600",
  },
  {
    id: "3",
    title: "Sleep Meditation",
    duration: 15,
    type: "sleep",
    icon: Heart,
    color: "from-brand-500 to-brand-700",
  },
  {
    id: "4",
    title: "Focus Boost",
    duration: 8,
    type: "focus",
    icon: Sparkles,
    color: "from-cyan-400 to-cyan-600",
  },
];

export default function MeditationPage() {
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [breathingPhase, setBreathingPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [completedSessions, setCompletedSessions] = useState(3);
  const [completedMinutes, setCompletedMinutes] = useState(23);

  // Meditation timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsPlaying(false);
            setCompletedSessions((c) => c + 1);
            if (activeExercise) {
              setCompletedMinutes((m) => m + activeExercise.duration);
            }
            setActiveExercise(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeLeft, activeExercise]);

  // Breathing Phase cycle (4 seconds inhale, 4 seconds hold, 4 seconds exhale)
  useEffect(() => {
    let breathingInterval: NodeJS.Timeout;
    if (isPlaying && activeExercise?.type === "breathing") {
      breathingInterval = setInterval(() => {
        setBreathingPhase((prev) => {
          if (prev === "inhale") return "hold";
          if (prev === "hold") return "exhale";
          return "inhale";
        });
      }, 4000);
    }
    return () => clearInterval(breathingInterval);
  }, [isPlaying, activeExercise]);

  const startSession = (ex: Exercise) => {
    setActiveExercise(ex);
    setTimeLeft(ex.duration * 60);
    setIsPlaying(true);
    setBreathingPhase("inhale");
  };

  const handleStopSession = () => {
    if (activeExercise && timeLeft < activeExercise.duration * 60 - 30) {
      // If completed more than 30 seconds, credit minutes
      const minsCompleted = Math.floor((activeExercise.duration * 60 - timeLeft) / 60);
      if (minsCompleted > 0) {
        setCompletedMinutes((m) => m + minsCompleted);
        setCompletedSessions((c) => c + 1);
      }
    }
    setIsPlaying(false);
    setActiveExercise(null);
    setTimeLeft(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getPhaseText = () => {
    if (breathingPhase === "inhale") return "Breathe In...";
    if (breathingPhase === "hold") return "Hold...";
    return "Breathe Out...";
  };

  const activeColor = activeExercise ? activeExercise.color : "from-brand-500 to-brand-600";

  return (
    <div className="p-8 space-y-8 w-full min-h-full bg-[#f0f5ff]">
      {/* Header Banner */}
      <header className="flex justify-between items-center bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Meditation &amp; Mind</h1>
          <p className="text-slate-500 text-sm font-semibold mt-1">
            Practice mindful diagnostics and breathing control sessions.
          </p>
        </div>

        <div className="flex space-x-6 text-center">
          <div>
            <p className="text-2xl font-black text-slate-800">{completedSessions}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Sessions
            </p>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800">{completedMinutes}m</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Total Time
            </p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {!activeExercise ? (
            <motion.div
              key="exercise-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {exercises.map((ex) => {
                const Icon = ex.icon;
                return (
                  <motion.button
                    key={ex.id}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => startSession(ex)}
                    className={`bg-gradient-to-r ${ex.color} text-white p-6 rounded-3xl text-left flex flex-col justify-between h-48 shadow-lg hover:shadow-xl transition-all border-t border-white/20 relative overflow-hidden group cursor-pointer`}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform" />

                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                      <Icon className="h-6 w-6 text-white" />
                    </div>

                    <div>
                      <h3 className="text-lg font-black">{ex.title}</h3>
                      <p className="text-xs opacity-80 mt-1 capitalize">
                        {ex.type} session • {ex.duration} minutes
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="active-session"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-100 rounded-[2.5rem] p-12 shadow-sm text-center max-w-xl mx-auto flex flex-col items-center justify-center min-h-[460px]"
            >
              {/* Animated Circle / Bubble */}
              <div className="relative h-60 w-60 flex items-center justify-center">
                <motion.div
                  animate={
                    activeExercise.type === "breathing" && isPlaying
                      ? {
                          scale:
                            breathingPhase === "inhale"
                              ? 1.3
                              : breathingPhase === "hold"
                                ? 1.3
                                : 1.0,
                          opacity: breathingPhase === "hold" ? 0.95 : 0.8,
                        }
                      : {
                          scale: [1.0, 1.05, 1.0],
                        }
                  }
                  transition={
                    activeExercise.type === "breathing" && isPlaying
                      ? {
                          duration: 4,
                          ease: "easeInOut",
                        }
                      : {
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }
                  }
                  className={`absolute h-44 w-44 rounded-full bg-gradient-to-br ${activeColor} flex items-center justify-center shadow-2xl shadow-brand-500/10`}
                />

                {/* Text Overlay */}
                <div className="relative z-10 text-white flex flex-col items-center select-none">
                  {activeExercise.type === "breathing" && isPlaying ? (
                    <motion.p
                      key={breathingPhase}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm font-bold uppercase tracking-wider opacity-90"
                    >
                      {getPhaseText()}
                    </motion.p>
                  ) : (
                    <p className="text-xs font-bold uppercase tracking-wider opacity-85">
                      {isPlaying ? "Focusing..." : "Paused"}
                    </p>
                  )}
                  <p className="text-3xl font-black font-mono mt-1">{formatTime(timeLeft)}</p>
                </div>
              </div>

              <h2 className="text-2xl font-black text-slate-800 tracking-tight mt-6">
                {activeExercise.title}
              </h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">
                {activeExercise.duration} minute session
              </p>

              {/* Controls */}
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-14 h-14 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-full border border-slate-200 flex items-center justify-center hover:scale-105 transition-transform shadow-sm cursor-pointer"
                  title={isPlaying ? "Pause" : "Resume"}
                >
                  {isPlaying ? (
                    <Pause className="h-5.5 w-5.5 fill-current" />
                  ) : (
                    <Play className="h-5.5 w-5.5 fill-current ml-0.5" />
                  )}
                </button>
                <button
                  onClick={handleStopSession}
                  className="w-14 h-14 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-full border border-rose-100 flex items-center justify-center hover:scale-105 transition-transform shadow-sm cursor-pointer"
                  title="Stop Session"
                >
                  <Square className="h-5 w-5 fill-current" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
