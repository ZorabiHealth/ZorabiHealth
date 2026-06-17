import React from "react";
import Link from "next/link";
import { DocsSidebar } from "@/components/marketing/docs-sidebar";
import { Code, BookOpen, Shield, Terminal, ArrowRight } from "lucide-react";

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

const cards = [
  {
    title: "API Reference",
    description:
      "Complete REST and WebSocket API documentation for all ZorabiHealth platform services.",
    icon: Code,
    href: "/docs/api-reference",
    audience: "Developers & engineering teams",
  },
  {
    title: "Integration Guide",
    description: "Step-by-step instructions for connecting EHR, pharmacy, and laboratory systems.",
    icon: BookOpen,
    href: "/docs/integration-guide",
    audience: "Integration specialists & IT staff",
  },
  {
    title: "SDK Quickstart",
    description: "Get up and running with our client libraries for Python, TypeScript, and Swift.",
    icon: Terminal,
    href: "/docs/sdk-quickstart",
    audience: "Mobile & frontend developers",
  },
  {
    title: "Compliance & Security",
    description: "HIPAA alignment, SOC 2 certification, data residency, and audit documentation.",
    icon: Shield,
    href: "/docs/compliance-security",
    audience: "Compliance officers & security teams",
  },
];

export default function DocsOverviewPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DocsSidebar sections={sections} />
      <div className="flex-1 px-8 py-12 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Documentation
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Everything you need to integrate, extend, and deploy ZorabiHealth across your healthcare
            organization. Browse our guides, API specs, and compliance references.
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
