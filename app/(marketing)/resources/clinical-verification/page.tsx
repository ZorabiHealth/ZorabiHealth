import React from "react";
import { DocsSidebar } from "@/components/marketing/docs-sidebar";
import { Shield, CheckCircle2, FileCheck, Lock, Eye, Server } from "lucide-react";

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

const verifications = [
  {
    icon: Shield,
    title: "HIPAA Alignment",
    description:
      "ZorabiHealth completes an annual HIPAA security assessment. All PHI handling follows the Privacy Rule, Security Rule, and Breach Notification Rule. We sign BAAs with every customer and subprocessor.",
  },
  {
    icon: FileCheck,
    title: "SOC 2 Type II",
    description:
      "Our SOC 2 Type II report, audited annually by an independent CPA firm, covers the Security, Availability, and Confidentiality trust service criteria. Reports are available under NDA.",
  },
  {
    icon: Lock,
    title: "Encryption Standards",
    description:
      "Data at rest is encrypted with AES-256 using customer-managed key (CMK) support for enterprise plans. Data in transit uses TLS 1.3 with HSTS. Voice and audio are encrypted end-to-end.",
  },
  {
    icon: Eye,
    title: "Access Governance",
    description:
      "Granular RBAC with distinct permission sets for patients, doctors, and pharmacy vendors. MFA enforced for all provider accounts. Full audit trail with 7-year retention.",
  },
  {
    icon: Server,
    title: "Infrastructure Security",
    description:
      "All infrastructure runs on AWS with HIPAA-eligible services. Network segmentation, WAF, IDS/IPS, and 24/7 SOC monitoring are in place. Penetration tests are conducted quarterly.",
  },
];

export default function ClinicalVerificationPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DocsSidebar sections={sections} />
      <div className="flex-1 px-8 py-12 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Clinical Verification
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            ZorabiHealth is designed and operated to meet the rigorous security, privacy, and
            compliance requirements of healthcare. This page details our verification posture and
            available documentation.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {["HIPAA Aligned", "SOC 2 Audited", "AES-256", "TLS 1.3", "MFA", "RBAC"].map(
              (badge) => (
                <span
                  key={badge}
                  className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                >
                  <CheckCircle2 className="size-3" />
                  {badge}
                </span>
              )
            )}
          </div>

          <div className="mt-12 space-y-6">
            {verifications.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/20">
                      <Icon className="size-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {v.title}
                      </h3>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {v.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Verification Requests
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Enterprise customers and prospects under active evaluation can request our complete
              compliance package including SOC 2 report, HIPAA assessment summary, penetration test
              results, and BAA template. Contact{" "}
              <a
                href="mailto:security@zorabihealth.com"
                className="text-brand-600 underline hover:text-brand-700 dark:text-brand-400"
              >
                security@zorabihealth.com
              </a>
              .
            </p>
            <p className="mt-4 text-xs text-slate-400">
              <strong>Target audience:</strong> Compliance officers, security architects, legal
              counsel, and procurement teams conducting vendor risk assessments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
