import React from "react";
import { DocsSidebar } from "@/components/marketing/docs-sidebar";
import { Shield, Lock, FileCheck, Eye, Server } from "lucide-react";

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

const pillars = [
  {
    icon: Shield,
    title: "HIPAA Alignment",
    description:
      "All protected health information (PHI) is encrypted at rest (AES-256) and in transit (TLS 1.3). Access controls follow the minimum necessary standard with audit logging for every data access event. Business Associate Agreements (BAAs) are executed with all subprocessors.",
  },
  {
    icon: FileCheck,
    title: "SOC 2 Type II",
    description:
      "ZorabiHealth undergoes annual SOC 2 Type II audits covering security, availability, and confidentiality trust service criteria. Our latest audit report is available under NDA to enterprise customers.",
  },
  {
    icon: Lock,
    title: "Data Encryption",
    description:
      "All data at rest uses AES-256 encryption with customer-managed key (CMK) options for enterprise plans. Data in transit is protected by TLS 1.3 with HSTS preloading. Voice and audio files are encrypted end-to-end during processing.",
  },
  {
    icon: Eye,
    title: "Access Controls",
    description:
      "Role-based access control (RBAC) with granular permissions for patients, providers, and pharmacy vendors. Multi-factor authentication (MFA) is enforced for all provider and vendor accounts. Session policies include idle timeout and concurrent session limits.",
  },
  {
    icon: Server,
    title: "Data Residency",
    description:
      "Primary data processing occurs in US-based AWS regions (us-east-1, us-west-2). EU data residency is available for enterprise customers through our Frankfurt deployment. Data export tools are provided for customer-initiated migration.",
  },
];

export default function ComplianceSecurityPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DocsSidebar sections={sections} />
      <div className="flex-1 px-8 py-12 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Compliance & Security
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            ZorabiHealth is built from the ground up with healthcare compliance and data security as
            foundational requirements. This page documents our controls, certifications, and
            practices.
          </p>

          <div className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-900/10">
            <p className="text-sm text-emerald-800 dark:text-emerald-300">
              <strong>Certification status:</strong> HIPAA aligned &bull; SOC 2 Type II audited
              &bull; HITRUST assessment in progress
            </p>
          </div>

          <div className="mt-12 space-y-8">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/20">
                      <Icon className="size-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {pillar.title}
                      </h3>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {pillar.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Request Compliance Documentation
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Enterprise customers can request our SOC 2 report, HIPAA self-assessment, and
              penetration testing summary by contacting{" "}
              <a
                href="mailto:security@zorabihealth.com"
                className="text-brand-600 underline hover:text-brand-700 dark:text-brand-400"
              >
                security@zorabihealth.com
              </a>
              .
            </p>
            <p className="mt-4 text-xs text-slate-400">
              <strong>Target audience:</strong> Compliance officers, security teams, legal counsel,
              and procurement reviewers conducting vendor risk assessments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
