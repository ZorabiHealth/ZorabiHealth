"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Square,
  Sparkles,
  Brain,
  Timer,
  Compass,
  UserCheck,
  X,
  Volume2,
} from "lucide-react";
import { ImagesScrollingAnimation } from "@/components/images-scrolling-animation";

interface Exercise {
  id: string;
  title: string;
  duration: number; // in minutes
  type: "breathing" | "mindfulness" | "sleep" | "focus";
  color: string;
  description: string;
}

interface YouTubeVideo {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      medium?: { url: string };
      high?: { url: string };
    };
  };
}

const exercises: Exercise[] = [
  {
    id: "journey-1",
    title: "Morning Clarity Focus",
    duration: 15,
    type: "breathing",
    color: "from-[#0f172a] to-[#0891b2]",
    description: "Start your day with focused breathwork to align your intentions.",
  },
  {
    id: "journey-2",
    title: "Deep Relaxation scan",
    duration: 30,
    type: "mindfulness",
    color: "from-blue-600 to-indigo-950",
    description: "A guided body scan to release tension and promote restful sleep.",
  },
  {
    id: "journey-3",
    title: "Focus Reset Breath",
    duration: 10,
    type: "focus",
    color: "from-cyan-500 to-slate-900",
    description: "Quick mindful exercises to regain concentration during your workday.",
  },
];

