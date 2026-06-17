import React from "react";

export default function TermsOfServicePage() {
  return (
    <div className="px-6 py-16 lg:px-10">
      <div className="mx-auto max-w-3xl prose prose-slate dark:prose-invert">
        <h1>Terms of Service</h1>
        <p className="lead">Last updated: June 14, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using ZorabiHealth, you agree to be bound by these Terms of Service. If
          you are using the platform on behalf of a healthcare organization, you represent that you
          have authority to bind that organization.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          ZorabiHealth provides a digital health platform including AI-powered voice transcription,
          automated medication refill routing, push notification alerts, patient journey tracking,
          and clinical decision support tools. Features vary by subscription plan.
        </p>

        <h2>3. User Responsibilities</h2>
        <p>
          You agree to maintain accurate account information, safeguard login credentials, comply
          with all applicable laws including HIPAA, use the platform only for authorized healthcare
          purposes, and promptly report any security incidents or unauthorized access.
        </p>

        <h2>4. Account Termination</h2>
        <p>
          Either party may terminate the agreement with 30 days written notice. ZorabiHealth may
          suspend access for material breach of terms. Upon termination, your data will be exported
          and provided within 30 days, after which it will be deleted per our data retention policy.
        </p>

        <h2>5. Limitation of Liability</h2>
        <p>
          ZorabiHealth provides the platform as a tool to support clinical decision-making but does
          not replace professional medical judgment. We are not liable for clinical outcomes
          resulting from use of the platform. Our aggregate liability is limited to fees paid in the
          12 months preceding the claim.
        </p>

        <h2>6. Intellectual Property</h2>
        <p>
          ZorabiHealth retains all rights to the platform, including proprietary algorithms, machine
          learning models, and software. Customer data remains the property of the customer or their
          patients.
        </p>

        <h2>7. Changes to Terms</h2>
        <p>
          We may update these terms with 30 days notice. Continued use after the effective date
          constitutes acceptance of the revised terms. Material changes will be communicated via
          email and in-app notification.
        </p>

        <h2>8. Contact</h2>
        <p>
          Questions about these terms should be directed to legal@zorabihealth.com or ZorabiHealth,
          Inc., 450 Serene Parkway, Suite 300, San Francisco, CA 94107.
        </p>
      </div>
    </div>
  );
}
