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
    title: `Terms of Service | ${config.name}`,
  };
}

export default async function TermsPage() {
  const { DEFAULT_CONFIG: cfg } = await import("@/config/platform.config");

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[800px] mx-auto px-4 py-16">
        <h1 className="font-[family-name:var(--font-display)] font-bold text-[28px] text-[var(--color-text-primary)] mb-2">
          Terms of Service
        </h1>
        <p className="text-[14px] text-[var(--color-text-tertiary)] mb-8">
          Last updated: July 2026
        </p>

        <div className="text-[14px] leading-relaxed text-[var(--color-text-secondary)] space-y-6">
          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using {cfg.name}, you agree to be bound by these Terms of Service.
              If you do not agree, do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              2. Platform Description
            </h2>
            <p>
              {cfg.name} is a marketplace connecting brands and clients with creative professionals
              (content creators, cinematographers, and videographers). We facilitate bookings,
              handle escrow payments, and provide portfolio hosting.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              3. User Accounts
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials.
              You must be at least 18 years old to use this platform. All information you provide
              must be accurate and current.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              4. Booking and Payment Terms
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>All prices are quoted in Nigerian Naira (NGN)</li>
              <li>A platform fee of {(cfg.feeRate * 100).toFixed(0)}% is added to each booking</li>
              <li>Payments are held in escrow via Paystack until service completion</li>
              <li>Full refunds are available within {cfg.cancellationPolicy.fullRefundThresholdHours} hours of booking</li>
              <li>{cfg.cancellationPolicy.lateCancellationHoldPercent}% of payment is held on late cancellations</li>
              <li>Funds are released {cfg.escrowReleaseDays} days after the service date if no dispute is raised</li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              5. Dispute Resolution
            </h2>
            <p>
              Disputes are reviewed by our admin team. We may request additional documentation
              from both parties. Our decision in dispute resolution is final and binding.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              6. Intellectual Property
            </h2>
            <p>
              Creators retain intellectual property rights to their portfolio work. Upon booking
              completion, deliverables are licensed to the client as specified in the service
              package terms.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              7. Limitation of Liability
            </h2>
            <p>
              {cfg.name} acts as an intermediary platform and is not liable for disputes between
              clients and providers. Our liability is limited to the platform fee paid for the
              specific booking in question.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              8. Account Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms,
              engage in fraudulent activity, or harm the platform community.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              9. Changes to Terms
            </h2>
            <p>
              We may modify these terms at any time. Users will be notified of material changes.
              Continued use of the platform after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)] mb-3">
              10. Governing Law
            </h2>
            <p>
              These terms are governed by the laws of the Federal Republic of Nigeria.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
