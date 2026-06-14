import React from "react";

export default function PrivacyPolicyPage() {
  return (
    <div className="px-6 py-16 lg:px-10">
      <div className="mx-auto max-w-3xl prose prose-slate dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="lead">Last updated: June 14, 2026</p>

        <h2>1. Information We Collect</h2>
        <p>
          ZorabiHealth collects information necessary to provide our healthcare platform services.
          This includes personal identifiers (name, email, date of birth), protected health
          information (medical history, medication records, vital signs), and usage data
          (interaction logs, feature utilization).
        </p>

        <h2>2. How We Use Your Information</h2>
        <p>
          We use collected information to operate, maintain, and improve our platform; facilitate
          medication management and refill routing; provide clinical decision support insights;
          comply with legal and regulatory obligations; and communicate service-related
          announcements.
        </p>

        <h2>3. Data Sharing</h2>
        <p>
          We share data only with your explicit consent or as required by law. Authorized healthcare
          providers and pharmacy vendors receive access solely to data necessary for treatment,
          payment, and healthcare operations. We never sell personal information or PHI to third
          parties.
        </p>

        <h2>4. Data Security</h2>
        <p>
          We implement administrative, physical, and technical safeguards consistent with HIPAA and
          SOC 2 requirements. These include encryption at rest (AES-256) and in transit (TLS 1.3),
          access controls, audit logging, and regular security assessments.
        </p>

        <h2>5. Your Rights</h2>
        <p>
          You have the right to access, amend, and request deletion of your personal information.
          Patients may request an accounting of disclosures. Requests should be submitted to
          privacy@zorabihealth.com and will be processed within 30 days.
        </p>

        <h2>6. Data Retention</h2>
        <p>
          We retain PHI for the duration of your account plus seven years, consistent with medical
          record retention requirements. Anonymized data used for analytics and platform improvement
          may be retained indefinitely.
        </p>

        <h2>7. Contact</h2>
        <p>
          For privacy-related inquiries, contact our Privacy Officer at privacy@zorabihealth.com or
          write to ZorabiHealth, Inc., 450 Serene Parkway, Suite 300, San Francisco, CA 94107.
        </p>
      </div>
    </div>
  );
}
