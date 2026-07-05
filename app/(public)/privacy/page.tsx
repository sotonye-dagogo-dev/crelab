import { DEFAULT_CONFIG } from "@/config/platform.config";
import { PlatformConfigService } from "@/services/PlatformConfigService";

export async function generateMetadata() {
  let config;
  try {
    config = await PlatformConfigService.getCached();
  } catch {
    config = DEFAULT_CONFIG;
  }
  return {
    title: `Privacy Policy | ${config.name}`,
  };
}

export default async function PrivacyPage() {
  const { DEFAULT_CONFIG: cfg } = await import("@/config/platform.config");

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[800px] mx-auto px-4 py-16">
        <h1 className="font-[family-name:var(--font-display)] font-bold text-[28px] text-[var(--color-text-primary)] mb-2">
          Privacy Policy
        </h1>
        <p className="text-[14px] text-[var(--color-text-tertiary)] mb-8">
          Last updated: July 2026
        </p>

        <div className="prose prose-invert max-w-none text-[14px] leading-relaxed text-[var(--color-text-secondary)] space-y-6">
          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              1. Introduction
            </h2>
            <p>
              {cfg.name} (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use our platform. It complies with the Nigeria Data Protection
              Regulation (NDPR) 2023.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              2. Information We Collect
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Personal identification information (name, email address, phone number)</li>
              <li>Profile information (bio, portfolio, work samples, service packages)</li>
              <li>Payment information (processed securely through Paystack)</li>
              <li>Communication data (messages between users)</li>
              <li>Usage data (pages visited, features used)</li>
              <li>Device and browser information</li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and maintain our marketplace platform</li>
              <li>To process transactions and manage escrow payments</li>
              <li>To communicate with you about bookings and platform updates</li>
              <li>To improve our services and user experience</li>
              <li>To comply with legal obligations</li>
              <li>With your consent, to send marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              4. Legal Basis for Processing (NDPR)
            </h2>
            <p>
              Under NDPR 2023, we process your personal data based on the following lawful bases:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Consent:</strong> You have given clear consent for us to process your data for specific purposes (e.g., marketing, analytics). You may withdraw consent at any time.</li>
              <li><strong>Contract:</strong> Processing is necessary for the performance of a contract with you (e.g., facilitating bookings, processing payments).</li>
              <li><strong>Legal obligation:</strong> Processing is necessary for compliance with legal obligations.</li>
              <li><strong>Legitimate interests:</strong> Processing is necessary for our legitimate interests (e.g., fraud prevention, platform improvement).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              5. Data Subject Rights
            </h2>
            <p>Under NDPR 2023, you have the following rights:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Right to be informed:</strong> We provide this Privacy Policy to inform you of our data practices.</li>
              <li><strong>Right of access:</strong> You can request a copy of your personal data via the Account Export feature.</li>
              <li><strong>Right to rectification:</strong> You can update your profile information at any time.</li>
              <li><strong>Right to erasure:</strong> You can request deletion of your account. Financial records will be anonymised rather than deleted to comply with legal retention obligations.</li>
              <li><strong>Right to restrict processing:</strong> You can request that we restrict processing of your data.</li>
              <li><strong>Right to data portability:</strong> You can export your data in a structured, machine-readable format.</li>
              <li><strong>Right to object:</strong> You can object to processing based on legitimate interests or direct marketing.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              6. Data Retention
            </h2>
            <p>
              We retain your personal data only as long as necessary to provide our services and
              comply with legal obligations. Financial records are retained for a minimum of 6 years
              to comply with Nigerian tax and regulatory requirements. When you delete your account,
              personal data is anonymised while financial records are retained in anonymised form.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              7. Data Sharing and Third Parties
            </h2>
            <p>We may share your data with:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Paystack:</strong> Payment processing and escrow services</li>
              <li><strong>Cloudinary:</strong> Video and image hosting</li>
              <li><strong>Mux:</strong> Video streaming</li>
              <li><strong>Google Drive:</strong> Portfolio sync (with your explicit consent)</li>
              <li><strong>Supabase:</strong> Database hosting with row-level security</li>
              <li><strong>Resend:</strong> Email delivery</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal data to third parties. All third-party data processors
              are contractually bound to comply with NDPR requirements.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              8. Data Security
            </h2>
            <p>
              We implement appropriate technical and organisational measures to protect your data,
              including encryption at rest and in transit, row-level security policies on our
              database, and access controls. However, no method of transmission over the Internet
              is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              9. Cookies
            </h2>
            <p>
              We use essential cookies for authentication and platform functionality. Analytics
              cookies are used only with your consent. You can manage your cookie preferences
              through our cookie consent banner.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              10. Contact Us
            </h2>
            <p>
              For questions about this Privacy Policy or to exercise your NDPR rights, please
              contact our Data Protection Officer at support@{cfg.name.toLowerCase().replace(/\s+/g, "")}.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
