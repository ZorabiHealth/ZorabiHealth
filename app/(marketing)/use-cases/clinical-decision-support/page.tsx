import React from "react";
import { DocsSidebar } from "@/components/marketing/docs-sidebar";
import { CheckCircle2, Brain, Search, Lightbulb } from "lucide-react";

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
  "AI-generated care summaries from voice logs reduce documentation time by 40%",
  "Cross-reference patient data against formularies and clinical guidelines in milliseconds",
  "Real-time drug-drug interaction alerts during medication review",
  "Population-level trend identification for proactive care interventions",
];

const features = [
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description:
      "Natural language processing extracts clinical entities from voice logs and surfaces relevant patterns, medication conflicts, and care gaps.",
  },
  {
    icon: Search,
    title: "Unified Patient Timeline",
    description:
      "Every data point — voice note, vital reading, refill event, alert — is displayed chronologically, giving clinicians a complete picture before every decision.",
  },
  {
    icon: Lightbulb,
    title: "Recommendation Engine",
    description:
      "Rule-based and ML-driven suggestions for medication adjustments, follow-up scheduling, and preventive screenings based on patient history.",
  },
];

export default function ClinicalDecisionSupportPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DocsSidebar sections={sections} />
      <div className="flex-1 px-8 py-12 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Clinical Decision Support
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Empower clinicians with AI-driven insights derived from the full patient journey.
            ZorabiHealth surfaces relevant patterns, medication interactions, and care gaps at the
            point of decision.
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
              <strong>Target audience:</strong> Physicians, medical directors, clinical informatics
              teams, and quality improvement leaders seeking data-driven decision support at the
              point of care.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