export default function MeditationPage() {
  // Navigation & Active Session States
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [breathingPhase, setBreathingPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [, setCompletedSessions] = useState(4);
  const [, setCompletedMinutes] = useState(38);

  // Drawer / Booking process
  const [showDrawer, setShowDrawer] = useState(false);

  // Cinematic Video Player Modal (for Abstract Card click)
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoTimeLeft, setVideoTimeLeft] = useState(600); // 10 minutes video

  // Web Audio Synth states
  const [ambientSound, setAmbientSound] = useState<"None" | "Theta" | "Solfeggio" | "Zen">("None");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [ambientVolume, setAmbientVolume] = useState(0.35);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const mainGainRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const lfoRef = useRef<OscillatorNode | null>(null);

  // Video Synth Audio ref
  const videoCtxRef = useRef<AudioContext | null>(null);
  const videoGainRef = useRef<GainNode | null>(null);
  const videoOscRef = useRef<OscillatorNode | null>(null);
  const [barHeights] = React.useState(() =>
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(() => Math.floor(40 + Math.random() * 50))
  );
  const [barDurations] = React.useState(() =>
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(() => 0.6 + Math.random() * 0.4)
  );

  // YouTube video suggestions
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [ytLoading, setYtLoading] = useState(true);

  useEffect(() => {
    const queries = [
      "guided meditation",
      "mindfulness breathing",
      "yoga for anxiety",
      "sleep meditation",
    ];
    Promise.all(
      queries.map((q) =>
        fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`).then((r) => r.json())
      )
    )
      .then((results) => {
        const all = results.flatMap((r) => r.items || []);
        const unique = all.filter(
          (v: YouTubeVideo, i: number, self: YouTubeVideo[]) =>
            self.findIndex((s: YouTubeVideo) => s.id?.videoId === v.id?.videoId) === i
        );
        setYoutubeVideos(unique.slice(0, 12));
      })
      .catch(() => {})
      .finally(() => setYtLoading(false));
  }, []);

  // Sound chimes for breathing phase boundaries
  const playPhaseChime = (freq: number, type: "sine" | "triangle" = "sine", duration = 0.5) => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Web Audio chime failed
    }
  };

  // Ambient synth controllers
  const stopAmbientSynth = useCallback(() => {
    oscillatorsRef.current.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        console.warn("[catch] Non-critical operation failed at page.tsx");
      }
    });
    oscillatorsRef.current = [];

    if (lfoRef.current) {
      try {
        lfoRef.current.stop();
      } catch {
        console.warn("[catch] Non-critical operation failed at page.tsx");
      }
      lfoRef.current = null;
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  }, []);

  const startAmbientSynth = useCallback(
    (soundType: typeof ambientSound) => {
      stopAmbientSynth();
      if (soundType === "None" || typeof window === "undefined") return;

      try {
        const AudioCtx =
          window.AudioContext ||
          (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        const mainGain = ctx.createGain();
        mainGain.gain.setValueAtTime(ambientVolume, ctx.currentTime);
        mainGain.connect(ctx.destination);
        mainGainRef.current = mainGain;

        if (soundType === "Theta") {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const pan1 = ctx.createStereoPanner();
          const pan2 = ctx.createStereoPanner();

          osc1.type = "sine";
          osc1.frequency.setValueAtTime(100, ctx.currentTime);
          pan1.pan.setValueAtTime(-1, ctx.currentTime);

          osc2.type = "sine";
          osc2.frequency.setValueAtTime(106, ctx.currentTime);
          pan2.pan.setValueAtTime(1, ctx.currentTime);

          osc1.connect(pan1).connect(mainGain);
          osc2.connect(pan2).connect(mainGain);

          osc1.start();
          osc2.start();
          oscillatorsRef.current = [osc1, osc2];
        } else if (soundType === "Solfeggio") {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(528, ctx.currentTime);

          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.type = "sine";
          lfo.frequency.setValueAtTime(0.4, ctx.currentTime);
          lfoGain.gain.setValueAtTime(0.15, ctx.currentTime);

          lfo.connect(lfoGain).connect(mainGain.gain);
          osc.connect(mainGain);

          osc.start();
          lfo.start();
          oscillatorsRef.current = [osc];
          lfoRef.current = lfo;
        } else if (soundType === "Zen") {
          const freqs = [110, 220, 330];
          const oscs = freqs.map((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(i === 0 ? 0.4 : i === 1 ? 0.25 : 0.15, ctx.currentTime);
            osc.connect(gain).connect(mainGain);
            osc.start();
            return osc;
          });
          oscillatorsRef.current = oscs;
        }
      } catch {
        // Ambient synthesis failed
      }
    },
    [ambientVolume, stopAmbientSynth]
  );

  // Video Chime controller
  const startVideoSynth = () => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      videoCtxRef.current = ctx;

      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(0.2, ctx.currentTime);
      mainGain.connect(ctx.destination);
      videoGainRef.current = mainGain;

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(528, ctx.currentTime);

      const tremolo = ctx.createOscillator();
      const tremoloGain = ctx.createGain();
      tremolo.type = "sine";
      tremolo.frequency.setValueAtTime(1.0, ctx.currentTime);
      tremoloGain.gain.setValueAtTime(0.1, ctx.currentTime);

      tremolo.connect(tremoloGain).connect(mainGain.gain);
      osc.connect(mainGain);

      osc.start();
      tremolo.start();
      videoOscRef.current = osc;
    } catch {
      // Video audio setup failed
    }
  };

  const stopVideoSynth = () => {
    if (videoOscRef.current) {
      try {
        videoOscRef.current.stop();
      } catch {
        console.warn("[catch] Non-critical operation failed at page.tsx");
      }
      videoOscRef.current = null;
    }
    if (videoCtxRef.current && videoCtxRef.current.state !== "closed") {
      videoCtxRef.current.close();
      videoCtxRef.current = null;
    }
  };

  // Video countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isVideoPlaying && videoTimeLeft > 0) {
      interval = setInterval(() => {
        setVideoTimeLeft((prev) => {
          if (prev <= 1) {
            setIsVideoPlaying(false);
            stopVideoSynth();
            setCompletedSessions((c) => c + 1);
            setCompletedMinutes((m) => m + 10);
            playPhaseChime(880, "sine", 1.0);
            setShowVideoModal(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isVideoPlaying, videoTimeLeft]);

  // Adjust volume main gain
  useEffect(() => {
    if (mainGainRef.current && audioCtxRef.current) {
      mainGainRef.current.gain.setValueAtTime(ambientVolume, audioCtxRef.current.currentTime);
    }
  }, [ambientVolume]);

  // Handle changes in ambient sound dropdown
  useEffect(() => {
    if (isPlaying && activeExercise) {
      startAmbientSynth(ambientSound);
    } else {
      stopAmbientSynth();
    }
    return () => stopAmbientSynth();
  }, [ambientSound, isPlaying, activeExercise, startAmbientSynth, stopAmbientSynth]);

  // Main countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsPlaying(false);
            stopAmbientSynth();
            setCompletedSessions((c) => c + 1);
            if (activeExercise) {
              setCompletedMinutes((m) => m + activeExercise.duration);
            }
            playPhaseChime(880, "sine", 1.0);
            setActiveExercise(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeLeft, activeExercise, stopAmbientSynth]);

  // Breathing Phase cycle
  useEffect(() => {
    let breathingInterval: NodeJS.Timeout;
    if (isPlaying && activeExercise?.type === "breathing") {
      breathingInterval = setInterval(() => {
        setBreathingPhase((prev) => {
          let next: typeof breathingPhase = "inhale";
          if (prev === "inhale") {
            next = "hold";
            playPhaseChime(660, "sine", 0.4);
          } else if (prev === "hold") {
            next = "exhale";
            playPhaseChime(440, "sine", 0.4);
          } else {
            next = "inhale";
            playPhaseChime(520, "triangle", 0.3);
          }
          return next;
        });
      }, 4000);
    }
    return () => clearInterval(breathingInterval);
  }, [isPlaying, activeExercise]);

  // Actions
  const startSession = (ex: Exercise) => {
    setActiveExercise(ex);
    setTimeLeft(ex.duration * 60);
    setIsPlaying(true);
    setBreathingPhase("inhale");
    playPhaseChime(523.25, "sine", 0.8);
  };

  const handleStopSession = () => {
    stopAmbientSynth();
    if (activeExercise && timeLeft < activeExercise.duration * 60 - 30) {
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

  const launchJourney = (ex: Exercise) => {
    startSession(ex);
  };

  return (
    <div className="w-full min-h-full bg-gradient-to-br from-[#eef2f8] via-[#e8eef9] to-[#d4e1f5] text-slate-800 relative font-sans scroll-smooth p-2 md:p-4 pb-16">
      {/* eslint-disable @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@300;400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      {/* eslint-enable @next/next/no-page-custom-font */}

      {/* Absolute top badge - Exact Ditto Copy */}
      <div
        onClick={() => setShowDrawer(true)}
        className="absolute top-8 right-12 z-20 bg-white/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30 flex items-center gap-2 cursor-pointer hover:bg-white/60 transition-all shadow-sm"
      >
        <Image
          src="/logo/image/logo.png"
          alt="ZorabiHealth"
          width={80}
          height={24}
          style={{ height: 24, width: "auto" }}
          priority
        />
      </div>

      {/* Floating Glass Meditation Timer HUD */}
      <AnimatePresence>
        {activeExercise && (
          <>
            {/* Top-center floating timer badge */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-[60]"
            >
              <div className="glass-effect rounded-2xl px-5 py-2.5 flex items-center gap-4 shadow-lg border border-white/40 backdrop-blur-xl">
                {/* Breathing bubble indicator */}
                <div className="relative w-10 h-10 shrink-0">
                  <motion.div
                    animate={
                      activeExercise.type === "breathing" && isPlaying
                        ? {
                            scale:
                              breathingPhase === "inhale"
                                ? 1.3
                                : breathingPhase === "hold"
                                  ? 1.3
                                  : 0.9,
                            opacity: breathingPhase === "hold" ? 0.9 : 0.7,
                          }
                        : isPlaying
                          ? { scale: [1, 1.1, 1], opacity: [0.7, 0.9, 0.7] }
                          : { scale: 1, opacity: 0.6 }
                    }
                    transition={
                      activeExercise.type === "breathing" && isPlaying
                        ? { duration: 4, ease: "easeInOut" }
                        : isPlaying
                          ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
                          : {}
                    }
                    className={`w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20`}
                  >
                    {activeExercise.type === "breathing" && isPlaying ? (
                      <motion.span
                        key={breathingPhase}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[6px] font-black uppercase tracking-widest text-blue-200 text-center leading-tight"
                      >
                        {breathingPhase === "inhale"
                          ? "IN"
                          : breathingPhase === "hold"
                            ? "--"
                            : "OUT"}
                      </motion.span>
                    ) : (
                      <span className="text-[6px] font-black uppercase tracking-widest text-blue-200 text-center leading-tight">
                        {isPlaying ? "FOCUS" : "PAUSED"}
                      </span>
                    )}
                  </motion.div>
                </div>

                {/* Timer */}
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-700 font-mono tabular-nums tracking-tight">
                    {formatTime(timeLeft)}
                  </span>
                  {activeExercise && (
                    <span className="text-[9px] text-slate-400 font-medium">
                      / {activeExercise.duration}:00
                    </span>
                  )}
                </div>

                {/* Play/Pause + Stop */}
                <div className="flex items-center gap-1.5">
                  <motion.button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-700 shadow-sm transition-all cursor-pointer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title={isPlaying ? "Pause" : "Resume"}
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    )}
                  </motion.button>
                  <motion.button
                    onClick={handleStopSession}
                    className="p-1.5 rounded-full bg-white/80 hover:bg-white text-red-500 shadow-sm transition-all cursor-pointer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Stop session"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Floating bottom-right glass controls */}
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              transition={{ type: "spring", damping: 20, stiffness: 200, delay: 0.1 }}
              className="fixed bottom-6 right-6 z-[60]"
            >
              <div className="glass-effect rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg border border-white/40 backdrop-blur-xl">
                {/* Phase text */}
                <div className="flex items-center gap-2">
                  {activeExercise.type === "breathing" && isPlaying ? (
                    <motion.span
                      key={breathingPhase}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] font-bold text-indigo-600 whitespace-nowrap"
                    >
                      {getPhaseText()}
                    </motion.span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                      {isPlaying ? "Focusing..." : "Paused"}
                    </span>
                  )}
                </div>

                <div className="w-px h-6 bg-white/30" />

                {/* Ambient sound pill */}
                <div className="flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  <select
                    value={ambientSound}
                    onChange={(e) => setAmbientSound(e.target.value as typeof ambientSound)}
                    className="bg-white/60 border border-white/40 text-slate-700 rounded-lg text-[9px] font-bold h-7 px-2 outline-none focus:border-indigo-300 cursor-pointer appearance-none"
                  >
                    <option value="None">Mute</option>
                    <option value="Theta">Theta</option>
                    <option value="Solfeggio">528Hz</option>
                    <option value="Zen">Zen</option>
                  </select>
                </div>

                <div className="w-px h-6 bg-white/30" />

                {/* Title */}
                <p className="text-[9px] text-slate-500 max-w-[120px] leading-tight font-medium truncate">
                  {activeExercise.title}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Page Content */}
      <div className="space-y-16">
        <section className="relative h-[90vh] min-h-[600px] rounded-[40px] overflow-hidden shrink-0 mx-2 shadow-xl flex items-center">
          {/* Background Video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-0"
          >
            <source src="/video/yogaasset.mp4" type="video/mp4" />
          </video>
          {/* Dark Overlay to make text readable */}
          <div className="absolute inset-0 bg-black/15 z-0 pointer-events-none"></div>

          <div className="relative z-10 w-full flex flex-col px-16 text-white">
            <p className="text-sm font-bold tracking-widest uppercase mb-4 text-cyan-200">
              Daily Fitness Guide
            </p>
            <h1 className="text-6xl md:text-7xl font-bold leading-tight max-w-3xl mb-8 font-hanken">
              Meditations change your lifestyle
            </h1>
            <a
              className="w-fit bg-white text-[#0f172a] px-8 py-4 rounded-full font-bold flex items-center gap-3 hover:bg-[#c4d4eb] transition-all shadow-lg text-sm"
              href="#start-journey"
            >
              Get in touch
              <svg className="w-4 h-4 ml-1 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>

          {/* Floating review card - Exact Ditto Copy */}
          <div className="absolute bottom-12 right-12 glass-dark p-6 rounded-3xl max-w-xs border border-white/20 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-slate-800 bg-gradient-to-br from-purple-400 to-pink-500"></div>
                <div className="w-8 h-8 rounded-full border-2 border-slate-800 bg-gradient-to-br from-blue-400 to-cyan-500"></div>
                <div className="w-8 h-8 rounded-full border-2 border-slate-800 bg-gradient-to-br from-amber-400 to-orange-500"></div>
              </div>
              <span className="text-[10px] font-bold text-white/90">Plus 2M+ Trusted!</span>
            </div>
            <p className="text-xs text-white/70 mb-4">
              The perfect organizer and developer for dream agency
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">4.9</span>
              {/* Yellow star vector - Exact Ditto */}
              <svg
                className="w-4 h-4 text-yellow-400 fill-current inline-block"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
              </svg>
              <span className="text-[10px] text-white/50 ml-2">( RATING )</span>
            </div>
          </div>
        </section>

        {/* Start Your Journey Today - Exact Ditto Copy */}
        <section id="start-journey" className="px-8 pt-8 space-y-6">
          <div className="mb-10">
            <h2 className="text-4xl font-bold text-slate-800 font-hanken mb-2">
              Start Your Journey Today
            </h2>
            <p className="text-slate-500">
              Explore practices designed to elevate your mind and body.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Morning Clarity */}
            <div
              onClick={() => launchJourney(exercises[0])}
              className="group relative aspect-[3/4] rounded-[32px] overflow-hidden shadow-lg cursor-pointer bg-slate-200"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              >
                <source src="/video/firstbox.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-8 w-full">
                <span className="bg-white/20 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full mb-3 inline-block font-bold">
                  15 MIN
                </span>
                <h3 className="text-2xl font-bold text-white mb-2 font-hanken">Morning Clarity</h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  Start your day with focused breathwork to align your intentions.
                </p>
              </div>
            </div>

            {/* Card 2: Deep Relaxation */}
            <div
              onClick={() => launchJourney(exercises[1])}
              className="group relative aspect-[3/4] rounded-[32px] overflow-hidden shadow-lg cursor-pointer bg-slate-200"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              >
                <source src="/video/secondbox.mp4" type="video/mp4" />
              </video>
              <div className="absolute bottom-0 left-0 p-8 w-full">
                <span className="bg-white/20 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full mb-3 inline-block font-bold">
                  30 MIN
                </span>
                <h3 className="text-2xl font-bold text-white mb-2 font-hanken">Deep Relaxation</h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  A guided body scan to release tension and promote restful sleep.
                </p>
              </div>
            </div>

            {/* Card 3: Focus Reset */}
            <div
              onClick={() => launchJourney(exercises[2])}
              className="group relative aspect-[3/4] rounded-[32px] overflow-hidden shadow-lg cursor-pointer bg-slate-200"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              >
                <source src="/video/thridbox.mp4" type="video/mp4" />
              </video>
              <div className="absolute bottom-0 left-0 p-8 w-full">
                <span className="bg-white/20 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full mb-3 inline-block font-bold">
                  10 MIN
                </span>
                <h3 className="text-2xl font-bold text-white mb-2 font-hanken">Focus Reset</h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  Quick mindful exercises to regain concentration during your workday.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Suggested Practices Section - YouTube Powered */}
        <section className="px-8 space-y-6">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800 font-hanken mb-2">
              Suggested Practices
            </h2>
            <p className="text-slate-500 text-sm">Curated sessions based on your activity.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ytLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={`skel-${i}`} className="glass-effect rounded-2xl p-3 animate-pulse">
                    <div className="aspect-video bg-slate-200 rounded-xl mb-3" />
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-1/2 mb-1" />
                    <div className="h-2 bg-slate-100 rounded w-1/3" />
                  </div>
                ))
              : youtubeVideos.slice(0, 4).map((video: YouTubeVideo) => {
                  const videoId = video.id?.videoId || video.snippet?.title || "";
                  let hash = 0;
                  for (let i = 0; i < videoId.length; i++) {
                    hash = (hash << 5) - hash + videoId.charCodeAt(i);
                    hash |= 0;
                  }
                  const stableDuration = Math.floor(5 + (Math.abs(hash) % 25));
                  return (
                    <div
                      key={videoId}
                      onClick={() => {
                        const vid = video.id?.videoId;
                        if (vid) {
                          setVideoUrl(`https://www.youtube.com/embed/${vid}?autoplay=1&rel=0`);
                          setIsVideoPlaying(true);
                          setShowVideoModal(true);
                        }
                      }}
                      className="glass-effect rounded-2xl p-3 hover:bg-white/60 transition-colors cursor-pointer group"
                    >
                      <div className="aspect-video bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl mb-3 relative overflow-hidden">
                        <Image
                          src={
                            video.snippet?.thumbnails?.medium?.url ||
                            video.snippet?.thumbnails?.high?.url ||
                            ""
                          }
                          alt={video.snippet?.title || ""}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          sizes="100%"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                          {stableDuration}:00
                        </div>
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2 leading-tight">
                        {video.snippet?.title || "Guided Meditation"}
                      </h4>
                      <p className="text-slate-500 text-xs">
                        {video.snippet?.channelTitle || "YouTube"}
                      </p>
                      <p className="text-slate-400 text-[10px]">Guided practice • tap to start</p>
                    </div>
                  );
                })}
          </div>
        </section>
      </div>

      {/* Mindful Thoughts Scrolling Animation Section */}
      <section className="px-8 mt-16 w-full relative">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 font-hanken">Mindful Thoughts</h2>
          <div className="w-12 h-0.5 bg-[#0077b6] mt-2 rounded-full"></div>
        </div>
        <div className="w-full">
          <ImagesScrollingAnimation />
        </div>
      </section>

      {/* Services Section from Medicine Website Replica - Exact Ditto Copy */}
      <section
        style={{ backgroundColor: "#1c1c1c" }}
        className="text-white pt-24 pb-32 px-6 md:px-12 shadow-2xl relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-medium leading-tight max-w-4xl mb-16">
            At ZorabiHealth, we provide AI-guided meditation and breathwork tailored to your unique
            wellness journey.
          </h2>

          {/* Grid matching services ditto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Grid Item 1: Meditating child */}
            <div
              onClick={() =>
                launchJourney({
                  id: "services-child",
                  title: "Childhood Serenity Meditation",
                  duration: 10,
                  type: "breathing",
                  color: "from-[#0891b2] to-indigo-900",
                  description: "Personalized mindfulness breathing for childhood presence focus.",
                })
              }
              className="relative h-[400px] rounded-2xl overflow-hidden group cursor-pointer shadow-lg border border-white/5"
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              >
                <source src="/logo/video/logo_animation.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
            </div>

            {/* Grid Item 2: Abstract texture */}
            <div
              onClick={() => {
                setShowVideoModal(true);
                setIsVideoPlaying(true);
                setVideoTimeLeft(600);
                startVideoSynth();
              }}
              className="relative h-[400px] rounded-2xl overflow-hidden group cursor-pointer shadow-lg border border-white/5"
            >
              <div
                className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: "url(/images/large.jpg)" }}
              ></div>
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>

              {/* Play Button Overlay - Exact Ditto Copy */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="w-16 h-16 rounded-full border-2 border-white/50 backdrop-blur-sm flex items-center justify-center group-hover:border-white transition-colors group-hover:scale-105 transition-all">
                  <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"></path>
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cinematic Video Player Modal overlay */}
      <AnimatePresence>
        {showVideoModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowVideoModal(false);
                setVideoUrl(null);
                setIsVideoPlaying(false);
                stopVideoSynth();
              }}
              className="fixed inset-0 bg-black z-40"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-[#1c1c1c] border border-white/10 rounded-[32px] p-6 md:p-8 z-50 text-white shadow-2xl space-y-6 text-center"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 animate-spin-slow" />{" "}
                  {videoUrl ? "YouTube Meditation" : "Solfeggio Visual Entrainment"}
                </span>
                <button
                  onClick={() => {
                    setShowVideoModal(false);
                    setVideoUrl(null);
                    setIsVideoPlaying(false);
                    stopVideoSynth();
                  }}
                  className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Video Visualizer block */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-white/5 flex items-center justify-center">
                {videoUrl ? (
                  <iframe
                    src={videoUrl}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                ) : isVideoPlaying ? (
                  <div className="flex gap-1.5 items-end justify-center h-24 w-full px-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <motion.span
                        key={num}
                        animate={{
                          height: ["20px", `${barHeights[num - 1]}px`, "20px"],
                        }}
                        transition={{
                          duration: barDurations[num - 1],
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="w-1 bg-[#0077b6] rounded-full"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 flex flex-col items-center gap-2">
                    <Play className="w-10 h-10 text-slate-600 animate-pulse" />
                    <p className="text-xs font-bold uppercase">Video Paused</p>
                  </div>
                )}

                {!videoUrl && (
                  <>
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-xl text-[9px] font-mono tracking-wider font-bold">
                      Solfeggio Waveform: 528Hz
                    </div>
                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-xl text-[10px] font-mono font-bold tracking-tight">
                      {formatTime(videoTimeLeft)}
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-bold">
                  {videoUrl ? "YouTube Meditation" : "Cinematic Theta Guide"}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                  {videoUrl
                    ? "Playing guided meditation video from YouTube."
                    : "A high-fidelity entrainment visualizer aligning breathing rhythms with 528Hz pure audio oscillators."}
                </p>
              </div>

              {!videoUrl && (
                <div className="flex gap-4 justify-center pt-2">
                  <button
                    onClick={() => {
                      setIsVideoPlaying(!isVideoPlaying);
                      if (!isVideoPlaying) {
                        startVideoSynth();
                      } else {
                        stopVideoSynth();
                      }
                    }}
                    className="px-6 py-2.5 bg-white text-slate-900 rounded-full font-bold text-xs hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {isVideoPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    )}
                    {isVideoPlaying ? "Pause Wave" : "Play Wave"}
                  </button>
                  <button
                    onClick={() => {
                      setShowVideoModal(false);
                      setVideoUrl(null);
                      setIsVideoPlaying(false);
                      stopVideoSynth();
                    }}
                    className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-full text-slate-300 font-bold text-xs hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Close Player
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Wellness process drawer */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
              className="fixed inset-0 bg-black z-40"
            />

            <motion.div
              initial={{ translateX: "100%" }}
              animate={{ translateX: 0 }}
              exit={{ translateX: "100%" }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="fixed top-0 right-0 h-full w-[380px] bg-white z-50 shadow-2xl p-6 md:p-8 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                  <h4 className="text-base font-bold text-slate-800 font-hanken">
                    Wellness Process
                  </h4>
                  <button
                    onClick={() => setShowDrawer(false)}
                    className="h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Step 1 */}
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-855 flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5 text-blue-500" /> Vital Tracking
                      </p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        We monitor heart rate variability (HRV) and sleeping respiration metrics
                        daily.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-855 flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5 text-blue-500" /> Sleep Rebalancing
                      </p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Using cycle suggestions, we adjust alarms to sound inside light sleep
                        windows.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0">
                      3
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-855 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-blue-500" /> Audio Entrainment
                      </p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Web-audio binaural beats settle brain activity into 6Hz theta states for
                        relaxation.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0">
                      4
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-855 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-500" /> Clinical Guidance
                      </p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Securely share reports with your primary cardiologist to adjust exercise
                        regimens.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowDrawer(false)}
                className="w-full bg-slate-850 hover:bg-slate-900 text-white font-bold py-3 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
              >
                Close Drawer
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx>{`
        .glass-effect {
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.35);
        }
      `}</style>
    </div>
  );
}
