import React from "react";
import { DocsSidebar } from "@/components/marketing/docs-sidebar";
import { CheckCircle2, Bell, Route, BarChart3 } from "lucide-react";

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
  "27% improvement in on-time prescription refill rates",
  "54% reduction in missed-dose events with push alert escalation",
  "89% patient satisfaction score with automated refill experience",
  "Real-time adherence dashboards for pharmacy and provider teams",
];

const features = [
  {
    icon: Route,
    title: "Smart Refill Routing",
    description:
      "When a prescription is due, ZorabiHealth automatically queries vendor inventory, selects the optimal pharmacy, and dispatches the order — all without staff intervention.",
  },
  {
    icon: Bell,
    title: "Multi-Channel Reminders",
    description:
      "Patients receive push notifications, SMS, or voice call reminders based on their preference. Missed acknowledgments trigger escalation to a designated caregiver.",
  },
  {
    icon: BarChart3,
    title: "Adherence Analytics",
    description:
      "Providers and pharmacists access real-time adherence rates, dose timeliness metrics, and trend reports to identify patients needing intervention.",
  },
];

export default function MedicationAdherencePage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DocsSidebar sections={sections} />
      <div className="flex-1 px-8 py-12 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Medication Adherence
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Improve adherence rates across your patient population with automated refill routing,
            intelligent reminders, and real-time compliance tracking that connects patients,
            pharmacies, and providers.
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
              <strong>Target audience:</strong> Pharmacists, primary care providers, and health plan
              administrators responsible for medication adherence quality measures (e.g., PDC, MPR).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
