"use client";

import React from "react";
import { Navbar1 } from "@/components/shadcnblocks-com-navbar1";
import { Footer } from "@/components/ui/footer";

const marketingMenu = [
  { title: "Home", url: "/" },
  {
    title: "Products",
    url: "#",
    items: [
      { title: "Products", url: "#", isSection: true },
      {
        title: "AI Voice Assistant",
        description: "Speech-to-text wellness logging powered by Deepgram.",
        icon: React.createElement(
          "svg",
          {
            className: "size-5 shrink-0 text-violet-500",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
          },
          React.createElement("path", {
            d: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z",
          }),
          React.createElement("path", { d: "M19 10v2a7 7 0 0 1-14 0v-2" }),
          React.createElement("line", { x1: "12", x2: "12", y1: "19", y2: "22" })
        ),
        url: "/dashboard/voice",
        badge: "Live",
      },
      {
        title: "Automated Refills",
        description: "Auto-vendor stock routing and real-time dispatch.",
        icon: React.createElement(
          "svg",
          {
            className: "size-5 shrink-0 text-emerald-500",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
          },
          React.createElement("path", { d: "M22 12h-4l-3 9L9 3l-3 9H2" })
        ),
        url: "/dashboard/pharmacy",
      },
      {
        title: "Push Alerts",
        description: "Real-time push with clinical escalation triggers.",
        icon: React.createElement(
          "svg",
          {
            className: "size-5 shrink-0 text-amber-500",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
          },
          React.createElement("path", { d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" }),
          React.createElement("path", { d: "M13.73 21a2 2 0 0 1-3.46 0" })
        ),
        url: "/dashboard/medications",
      },
      { title: "Use Cases", url: "#", isSection: true },
      {
        title: "Chronic Care Management",
        description: "End-to-end care coordination across specialties.",
        icon: React.createElement(
          "svg",
          {
            className: "size-5 shrink-0 text-rose-500",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
          },
          React.createElement("path", {
            d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
          })
        ),
        url: "/use-cases/chronic-care-management",
      },
      {
        title: "Medication Adherence",
        description: "Automated refill routing and compliance tracking.",
        icon: React.createElement(
          "svg",
          {
            className: "size-5 shrink-0 text-emerald-500",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
          },
          React.createElement("path", { d: "M10.5 4.5 3 12l3.5 3.5" }),
          React.createElement("path", { d: "M21 12H11" }),
          React.createElement("path", { d: "M11 18h10" })
        ),
        url: "/use-cases/medication-adherence",
      },
      {
        title: "Remote Patient Monitoring",
        description: "Real-time vitals and clinical telemetry dashboards.",
        icon: React.createElement(
          "svg",
          {
            className: "size-5 shrink-0 text-cyan-500",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
          },
          React.createElement("path", { d: "M22 12h-4l-3 9L9 3l-3 9H2" })
        ),
        url: "/use-cases/remote-patient-monitoring",
      },
      {
        title: "Clinical Decision Support",
        description: "AI-driven insights for care teams.",
        icon: React.createElement(
          "svg",
          {
            className: "size-5 shrink-0 text-blue-500",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
          },
          React.createElement("circle", { cx: "12", cy: "12", r: "10" }),
          React.createElement("path", { d: "M12 6v6l4 2" })
        ),
        url: "/use-cases/clinical-decision-support",
      },
      { title: "Documentation", url: "#", isSection: true },
      {
        title: "API Reference",
        description: "REST and WebSocket endpoints for all platform services.",
        icon: React.createElement(
          "svg",
          {
            className: "size-5 shrink-0 text-indigo-500",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
          },
          React.createElement("polyline", { points: "16 18 22 12 16 6" }),
          React.createElement("polyline", { points: "8 6 2 12 8 18" })
        ),
        url: "/docs/api-reference",
      },
      {
        title: "Integration Guide",
        description: "Connect your EHR, pharmacy, and lab systems.",
        icon: React.createElement(
          "svg",
          {
            className: "size-5 shrink-0 text-sky-500",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
          },
          React.createElement("path", {
            d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20",
          })
        ),
        url: "/docs/integration-guide",
      },
      {
        title: "SDK Quickstart",
        description: "Client libraries for Python, TypeScript, and Swift.",
        icon: React.createElement(
          "svg",
          {
            className: "size-5 shrink-0 text-teal-500",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
          },
          React.createElement("polyline", { points: "4 17 10 11 4 5" }),
          React.createElement("line", { x1: "12", y1: "19", x2: "20", y2: "19" })
        ),
        url: "/docs/sdk-quickstart",
      },
      {
        title: "Compliance & Security",
        description: "HIPAA, SOC 2, and data residency documentation.",
        icon: React.createElement(
          "svg",
          {
            className: "size-5 shrink-0 text-slate-500",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
          },
          React.createElement("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" })
        ),
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
        icon: React.createElement(
          "svg",
          {
            className: "size-5 shrink-0 text-blue-500",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
          },
          React.createElement("rect", {
            width: "18",
            height: "18",
            x: "3",
            y: "3",
            rx: "2",
            ry: "2",
          }),
          React.createElement("line", { x1: "3", y1: "9", x2: "21", y2: "9" }),
          React.createElement("line", { x1: "9", y1: "21", x2: "9", y2: "9" })
        ),
        url: "/dashboard",
      },
      {
        title: "Documentation",
        description: "Guides, tutorials, and platform reference.",
        icon: React.createElement(
          "svg",
          {
            className: "size-5 shrink-0 text-slate-500",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
          },
          React.createElement("path", {
            d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
          }),
          React.createElement("polyline", { points: "14 2 14 8 20 8" }),
          React.createElement("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
          React.createElement("line", { x1: "16", y1: "17", x2: "8", y2: "17" })
        ),
        url: "/docs",
      },
      {
        title: "API Reference",
        description: "Full API specification with interactive playground.",
        icon: React.createElement(
          "svg",
          {
            className: "size-5 shrink-0 text-indigo-500",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
          },
          React.createElement("polyline", { points: "16 18 22 12 16 6" }),
          React.createElement("polyline", { points: "8 6 2 12 8 18" })
        ),
        url: "/docs/api-reference",
      },
      {
        title: "Help Center",
        description: "FAQs, troubleshooting, and community forums.",
        icon: React.createElement(
          "svg",
          {
            className: "size-5 shrink-0 text-amber-500",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
          },
          React.createElement("circle", { cx: "12", cy: "12", r: "10" }),
          React.createElement("path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }),
          React.createElement("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })
        ),
        url: "/resources/help-center",
      },
      {
        title: "Clinical Verification",
        description: "Read about our compliance standards and HIPAA privacy alignment.",
        icon: React.createElement(
          "svg",
          {
            className: "size-5 shrink-0 text-emerald-500",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
          },
          React.createElement("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" })
        ),
        url: "/resources/clinical-verification",
      },
    ],
  },
  { title: "Pricing", url: "/pricing" },
];

const mobileExtraLinks = [
  { name: "Clinical Safety", url: "#" },
  { name: "Help & Support", url: "/resources/help-center" },
  { name: "API Docs", url: "/docs/api-reference" },
  { name: "Status", url: "#" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar1
        logo={{
          url: "/",
          src: "/logo/image/logo.png",
          alt: "ZorabiHealth",
          title: "ZorabiHealth",
        }}
        menu={marketingMenu}
        mobileExtraLinks={mobileExtraLinks}
        auth={{
          login: { text: "Log in", url: "/login" },
          signup: { text: "Sign up", url: "/signup" },
        }}
      />
      <main className="min-h-screen pt-16">{children}</main>
      <Footer />
    </>
  );
}
