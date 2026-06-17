"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Brain,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  FileCode,
  FileText,
  FlaskConical,
  FolderHeart,
  HeartPulse,
  LayoutDashboard,
  Leaf,
  LineChart,
  Microscope,
  Pill,
  Play,
  Pause,
  Quote,
  Settings,
  Shield,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Star,
  Stethoscope,
  TrendingUp,
  Upload,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { Navbar1 } from "@/components/shadcnblocks-com-navbar1";
import TestimonialSlider from "@/components/testimonial-slider";
import { Footer } from "@/components/ui/footer";
import { Features } from "@/components/features-10";

const demoData = {
  logo: {
    url: "/",
    src: "/logo/image/logo.png",
    alt: "ZorabiHealth",
    title: "ZorabiHealth",
  },
  menu: [
    { title: "Home", url: "/" },
    {
      title: "Products",
      url: "#",
      items: [
        { title: "Products", url: "#", isSection: true },
        {
          title: "AI Voice Assistant",
          description: "Speech-to-text wellness logging powered by Deepgram Nova-3.",
          icon: <Sparkles className="size-5 shrink-0 text-violet-500" />,
          url: "/dashboard/voice",
        },
        {
          title: "Automated Refills",
          description: "Auto-vendor stock routing and real-time shipment dispatch.",
          icon: <Activity className="size-5 shrink-0 text-emerald-500" />,
          url: "/dashboard/pharmacy",
        },
        {
          title: "Push Notification Alerts",
          description: "Real-time push alerts with clinical escalation triggers.",
          icon: <Zap className="size-5 shrink-0 text-amber-500" />,
          url: "/dashboard/medications",
        },
        { title: "Use Cases", url: "#", isSection: true },
        {
          title: "Chronic Care Management",
          description: "End-to-end care coordination across specialties.",
          icon: <HeartPulse className="size-5 shrink-0 text-rose-500" />,
          url: "/use-cases/chronic-care-management",
        },
        {
          title: "Medication Adherence",
          description: "Automated refill routing and compliance tracking.",
          icon: <Pill className="size-5 shrink-0 text-emerald-500" />,
          url: "/use-cases/medication-adherence",
        },
        {
          title: "Remote Patient Monitoring",
          description: "Real-time vitals and clinical telemetry dashboards.",
          icon: <Microscope className="size-5 shrink-0 text-cyan-500" />,
          url: "/use-cases/remote-patient-monitoring",
        },
        {
          title: "Clinical Decision Support",
          description: "AI-driven insights for care teams.",
          icon: <Stethoscope className="size-5 shrink-0 text-blue-500" />,
          url: "/use-cases/clinical-decision-support",
        },
        { title: "Documentation", url: "#", isSection: true },
        {
          title: "API Reference",
          description: "REST and WebSocket endpoints for all platform services.",
          icon: <FileCode className="size-5 shrink-0 text-indigo-500" />,
          url: "/docs/api-reference",
        },
        {
          title: "Integration Guide",
          description: "Connect your EHR, pharmacy, and lab systems.",
          icon: <BookOpen className="size-5 shrink-0 text-sky-500" />,
          url: "/docs/integration-guide",
        },
        {
          title: "SDK Quickstart",
          description: "Client libraries for Python, TypeScript, and Swift.",
          icon: <FlaskConical className="size-5 shrink-0 text-teal-500" />,
          url: "/docs/sdk-quickstart",
        },
        {
          title: "Compliance & Security",
          description: "HIPAA, SOC 2, and data residency documentation.",
          icon: <Shield className="size-5 shrink-0 text-slate-500" />,
          url: "/docs/compliance-security",
        },
      ],
    },
    {
      title: "Resources",
      url: "#",
      items: [
        {
          title: "Patient Portal",
          description: "Access your clinical indicators and telemetry logs.",
          icon: <LayoutDashboard className="size-5 shrink-0 text-blue-500" />,
          url: "/dashboard",
        },
        {
          title: "Documentation",
          description: "Guides, tutorials, and platform reference.",
          icon: <FileText className="size-5 shrink-0 text-slate-500" />,
          url: "/docs",
        },
        {
          title: "API Reference",
          description: "Full API specification with interactive playground.",
          icon: <FileCode className="size-5 shrink-0 text-indigo-500" />,
          url: "/docs/api-reference",
        },
        {
          title: "Help Center",
          description: "FAQs, troubleshooting, and community forums.",
          icon: <Users className="size-5 shrink-0 text-amber-500" />,
          url: "/resources/help-center",
        },
        {
          title: "Clinical Verification",
          description: "Read about our compliance standards and HIPAA privacy alignment.",
          icon: <Shield className="size-5 shrink-0 text-emerald-500" />,
          url: "/resources/clinical-verification",
        },
      ],
    },
    { title: "Pricing", url: "/pricing" },
  ],
  mobileExtraLinks: [
    { name: "Clinical Safety", url: "/resources/clinical-verification" },
    { name: "Help & Support", url: "/resources/help-center" },
    { name: "API Docs", url: "/docs/api-reference" },
    { name: "Status", url: "#" },
  ],
  auth: {
    login: { text: "Log in", url: "/login" },
    signup: { text: "Sign up", url: "/signup" },
  },
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("overview");

  // Interactive mock states
  const [analyticsMetric, setAnalyticsMetric] = useState("heartRate");
  const [analyticsRange, setAnalyticsRange] = useState("7D");

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomSeverity, setSymptomSeverity] = useState("Mild");
  const [symptomLogs, setSymptomLogs] = useState([
    { date: "Yesterday", detail: "Fatigue, Headache (Mild)", severity: "Mild" },
    { date: "June 4", detail: "Insomnia (Moderate)", severity: "Moderate" },
  ]);

  const [isPlayingMeditation, setIsPlayingMeditation] = useState(false);
  const [activeMeditationTrack, setActiveMeditationTrack] = useState("forest");

  const [settingsSMS, setSettingsSMS] = useState(true);
  const [settingsEscalation, setSettingsEscalation] = useState(true);
  const [settingsHIPAA, setSettingsHIPAA] = useState(true);
  const [settingsDeepgram, setSettingsDeepgram] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll(
      ".animate-on-scroll, .animate-on-scroll-left, .animate-on-scroll-right, .animate-on-scroll-zoom"
    );
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <main className="main-container w-full min-h-screen bg-white">
      {/* BEGIN: TopNavigation */}
      <Navbar1 {...demoData} />
      {/* END: TopNavigation */}

      {/* BEGIN: HeroSection */}
      <section className="grid grid-cols-12 gap-8 px-10 pt-24 pb-20 items-center min-h-[calc(100vh-8rem)] relative bg-white overflow-hidden">
        {/* Left Column: Copy */}
        <div className="col-span-5 animate-on-scroll-left" data-purpose="hero-copy">
          <div className="flex flex-col gap-4 mb-6">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-24 h-24 rounded-2xl object-cover shadow-lg border border-brand-100"
            >
              <source src="/logo/video/logo_animation.mp4" type="video/mp4" />
            </video>
            <span className="text-sm font-semibold text-brand-600 uppercase tracking-wider">
              Your Personal Health Companion
            </span>
          </div>
          <h1 className="text-5xl font-bold leading-[1.1] mb-8 text-slate-900">
            Your{" "}
            <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
              Health
            </span>{" "}
            Simplified, Your{" "}
            <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
              Wellness
            </span>{" "}
            Amplified
          </h1>
          <ul className="space-y-4 mb-10">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full border border-brand-200 flex items-center justify-center text-brand-600 text-xs bg-brand-50">
                ✓
              </span>
              <span className="text-slate-600 font-medium">
                AI voice assistant for instant symptom logging
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full border border-brand-200 flex items-center justify-center text-brand-600 text-xs bg-brand-50">
                ✓
              </span>
              <span className="text-slate-600 font-medium">
                Automated pharmacy refill stock matching
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full border border-brand-200 flex items-center justify-center text-brand-600 text-xs bg-brand-50">
                ✓
              </span>
              <span className="text-slate-600 font-medium">
                Push notification alerts & emergency escalation rules
              </span>
            </li>
          </ul>
          <Link
            href="/signup"
            className="bg-brand-500 hover:bg-brand-600 text-white font-medium py-4 px-10 rounded-2xl w-full max-w-sm transition-colors shadow-lg shadow-brand-200 cursor-pointer block text-center"
          >
            Enter Patient Portal
          </Link>
        </div>

        {/* Right Column: Visual Component */}
        <div
          className="col-span-7 relative h-full min-h-[600px] animate-on-scroll-right"
          data-purpose="hero-visual"
        >
          <div className="hero-right-bg absolute inset-0 w-full h-full flex items-center justify-center">
            <Image
              alt="Doctor"
              className="absolute inset-0 w-full h-full object-cover object-top opacity-90 mix-blend-multiply"
              src="/images/doctor_hero.png"
              fill
              priority
              sizes="(max-width: 1200px) 50vw, 700px"
            />
            {/* Floating UI Elements */}
            <div className="content-overlay w-full h-full flex flex-col items-center justify-center relative">
              {/* Top Right Product Tag */}
              <div className="absolute top-8 right-8">
                <button className="bg-white px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 shadow-sm text-gray-700 cursor-pointer">
                  ZorabiHealth <span className="text-[10px]">▼</span>
                </button>
              </div>
              {/* Research Card Top Left */}
              <div className="absolute top-4 left-4 bg-white p-2 rounded-[1.5rem] shadow-xl flex items-center gap-4 w-64 h-24">
                <div className="ml-4 flex-1">
                  <div className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-[10px] mb-1 text-gray-500">
                    ↗
                  </div>
                  <p className="text-sm font-bold leading-tight text-slate-800">
                    Research &amp; Guidance
                  </p>
                </div>
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative">
                  <video autoPlay muted loop playsInline className="w-full h-full object-cover">
                    <source src="/logo/video/logo_animation.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
              {/* Logo Animation Badge */}
              <div className="absolute bottom-24 left-6 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg p-4 flex items-center gap-4 border border-white/50">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-16 h-16 rounded-xl object-cover"
                >
                  <source src="/logo/video/logo_animation.mp4" type="video/mp4" />
                </video>
                <div>
                  <p className="text-sm font-bold text-slate-800">ZorabiHealth</p>
                  <p className="text-xs text-slate-500">AI-Powered Care</p>
                </div>
              </div>
              {/* Bottom Tabs */}
              <div className="absolute bottom-8 flex gap-3">
                <div className="bg-white px-4 py-1.5 rounded-full text-[10px] text-slate-800 font-semibold border border-white shadow-sm">
                  Clinical Voice
                </div>
                <div className="bg-white px-4 py-1.5 rounded-full text-[10px] text-slate-800 font-semibold border border-white shadow-sm">
                  Auto-Refills
                </div>
                <div className="bg-white px-4 py-1.5 rounded-full text-[10px] text-slate-800 font-semibold border border-white shadow-sm">
                  Push Alerts
                </div>
                <div className="bg-white px-4 py-1.5 rounded-full text-[10px] text-slate-800 font-semibold border border-white shadow-sm">
                  Vital Indicators
                </div>
              </div>
              {/* Cut-out center Arrow tab */}
              <div className="cut-out-tab flex items-center justify-center shadow-[-5px_0_15px_rgba(0,0,0,0.03)]">
                <span className="text-gray-400">❯</span>
              </div>
            </div>
          </div>
        </div>
        {/* Scroll to explore indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center text-slate-400 animate-bounce">
          <span className="text-[10px] uppercase tracking-widest font-semibold mb-1">
            Scroll to explore
          </span>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </div>
      </section>
      {/* END: HeroSection */}

      {/* BEGIN: Dashboard Scroll Experience */}
      <section className="px-10 py-16 bg-slate-50 border-t border-slate-100">
        <div className="w-full max-w-7xl mx-auto flex gap-6">
          {/* Data Integration Card */}
          <div
            className="bg-brand-50 rounded-3xl p-8 w-1/2 flex flex-col justify-between relative overflow-hidden h-64 shadow-sm hover:shadow-md transition-shadow animate-on-scroll"
            data-purpose="feature-card-1"
          >
            <div>
              <h3 className="text-brand-900 font-bold mb-3 text-lg">AI Voice Logs</h3>
              <p className="text-brand-700/80 text-sm leading-relaxed font-medium">
                Log your health indicators naturally. Speak to the Deepgram assistant to parse
                symptom updates and automatically record telemetry.
              </p>
            </div>
            <div className="flex justify-between items-end mt-4">
              <div className="w-12 h-12 bg-white/90 rounded-xl flex items-center justify-center text-brand-50 text-2xl shadow-sm">
                🎙️
              </div>
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-brand-400 shadow-sm text-lg hover:bg-brand-100 cursor-pointer transition-colors">
                →
              </div>
            </div>
          </div>
          {/* Get Predictions Card */}
          <div
            className="bg-brand-300 rounded-3xl p-8 w-1/2 flex flex-col justify-between relative overflow-hidden h-64 text-slate-800 shadow-sm hover:shadow-md transition-shadow animate-on-scroll"
            data-purpose="feature-card-2"
          >
            <div>
              <h3 className="font-bold mb-3 text-lg text-slate-900">Automated Refills</h3>
              <p className="text-slate-800/90 text-sm leading-relaxed mb-4 font-medium">
                Automatically verify pharmacy stocks, coordinate delivery locations, and get push
                alerts to ensure you never miss a dose.
              </p>
              <Link
                className="text-sm text-slate-900 font-bold hover:text-slate-700 transition-colors flex items-center gap-1"
                href="/dashboard"
              >
                Learn more <span className="text-xs">↗</span>
              </Link>
            </div>
            <div className="absolute bottom-6 right-6 w-20 h-20 bg-white/90 rounded-full flex items-center justify-center">
              {/* Spinning progress animation */}
              <svg className="w-16 h-16 text-brand-500 animate-spin-slow" viewBox="0 0 36 36">
                <path
                  className="fill-none text-brand-100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  stroke="currentColor"
                  strokeDasharray="100, 100"
                  strokeWidth="4"
                />
                <path
                  className="fill-none text-brand-500"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  stroke="currentColor"
                  strokeDasharray="75, 100"
                  strokeWidth="4"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>
      {/* END: Dashboard Scroll Experience */}

      {/* BEGIN: Integrated Health Dashboard */}
      <section className="px-10 py-16 bg-slate-50 animate-on-scroll">
        <div
          className="w-full max-w-7xl mx-auto bg-[#f0f5ff] rounded-[40px] shadow-lg border border-slate-100 overflow-hidden flex p-4 gap-4 h-[760px]"
          data-purpose="dashboard-layout"
        >
          {/* BEGIN: Left Sidebar */}
          <aside
            className="w-16 flex flex-col items-center py-6 gap-8 bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/30 shrink-0"
            data-purpose="sidebar"
          >
            {/* Logo */}
            <div className="mb-8">
              <svg
                className="w-8 h-8 text-brand-500"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
              </svg>
            </div>
            {/* Navigation Icons */}
            <nav className="flex flex-col gap-5 items-center flex-grow text-slate-400">
              <button
                onClick={() => setActiveTab("overview")}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === "overview"
                    ? "bg-brand-100 text-brand-600 shadow-sm"
                    : "hover:text-brand-500 hover:bg-slate-100 text-slate-400"
                }`}
                title="Overview"
              >
                <LayoutDashboard className="w-5 h-5" />
              </button>

              <button
                onClick={() => setActiveTab("analytics")}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === "analytics"
                    ? "bg-brand-100 text-brand-600 shadow-sm"
                    : "hover:text-brand-500 hover:bg-slate-100 text-slate-400"
                }`}
                title="Analytics & Trends"
              >
                <LineChart className="w-5 h-5" />
              </button>

              <button
                onClick={() => setActiveTab("vitals")}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === "vitals"
                    ? "bg-brand-100 text-brand-600 shadow-sm"
                    : "hover:text-brand-500 hover:bg-slate-100 text-slate-400"
                }`}
                title="Symptom Tracker"
              >
                <Activity className="w-5 h-5" />
              </button>

              <button
                onClick={() => setActiveTab("meditation")}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === "meditation"
                    ? "bg-brand-100 text-brand-600 shadow-sm"
                    : "hover:text-brand-500 hover:bg-slate-100 text-slate-400"
                }`}
                title="Meditation & Mind"
              >
                <Leaf className="w-5 h-5" />
              </button>

              <button
                onClick={() => setActiveTab("workout")}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === "workout"
                    ? "bg-brand-100 text-brand-600 shadow-sm"
                    : "hover:text-brand-500 hover:bg-slate-100 text-slate-400"
                }`}
                title="Workout & Fitness"
              >
                <Dumbbell className="w-5 h-5" />
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === "settings"
                    ? "bg-brand-100 text-brand-600 shadow-sm"
                    : "hover:text-brand-500 hover:bg-slate-100 text-slate-400"
                }`}
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </nav>
            {/* Bottom Profile */}
            <div className="mt-auto flex flex-col items-center gap-6">
              <svg
                className="w-5 h-5 text-slate-400 hover:text-brand-500 transition-colors"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-slate-200 relative">
                <Image
                  alt="User avatar"
                  className="object-cover"
                  src="/images/user.jpg"
                  fill
                  sizes="40px"
                />
              </div>
            </div>
          </aside>
          {/* END: Left Sidebar */}

          {/* BEGIN: Dashboard Content Area */}
          <div
            className="flex-grow flex flex-col overflow-y-auto pb-4 pr-2 space-y-12 h-[680px] max-h-[680px]"
            data-purpose="content-area"
          >
            {activeTab === "overview" && (
              <div
                className="grid grid-cols-12 grid-rows-6 gap-6 shrink-0 min-h-full"
                data-purpose="main-grid"
              >
                {/* BEGIN: Heart Health Card (Top Left) */}
                <section
                  className="col-span-9 row-span-3 bg-brand-50 rounded-[32px] relative overflow-hidden p-8 flex flex-col justify-between"
                  data-purpose="heart-health-summary"
                >
                  <header className="relative z-10">
                    <h2 className="text-2xl font-bold tracking-tight text-brand-900">
                      Heart health
                      <br />
                      overview
                    </h2>
                  </header>
                  <div className="relative z-10 flex gap-12 mt-4">
                    {/* Info Box Left */}
                    <div className="bg-white p-6 rounded-[24px] max-w-xs border border-white shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-brand-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            Not enough information about sleep
                          </p>
                          <div className="flex gap-1 mt-1">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-200 text-brand-800 font-bold">
                              Quality
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                              Time
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
                        The secret to a healthy heart
                        <br />A healthy heart is the basis for a long and active life. Here are some
                        key secrets that help maintain a healthy heart.
                      </p>
                      <Link
                        href="/login"
                        className="mt-4 bg-brand-100 px-4 py-2 rounded-xl text-xs font-bold text-brand-700 flex items-center gap-2 hover:bg-brand-200 transition-colors cursor-pointer"
                      >
                        Add info <span className="text-lg leading-none">+</span>
                      </Link>
                    </div>
                    {/* SpO2 Graph (Right Side) */}
                    <div className="flex flex-col justify-center gap-4 flex-grow relative">
                      {/* Centered heart image */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none mix-blend-multiply">
                        <Image
                          alt="Heart"
                          src="/images/doctor_hero.png"
                          fill
                          className="object-contain filter grayscale contrast-125"
                          style={{ clipPath: "circle(40% at center)" }}
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </div>
                      <div className="flex items-baseline gap-2 z-10 self-end">
                        <span className="text-xs text-brand-600 font-bold">SpO2</span>
                        <span className="text-xl font-black text-brand-900">97%</span>
                      </div>
                      <div className="h-16 w-48 relative z-10 self-end">
                        {/* Sine wave svg path */}
                        <svg
                          className="w-full h-full text-brand-400"
                          fill="none"
                          preserveAspectRatio="none"
                          viewBox="0 0 200 60"
                        >
                          <path
                            d="M0 40 Q 25 20, 50 40 T 100 40 T 150 40 T 200 40"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <circle
                            cx="150"
                            cy="40"
                            fill="white"
                            r="4"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </section>
                {/* END: Heart Health Card */}

                {/* BEGIN: Time/Music Card (Top Right) */}
                <section
                  className="col-span-3 row-span-3 bg-brand-600 rounded-[32px] overflow-hidden relative shadow-md"
                  data-purpose="time-music-widget"
                >
                  <div className="absolute inset-0 flex flex-col p-6 text-white bg-gradient-to-br from-brand-500 to-brand-800">
                    <div className="flex justify-between items-start">
                      <h1 className="text-3xl font-bold tracking-tight">12:45</h1>
                      <div className="text-right">
                        <p className="text-[10px] opacity-90 font-medium">Wednesday</p>
                        <p className="text-[10px] font-bold">24 July</p>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <div className="bg-white/30 p-3 rounded-2xl flex items-center gap-3 border border-white/20">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                          <div className="w-6 h-6 bg-white/40 rounded-full blur-[2px]"></div>
                        </div>
                        <div className="flex-grow">
                          <p className="text-[10px] font-bold leading-tight">Rustle of petals</p>
                          <p className="text-[10px] opacity-80">Flower meditation</p>
                        </div>
                        <div className="text-[10px] font-semibold flex items-center gap-2">
                          -3:26
                          <div className="w-6 h-6 rounded-full border border-white flex items-center justify-center hover:bg-white/20 cursor-pointer transition-colors">
                            <div className="w-0 h-0 border-t-[3px] border-t-transparent border-l-[6px] border-l-white border-b-[3px] border-b-transparent ml-0.5"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center gap-1 mt-4">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        <div className="w-1.5 h-1.5 bg-white/30 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </section>
                {/* END: Time/Music Card */}

                {/* BEGIN: Doctor Selection Card (Bottom Left) */}
                <section
                  className="col-span-5 row-span-3 bg-white border border-slate-100 shadow-sm rounded-[32px] p-6 flex flex-col justify-between"
                  data-purpose="doctor-selection"
                >
                  <h2 className="text-2xl font-bold text-slate-800 leading-tight">
                    Choose your
                    <br />
                    personal doctor
                  </h2>
                  <div className="flex gap-3 justify-center py-4 relative animate-on-scroll-zoom">
                    {/* Doctor Placeholders */}
                    <div className="w-14 h-18 rounded-2xl bg-slate-200 overflow-hidden opacity-40 relative">
                      <Image
                        className="object-cover"
                        src="/images/doctor1.jpg"
                        fill
                        sizes="56px"
                        alt="Doctor"
                      />
                    </div>
                    <div className="w-14 h-18 rounded-2xl bg-slate-200 overflow-hidden ring-4 ring-brand-100 opacity-80 relative">
                      <Image
                        className="object-cover"
                        src="/images/doctor2.jpg"
                        fill
                        sizes="56px"
                        alt="Doctor"
                      />
                    </div>
                    <div className="w-14 h-18 rounded-2xl bg-slate-200 overflow-hidden shadow-lg transform scale-110 z-10 ring-2 ring-brand-400 relative">
                      <Image
                        className="object-cover"
                        src="/images/doctor3.jpg"
                        fill
                        sizes="56px"
                        alt="Doctor"
                      />
                    </div>
                    <div className="w-14 h-18 rounded-2xl bg-slate-200 overflow-hidden opacity-80 relative">
                      <Image
                        className="object-cover"
                        src="/images/doctor4.jpg"
                        fill
                        sizes="56px"
                        alt="Doctor"
                      />
                    </div>
                    <div className="w-14 h-18 rounded-2xl bg-slate-200 overflow-hidden opacity-40 relative">
                      <Image
                        className="object-cover"
                        src="/images/doctor1.jpg"
                        fill
                        sizes="56px"
                        alt="Doctor"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-1">
                      <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                      <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                      <div className="w-1.5 h-1 bg-brand-500 rounded-full"></div>
                      <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                    </div>
                    <Link
                      href="/login"
                      className="w-full bg-slate-50 text-slate-700 font-bold py-3 rounded-2xl text-xs hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer block text-center"
                    >
                      See everyone
                    </Link>
                  </div>
                </section>
                {/* END: Doctor Selection Card */}

                {/* BEGIN: Sleep Tracking Card (Bottom Middle) */}
                <section
                  className="col-span-3 row-span-3 bg-brand-900 rounded-[32px] p-6 flex flex-col justify-between text-white relative shadow-md overflow-hidden"
                  data-purpose="sleep-tracking"
                >
                  {/* Subtle pattern overlay */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent pointer-events-none"></div>
                  <div className="flex justify-between items-start z-10">
                    <h2 className="text-lg font-bold leading-tight">
                      Personal sleep
                      <br />
                      tracking
                    </h2>
                    <div className="flex gap-1.5">
                      <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center text-[8px]">
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.97 12.01 4.72 9.03c.87-1.47 2.38-2.4 4.01-2.43 1.24-.02 2.41.83 3.17.83.76 0 2.18-1.01 3.69-.86 1.15.05 3.01.5 4.14 2.22-.09.06-1.92 1.12-1.9 3.31.02 2.62 2.28 3.49 2.31 3.5-.02.05-.36 1.24-1.24 2.51M14.94 5.3c-.66.81-1.77 1.4-2.8 1.32-.15-1.19.46-2.33 1.09-3.08.64-.77 1.83-1.4 2.76-1.32.14 1.23-.39 2.27-1.05 3.08Z" />
                        </svg>
                      </div>
                      <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center text-[8px]">
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 14L11 13V7h1.5v5.25l4.5 2.67-.5.08z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/sleep"
                    className="mt-auto z-10 flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <div className="w-8 h-8 rounded-lg border border-white/30 flex items-center justify-center bg-white/10">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold">View details</span>
                  </Link>
                </section>
                {/* END: Sleep Tracking Card */}

                {/* BEGIN: Recovery Goal Card (Bottom Right) */}
                <section
                  className="col-span-4 row-span-3 bg-white border border-slate-100 shadow-sm rounded-[32px] p-6 flex flex-col gap-4 animate-on-scroll-zoom"
                  data-purpose="recovery-goal"
                >
                  <header className="flex justify-between items-start">
                    <h2 className="text-xl font-bold text-slate-800 leading-tight">
                      Recovery
                      <br />
                      goal
                    </h2>
                    <div className="bg-brand-50 px-3 py-1 rounded-full flex items-center gap-2 text-brand-600 text-[10px] font-bold border border-brand-100 cursor-pointer hover:bg-brand-100 transition-colors">
                      Month
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        viewBox="0 0 24 24"
                      >
                        <path d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </header>
                  <div className="flex-grow flex items-center justify-center relative">
                    {/* Circular Progress */}
                    <div className="w-36 h-36 rounded-full border-[12px] border-brand-50 flex items-center justify-center relative">
                      {/* Simulated Progress Arc */}
                      <svg className="absolute w-40 h-40 -rotate-90">
                        <circle
                          cx="80"
                          cy="80"
                          fill="none"
                          r="72"
                          stroke="#38bdf8"
                          strokeDasharray="350 1000"
                          strokeLinecap="round"
                          strokeWidth="12"
                        />
                      </svg>
                      <div className="text-center z-10">
                        <p className="text-[10px] text-slate-500 font-semibold">
                          Get better
                          <br />
                          by <span className="text-brand-600 font-black">+126%</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
                {/* END: Recovery Goal Card */}
              </div>
            )}

            {activeTab === "workout" && (
              <div
                className="font-sans bg-white/60 rounded-[40px] shadow-lg p-8 flex flex-col gap-8 shrink-0 relative"
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
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-300 to-cyan-100 shadow-inner flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-1 bg-white/40 rounded-full blur-sm" />
                    </div>
                    <div className="h-12 w-px bg-slate-200" />
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-xl font-semibold text-slate-800 shadow-sm">
                        19
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Tue,</p>
                        <p className="text-sm text-slate-800 font-semibold">December</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <button className="bg-[#1e4a46] hover:bg-[#153633] text-white px-6 py-3 rounded-full text-sm font-medium transition-colors cursor-pointer">
                        Show my Task
                      </button>
                      <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-600 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-4 gap-8">
                  {/* Column 1 */}
                  <div className="flex flex-col gap-6">
                    {/* Suggest Workout */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-3">Suggest Workout</h3>
                      <div className="bg-[#1e4a46] rounded-2xl p-4 text-white relative overflow-hidden h-28 flex flex-col justify-center cursor-pointer hover:shadow-md transition-shadow">
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
                        <span className="text-xs text-[#1e4a46] font-semibold hover:underline cursor-pointer">
                          See All
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="cursor-pointer group">
                          <div className="bg-slate-50 rounded-xl aspect-[3/4] flex items-center justify-center p-2 mb-1 group-hover:bg-slate-100 transition-colors">
                            <div className="w-6 h-12 bg-slate-200 rounded-full" />
                          </div>
                          <span className="text-[9px] text-slate-500 font-medium">Lower Leg</span>
                        </div>
                        <div className="cursor-pointer group">
                          <div className="bg-slate-50 rounded-xl aspect-[3/4] flex items-center justify-center p-2 mb-1 group-hover:bg-slate-100 transition-colors">
                            <div className="w-8 h-12 bg-slate-200 rounded-t-full" />
                          </div>
                          <span className="text-[9px] text-slate-500 font-medium">Upper Leg</span>
                        </div>
                        <div className="cursor-pointer group">
                          <div className="bg-slate-50 rounded-xl aspect-[3/4] flex items-center justify-center p-2 mb-1 group-hover:bg-slate-100 transition-colors">
                            <div className="w-10 h-10 bg-slate-200 rounded-full" />
                          </div>
                          <span className="text-[9px] text-slate-500 font-medium">Chest</span>
                        </div>
                        <div className="cursor-pointer group">
                          <div className="bg-slate-50 rounded-xl aspect-[3/4] flex items-center justify-center p-2 mb-1 group-hover:bg-slate-100 transition-colors">
                            <div className="w-6 h-10 bg-slate-200 rounded-full" />
                          </div>
                          <span className="text-[9px] text-slate-500 font-medium">Bicep</span>
                        </div>
                      </div>
                    </div>

                    {/* Workout Schedule */}
                    <div className="flex-grow">
                      <h3 className="text-sm font-bold text-slate-800 mb-3">
                        Workout Schedule (Daily)
                      </h3>
                      <div className="flex flex-col gap-4 relative">
                        <div className="absolute left-[35px] top-2 bottom-0 w-px bg-slate-200" />
                        <div className="flex gap-4 items-start relative z-10 group cursor-pointer">
                          <span className="text-[10px] text-slate-400 font-medium w-6 pt-2 text-right group-hover:text-slate-600 transition-colors">
                            08:00
                            <br />
                            AM
                          </span>
                          <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex-grow flex items-center gap-3 group-hover:border-slate-300 transition-colors">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                Morning HIIT Training
                              </p>
                              <p className="text-[9px] text-slate-500 mt-0.5">
                                Intense • 30 min • Cardio
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-4 items-start relative z-10 opacity-60">
                          <div className="flex items-center gap-2 w-full mt-2">
                            <span className="text-[10px] text-slate-400 font-medium w-6 text-right">
                              07:00
                              <br />
                              AM
                            </span>
                            <div className="h-px bg-slate-300 flex-grow relative">
                              <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300" />
                            </div>
                          </div>
                        </div>
                        <div className="ml-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4 text-center">
                          <span className="text-xs text-slate-400 font-medium">No Schedule</span>
                        </div>
                      </div>
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
                      <div className="relative rounded-[24px] overflow-hidden aspect-[4/3] bg-slate-800 text-white p-4 flex flex-col justify-end group cursor-pointer">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 group-hover:from-black/90 transition-colors" />
                        <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-medium z-20">
                          Beginner
                        </div>
                        <div className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center z-20 hover:bg-white/40 transition-colors">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                            />
                          </svg>
                        </div>
                        <div className="relative z-20 transform group-hover:translate-y-[-4px] transition-transform">
                          <h4 className="text-lg font-bold leading-tight mb-2">
                            Core Crusher Abs &amp; Obliques Workout
                          </h4>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 bg-slate-400 rounded-full" />
                            <span className="text-[10px] opacity-80">Coach Arnold White</span>
                          </div>
                          <div className="flex items-center gap-4 text-[10px] font-medium">
                            <div className="flex items-center gap-1">
                              <span className="text-orange-400">🔥</span> 551 kcal
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-blue-300">⏱</span> 25 minutes
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Featured Workout */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-3">Featured Workout</h3>
                      <div className="relative rounded-[24px] overflow-hidden aspect-[4/3] bg-slate-800 text-white p-4 flex flex-col justify-end group cursor-pointer">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 group-hover:from-black/90 transition-colors" />
                        <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-medium z-20">
                          Beginner
                        </div>
                        <div className="relative z-20 transform group-hover:translate-y-[-4px] transition-transform">
                          <h4 className="text-lg font-bold leading-tight mb-2">
                            Total Body Circuit
                          </h4>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 bg-slate-400 rounded-full" />
                            <span className="text-[10px] opacity-80">Coach Arnold White</span>
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
                        <span className="text-xs text-[#1e4a46] font-semibold hover:underline cursor-pointer">
                          See All
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="cursor-pointer group">
                          <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full mx-auto flex items-center justify-center mb-1 group-hover:bg-green-100 transition-colors">
                            🔥
                          </div>
                          <span className="text-[10px] font-medium text-slate-600">HIIT</span>
                        </div>
                        <div className="cursor-pointer group">
                          <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full mx-auto flex items-center justify-center mb-1 group-hover:bg-slate-200 transition-colors">
                            🏋️
                          </div>
                          <span className="text-[10px] font-medium text-slate-600">Strength</span>
                        </div>
                        <div className="cursor-pointer group">
                          <div className="w-12 h-12 bg-yellow-50 text-yellow-500 rounded-full mx-auto flex items-center justify-center mb-1 group-hover:bg-yellow-100 transition-colors">
                            ⚡
                          </div>
                          <span className="text-[10px] font-medium text-slate-600">Focus</span>
                        </div>
                        <div className="cursor-pointer group">
                          <div className="w-12 h-12 bg-red-50 text-red-400 rounded-full mx-auto flex items-center justify-center mb-1 group-hover:bg-red-100 transition-colors">
                            🏃
                          </div>
                          <span className="text-[10px] font-medium text-slate-600">Agility</span>
                        </div>
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
                        {/* Card 1 */}
                        <div className="bg-white rounded-3xl p-3 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow">
                          <div className="aspect-square bg-slate-100 rounded-2xl mb-3 relative overflow-hidden">
                            <div className="absolute top-2 left-2 bg-[#1e4a46] text-white text-[9px] px-2 py-0.5 rounded-full z-10">
                              Upper Body
                            </div>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800">Upper Body Boxing</h4>
                          <p className="text-[10px] text-slate-500 mt-1">20min • Easy</p>
                        </div>
                        {/* Card 2 */}
                        <div className="bg-white rounded-3xl p-3 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow">
                          <div className="aspect-square bg-slate-100 rounded-2xl mb-3 relative overflow-hidden">
                            <div className="absolute top-2 left-2 bg-[#1e4a46] text-white text-[9px] px-2 py-0.5 rounded-full z-10">
                              Lower Body
                            </div>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800">Mindfulness Basics</h4>
                          <p className="text-[10px] text-slate-500 mt-1">20min • Easy</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 4 */}
                  <div className="flex flex-col gap-8">
                    {/* Day Streak */}
                    <div className="flex flex-col items-center text-center">
                      <div className="w-24 h-24 mb-4 relative hover:scale-105 transition-transform cursor-pointer">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-slate-100"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          />
                          <path
                            className="text-[#1e4a46]"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeDasharray="60, 100"
                            strokeWidth="4"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-[#1e4a46]">
                          3
                        </div>
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 mb-4">
                        day streak this week!
                      </h3>
                      <div className="flex gap-2 justify-center mb-6">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] text-slate-400">Mon</span>
                          <div className="w-6 h-6 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-[10px]">
                            ✕
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] text-slate-400">Tue</span>
                          <div className="w-6 h-6 rounded-full bg-[#1e4a46] text-white flex items-center justify-center text-[10px]">
                            ✓
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] text-slate-400">Wed</span>
                          <div className="w-6 h-6 rounded-full bg-[#1e4a46] text-white flex items-center justify-center text-[10px]">
                            ✓
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] text-slate-400">Thu</span>
                          <div className="w-6 h-6 rounded-full bg-[#1e4a46] text-white flex items-center justify-center text-[10px]">
                            ✓
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] text-slate-400">Fri</span>
                          <div className="w-6 h-6 rounded-full bg-slate-100" />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-slate-800">22</p>
                      <p className="text-[10px] text-slate-500 mb-2">Longest Streak</p>
                      <p className="text-[9px] text-slate-400 leading-relaxed px-4">
                        You are on fire! Keep using ZorabiHealth to gain more streak!
                      </p>
                    </div>

                    {/* Nutrition History */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-slate-800">Nutrition History</h3>
                        <span className="text-xs text-[#1e4a46] font-semibold hover:underline cursor-pointer">
                          See All
                        </span>
                      </div>
                      <div className="flex flex-col gap-3">
                        {/* Item 1 */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow">
                          <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-lg">
                            🥣
                          </div>
                          <div className="flex-grow">
                            <p className="text-xs font-bold text-slate-800">285kcal</p>
                            <p className="text-[10px] text-slate-500">Morning Oatmeal</p>
                            <div className="flex gap-2 mt-1 text-[9px] text-slate-400">
                              <span>P 128g</span>
                              <span>C 23g</span>
                              <span>F 88g</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">Jan 23</span>
                        </div>
                        {/* Item 2 */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow">
                          <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-lg">
                            🍞
                          </div>
                          <div className="flex-grow">
                            <p className="text-xs font-bold text-slate-800">128kcal</p>
                            <p className="text-[10px] text-slate-500">Classic Bread Toast</p>
                            <div className="flex gap-2 mt-1 text-[9px] text-slate-400">
                              <span>P 128g</span>
                              <span>C 23g</span>
                              <span>F 88g</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">Jan 23</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="font-sans bg-white/60 backdrop-blur-md rounded-[40px] shadow-lg p-8 flex flex-col gap-6 shrink-0 relative min-h-[640px]">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Analytics &amp; Trends</h2>
                    <p className="text-xs text-slate-400">
                      Clinical indicator predictions and historical data analysis.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAnalyticsMetric("heartRate")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        analyticsMetric === "heartRate"
                          ? "bg-brand-500 text-white shadow-sm"
                          : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                      }`}
                    >
                      Heart Rate
                    </button>
                    <button
                      onClick={() => setAnalyticsMetric("spo2")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        analyticsMetric === "spo2"
                          ? "bg-brand-500 text-white shadow-sm"
                          : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                      }`}
                    >
                      SpO2
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-6">
                  {/* Chart view */}
                  <div className="col-span-8 bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between h-[360px]">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-700">
                        {analyticsMetric === "heartRate"
                          ? "Heart Rate History (bpm)"
                          : "Blood Oxygen Levels (SpO2 %)"}
                      </span>
                      <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
                        {["7D", "30D"].map((r) => (
                          <button
                            key={r}
                            onClick={() => setAnalyticsRange(r)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                              analyticsRange === r
                                ? "bg-white text-brand-600 shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chart SVG */}
                    <div className="h-48 w-full mt-4 relative">
                      <svg
                        className="w-full h-full text-brand-500"
                        viewBox="0 0 400 120"
                        preserveAspectRatio="none"
                      >
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="chartGradGreen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        <line
                          x1="0"
                          y1="30"
                          x2="400"
                          y2="30"
                          stroke="#f1f5f9"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <line
                          x1="0"
                          y1="60"
                          x2="400"
                          y2="60"
                          stroke="#f1f5f9"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <line
                          x1="0"
                          y1="90"
                          x2="400"
                          y2="90"
                          stroke="#f1f5f9"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />

                        {analyticsMetric === "heartRate" ? (
                          <>
                            {/* Heart rate path */}
                            <path
                              d={
                                analyticsRange === "7D"
                                  ? "M 0 80 Q 50 40, 100 90 T 200 50 T 300 70 T 400 35"
                                  : "M 0 75 Q 30 50, 60 85 T 120 40 T 180 90 T 240 60 T 300 50 T 400 45"
                              }
                              fill="none"
                              stroke="#0ea5e9"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                            <path
                              d={
                                analyticsRange === "7D"
                                  ? "M 0 80 Q 50 40, 100 90 T 200 50 T 300 70 T 400 35 L 400 120 L 0 120 Z"
                                  : "M 0 75 Q 30 50, 60 85 T 120 40 T 180 90 T 240 60 T 300 50 T 400 45 L 400 120 L 0 120 Z"
                              }
                              fill="url(#chartGrad)"
                            />
                            {/* Active Point */}
                            <circle
                              cx="400"
                              cy="35"
                              r="5"
                              fill="white"
                              stroke="#0ea5e9"
                              strokeWidth="3"
                            />
                          </>
                        ) : (
                          <>
                            {/* SpO2 path */}
                            <path
                              d={
                                analyticsRange === "7D"
                                  ? "M 0 30 Q 80 25, 160 35 T 320 20 T 400 24"
                                  : "M 0 28 Q 50 35, 100 24 T 200 32 T 300 22 T 400 26"
                              }
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                            <path
                              d={
                                analyticsRange === "7D"
                                  ? "M 0 30 Q 80 25, 160 35 T 320 20 T 400 24 L 400 120 L 0 120 Z"
                                  : "M 0 28 Q 50 35, 100 24 T 200 32 T 300 22 T 400 26 L 400 120 L 0 120 Z"
                              }
                              fill="url(#chartGradGreen)"
                            />
                            {/* Active Point */}
                            <circle
                              cx="400"
                              cy="24"
                              r="5"
                              fill="white"
                              stroke="#10b981"
                              strokeWidth="3"
                            />
                          </>
                        )}
                      </svg>
                      {/* X Axis labels */}
                      <div className="flex justify-between mt-2 text-[9px] text-slate-400 font-semibold px-1">
                        {analyticsRange === "7D" ? (
                          <>
                            <span>Mon</span>
                            <span>Tue</span>
                            <span>Wed</span>
                            <span>Thu</span>
                            <span>Fri</span>
                            <span>Sat</span>
                            <span>Sun</span>
                          </>
                        ) : (
                          <>
                            <span>May 1</span>
                            <span>May 10</span>
                            <span>May 20</span>
                            <span>May 30</span>
                            <span>June 6</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summary Indicators */}
                  <div className="col-span-4 flex flex-col gap-4">
                    <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm flex flex-col justify-between flex-grow">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Predictive Recovery
                        </span>
                        <h3 className="text-3xl font-extrabold text-slate-800 mt-1">94%</h3>
                        <p className="text-[10px] text-emerald-600 font-bold mt-1">
                          ✓ Excellent Condition
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed mt-2 font-medium">
                        Based on your resting HRV and continuous SpO2 trends over the last 24h, your
                        recovery rate has increased by{" "}
                        <span className="text-brand-500 font-bold">+4.2%</span>.
                      </p>
                    </div>

                    <div className="bg-[#1e4a46] text-white rounded-[24px] p-5 flex flex-col justify-between flex-grow shadow-md">
                      <div>
                        <span className="text-[10px] text-white/70 font-bold uppercase tracking-wider">
                          Clinical Compliance
                        </span>
                        <h3 className="text-2xl font-black mt-1">98.2%</h3>
                        <p className="text-[10px] text-teal-200 mt-1">16 out of 17 doses taken</p>
                      </div>
                      <Link
                        href="/dashboard"
                        className="text-[10px] text-white font-bold hover:underline mt-4 flex items-center gap-1"
                      >
                        View Medication Plan <span>→</span>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Bottom Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-semibold">Average Heart Rate</p>
                    <p className="text-xl font-bold text-slate-800 mt-1">
                      {analyticsMetric === "heartRate" ? "68 bpm" : "71 bpm"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-semibold">Oxygen Stability</p>
                    <p className="text-xl font-bold text-slate-800 mt-1">
                      {analyticsMetric === "spo2" ? "98.8%" : "98.1%"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Symptom Severity Index
                    </p>
                    <p className="text-xl font-bold text-emerald-600 mt-1">0.1 (Low)</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "vitals" && (
              <div className="font-sans bg-white/60 backdrop-blur-md rounded-[40px] shadow-lg p-8 flex flex-col gap-6 shrink-0 relative min-h-[640px]">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Symptom Tracker</h2>
                    <p className="text-xs text-slate-400">
                      Log physical symptoms to feed telemetry calculations.
                    </p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-brand-50 text-brand-700 font-bold border border-brand-100">
                    Active Logging
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-6">
                  {/* Selector panel */}
                  <div className="col-span-7 bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col gap-5">
                    <div>
                      <h3 className="text-sm font-bold text-slate-700 mb-2">Select Symptoms</h3>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: "headache", label: "Headache", emoji: "🧠" },
                          { id: "fatigue", label: "Fatigue", emoji: "🔋" },
                          { id: "cough", label: "Dry Cough", emoji: "🗣️" },
                          { id: "insomnia", label: "Insomnia", emoji: "🌙" },
                          { id: "nausea", label: "Nausea", emoji: "🤢" },
                          { id: "chestPain", label: "Chest Tightness", emoji: "🫁" },
                        ].map((sym) => {
                          const isSelected = selectedSymptoms.includes(sym.id);
                          return (
                            <button
                              key={sym.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedSymptoms(selectedSymptoms.filter((s) => s !== sym.id));
                                } else {
                                  setSelectedSymptoms([...selectedSymptoms, sym.id]);
                                }
                              }}
                              className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-brand-50 border-brand-400 text-brand-700 shadow-xs"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <span>{sym.emoji}</span>
                              <span>{sym.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-brand-600" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-700 mb-2">Symptom Severity</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          {
                            id: "Mild",
                            color: "bg-emerald-500",
                            text: "text-emerald-700",
                            bg: "bg-emerald-50 border-emerald-100",
                          },
                          {
                            id: "Moderate",
                            color: "bg-amber-500",
                            text: "text-amber-700",
                            bg: "bg-amber-50 border-amber-100",
                          },
                          {
                            id: "Severe",
                            color: "bg-red-500",
                            text: "text-red-700",
                            bg: "bg-red-50 border-red-100",
                          },
                        ].map((sev) => {
                          const isActive = symptomSeverity === sev.id;
                          return (
                            <button
                              key={sev.id}
                              onClick={() => setSymptomSeverity(sev.id)}
                              className={`p-3 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                isActive
                                  ? `${sev.bg} border-2`
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${sev.color}`} />
                              <span className={isActive ? sev.text : "text-slate-600"}>
                                {sev.id}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (selectedSymptoms.length === 0) return;
                        const newLog = `${selectedSymptoms
                          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                          .join(", ")} (${symptomSeverity})`;
                        setSymptomLogs([
                          { date: "Today", detail: newLog, severity: symptomSeverity },
                          ...symptomLogs,
                        ]);
                        setSelectedSymptoms([]);
                      }}
                      disabled={selectedSymptoms.length === 0}
                      className="w-full bg-[#1e4a46] hover:bg-[#153633] disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-xs transition-colors shadow-md cursor-pointer mt-2"
                    >
                      Record Log Entry
                    </button>
                  </div>

                  {/* Summary indicators */}
                  <div className="col-span-5 flex flex-col gap-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-[24px] p-5 flex-grow flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Clinical Status
                        </h4>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`w-3.5 h-3.5 rounded-full ${
                              symptomSeverity === "Severe" && selectedSymptoms.length > 0
                                ? "bg-red-500"
                                : "bg-emerald-500"
                            }`}
                          />
                          <span className="text-lg font-black text-slate-800">
                            {symptomSeverity === "Severe" && selectedSymptoms.length > 0
                              ? "Attention Required"
                              : "Stable & Normal"}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed mt-4 font-medium">
                        {symptomSeverity === "Severe" && selectedSymptoms.length > 0
                          ? "We detected a severe physical flag. A push notification escalation trigger is armed. If indicators persist, we will contact Dr. Jenkins."
                          : "No emergency clinical thresholds crossed. Rest well and continue logging symptoms periodically."}
                      </p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-[24px] p-5 h-44 overflow-y-auto flex flex-col gap-2.5 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Recent Logs
                      </span>
                      {symptomLogs.length === 0 ? (
                        <p className="text-xs text-slate-400 italic my-auto text-center">
                          No logs logged today.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {symptomLogs.map((log, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[10px] font-semibold"
                            >
                              <span className="text-slate-800 truncate max-w-[150px]">
                                {log.detail}
                              </span>
                              <div className="flex gap-2 items-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${
                                    log.severity === "Severe"
                                      ? "bg-red-100 text-red-700"
                                      : log.severity === "Moderate"
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {log.severity}
                                </span>
                                <span className="text-slate-400">{log.date}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "meditation" && (
              <div className="font-sans bg-white/60 backdrop-blur-md rounded-[40px] shadow-lg p-8 flex flex-col gap-6 shrink-0 relative min-h-[640px]">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">
                      Meditation &amp; Mindfulness
                    </h2>
                    <p className="text-xs text-slate-400">
                      Settle your mind and reduce heart rate with guided breathing.
                    </p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
                    Relaxation Center
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-8 items-center mt-2">
                  {/* Left Column - Audio Player Mockup */}
                  <div className="col-span-6 flex flex-col items-center bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm relative overflow-hidden h-[380px] justify-between">
                    {/* Breathing circle animation */}
                    <div className="my-auto flex flex-col items-center justify-center relative">
                      <div
                        className={`w-36 h-36 rounded-full bg-gradient-to-br from-emerald-100 to-teal-200/40 flex items-center justify-center relative transition-all duration-[3000ms] ${
                          isPlayingMeditation ? "animate-pulse scale-105" : ""
                        }`}
                      >
                        <div className="w-28 h-28 rounded-full bg-white flex flex-col items-center justify-center shadow-inner text-center p-2 z-10">
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                            {isPlayingMeditation ? "Breathing" : "Paused"}
                          </p>
                          <p className="text-sm font-extrabold text-[#1e4a46] mt-1">
                            {isPlayingMeditation ? "Inhale..." : "Begin"}
                          </p>
                        </div>
                        {/* Ambient aura */}
                        {isPlayingMeditation && (
                          <div className="absolute inset-0 rounded-full border border-teal-400/30 animate-ping opacity-60" />
                        )}
                      </div>
                    </div>

                    {/* Progress slider */}
                    <div className="w-full flex flex-col gap-1.5 px-2">
                      <div className="flex justify-between text-[9px] text-slate-400 font-semibold">
                        <span>1:45</span>
                        <span>
                          {activeMeditationTrack === "forest"
                            ? "5:30"
                            : activeMeditationTrack === "ocean"
                              ? "8:00"
                              : "10:15"}
                        </span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full w-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all duration-1000"
                          style={{ width: isPlayingMeditation ? "32%" : "20%" }}
                        />
                      </div>
                    </div>

                    {/* Player controls */}
                    <div className="flex items-center gap-6 mt-4">
                      <button
                        onClick={() => setIsPlayingMeditation(!isPlayingMeditation)}
                        className="w-14 h-14 bg-[#1e4a46] hover:bg-[#153633] text-white rounded-full flex items-center justify-center shadow-md transition-colors cursor-pointer"
                      >
                        {isPlayingMeditation ? (
                          <Pause className="w-6 h-6 text-white" />
                        ) : (
                          <Play className="w-6 h-6 text-white fill-white ml-1" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Right Column - Sound tracks */}
                  <div className="col-span-6 flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-slate-700">Choose Guided Zen Sessions</h3>
                    <div className="flex flex-col gap-3">
                      {[
                        {
                          id: "forest",
                          name: "Forest Rain Breath",
                          duration: "5:30",
                          desc: "Gentle raindrops coupled with diaphragmatic rhythm.",
                          emoji: "🌧️",
                        },
                        {
                          id: "ocean",
                          name: "Deep Zen Ocean",
                          duration: "8:00",
                          desc: "Symphony of ambient tides to stabilize sinus rhythm.",
                          emoji: "🌊",
                        },
                        {
                          id: "cosmic",
                          name: "Cosmic Mind Calm",
                          duration: "10:15",
                          desc: "Low-frequency pulses for restorative neural cycles.",
                          emoji: "🌌",
                        },
                      ].map((track) => (
                        <button
                          key={track.id}
                          onClick={() => {
                            setActiveMeditationTrack(track.id);
                            setIsPlayingMeditation(true);
                          }}
                          className={`p-4 rounded-[24px] border transition-all cursor-pointer flex items-center justify-between text-left w-full ${
                            activeMeditationTrack === track.id
                              ? "bg-teal-50 border-teal-200 shadow-xs"
                              : "bg-white border-slate-100 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-2xl">{track.emoji}</span>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{track.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{track.desc}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {track.duration}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="font-sans bg-white/60 backdrop-blur-md rounded-[40px] shadow-lg p-8 flex flex-col gap-6 shrink-0 relative min-h-[640px]">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Clinical Settings</h2>
                    <p className="text-xs text-slate-400">
                      Configure your telemetry synchronization and push notification alarms.
                    </p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                    Console Config
                  </span>
                </div>

                {/* Settings panel */}
                <div className="grid grid-cols-12 gap-6 mt-2">
                  <div className="col-span-8 bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col gap-5">
                    {/* Toggles */}
                    <div className="flex flex-col gap-4">
                      {/* HIPAA */}
                      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <Shield className="w-5 h-5 text-brand-600" />
                          <div>
                            <p className="text-xs font-bold text-slate-800">HIPAA Secure Sharing</p>
                            <p className="text-[9px] text-slate-400">
                              Sync all telemetry reports directly to your clinician profile.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSettingsHIPAA(!settingsHIPAA)}
                          className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                            settingsHIPAA ? "bg-brand-500" : "bg-slate-200"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                              settingsHIPAA ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Push Notifications */}
                      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <Smartphone className="w-5 h-5 text-emerald-600" />
                          <div>
                            <p className="text-xs font-bold text-slate-800">Push Notifications</p>
                            <p className="text-[9px] text-slate-400">
                              Deliver real-time alerts to your device via Web Push.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSettingsSMS(!settingsSMS)}
                          className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                            settingsSMS ? "bg-brand-500" : "bg-slate-200"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                              settingsSMS ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Escalation */}
                      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <Zap className="w-5 h-5 text-amber-500" />
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              Emergency Escalation Alarms
                            </p>
                            <p className="text-[9px] text-slate-400">
                              Alert designated contacts after consecutive missed medications.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSettingsEscalation(!settingsEscalation)}
                          className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                            settingsEscalation ? "bg-brand-500" : "bg-slate-200"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                              settingsEscalation ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Deepgram */}
                      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-5 h-5 text-violet-500" />
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              Deepgram Voice Export
                            </p>
                            <p className="text-[9px] text-slate-400">
                              Enable storage of transcripts and recordings in Supabase buckets.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSettingsDeepgram(!settingsDeepgram)}
                          className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                            settingsDeepgram ? "bg-brand-500" : "bg-slate-200"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                              settingsDeepgram ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowSaveToast(true);
                        setTimeout(() => setShowSaveToast(false), 3000);
                      }}
                      className="w-full bg-[#1e4a46] hover:bg-[#153633] text-white font-bold py-3.5 rounded-2xl text-xs transition-colors shadow-md cursor-pointer mt-2"
                    >
                      Save Configuration
                    </button>
                  </div>

                  {/* Summary / Info */}
                  <div className="col-span-4 flex flex-col gap-4 relative">
                    <div className="bg-slate-50 border border-slate-100 rounded-[24px] p-5 flex-grow">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Sync Status
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-bold text-slate-700">
                          Connected to Supabase
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed mt-4 font-medium">
                        Your console settings are automatically saved locally and synchronized
                        across the secure cloud database for all devices.
                      </p>
                    </div>

                    {/* Notification Toast */}
                    {showSaveToast && (
                      <div className="absolute inset-x-0 bottom-0 bg-emerald-600 text-white rounded-2xl p-4 shadow-lg border border-emerald-500 flex items-center gap-3 animate-bounce">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                        <span className="text-[10px] font-bold">
                          Preferences saved and synced successfully!
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* END: Dashboard Content Area */}
        </div>
      </section>
      {/* END: Integrated Health Dashboard */}

      {/* NEW SECTION 1: Pharmacy & Medication Management */}
      <section className="px-10 py-16 bg-[#f8fafc] border-t border-slate-100 animate-on-scroll">
        <div className="relative bg-white rounded-[40px] overflow-hidden min-h-[600px] flex items-center px-12 py-16 shadow-sm border border-slate-100">
          {/* Background Decorative Curves */}
          <div className="absolute inset-0 pointer-events-none">
            <svg
              className="w-full h-full opacity-20"
              fill="none"
              viewBox="0 0 1200 600"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M-100 450 Q 300 350 600 450 T 1300 350"
                stroke="#0ea5e9"
                strokeDasharray="8 8"
                strokeWidth="2"
              ></path>
              <path
                d="M-100 500 Q 400 400 700 500 T 1300 400"
                stroke="#0ea5e9"
                strokeDasharray="8 8"
                strokeWidth="2"
              ></path>
            </svg>
          </div>
          <div className="grid grid-cols-12 gap-8 items-center w-full relative z-10">
            {/* Left Content */}
            <div className="col-span-12 lg:col-span-6">
              <h2 className="text-5xl font-bold text-slate-900 leading-[1.1] mb-6">
                Your <span className="text-brand-500">trusted partner</span>
                <br />
                in digital healthcare.
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-md">
                <span className="text-brand-500 font-bold">
                  Empowering Your Health at Every Step.
                </span>{" "}
                Experience personalized medical care from the comfort of your home. Connect with{" "}
                <span className="text-brand-500 font-bold underline">certified doctors</span>,
                manage prescriptions, and schedule appointments with ease. Ready to take control of
                your health? <span className="text-brand-500 font-bold">Get Started</span> or Book
                an Appointment today.
              </p>
              <button className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 px-8 rounded-xl flex items-center gap-3 transition-all shadow-lg shadow-brand-100 mb-12 cursor-pointer">
                Book an appointment <ChevronRight className="w-5 h-5" />
              </button>
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Trusted by millions across the globe:
                </p>
                <div className="flex items-center gap-6 opacity-60 grayscale">
                  <div className="relative h-5 w-20">
                    <Image
                      alt="Amazon"
                      fill
                      className="object-contain"
                      src="/images/logos/amazon.png"
                      sizes="80px"
                    />
                  </div>
                  <div className="relative h-5 w-16">
                    <Image
                      alt="Apple"
                      fill
                      className="object-contain"
                      src="/images/logos/apple.png"
                      sizes="64px"
                    />
                  </div>
                  <div className="relative h-5 w-20">
                    <Image
                      alt="Google"
                      fill
                      className="object-contain"
                      src="/images/logos/google.png"
                      sizes="80px"
                    />
                  </div>
                  <div className="relative h-5 w-16">
                    <Image
                      alt="Notion"
                      fill
                      className="object-contain"
                      src="/images/logos/notion.png"
                      sizes="64px"
                    />
                  </div>
                  <div className="relative h-5 w-20">
                    <Image
                      alt="Spotify"
                      fill
                      className="object-contain"
                      src="/images/logos/spotify.png"
                      sizes="80px"
                    />
                  </div>
                  <div className="relative h-5 w-16">
                    <Image
                      alt="Slack"
                      fill
                      className="object-contain"
                      src="/images/logos/slack.png"
                      sizes="64px"
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Right Visual */}
            <div className="col-span-12 lg:col-span-6 relative flex justify-center">
              <div className="relative w-full max-w-md aspect-square">
                {/* Doctor Image in Circle */}
                <div className="absolute inset-0 bg-brand-50 rounded-full overflow-hidden border-[12px] border-white shadow-xl">
                  <Image
                    alt="Doctor"
                    className="object-cover object-top"
                    src="/images/doctor_partner.jpg"
                    fill
                    sizes="400px"
                  />
                </div>
                {/* Floating Badge 1: Easy Appointment */}
                <div className="absolute top-1/2 -left-12 -translate-y-1/2 bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 border border-slate-50 z-20">
                  <Star className="text-brand-500 w-4 h-4 fill-brand-500" />
                  <span className="text-[10px] font-bold text-slate-700">
                    Easy Appointment Booking
                  </span>
                </div>
                {/* Floating Badge 2: Happy Customers */}
                <div className="absolute top-1/4 -right-8 bg-white p-3 rounded-xl shadow-lg border border-slate-50 w-40 z-20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full border border-white bg-slate-200 overflow-hidden relative">
                        <Image
                          alt=""
                          fill
                          src="/images/doctor1.jpg"
                          sizes="24px"
                          className="object-cover"
                        />
                      </div>
                      <div className="w-6 h-6 rounded-full border border-white bg-slate-300 overflow-hidden relative">
                        <Image
                          alt=""
                          fill
                          src="/images/doctor2.jpg"
                          sizes="24px"
                          className="object-cover"
                        />
                      </div>
                      <div className="w-6 h-6 rounded-full border border-white bg-slate-400 overflow-hidden relative">
                        <Image
                          alt=""
                          fill
                          src="/images/doctor3.jpg"
                          sizes="24px"
                          className="object-cover"
                        />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-800">2400+</span>
                  </div>
                  <p className="text-[8px] font-bold text-brand-500 mb-1">Happy Customers</p>
                  <div className="flex text-yellow-500 text-[8px] items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    <Star className="w-2.5 h-2.5 fill-current" />
                    <Star className="w-2.5 h-2.5 fill-current" />
                    <Star className="w-2.5 h-2.5 fill-current" />
                    <Star className="w-2.5 h-2.5 fill-current" />
                    <span className="ml-1 text-slate-400 font-semibold">(4.7 Stars)</span>
                  </div>
                </div>
                {/* Floating Badge 3: Quote */}
                <div className="absolute -bottom-4 -right-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/50 max-w-[200px] z-20">
                  <Quote className="text-brand-500 w-5 h-5 mb-1" />
                  <p className="text-[10px] font-medium text-slate-600 leading-tight italic">
                    Where science meets art, and compassion heals.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW SECTION 2: Patient Empowerment Portal */}
      <section className="px-10 py-24 bg-white animate-on-scroll">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="w-full lg:w-1/2">
            <span className="text-brand-500 font-bold text-sm uppercase tracking-widest mb-4 block">
              Central Intelligence
            </span>
            <h2 className="text-5xl font-bold leading-tight mb-6 text-slate-900">
              Your Health,{" "}
              <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                Unified.
              </span>
            </h2>
            <p className="text-slate-500 text-lg mb-10 leading-relaxed">
              Experience a clean, light-filled portal where your entire medical history meets
              real-time predictive analytics.
            </p>
            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <FolderHeart className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2 text-slate-800">
                    Centralized medical records
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Secure access to labs, imaging, and histories in one high-fidelity interface.
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                  <HeartPulse className="w-6 h-6 text-brand-500" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2 text-slate-800">
                    Real-time vitals monitoring
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Synchronize wearable data with clinical-grade visualization tools.
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
                  <Brain className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2 text-slate-800">
                    Personalized AI health insights
                  </h3>
                  <p className="text-slate-500 text-sm">
                    ZorabiHealth analyzes your unique markers to provide actionable recovery
                    pathways.
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* Visual: High-contrast data visualizations mirroring ZorabiHealth style */}
          <div className="w-full lg:w-1/2 grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-12">
                <Activity className="w-6 h-6 text-brand-500" />
                <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-full border">
                  LIVE
                </span>
              </div>
              <div className="h-24 flex items-end gap-2">
                <div className="w-full bg-brand-200 rounded-t-lg h-[60%]"></div>
                <div className="w-full bg-brand-400 rounded-t-lg h-[85%]"></div>
                <div className="w-full bg-brand-500 rounded-t-lg h-[70%]"></div>
                <div className="w-full bg-brand-300 rounded-t-lg h-[100%] animate-pulse"></div>
                <div className="w-full bg-brand-200 rounded-t-lg h-[55%]"></div>
              </div>
              <p className="mt-6 font-bold text-slate-800">Oxygen Saturation</p>
              <p className="text-xs text-slate-400">98% Avg this week</p>
            </div>
            <div className="bg-slate-900 p-8 rounded-[40px] text-white flex flex-col justify-between hover:scale-[1.02] transition-transform">
              <TrendingUp className="w-8 h-8 text-brand-400" />
              <div>
                <h4 className="text-3xl font-bold mb-2">+12%</h4>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest">
                  Metabolic Efficiency
                </p>
              </div>
            </div>
            <div className="col-span-2 bg-gradient-to-br from-brand-500 to-brand-600 p-8 rounded-[40px] text-white flex items-center justify-between shadow-sm">
              <div>
                <h4 className="text-2xl font-bold mb-1">Unified Health Score</h4>
                <p className="text-white/80 text-sm">Clinical benchmark: Optimized</p>
              </div>
              <div className="w-16 h-16 rounded-full border-4 border-white/20 flex items-center justify-center text-xl font-black">
                94
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW SECTION 3: Doctor-Patient Appointment Hub */}
      <section className="px-10 py-16 bg-[#f0f4f8] animate-on-scroll">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-slate-900 mb-4">
              Seamless Clinical Connection.
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Sophisticated scheduling for the modern patient-doctor relationship, inspired by
              clinical excellence.
            </p>
          </div>
          <div className="grid grid-cols-12 gap-8">
            {/* Feature Cards */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="appointment-glass p-8 rounded-[32px] hover:bg-white transition-colors cursor-pointer group shadow-sm bg-white/70 border border-white/40">
                <Calendar className="w-8 h-8 text-brand-600 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Instant booking</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Synchronize directly with clinical calendars for zero-latency scheduling.
                </p>
              </div>
              <div className="appointment-glass p-8 rounded-[32px] hover:bg-white transition-colors cursor-pointer group shadow-sm bg-white/70 border border-white/40">
                <Video className="w-8 h-8 text-brand-600 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  Secure video consultations
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  HIPAA-compliant, high-definition tele-health integration with low latency.
                </p>
              </div>
              <div className="appointment-glass p-8 rounded-[32px] hover:bg-white transition-colors cursor-pointer group shadow-sm bg-white/70 border border-white/40">
                <ClipboardList className="w-8 h-8 text-brand-600 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  Integrated patient history
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Automatic pre-briefing for doctors using ZorabiHealth predictive summaries.
                </p>
              </div>
            </div>
            {/* Appointment Interface */}
            <div className="col-span-12 lg:col-span-8 bg-white rounded-[40px] p-8 shadow-xl border border-slate-200 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
              <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                <div className="flex justify-between items-center">
                  <h4 className="text-2xl font-bold text-slate-800">Upcoming Consultations</h4>
                  <div className="flex gap-2">
                    <button className="p-2 rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors cursor-pointer">
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <button className="p-2 rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors cursor-pointer">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {/* Glassmorphism Appointment Cards */}
                  <div className="flex items-center gap-6 p-6 rounded-3xl bg-slate-50 border border-slate-100 group hover:border-brand-500 transition-all">
                    <div className="w-16 h-16 rounded-2xl bg-slate-200 overflow-hidden shrink-0 relative">
                      <Image
                        alt="Doctor"
                        className="object-cover"
                        src="/images/doctor_jenkins.jpg"
                        fill
                        sizes="64px"
                      />
                    </div>
                    <div className="flex-grow">
                      <h5 className="font-bold text-slate-800">Dr. Sarah Jenkins</h5>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        Cardiology Specialist
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">Today, 14:30</p>
                      <p className="text-xs text-brand-500 font-bold">Video Consult</p>
                    </div>
                    <button className="bg-brand-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-brand-100 transform group-hover:scale-105 transition-all cursor-pointer">
                      Join Room
                    </button>
                  </div>
                  <div className="flex items-center gap-6 p-6 rounded-3xl bg-white border border-slate-100 hover:bg-slate-50 transition-all opacity-80">
                    <div className="w-16 h-16 rounded-2xl bg-slate-200 overflow-hidden shrink-0 relative">
                      <Image
                        alt="Doctor"
                        className="object-cover"
                        src="/images/doctor2.jpg"
                        fill
                        sizes="64px"
                      />
                    </div>
                    <div className="flex-grow">
                      <h5 className="font-bold text-slate-800">Dr. Michael Chen</h5>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        Internal Medicine
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">July 26, 09:15</p>
                      <p className="text-xs text-slate-400 font-bold">In-Person</p>
                    </div>
                    <button className="bg-slate-100 text-slate-400 px-6 py-2 rounded-xl text-sm font-bold cursor-pointer">
                      Manage
                    </button>
                  </div>
                </div>
                <div className="pt-6 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                      <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden relative">
                        <Image
                          alt=""
                          fill
                          className="object-cover"
                          src="/images/doctor1.jpg"
                          sizes="40px"
                        />
                      </div>
                      <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-300 overflow-hidden relative">
                        <Image
                          alt=""
                          fill
                          className="object-cover"
                          src="/images/doctor2.jpg"
                          sizes="40px"
                        />
                      </div>
                      <div className="w-10 h-10 rounded-full border-2 border-white bg-brand-500 flex items-center justify-center text-[10px] font-bold text-white z-10">
                        +24
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-400">
                      Trusted by top specialists globally
                    </p>
                  </div>
                  <button className="text-brand-500 font-bold text-sm flex items-center gap-2 hover:underline cursor-pointer">
                    View complete directory <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW SECTION 4: Online Pharmacy Section */}
      <section
        className="px-10 py-24 bg-white border-t border-slate-100 animate-on-scroll"
        data-purpose="pharmacy-section"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-12 gap-12 items-center mb-16">
            <div className="col-span-12 lg:col-span-6">
              <h2 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
                Your Trusted <span className="text-brand-500">Online Pharmacy</span>
              </h2>
              <p className="text-slate-500 text-lg mb-10 leading-relaxed">
                Safe medicines, fast delivery, and professional guidance all in one place. We are a
                certified online pharmacy committed to making healthcare simple, safe, and
                affordable.
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 px-8 rounded-2xl flex items-center gap-3 transition-all shadow-lg shadow-brand-100 cursor-pointer">
                  <ShoppingBasket className="w-5 h-5" /> Shop Medicines
                </button>
                <button className="bg-white border-2 border-brand-500 text-brand-500 hover:bg-brand-50 font-bold py-4 px-8 rounded-2xl flex items-center gap-3 transition-all cursor-pointer">
                  <Upload className="w-5 h-5" /> Upload Prescription
                </button>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-6 relative flex justify-center">
              <div className="w-full max-w-md aspect-square rounded-[40px] overflow-hidden shadow-2xl border-[12px] border-white relative">
                <Image
                  alt="Medical Professional"
                  className="object-cover"
                  src="/images/medical_professional.jpg"
                  fill
                  sizes="450px"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-24">
            <div className="bg-slate-50 p-8 rounded-[32px] text-center hover:shadow-md transition-shadow border border-slate-100">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-3xl">
                💊
              </div>
              <p className="font-bold text-slate-800">Supplements</p>
            </div>
            <div className="bg-slate-50 p-8 rounded-[32px] text-center hover:shadow-md transition-shadow border border-slate-100">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-3xl">
                💉
              </div>
              <p className="font-bold text-slate-800">Diabetes</p>
            </div>
            <div className="bg-slate-50 p-8 rounded-[32px] text-center hover:shadow-md transition-shadow border border-slate-100">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-3xl">
                🧴
              </div>
              <p className="font-bold text-slate-800">Beauty Products</p>
            </div>
            <div className="bg-slate-50 p-8 rounded-[32px] text-center hover:shadow-md transition-shadow border border-slate-100">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-3xl">
                🪥
              </div>
              <p className="font-bold text-slate-800">Oral Care</p>
            </div>
          </div>
          <div className="flex justify-between items-end mb-12">
            <h3 className="text-3xl font-bold text-slate-900">Shop by Health Concerns</h3>
            <button className="text-brand-500 font-bold flex items-center gap-2 hover:underline cursor-pointer">
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 text-center hover:border-brand-500 transition-colors">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                🫁
              </div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Lung</p>
            </div>
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 text-center hover:border-brand-500 transition-colors">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                🦷
              </div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dental</p>
            </div>
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 text-center hover:border-brand-500 transition-colors">
              <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                ❤️
              </div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Heart</p>
            </div>
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 text-center hover:border-brand-500 transition-colors">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                🦴
              </div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Bone</p>
            </div>
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 text-center hover:border-brand-500 transition-colors">
              <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                🥩
              </div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Liver</p>
            </div>
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 text-center hover:border-brand-500 transition-colors">
              <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                🦠
              </div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Virus</p>
            </div>
          </div>
        </div>
      </section>

      {/* BEGIN: Medicine Section */}
      <section className="medicine-section relative py-24 border-t border-slate-100 overflow-hidden animate-on-scroll">
        {/* Hero Background Text */}
        <div className="hero-text-bg">MEDICINE</div>
        <div className="w-full max-w-7xl mx-auto px-10 relative z-10 flex flex-col md:flex-row items-center justify-between min-h-[600px]">
          {/* Hero Image Area (Left) */}
          <div className="w-full md:w-1/2 relative">
            <div className="w-full relative aspect-[4/3] min-h-[300px]">
              <Image
                alt="Spilling Pill Jar"
                className="object-contain opacity-90 drop-shadow-xl"
                src="/images/pills.jpg"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ clipPath: "polygon(0 10%, 100% 0%, 90% 90%, 10% 100%)" }}
              />
            </div>
            {/* Circular Badge */}
            <div className="circular-text rounded-full border border-slate-200 bg-white/95 flex items-center justify-center shadow-lg">
              <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white relative z-10 shadow-md">
                <svg
                  className="w-5 h-5 transform -rotate-45"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <svg
                className="absolute w-full h-full animate-spin-slow"
                style={{ animationDuration: "12s" }}
                viewBox="0 0 100 100"
              >
                <path
                  d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                  fill="transparent"
                  id="circlePath"
                ></path>
                <text fill="#334155" fontSize="10" fontWeight="800">
                  <textPath href="#circlePath" startOffset="0%">
                    Explore All Products • Explore All Products •{" "}
                  </textPath>
                </text>
              </svg>
            </div>
          </div>
          {/* Right Side Content */}
          <div className="w-full md:w-1/2 flex flex-col items-end text-right mt-16 md:mt-0">
            <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tight uppercase mb-8 text-slate-900">
              Trusted Healthcare
              <br />
              Delivered Right When
              <br />
              You Need It
            </h2>
            <div className="w-full flex justify-end mb-6">
              <div className="w-16 h-[2px] bg-brand-200"></div>
            </div>
            <div className="flex items-center gap-6 justify-end mt-8">
              <div className="flex -space-x-4 animate-on-scroll-zoom">
                <div className="w-14 h-14 rounded-full border-4 border-white overflow-hidden shadow-sm relative">
                  <Image
                    alt="Doctor 1"
                    className="object-cover"
                    src="/images/doctor1.jpg"
                    fill
                    sizes="56px"
                  />
                </div>
                <div className="w-14 h-14 rounded-full border-4 border-white overflow-hidden shadow-sm relative">
                  <Image
                    alt="Doctor 2"
                    className="object-cover"
                    src="/images/doctor2.jpg"
                    fill
                    sizes="56px"
                  />
                </div>
                <div className="w-14 h-14 rounded-full border-4 border-white overflow-hidden shadow-sm relative">
                  <Image
                    alt="Doctor 3"
                    className="object-cover"
                    src="/images/doctor3.jpg"
                    fill
                    sizes="56px"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BEGIN: Platform Features Section */}
      <Features />
      {/* END: Platform Features Section */}

      {/* BEGIN: Testimonials Section */}
      <TestimonialSlider />
      {/* END: Testimonials Section */}

      {/* BEGIN: Footer Section */}
      <Footer />
      {/* END: Footer Section */}
    </main>
  );
}
