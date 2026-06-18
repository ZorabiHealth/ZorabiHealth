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

const languages = [
  {
    name: "Python",
    install: "pip install zorabihealth-sdk",
    code: `from zorabihealth import Client

client = Client(api_key="YOUR_API_KEY")

# Create a voice session
session = client.voice.create_session(
    patient_id="pat_abc123",
    provider="deepgram",
)

# Submit audio for transcription
transcript = client.voice.transcribe(
    session_id=session.id,
    audio_file="consultation.mp3",
)

print(transcript.text)`,
  },
  {
    name: "TypeScript",
    install: "npm install @zorabihealth/sdk",
    code: `import { ZorabiHealthClient } from "@zorabihealth/sdk";

const client = new ZorabiHealthClient({
  apiKey: "YOUR_API_KEY",
});

// Submit a refill request
const refill = await client.refills.create({
  prescriptionId: "rx_456",
  pharmacyVendorId: "vendor_789",
  quantity: 90,
});

console.log(refill.trackingId);`,
  },
  {
    name: "Swift",
    install: `// Add to your Package.swift
.package(url: "https://github.com/zorabihealth/sdk-swift", from: "1.0.0")`,
    code: `import ZorabiHealthSDK

let client = ZorabiHealthClient(apiKey: "YOUR_API_KEY")

// Send a push alert
try await client.alerts.send(
    PushAlert(
        patientId: "pat_abc123",
        title: "Medication Reminder",
        body: "Time to take your evening dose.",
        severity: .standard
    )
)`,
  },
];

export default function SdkQuickstartPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DocsSidebar sections={sections} />
      <div className="flex-1 px-8 py-12 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            SDK Quickstart
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Client libraries for Python, TypeScript, and Swift. Each SDK mirrors the REST API
            surface with native async patterns, type definitions, and automatic retry logic.
          </p>

          <div className="space-y-12">
            {languages.map((lang) => (
              <section key={lang.name}>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {lang.name}
                </h2>
                <p className="mt-1 mb-4 text-sm text-slate-500">
                  Install with{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm dark:bg-slate-800">
                    {lang.install}
                  </code>
                </p>
                <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-900 p-4 text-sm text-slate-100 dark:border-slate-700">
                  <code>{lang.code}</code>
                </pre>
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              SDK Conventions
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                All SDKs use Bearer token authentication via the{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">
                  api_key
                </code>{" "}
                parameter.
              </li>
              <li>
                Automatic retry with exponential backoff for 5xx responses (3 retries by default).
              </li>
              <li>
                Every method returns a structured response object with TypeScript/Pydantic models.
              </li>
              <li>File uploads (audio, images) support streaming for large payloads.</li>
            </ul>
            <p className="mt-4 text-xs text-slate-400">
              <strong>Target audience:</strong> Mobile and frontend developers building
              patient-facing or provider-facing applications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
