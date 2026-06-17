import React from "react";
import Link from "next/link";
import { DocsSidebar } from "@/components/marketing/docs-sidebar";
import { HeartPulse, Pill, Microscope, Stethoscope, ArrowRight } from "lucide-react";

const sections = [
  {
    title: "Use Cases",
    items: [
      { title: "Overview", url: "/use-cases" },
      { title: "Chronic Care Management", url: "/use-cases/chronic-care-management" },
      { title: "Medication Adherence", url: "/use-cases/medication-adherence" },
      { title: "Remote Patient Monitoring", url: "/use-cases/remote-patient-monitoring" },
      { title: "Clinical Decision Support", url: "/use-cases/clinical-decision-support" },
    ],
  },
];

const cards = [
  {
    title: "Chronic Care Management",
    description:
      "Coordinate care across specialties with AI-powered voice logging, automated refills, and unified patient journey tracking.",
    icon: HeartPulse,
    href: "/use-cases/chronic-care-management",
    audience: "Care coordinators & chronic disease managers",
  },
  {
    title: "Medication Adherence",
    description:
      "Reduce non-adherence with automated refill routing, push reminders, and real-time compliance dashboards.",
    icon: Pill,
    href: "/use-cases/medication-adherence",
    audience: "Pharmacists & providers",
  },
  {
    title: "Remote Patient Monitoring",
    description:
      "Monitor vitals, symptoms, and medication logs from anywhere with clinical telemetry and escalation alerts.",
    icon: Microscope,
    href: "/use-cases/remote-patient-monitoring",
    audience: "Clinicians & hospital administrators",
  },
  {
    title: "Clinical Decision Support",
    description:
      "Surface AI-driven insights from patient journey data to support diagnosis, medication review, and care planning.",
    icon: Stethoscope,
    href: "/use-cases/clinical-decision-support",
    audience: "Physicians & clinical informatics teams",
  },
];

export default function UseCasesOverviewPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DocsSidebar sections={sections} />
      <div className="flex-1 px-8 py-12 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Use Cases
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            See how ZorabiHealth transforms healthcare delivery across the care continuum. Each use
            case outlines the problem, our solution, and measurable outcomes for health systems,
            clinics, and pharmacies.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-brand-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-800"
                >
                  <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/20">
                    <Icon className="size-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {card.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      For {card.audience}
                    </span>
                    <ArrowRight className="size-4 text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-brand-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
