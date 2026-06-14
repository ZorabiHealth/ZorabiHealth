import React from "react";
import { DocsSidebar } from "@/components/marketing/docs-sidebar";
import { CheckCircle2, Activity, AlertTriangle, LineChart } from "lucide-react";

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
  "36% faster clinical response to abnormal vital readings",
  "Continuous telemetry ingestion from wearables and patient-reported data",
  "Automated escalation workflows based on configurable threshold rules",
  "Reduced in-person visit frequency for stable chronic patients",
];

const features = [
  {
    icon: Activity,
    title: "Real-Time Telemetry",
    description:
      "Ingest vital signs from connected devices (BP cuffs, glucometers, pulse oximeters) and patient-reported symptom logs in real time.",
  },
  {
    icon: AlertTriangle,
    title: "Smart Escalation",
    description:
      "Configurable clinical thresholds trigger push alerts to the care team. Escalation chains ensure no critical reading goes unnoticed.",
  },
  {
    icon: LineChart,
    title: "Trend Analytics",
    description:
      "Visualize patient vitals over time with aggregate views for population health management and individual trend lines for clinical review.",
  },
];

export default function RemotePatientMonitoringPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DocsSidebar sections={sections} />
      <div className="flex-1 px-8 py-12 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Remote Patient Monitoring
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Extend clinical oversight beyond the exam room. ZorabiHealth&apos;s remote monitoring
            platform ingests vitals, symptoms, and medication data from any location, with
            intelligent escalation when intervention thresholds are crossed.
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
              <strong>Target audience:</strong> Clinicians, hospital administrators, home health
              agencies, and value-based care organizations scaling remote care programs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
