import React from "react";
import { DocsSidebar } from "@/components/marketing/docs-sidebar";
import { CheckCircle2 } from "lucide-react";

const sections = [
  {
    title: "Documentation",
    items: [
      { title: "Overview", url: "/docs" },
      { title: "API Reference", url: "/docs/api-reference" },
      { title: "Integration Guide", url: "/docs/integration-guide" },
      { title: "SDK Quickstart", url: "/docs/sdk-quickstart" },
      { title: "Compliance & Security", url: "/docs/compliance-security" },
    ],
  },
];

const steps = [
  {
    title: "Provision Credentials",
    description:
      "Register your organization in the ZorabiHealth Partner Portal to generate API keys and webhook signing secrets. Each environment (sandbox, staging, production) receives isolated credentials.",
  },
  {
    title: "Configure Webhook Endpoints",
    description:
      "Set up webhook receivers for critical events: refill_status.updated, alert.escalated, voice.transcription.completed. We recommend idempotent handlers with at-least-once delivery semantics.",
  },
  {
    title: "Map Clinical Data Models",
    description:
      "Align your EHR's patient, medication, and provider schemas with ZorabiHealth's unified entity model. The Patient Journey API accepts bulk uploads for historical data backfill.",
  },
  {
    title: "Test in Sandbox",
    description:
      "Execute our integration test suite against the sandbox environment. Validate end-to-end flows: voice session creation, refill routing, alert dispatch, and telemetry ingestion.",
  },
  {
    title: "Go Live",
    description:
      "Promote to production after successful sandbox validation. Enable gradual rollout with our feature-flag system and monitor via the operational dashboard.",
  },
];

const systems = [
  "Epic EHR",
  "Cerner",
  "athenahealth",
  "DrChrono",
  "McKesson Pharmacy",
  "ScriptPro",
];

export default function IntegrationGuidePage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DocsSidebar sections={sections} />
      <div className="flex-1 px-8 py-12 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Integration Guide
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Connect ZorabiHealth to your existing healthcare stack. This guide walks integration
            specialists and IT teams through the full deployment lifecycle.
          </p>

          <div className="mt-8 rounded-lg border border-slate-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/10">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Estimated time:</strong> 2–4 weeks for full integration including EHR
              connectivity, pharmacy vendor onboarding, and compliance review.
            </p>
          </div>

          <h2 className="mt-12 mb-6 text-2xl font-semibold text-slate-900 dark:text-white">
            Integration Steps
          </h2>
          <ol className="space-y-6">
            {steps.map((step, idx) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                  {idx + 1}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <h2 className="mt-12 mb-6 text-2xl font-semibold text-slate-900 dark:text-white">
            Supported Systems
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {systems.map((system) => (
              <div
                key={system}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <CheckCircle2 className="size-5 text-emerald-500" />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {system}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Need Help?</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Our solutions engineering team provides dedicated support during integration. Contact
              us at{" "}
              <a
                href="mailto:integrations@zorabihealth.com"
                className="text-brand-600 underline hover:text-brand-700 dark:text-brand-400"
              >
                integrations@zorabihealth.com
              </a>
              .
            </p>
            <p className="mt-4 text-xs text-slate-400">
              <strong>Target audience:</strong> Integration specialists, IT staff, and EHR
              coordinators responsible for connecting external platforms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
