"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Activity,
  HeartPulse,
  CalendarClock,
  FlaskConical,
  Paperclip,
  BrainCircuit,
  Mic,
  Send,
  Sparkles,
  ChevronRight,
  Stethoscope,
} from "lucide-react";

const quickActions = [
  { label: "Vital Signs", icon: HeartPulse },
  { label: "Medications", icon: FlaskConical },
  { label: "Appointments", icon: CalendarClock },
  { label: "Lab Results", icon: Activity },
];

export default function ClinicalAIVoicePage() {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  const orbX = (mousePos.x - 0.5) * 30;
  const orbY = (mousePos.y - 0.5) * 30;
  const glowX = (mousePos.x - 0.5) * 40;
  const glowY = (mousePos.y - 0.5) * 40;

  const particles = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => {
      const seed = i * 17 + 42;
      const rand = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
      };
      return {
        size: rand(seed) * 6 + 2,
        left: rand(seed + 1) * 100,
        top: rand(seed + 2) * 100,
        background:
          i % 3 === 0
            ? "rgba(59, 130, 246, 0.2)"
            : i % 3 === 1
              ? "rgba(34, 211, 238, 0.15)"
              : "rgba(6, 182, 212, 0.15)",
        animationDuration: rand(seed + 3) * 10 + 8,
        animationDelay: rand(seed + 4) * 5,
      };
    });
  }, []);

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-[#f0f7ff] font-sans selection:bg-blue-200/40">
      {/* ===== CLINICAL BLUE GRADIENT BACKGROUND ===== */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, #E8F4FD 0%, transparent 60%), radial-gradient(ellipse at 70% 10%, #DBEAFE 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, #E0F2FE 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, #F0F9FF 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #F8FAFC 0%, #EFF6FF 100%)",
        }}
      />

      {/* Subtle medical cross grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(59,130,246,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.2) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* ===== TOP RIGHT: PROVIDER PORTAL ===== */}
      <div className="absolute top-6 right-6 z-30">
        <button className="group flex items-center gap-2 bg-white/70 backdrop-blur-xl border border-white/60 px-5 py-2.5 rounded-full text-sm font-semibold text-slate-700 shadow-sm hover:shadow-md hover:bg-white/90 transition-all duration-300 cursor-pointer">
          <Stethoscope className="w-4 h-4 text-blue-500" />
          <span>Provider Portal</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* ===== TOP LEFT: BRAND ===== */}
      <div className="absolute top-6 left-6 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Clinical AI
          </span>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pb-8">
        {/* HEADLINE */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center leading-tight max-w-4xl mb-16 mt-20">
          <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
            AI Powers Easy Clinical
          </span>
          <br />
          <span className="bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
            And Voice Access
          </span>
        </h1>

        {/* ===== 3D GLASS ORB ===== */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 mb-16">
          {/* Orb reflection shadow on ground */}
          <div
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-48 h-6 rounded-full blur-2xl"
            style={{
              background:
                "radial-gradient(ellipse, rgba(56, 189, 248, 0.4) 0%, rgba(34, 211, 238, 0.2) 50%, transparent 70%)",
              transform: `translateX(${glowX * 0.5}px) translateY(${glowY * 0.5}px)`,
            }}
          />

          {/* Orb container */}
          <div
            ref={orbRef}
            className="relative w-full h-full"
            style={{
              transform: `translateX(${orbX}px) translateY(${orbY}px)`,
              transition: "transform 0.1s ease-out",
            }}
          >
            {/* Main orb */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `
                  radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.3) 30%, transparent 60%),
                  conic-gradient(from 0deg, #38bdf8, #22d3ee, #2dd4bf, #60a5fa, #3b82f6, #06b6d4, #14b8a6, #818cf8, #38bdf8)
                `,
                borderRadius: "50%",
                boxShadow: `
                  inset -4px -4px 12px rgba(0,0,0,0.08),
                  inset 4px 4px 12px rgba(255,255,255,0.7),
                  0 20px 60px rgba(59, 130, 246, 0.25),
                  0 8px 24px rgba(34, 211, 238, 0.15),
                  0 0 120px rgba(59, 130, 246, 0.1)
                `,
                backdropFilter: "blur(4px)",
              }}
            >
              {/* Inner iridescent swirl layer */}
              <div
                className="absolute inset-2 rounded-full opacity-70 mix-blend-overlay"
                style={{
                  background: `
                    radial-gradient(circle at 60% 40%, rgba(147,197,253,0.4) 0%, transparent 50%),
                    radial-gradient(circle at 20% 70%, rgba(167, 243, 208, 0.4) 0%, transparent 50%),
                    conic-gradient(from 45deg, #38bdf855, #22d3ee55, #2dd4bf55, #60a5fa55, #38bdf855)
                  `,
                  animation: "spin 12s linear infinite",
                }}
              />
            </div>

            {/* Specular highlight top-left */}
            <div
              className="absolute rounded-full bg-white blur-sm"
              style={{
                width: "35%",
                height: "25%",
                top: "10%",
                left: "12%",
                opacity: 0.6,
                transform: "rotate(-30deg)",
              }}
            />

            {/* Specular highlight right */}
            <div
              className="absolute rounded-full bg-white/40 blur-[2px]"
              style={{
                width: "15%",
                height: "8%",
                top: "25%",
                right: "12%",
                opacity: 0.4,
                transform: "rotate(20deg)",
              }}
            />

            {/* Bottom reflection rim */}
            <div
              className="absolute rounded-full"
              style={{
                width: "60%",
                height: "12%",
                bottom: "8%",
                left: "20%",
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                opacity: 0.5,
              }}
            />

            {/* Outer glow */}
            <div
              className="absolute inset-0 rounded-full -z-10"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(59,130,246,0.15) 0%, rgba(34,211,238,0.08) 40%, transparent 70%)",
                transform: "scale(1.15)",
                filter: "blur(20px)",
              }}
            />
          </div>
        </div>

        {/* ===== QUICK ACTION PILLS ===== */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                className="group flex items-center gap-2 bg-white/60 backdrop-blur-xl border border-white/50 px-5 py-2.5 rounded-full text-sm font-medium text-slate-600 shadow-sm hover:shadow-md hover:bg-white/80 hover:text-slate-800 transition-all duration-300 cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-500 transition-colors" />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>

        {/* ===== SEARCH / INPUT BAR ===== */}
        <div className="w-full max-w-2xl">
          <div
            className="flex items-center gap-2 bg-white/70 backdrop-blur-2xl border border-white/60 rounded-2xl px-4 py-3 shadow-lg transition-all duration-300"
            style={{
              boxShadow:
                "0 8px 32px rgba(59, 130, 246, 0.08), 0 0 0 1px rgba(255,255,255,0.5), inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
          >
            {/* Attach */}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-white/60 transition-all cursor-pointer">
              <Paperclip className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Attach</span>
            </button>

            <div className="w-px h-6 bg-slate-200/80" />

            {/* Deep Think */}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all cursor-pointer">
              <BrainCircuit className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Deep Think</span>
            </button>

            <div className="w-px h-6 bg-slate-200/80" />

            {/* Voice */}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-cyan-500 hover:bg-cyan-50/50 transition-all cursor-pointer">
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voice</span>
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Send button */}
            <button className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-sm shadow-blue-200/50 transition-all duration-300 cursor-pointer">
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>

          {/* Helper text */}
          <p className="text-center text-xs text-slate-400 mt-4 font-medium">
            Ask me anything about your health, medications, and clinical records
          </p>
        </div>
      </div>

      {/* ===== AMBIENT FLOATING PARTICLES ===== */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.left}%`,
            top: `${p.top}%`,
            background: p.background,
            animation: `float ${p.animationDuration}s linear infinite`,
            animationDelay: `${p.animationDelay}s`,
          }}
        />
      ))}

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translateY(-30px) translateX(10px);
            opacity: 0.6;
          }
          90% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
