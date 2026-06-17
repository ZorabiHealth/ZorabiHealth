import React from "react";
import Link from "next/link";
import { CheckCircle2, HelpCircle } from "lucide-react";

const plans = [
  {
    name: "Starter",
    description: "For independent practitioners and small clinics.",
    price: "$49",
    period: "/month",
    features: [
      "Up to 100 active patients",
      "Voice transcription (10 hrs/month)",
      "Basic automated refill routing",
      "Push notification alerts",
      "Email support (48h response)",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Professional",
    description: "For growing practices and mid-size clinics.",
    price: "$199",
    period: "/month",
    features: [
      "Up to 1,000 active patients",
      "Voice transcription (100 hrs/month)",
      "Advanced refill routing & vendor mgmt",
      "Clinical escalation alerts",
      "EHR integration (Epic, Cerner, athena)",
      "Phone & chat support (4h response)",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    description: "For health systems and large organizations.",
    price: "Custom",
    period: "",
    features: [
      "Unlimited active patients",
      "Unlimited voice transcription",
      "Custom refill routing algorithms",
      "Dedicated escalation workflows",
      "Full EHR + lab system integration",
      "Dedicated account manager",
      "SSO, audit logs, custom SLAs",
      "Priority support (30min response)",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="px-6 py-16 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Start with a 14-day free trial. No credit card required. All plans include HIPAA
            alignment, SOC 2 security, and standard integrations.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 transition-all ${
                plan.highlighted
                  ? "border-brand-200 bg-white shadow-lg shadow-brand-100 ring-1 ring-brand-500 dark:border-brand-800 dark:bg-slate-900 dark:shadow-brand-900/20"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{plan.name}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">{plan.period}</span>
                )}
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.name === "Enterprise" ? "mailto:sales@zorabihealth.com" : "/signup"}
                className={`mt-8 flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold transition-all ${
                  plan.highlighted
                    ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-200 hover:shadow-brand-300"
                    : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-4">
            <HelpCircle className="mt-0.5 size-5 shrink-0 text-slate-400" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Need a custom plan?</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                We offer tailored pricing for large health systems, government agencies, and
                non-profit organizations. Contact{" "}
                <a
                  href="mailto:sales@zorabihealth.com"
                  className="text-brand-600 underline hover:text-brand-700 dark:text-brand-400"
                >
                  sales@zorabihealth.com
                </a>{" "}
                to discuss your requirements.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
