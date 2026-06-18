import React from "react";
import { DocsSidebar } from "@/components/marketing/docs-sidebar";
import { Search, MessageCircle, ChevronRight } from "lucide-react";

const sections = [
  {
    title: "Resources",
    items: [
      { title: "Overview", url: "/resources" },
      { title: "Help Center", url: "/resources/help-center" },
      { title: "Clinical Verification", url: "/resources/clinical-verification" },
    ],
  },
];

const faqs = [
  {
    q: "How do I reset my password?",
    a: "Navigate to the login page and click 'Forgot password'. Enter your registered email address and follow the password reset link sent to your inbox. For security, reset links expire after 60 minutes.",
  },
  {
    q: "How does the automated refill routing work?",
    a: "When a prescription is due for refill, ZorabiHealth queries all connected pharmacy vendors for stock availability and pricing. The system selects the optimal vendor based on proximity, inventory, and patient preference, then dispatches the order automatically.",
  },
  {
    q: "Is my health data secure?",
    a: "Yes. ZorabiHealth is HIPAA-aligned and SOC 2 Type II audited. All PHI is encrypted at rest (AES-256) and in transit (TLS 1.3). We execute Business Associate Agreements with all subprocessors and enforce MFA for provider accounts.",
  },
  {
    q: "Can I integrate ZorabiHealth with my existing EHR?",
    a: "Yes. ZorabiHealth supports integration with Epic, Cerner, athenahealth, DrChrono, and other major EHR platforms. See our Integration Guide for detailed setup instructions.",
  },
  {
    q: "What voice providers do you support?",
    a: "We currently use Deepgram Nova-3 for speech-to-text transcription. Our architecture supports pluggable provider backends, and we are evaluating additional providers for future releases.",
  },
  {
    q: "How do I invite patients to use the portal?",
    a: "Providers can invite patients directly from the dashboard. Invitations are sent via email or SMS and include a secure onboarding link. Patients set their own credentials during first login.",
  },
];

const topics = [
  { title: "Getting Started", description: "Account setup, onboarding, and basic navigation." },
  { title: "Patient Portal", description: "Accessing vitals, medications, and voice logs." },
  { title: "Pharmacy & Refills", description: "Managing prescriptions, vendors, and routing." },
  { title: "Integrations", description: "Connecting EHR, APIs, and third-party services." },
  { title: "Billing & Plans", description: "Subscription management, invoices, and plan changes." },
  {
    title: "Security & Compliance",
    description: "HIPAA, SOC 2, data privacy, and access control.",
  },
];

export default function HelpCenterPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DocsSidebar sections={sections} />
      <div className="flex-1 px-8 py-12 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Help Center
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Find answers to common questions, browse topic guides, or reach out to our support team.
          </p>

          <div className="mt-8 relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search help articles..."
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-brand-400"
            />
          </div>

          <h2 className="mt-12 mb-4 text-2xl font-semibold text-slate-900 dark:text-white">
            Browse by Topic
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {topics.map((topic) => (
              <div
                key={topic.title}
                className="group cursor-pointer rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-brand-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-800"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{topic.title}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {topic.description}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-slate-400 transition-colors group-hover:text-brand-600" />
                </div>
              </div>
            ))}
          </div>

          <h2 className="mt-12 mb-6 text-2xl font-semibold text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                  {faq.q}
                  <ChevronRight className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                </summary>
                <div className="border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </details>
            ))}
          </div>

          <div className="mt-12 rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-4">
              <MessageCircle className="size-8 text-brand-600 dark:text-brand-400" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Still need help?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Our support team responds within 2 hours during business hours.{" "}
                  <a
                    href="mailto:support@zorabihealth.com"
                    className="text-brand-600 underline hover:text-brand-700 dark:text-brand-400"
                  >
                    support@zorabihealth.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
