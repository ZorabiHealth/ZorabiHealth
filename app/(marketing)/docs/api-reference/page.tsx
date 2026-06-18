import React from "react";
import { DocsSidebar } from "@/components/marketing/docs-sidebar";

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

const endpoints = [
  {
    method: "POST",
    path: "/v1/voice/transcribe",
    description: "Submit audio for Deepgram-powered transcription and clinical entity extraction.",
  },
  {
    method: "GET",
    path: "/v1/voice/sessions",
    description: "List all voice sessions for the authenticated patient or provider.",
  },
  {
    method: "POST",
    path: "/v1/refills/route",
    description: "Trigger automated refill routing to the optimal pharmacy vendor.",
  },
  {
    method: "GET",
    path: "/v1/refills/status",
    description: "Check the real-time status of a refill order.",
  },
  {
    method: "POST",
    path: "/v1/alerts/push",
    description: "Send a clinical push alert with optional escalation flags.",
  },
  {
    method: "GET",
    path: "/v1/patients/:id/journey",
    description:
      "Retrieve the unified patient journey trace across voice, vitals, and medications.",
  },
  {
    method: "POST",
    path: "/v1/medications/track",
    description: "Log a medication event (taken, skipped, delayed) with adherence scoring.",
  },
  {
    method: "GET",
    path: "/v1/analytics/trends",
    description: "Aggregated clinical telemetry trends filtered by date range and metric.",
  },
];

export default function ApiReferencePage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DocsSidebar sections={sections} />
      <div className="flex-1 px-8 py-12 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            API Reference
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            RESTful and WebSocket APIs powering ZorabiHealth&apos;s voice, refill, alert, and
            analytics services. All endpoints require a valid API key passed via the
            <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              Authorization
            </code>
            header.
          </p>

          <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold">Base URL:</span>{" "}
              <code className="rounded bg-slate-200 px-2 py-0.5 text-sm font-mono text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                https://api.zorabihealth.com/v1
              </code>
            </p>
          </div>

          <h2 className="mt-12 mb-6 text-2xl font-semibold text-slate-900 dark:text-white">
            Endpoints
          </h2>
          <div className="space-y-4">
            {endpoints.map((ep) => (
              <div
                key={ep.path}
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                      ep.method === "GET"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}
                  >
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono text-slate-800 dark:text-slate-200">
                    {ep.path}
                  </code>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{ep.description}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-12 mb-6 text-2xl font-semibold text-slate-900 dark:text-white">
            Authentication
          </h2>
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              All API requests require a Bearer token obtained through OAuth 2.0 client credentials
              flow. Tokens expire after 24 hours. Include your API key in every request header:
            </p>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
              <code>{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://api.zorabihealth.com/v1/patients/:id/journey`}</code>
            </pre>
            <p className="mt-4 text-sm text-slate-500">
              <strong>Target audience:</strong> Developers and engineering teams integrating
              ZorabiHealth into existing healthcare workflows.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
