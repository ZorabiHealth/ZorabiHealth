import React from "react";
import { DocsSidebar } from "@/components/marketing/docs-sidebar";
import { CheckCircle2, Sparkles, Zap, Users } from "lucide-react";

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

const outcomes = [
  "42% reduction in 30-day readmission rates across pilot programs",
  "3.1x improvement in care plan compliance with voice-logged check-ins",
  "68% reduction in administrative time spent on care coordination",
  "Real-time visibility across primary care, specialists, and pharmacy vendors",
];

const features = [
  {
    icon: Sparkles,
    title: "AI Voice Logging",
    description:
      "Patients log daily symptoms and concerns via speech-to-text, automatically categorized and routed to the care team.",
  },
  {
    icon: Zap,
    title: "Automated Refill Routing",
    description:
      "Prescriptions are routed to the optimal pharmacy vendor based on stock, location, and patient preference.",
  },
  {
    icon: Users,
    title: "Unified Care Team View",
    description:
      "Every touchpoint — voice note, refill request, vital reading — is threaded into a single patient journey timeline.",
  },
];

export default function ChronicCarePage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DocsSidebar sections={sections} />
      <div className="flex-1 px-8 py-12 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Chronic Care Management
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Coordinate care across multiple specialties for patients with chronic conditions such as
            diabetes, hypertension, and COPD. ZorabiHealth unifies voice logs, medication refills,
            and vitals into a single, actionable timeline.
          </p>

          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Measurable Outcomes
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {outcomes.map((o) => (
                <li
                  key={o}
                  className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  {o}
                </li>
              ))}
            </ul>
          </div>

          <h2 className="mt-12 mb-6 text-2xl font-semibold text-slate-900 dark:text-white">
            How It Works
          </h2>
          <div className="space-y-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/20">
                    <Icon className="size-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {f.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <strong>Target audience:</strong> Care coordinators, chronic disease managers, and
              health systems looking to reduce readmissions and improve care plan adherence across
              their patient population.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
