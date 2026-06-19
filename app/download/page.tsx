"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Download,
  Smartphone,
  Shield,
  Zap,
  HeartPulse,
  Activity,
  Bell,
  Microscope,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { Navbar1 } from "@/components/shadcnblocks-com-navbar1";

/* ─── Nav ─────────────────────────────────────────────── */
const demoData = {
  logo: { url: "/", src: "/logo/image/logo.png", alt: "ZorabiHealth", title: "ZorabiHealth" },
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
          url: "/dashboard/voice",
        },
        {
          title: "Automated Refills",
          description: "Auto-vendor stock routing and real-time shipment dispatch.",
          url: "/dashboard/pharmacy",
        },
      ],
    },
    { title: "Pricing", url: "/pricing" },
    { title: "For Doctors", url: "/login" },
  ],
  auth: {
    login: { text: "Log in", url: "/login" },
    signup: { text: "Sign up", url: "/signup" },
  },
};

/* ─── Features ────────────────────────────────────────── */
const features = [
  {
    icon: HeartPulse,
    title: "Clinical Dashboard",
    desc: "Real-time vitals, lab trends, and AI-driven insights at a glance",
    color: "from-rose-400 to-pink-600",
    borderColor: "border-rose-100",
    glow: "rgba(244,63,94,0.10)",
  },
  {
    icon: Activity,
    title: "Voice Logging",
    desc: "Hands-free symptom tracking powered by Deepgram Nova-3 AI",
    color: "from-brand-400 to-brand-600",
    borderColor: "border-brand-100",
    glow: "rgba(14,165,233,0.10)",
  },
  {
    icon: Shield,
    title: "HIPAA Compliant",
    desc: "256-bit SSL encryption with SOC 2 Type II compliance",
    color: "from-emerald-400 to-teal-600",
    borderColor: "border-emerald-100",
    glow: "rgba(16,185,129,0.10)",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    desc: "Medication reminders and critical health notifications",
    color: "from-amber-400 to-orange-500",
    borderColor: "border-amber-100",
    glow: "rgba(245,158,11,0.10)",
  },
  {
    icon: Microscope,
    title: "Lab Integration",
    desc: "Seamless lab results and diagnostic data synchronisation",
    color: "from-violet-400 to-purple-600",
    borderColor: "border-violet-100",
    glow: "rgba(139,92,246,0.10)",
  },
  {
    icon: Zap,
    title: "Offline Mode",
    desc: "Access your complete health data even without internet",
    color: "from-cyan-400 to-brand-600",
    borderColor: "border-cyan-100",
    glow: "rgba(34,211,238,0.10)",
  },
];

