"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Download,
  Smartphone,
  Shield,
  Zap,
  HeartPulse,
  Star,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Navbar1 } from "@/components/shadcnblocks-com-navbar1";

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

const features = [
  {
    icon: HeartPulse,
    title: "Clinical Dashboard",
    desc: "Real-time vitals, lab trends, and AI-driven insights",
  },
  { icon: Zap, title: "Voice Logging", desc: "Hands-free symptom tracking with Deepgram Nova-3" },
  { icon: Shield, title: "HIPAA Compliant", desc: "256-bit SSL encryption with SOC 2 compliance" },
  {
    icon: Smartphone,
    title: "Offline Mode",
    desc: "Access your health data even without internet",
  },
];

export default function DownloadPage() {
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [apkVersion, setApkVersion] = useState("1.0.0");
  const [apkSize, setApkSize] = useState("");

  useEffect(() => {
    const fetchApk = async () => {
      const { data } = supabase.storage
        .from("doctor_assets")
        .getPublicUrl("apk/zorabihealth-latest.apk");
      if (data?.publicUrl) {
        setApkUrl(data.publicUrl);
        const head = await fetch(data.publicUrl, { method: "HEAD" });
        if (head.ok) {
          const size = head.headers.get("content-length");
          if (size) setApkSize(`${(Number(size) / 1024 / 1024).toFixed(1)} MB`);
          const lastMod = head.headers.get("last-modified");
          if (lastMod) {
            const ver = new Date(lastMod).toISOString().slice(0, 10).replace(/-/g, ".");
            setApkVersion(ver);
          }
        }
      }
    };
    fetchApk();
  }, []);

  return (
    <>
      <Navbar1 {...demoData} />
      <main className="min-h-screen bg-white pt-24">
        {/* Hero */}
        <section className="px-6 py-16 md:py-24 max-w-5xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <Image
              src="/logo/image/logo.png"
              alt="ZorabiHealth"
              width={200}
              height={58}
              className="object-contain"
              unoptimized
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-4 tracking-tight">
            ZorabiHealth Mobile App
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Your complete clinical companion. Monitor vitals, track medications, log symptoms, and
            stay connected with your care team — all from your phone.
          </p>

          {/* Download Card */}
          <div className="max-w-md mx-auto bg-gradient-to-br from-brand-50 to-white border border-brand-100 rounded-3xl p-8 shadow-lg">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg">
                <Smartphone className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800">Android App</p>
                {apkSize && (
                  <p className="text-xs text-slate-500">
                    v{apkVersion} &middot; {apkSize}
                  </p>
                )}
              </div>
            </div>

            <a
              href={apkUrl || "#"}
              download
              className={`flex items-center justify-center gap-3 w-full py-4 rounded-2xl text-white font-bold text-lg transition-all shadow-lg ${
                apkUrl
                  ? "bg-brand-500 hover:bg-brand-600 shadow-brand-200"
                  : "bg-slate-300 cursor-not-allowed"
              }`}
            >
              <Download className="w-5 h-5" />
              {apkUrl ? "Download APK" : "Coming Soon"}
            </a>

            <p className="text-xs text-slate-400 mt-4">
              Sideload the APK on your Android device. Enable Install from Unknown Sources in
              Settings.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 py-16 bg-slate-50 border-t border-slate-100">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-black text-slate-800 text-center mb-12">
              Everything in the app
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-brand-600" />
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How to install */}
        <section className="px-6 py-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-slate-800 text-center mb-8">How to install</h2>
          <div className="space-y-4">
            {[
              "Download the APK file above on your Android phone",
              "Open Settings → Security → Enable Install from Unknown Sources",
              "Open the Downloads folder and tap the APK file",
              "Tap Install and then Open to launch ZorabiHealth",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4 bg-slate-50 rounded-2xl p-4">
                <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {i + 1}
                </div>
                <p className="text-slate-700 pt-1.5">{step}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-100 px-6 py-8 text-center text-sm text-slate-400">
          <Link href="/" className="hover:text-brand-500 transition-colors">
            Back to ZorabiHealth
          </Link>
        </footer>
      </main>
    </>
  );
}
