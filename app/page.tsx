"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Book,
  Sunset,
  Trees,
  Zap,
  LayoutDashboard,
  LineChart,
  Activity,
  Leaf,
  Dumbbell,
  Settings,
  Sparkles,
} from "lucide-react";
import { Navbar1 } from "@/components/shadcnblocks-com-navbar1";
import TestimonialSlider from "@/components/testimonial-slider";
import { Footer } from "@/components/ui/footer";
import { Features } from "@/components/features-10";

const demoData = {
  logo: {
    url: "#",
    src: "https://www.shadcnblocks.com/images/block/block-1.svg",
    alt: "zorabihealth",
    title: "zorabihealth",
  },
  menu: [
    {
      title: "Home",
      url: "#",
    },
    {
      title: "Products",
      url: "#",
      items: [
        {
          title: "Blog",
          description: "The latest industry news, updates, and info",
          icon: <Book className="size-5 shrink-0" />,
          url: "/blog",
        },
        {
          title: "Company",
          description: "Our mission is to innovate and empower the world",
          icon: <Trees className="size-5 shrink-0" />,
          url: "/company",
        },
        {
          title: "Careers",
          description: "Browse job listing and discover our workspace",
          icon: <Sunset className="size-5 shrink-0" />,
          url: "/careers",
        },
        {
          title: "Support",
          description: "Get in touch with our support team or visit our community forums",
          icon: <Zap className="size-5 shrink-0" />,
          url: "/support",
        },
      ],
    },
    {
      title: "Resources",
      url: "#",
      items: [
        {
          title: "Help Center",
          description: "Get all the answers you need right here",
          icon: <Zap className="size-5 shrink-0" />,
          url: "/help",
        },
        {
          title: "Contact Us",
          description: "We are here to help you with any questions you have",
          icon: <Sunset className="size-5 shrink-0" />,
          url: "/contact",
        },
        {
          title: "Status",
          description: "Check the current status of our services and APIs",
          icon: <Trees className="size-5 shrink-0" />,
          url: "/status",
        },
        {
          title: "Terms of Service",
          description: "Our terms and conditions for using our services",
          icon: <Book className="size-5 shrink-0" />,
          url: "/terms",
        },
      ],
    },
    {
      title: "Pricing",
      url: "/pricing",
    },
    {
      title: "Blog",
      url: "/blog",
    },
  ],
  mobileExtraLinks: [
    { name: "Press", url: "/press" },
    { name: "Contact", url: "/contact" },
    { name: "Imprint", url: "/imprint" },
    { name: "Sitemap", url: "/sitemap" },
  ],
  auth: {
    login: { text: "Log in", url: "/login" },
    signup: { text: "Sign up", url: "/signup" },
  },
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("overview");

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
      <section className="grid grid-cols-12 gap-8 px-10 pb-20 items-center min-h-[calc(100vh-8rem)] relative bg-white overflow-hidden">
        {/* Left Column: Copy */}
        <div className="col-span-5 animate-on-scroll-left" data-purpose="hero-copy">
          <h1 className="text-5xl font-bold leading-[1.1] mb-8 text-slate-900">
            Predictive{" "}
            <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
              GenAI
            </span>{" "}
            turns analysts into predictive{" "}
            <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
              powerhouses
            </span>
          </h1>
          <ul className="space-y-4 mb-10">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full border border-brand-200 flex items-center justify-center text-brand-50 text-xs bg-brand-50">
                ✓
              </span>
              <span className="text-slate-600 font-medium">
                Built for business and data analysts
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full border border-brand-200 flex items-center justify-center text-brand-50 text-xs bg-brand-50">
                ✓
              </span>
              <span className="text-slate-600 font-medium">
                Blazing-fast predictions and seamless integrations
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full border border-brand-200 flex items-center justify-center text-brand-50 text-xs bg-brand-50">
                ✓
              </span>
              <span className="text-slate-600 font-medium">
                No ML experience or knowledge required
              </span>
            </li>
          </ul>
          <Link
            href="/signup"
            className="bg-brand-500 hover:bg-brand-600 text-white font-medium py-4 px-10 rounded-2xl w-full max-w-sm transition-colors shadow-lg shadow-brand-200 cursor-pointer block text-center"
          >
            See how it works
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
                  Product <span className="text-[10px]">▼</span>
                </button>
              </div>
              {/* Research Card Top Left */}
              <div className="absolute top-4 left-4 bg-white p-2 rounded-[1.5rem] shadow-xl flex items-center gap-4 w-64 h-24">
                <div className="ml-4 flex-1">
                  <div className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-[10px] mb-1 text-gray-500">
                    ↗
                  </div>
                  <p className="text-sm font-bold leading-tight text-slate-800">
                    Research and Expertise
                  </p>
                </div>
                <div className="w-20 h-20 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0 relative">
                  <Image
                    alt="Researcher"
                    className="object-cover"
                    src="/images/researcher.jpg"
                    fill
                    sizes="80px"
                    priority
                  />
                </div>
              </div>
              {/* Bottom Tabs */}
              <div className="absolute bottom-8 flex gap-3">
                <div className="bg-white px-4 py-1.5 rounded-full text-[10px] text-slate-800 font-semibold border border-white shadow-sm">
                  Diagnostic
                </div>
                <div className="bg-white px-4 py-1.5 rounded-full text-[10px] text-slate-800 font-semibold border border-white shadow-sm">
                  Personalized
                </div>
                <div className="bg-white px-4 py-1.5 rounded-full text-[10px] text-slate-800 font-semibold border border-white shadow-sm">
                  CTI imaging
                </div>
                <div className="bg-white px-4 py-1.5 rounded-full text-[10px] text-slate-800 font-semibold border border-white shadow-sm">
                  Markers &amp; Indicators Analysis
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
              <h3 className="text-brand-900 font-bold mb-3 text-lg">Data integration</h3>
              <p className="text-brand-700/80 text-sm leading-relaxed font-medium">
                Securely upload a CSV file or connect to a data source. Show how the data matches
                the variables of your customized model.
              </p>
            </div>
            <div className="flex justify-between items-end mt-4">
              <div className="w-12 h-12 bg-white/90 rounded-xl flex items-center justify-center text-brand-50 text-2xl shadow-sm">
                📁
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
              <h3 className="font-bold mb-3 text-lg text-slate-900">Get Predictions</h3>
              <p className="text-slate-800/90 text-sm leading-relaxed mb-4 font-medium">
                Equip teams and departments with blazing fast predictive capabilities without
                machine learning expertise.
              </p>
              <a
                className="text-sm text-slate-900 font-bold hover:text-slate-700 transition-colors flex items-center gap-1"
                href="#"
              >
                Learn more <span className="text-xs">↗</span>
              </a>
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
                        <img
                          alt="Heart"
                          className="h-full object-contain filter grayscale contrast-125"
                          src="/images/doctor_hero.png"
                          style={{ clipPath: "circle(40% at center)" }}
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
                  <div className="mt-auto z-10 flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
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
                    <span className="text-xs font-bold">Download app</span>
                  </div>
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
                                Homemade Plain Waffles
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
                        You are on fire! Keep using the sandow app to gain more streak!
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

            {activeTab !== "overview" && activeTab !== "workout" && (
              <div className="flex-grow flex flex-col items-center justify-center p-8 bg-slate-50 rounded-[32px] border border-slate-100 min-h-[500px] text-center">
                <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-500">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Feature Coming Soon</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                  This preview section is under active clinical testing. You can explore the full
                  functional version of zorabihealth by entering the portal.
                </p>
                <Link
                  href="/login"
                  className="mt-6 inline-block bg-[#1e4a46] hover:bg-[#153633] text-white font-bold py-2.5 px-6 rounded-full text-xs transition-colors shadow-md cursor-pointer"
                >
                  Sign In to Full Dashboard
                </Link>
              </div>
            )}
          </div>
          {/* END: Dashboard Content Area */}
        </div>
      </section>
      {/* END: Integrated Health Dashboard */}

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
