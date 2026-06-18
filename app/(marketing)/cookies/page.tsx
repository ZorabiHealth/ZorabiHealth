import React from "react";

export default function CookieSettingsPage() {
  return (
    <div className="px-6 py-16 lg:px-10">
      <div className="mx-auto max-w-3xl prose prose-slate dark:prose-invert">
        <h1>Cookie Settings</h1>
        <p className="lead">Last updated: June 14, 2026</p>

        <h2>1. What Are Cookies</h2>
        <p>
          Cookies are small text files stored on your device by your web browser. ZorabiHealth uses
          cookies and similar tracking technologies to operate, secure, and improve our platform.
        </p>

        <h2>2. Types of Cookies We Use</h2>

        <h3>Essential Cookies</h3>
        <p>
          Required for platform functionality, including session management, authentication, and
          security. These cannot be disabled.
        </p>

        <h3>Functional Cookies</h3>
        <p>
          Remember your preferences, such as dark mode, language, and notification settings.
          Disabling these may affect your experience.
        </p>

        <h3>Analytics Cookies</h3>
        <p>
          Help us understand how the platform is used, which features are most popular, and where
          users encounter issues. We use aggregated, de-identified data only.
        </p>

        <h2>3. Third-Party Cookies</h2>
        <p>
          We use limited third-party services for analytics and error tracking. These providers are
          contractually bound to process data only on our instructions and in compliance with HIPAA.
          No PHI is shared with analytics providers.
        </p>

        <h2>4. Managing Cookies</h2>
        <p>
          You can control cookie preferences through your browser settings. Note that disabling
          essential cookies will prevent the platform from functioning correctly. Most browsers
          provide options to block, delete, or allow cookies on a per-site basis.
        </p>

        <h2>5. Do Not Track</h2>
        <p>
          ZorabiHealth does not respond to browser Do Not Track signals at this time. We do not
          engage in cross-site tracking for advertising purposes.
        </p>

        <h2>6. Contact</h2>
        <p>For cookie-related inquiries, contact privacy@zorabihealth.com.</p>
      </div>
    </div>
  );
}
