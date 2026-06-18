import React from "react";
import Link from "next/link";
import { DocsSidebar } from "@/components/marketing/docs-sidebar";
import { FileText, FileCode, Users, Shield, ArrowRight } from "lucide-react";

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

const cards = [
  {
    title: "Patient Portal",
    description: "Access your clinical indicators, medication logs, and telemetry dashboards.",
    icon: FileText,
    href: "/dashboard",
    audience: "Patients & providers",
  },
  {
    title: "Documentation",
    description: "Guides, tutorials, API reference, and SDK quickstarts.",
    icon: FileCode,
    href: "/docs",
    audience: "Developers & integrators",
  },
  {
    title: "Help Center",
    description: "FAQs, troubleshooting guides, and community forums.",
    icon: Users,
    href: "/resources/help-center",
    audience: "All users",
  },
  {
    title: "Clinical Verification",
    description: "Compliance standards, HIPAA alignment, and security practices.",
    icon: Shield,
    href: "/resources/clinical-verification",
    audience: "Compliance & security teams",
  },
];

export default function ResourcesOverviewPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DocsSidebar sections={sections} />
      <div className="flex-1 px-8 py-12 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Resources
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Everything you need to get the most out of ZorabiHealth — from help articles and
            community support to compliance documentation and patient portals.
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