/* ─── Feature card ────────────────────────────────────── */
function FeatureCard({
  icon: Icon,
  title,
  desc,
  color,
  borderColor,
  glow,
  index,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
  borderColor: string;
  glow: string;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ type: "spring", stiffness: 70, damping: 14, delay: index * 0.08 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={`group relative bg-white border ${borderColor} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-default overflow-hidden`}
    >
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${glow} 0%, transparent 70%)` }}
      />
      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm mb-3`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="font-bold text-slate-800 text-sm mb-1">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
      <motion.div
        className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${color} rounded-full`}
        initial={{ width: 0 }}
        animate={isInView ? { width: "100%" } : {}}
        transition={{ delay: index * 0.08 + 0.35, duration: 0.7, ease: "easeOut" }}
      />
    </motion.div>
  );
}

/* ─── APK Config ─── */
const APK_GITHUB_URL =
  "https://github.com/ZorabiHealth/zorabihealth-mobileApp/releases/download/v1.0.0/ZorabiCompanion.apk";
const APK_VERSION = "1.0.0";
const APK_SIZE = "107.9 MB";

/* ─── Page ────────────────────────────────────────────── */
export default function DownloadPage() {
  const APK_LIVE = true; // ✅ GitHub Release is live
  const apkUrl = APK_LIVE ? APK_GITHUB_URL : null;
  const apkVersion = APK_VERSION;
  const apkSize = APK_SIZE;

  return (
    <>
      <Navbar1 {...demoData} />
      <main className="bg-white overflow-x-hidden">
        {/* ══════════════════════════════════════════════
            HERO — Two column: text left, phone image right
        ══════════════════════════════════════════════ */}
        <section className="relative overflow-hidden">
          {/* Background shape */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_60%_40%,rgba(14,165,233,0.06)_0%,transparent_70%)]" />
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: "radial-gradient(circle, #bae6fd 1px, transparent 1px)",
                backgroundSize: "44px 44px",
              }}
            />
          </div>

          <div className="max-w-7xl mx-auto px-6 pt-28 pb-0 lg:pb-0">
            <div className="grid lg:grid-cols-2 gap-12 items-end">
              {/* LEFT — Copy */}
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="pb-16 lg:pb-24"
              >
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, y: -12, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-200 bg-brand-50 text-brand-700 text-xs font-bold tracking-widest uppercase mb-7"
                >
                  <motion.span
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-brand-500 inline-block"
                  />
                  Now Available · Android
                </motion.div>

                <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.05] text-slate-800 mb-6">
                  Your personal
                  <span className="block bg-gradient-to-r from-brand-500 to-clinical-500 bg-clip-text text-transparent">
                    physician in
                  </span>
                  your pocket.
                </h1>

                <p className="text-lg text-slate-500 leading-relaxed mb-10 max-w-lg">
                  Monitor vitals, log symptoms with your voice, and stay connected with your care
                  team — all from the ZorabiHealth app.
                </p>

                {/* Download CTA */}
                <div className="flex flex-col sm:flex-row gap-4 items-start mb-12">
                  <motion.a
                    href={apkUrl || "#"}
                    download
                    whileHover={
                      apkUrl ? { scale: 1.04, boxShadow: "0 12px 40px rgba(12,67,129,0.22)" } : {}
                    }
                    whileTap={apkUrl ? { scale: 0.97 } : {}}
                    className={`relative flex items-center gap-3 px-7 py-4 rounded-2xl text-white font-bold text-base overflow-hidden transition-all ${
                      apkUrl
                        ? "bg-gradient-to-r from-clinical-500 to-brand-600 shadow-lg shadow-clinical-500/20 cursor-pointer"
                        : "bg-slate-300 cursor-not-allowed"
                    }`}
                  >
                    {apkUrl && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "linear",
                          repeatDelay: 2,
                        }}
                      />
                    )}
                    <Download className="w-5 h-5 relative z-10" />
                    <span className="relative z-10">{apkUrl ? "Download APK" : "Coming Soon"}</span>
                  </motion.a>

                  {apkSize && (
                    <div className="flex items-center gap-2 text-slate-400 text-sm pt-3">
                      <Smartphone className="w-4 h-4" />v{apkVersion} · {apkSize}
                    </div>
                  )}
                </div>

                {/* Trust badges */}
                <div className="flex items-center gap-6 text-slate-400 text-xs">
                  {[
                    { icon: Shield, label: "HIPAA Compliant" },
                    { icon: Zap, label: "Free Download" },
                    { icon: CheckCircle2, label: "SOC 2 Verified" },
                  ].map(({ icon: I, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <I className="w-3.5 h-3.5 text-brand-400" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* RIGHT — Phone image */}
              <motion.div
                initial={{ opacity: 0, x: 40, y: 20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                className="relative flex justify-center lg:justify-end items-end"
              >
                {/* Soft glow behind phone */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-brand-200/30 blur-3xl pointer-events-none" />

                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10"
                >
                  <Image
                    src="/images/PHONE.png"
                    alt="ZorabiHealth App — Your personal physician in your pocket"
                    width={400}
                    height={680}
                    className="object-contain drop-shadow-2xl"
                    priority
                    unoptimized
                  />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            FEATURES GRID
        ══════════════════════════════════════════════ */}
        <section id="features" className="relative px-6 py-24 bg-white overflow-hidden">
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #e0f2fe 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <div className="max-w-6xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="text-center mb-12"
            >
              <motion.span
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-100 border border-brand-200 text-brand-700 text-xs font-bold mb-5 tracking-widest uppercase"
              >
                <Sparkles className="w-3 h-3" />
                Everything you need
              </motion.span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-4 tracking-tight">
                Built for modern{" "}
                <span className="bg-gradient-to-r from-brand-500 to-clinical-500 bg-clip-text text-transparent">
                  clinical care
                </span>
              </h2>
              <p className="text-slate-500 text-lg max-w-xl mx-auto leading-relaxed">
                Every feature designed to make your health journey smarter, faster, and more
                connected.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f, i) => (
                <FeatureCard key={f.title} {...f} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            HOW TO INSTALL
        ══════════════════════════════════════════════ */}
        <section className="relative px-6 py-24 bg-slate-50 overflow-hidden">
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #bae6fd 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />

          <div className="max-w-5xl mx-auto relative z-10">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-3xl font-black text-slate-800 text-center mb-14 tracking-tight"
            >
              Install in{" "}
              <span className="bg-gradient-to-r from-brand-500 to-clinical-500 bg-clip-text text-transparent">
                4 easy steps
              </span>
            </motion.h2>

            <div className="relative">
              {/* Connector line */}
              <div className="absolute top-8 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent hidden md:block" />

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
                {[
                  {
                    step: "01",
                    label: "Download",
                    desc: "Download the APK file above on your Android phone",
                  },
                  {
                    step: "02",
                    label: "Settings",
                    desc: "Open Settings → Security → Enable Install from Unknown Sources",
                  },
                  {
                    step: "03",
                    label: "Install",
                    desc: "Open the Downloads folder and tap the APK file",
                  },
                  {
                    step: "04",
                    label: "Launch",
                    desc: "Tap Install and then Open to launch ZorabiHealth",
                  },
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 32 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{ type: "spring", stiffness: 70, damping: 14, delay: i * 0.1 }}
                    whileHover={{ y: -4 }}
                    className="relative flex flex-col items-center text-center group"
                  >
                    <motion.div
                      whileHover={{ scale: 1.08, rotate: 3 }}
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-clinical-500 to-brand-600 flex items-center justify-center shadow-lg shadow-clinical-500/20 mb-4 relative z-10"
                    >
                      <span className="text-white font-black text-lg">{s.step}</span>
                    </motion.div>
                    <div className="absolute top-0 w-20 h-20 rounded-full bg-brand-200/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <h3 className="text-slate-800 font-bold mb-1.5 text-sm">{s.label}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">{s.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            DOWNLOAD CTA BANNER
        ══════════════════════════════════════════════ */}
        <section id="download" className="relative px-6 py-20 bg-white overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_50%_50%,rgba(14,165,233,0.05)_0%,transparent_70%)] pointer-events-none" />

          <div className="max-w-lg mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ type: "spring", stiffness: 65, damping: 14 }}
              className="relative group"
            >
              {/* Hover border glow */}
              <div
                className="absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(14,165,233,0.3), rgba(12,67,129,0.15), transparent)",
                }}
              />

              <div className="relative bg-gradient-to-br from-brand-50 to-white border border-brand-100 rounded-3xl p-8 shadow-lg group-hover:shadow-xl transition-shadow">
                {/* App info row */}
                <div className="flex items-center gap-4 mb-7">
                  <motion.div
                    whileHover={{ rotate: [0, -8, 8, 0], scale: 1.05 }}
                    transition={{ duration: 0.5 }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-clinical-500 to-brand-600 flex items-center justify-center shadow-lg shadow-clinical-500/25 shrink-0"
                  >
                    <Smartphone className="w-8 h-8 text-white" />
                  </motion.div>
                  <div>
                    <p className="font-black text-slate-800 text-lg leading-tight">ZorabiHealth</p>
                    <p className="text-slate-500 text-sm">Android App · Free</p>
                    {apkSize && (
                      <p className="text-slate-400 text-xs mt-0.5">
                        v{apkVersion} · {apkSize}
                      </p>
                    )}
                  </div>
                </div>

                {/* Button */}
                <motion.a
                  href={apkUrl || "#"}
                  download
                  whileHover={
                    apkUrl ? { scale: 1.02, boxShadow: "0 8px 40px rgba(12,67,129,0.22)" } : {}
                  }
                  whileTap={apkUrl ? { scale: 0.98 } : {}}
                  className={`relative flex items-center justify-center gap-3 w-full py-4 rounded-2xl text-white font-bold text-lg overflow-hidden transition-all ${
                    apkUrl
                      ? "bg-gradient-to-r from-clinical-500 to-brand-600 shadow-lg shadow-clinical-500/20 cursor-pointer"
                      : "bg-slate-200 cursor-not-allowed text-slate-400"
                  }`}
                >
                  {apkUrl && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "linear",
                        repeatDelay: 1.5,
                      }}
                    />
                  )}
                  <Download className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">{apkUrl ? "Download APK" : "Coming Soon"}</span>
                </motion.a>

                {/* Trust row */}
                <div className="mt-5 flex items-center justify-center gap-6 text-slate-400">
                  {[
                    { icon: Shield, label: "HIPAA Safe" },
                    { icon: Zap, label: "Free App" },
                    { icon: CheckCircle2, label: "Verified" },
                  ].map(({ icon: I, label }) => (
                    <div key={label} className="flex items-center gap-1 text-xs">
                      <I className="w-3.5 h-3.5 text-brand-500" />
                      {label}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-slate-400 mt-4 text-center leading-relaxed">
                  Sideload via Settings → Security → Install from Unknown Sources
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-100 px-6 py-8 text-center bg-white">
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-brand-500 transition-colors font-medium"
          >
            ← Back to ZorabiHealth
          </Link>
        </footer>
      </main>
    </>
  );
}
