import { DEFAULT_CONFIG } from "@/config/platform.config";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { db } from "@/lib/db";
import { howItWorksPage } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import type { IHowItWorksPage } from "@/types";

// Static fallback data for build-time and when DB is unavailable
const FALLBACK_HOW_IT_WORKS_PAGE: IHowItWorksPage = {
  id: "how-it-works-1",
  heroTitle: "How It Works",
  heroSubtitle: "Everything you need to know to get started — whether you're a creator looking for work or a brand searching for talent.",
  sections: [
    {
      id: "for-creators",
      title: "For Creators",
      subtitle: "Turn your creativity into income",
      steps: [
        { step: 1, title: "Create Your Profile", description: "Showcase your work, set your rates, and define your niche. Add portfolio items from your device or sync from Google Drive." },
        { step: 2, title: "Get Discovered", description: "Brands browse our Explore feed and search for creators like you. Your profile appears in relevant searches based on your category, location, and tags." },
        { step: 3, title: "Receive Booking Requests", description: "Clients send booking requests with project details. You can accept, decline, or negotiate scope and timeline." },
        { step: 4, title: "Deliver & Get Paid", description: "Work is protected by escrow. Funds are held securely and released automatically after completion (or when you mark milestones as done)." },
      ],
    },
    {
      id: "for-clients",
      title: "For Clients & Brands",
      subtitle: "Find the right creative talent, fast",
      steps: [
        { step: 1, title: "Browse & Search", description: "Explore creators by category, location, experience level, and budget. Watch video portfolios to evaluate style and quality." },
        { step: 2, title: "Book with Confidence", description: "Select a package, set a date, and pay securely. Your payment is held in escrow until the work is delivered to your satisfaction." },
        { step: 3, title: "Collaborate Seamlessly", description: "Communicate directly with your creator, share briefs, and track progress. Milestone payments keep larger projects on track." },
        { step: 4, title: "Review & Release", description: "Review deliverables, request revisions if needed, and release payment. Leave a review to help the community." },
      ],
    },
    {
      id: "escrow",
      title: "Secure Payments with Escrow",
      subtitle: "Your money is protected every step of the way",
      steps: [
        { step: 1, title: "Payment Held in Escrow", description: "When you book, funds are securely held by our payment partner (Paystack) — not released to the creator until you're happy." },
        { step: 2, title: "Auto-Release Timeline", description: "If no dispute is raised, funds auto-release 5 days after the service date. You're always in control." },
        { step: 3, title: "Dispute Resolution", description: "If something goes wrong, our admin team mediates. We review evidence from both sides and make a fair decision." },
        { step: 4, title: "Milestone Payments", description: "For larger projects, split payments into milestones. Each milestone is funded upfront and released upon approval." },
      ],
    },
  ],
  sandboxes: [
    { id: "booking-flow", title: "Booking Flow Simulator", description: "Experience the end-to-end booking process as a client or creator", type: "booking-simulator" },
    { id: "escrow-timeline", title: "Escrow Timeline Explorer", description: "Visualize how escrow works — from payment to release or dispute", type: "escrow-timeline" },
    { id: "pricing-calculator", title: "Pricing Calculator", description: "Estimate costs for different project types and creator levels", type: "pricing-calculator" },
    { id: "search-simulator", title: "Search & Discovery Simulator", description: "See how creators appear in search results based on profile completeness", type: "search-simulator" },
  ],
  faqs: [
    { question: "How do I get paid as a creator?", answer: "Payments are held in escrow via Paystack. Once the client approves your work (or after 5 days with no dispute), funds are automatically released to your CreLab wallet. You can withdraw to your bank account anytime.", category: "payments" },
    { question: "What's the platform fee?", answer: "CreLab charges a 5% platform fee on each booking. This covers payment processing, escrow protection, platform maintenance, and support.", category: "payments" },
    { question: "Can I cancel a booking?", answer: "Yes. Full refunds are available within 48 hours of booking. After that, a 50% cancellation fee applies to protect the creator's time.", category: "bookings" },
    { question: "How do I build my portfolio?", answer: "Upload videos and images directly, or connect Google Drive to sync your existing portfolio. Portfolio items appear on your public profile and in the Explore feed.", category: "creators" },
    { question: "What types of creators can I hire?", answer: "We support Content Creators (UGC, lifestyle, brand content) and Cinematographers/Videographers (events, commercials, narrative, documentary). Each has tailored profile fields.", category: "clients" },
    { question: "Is my data secure?", answer: "Yes. We use bank-grade encryption, row-level database security, and comply with NDPR 2023. Payment data is handled by Paystack (PCI DSS Level 1 certified).", category: "security" },
  ],
  metaTitle: "How It Works - Crellab",
  metaDescription: "Learn how Crellab works for creators and clients. Booking flow, escrow protection, milestone payments, and more.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function generateMetadata(): Promise<Metadata> {
  const { buildSeoMetadata } = await import("@/lib/seo");
  let config;
  try {
    config = await PlatformConfigService.getCached();
  } catch {
    config = DEFAULT_CONFIG;
  }
  return buildSeoMetadata(config, {
    title: `How It Works - ${config.name}`,
    description: `Learn how ${config.name} works for creators and clients. Booking flow, escrow protection, milestone payments, and more.`,
    path: "/how-it-works",
  });
}

export default async function HowItWorksPage() {
  let pageData: IHowItWorksPage | null = null;
  try {
    const result = await db
      .select()
      .from(howItWorksPage)
      .where(eq(howItWorksPage.id, "how-it-works-1"))
      .limit(1);
    if (result[0]) {
      pageData = result[0] as unknown as IHowItWorksPage;
    }
  } catch {
    // DB unavailable, will use fallback
  }

  const data = pageData || FALLBACK_HOW_IT_WORKS_PAGE;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[800px] mx-auto px-4 py-16">
        <span className="inline-block mb-6 px-3 py-1 rounded-[6px] bg-[var(--color-accent-muted)] text-[var(--color-accent)] text-[11px] font-semibold uppercase tracking-[0.06em]">
          Config-Driven · Admin Manageable · Includes Sandboxes & FAQ
        </span>

        <div className="hero text-center mb-16">
          <h1 className="font-[family-name:var(--font-display)] font-extrabold text-4xl md:text-5xl tracking-[-0.02em] leading-[1.2] mb-4">
            {data.heroTitle}
          </h1>
          <p className="subtitle text-[var(--color-text-secondary)] text-lg leading-relaxed max-w-[680px] mx-auto">
            {data.heroSubtitle}
          </p>
        </div>

        <div className="space-y-12">
          {data.sections.map((section) => (
            <section key={section.id} className="section">
              <div className="section-header mb-6">
                <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] text-[var(--color-text-primary)]">
                  {section.title}
                </h2>
                {section.subtitle && (
                  <span className="subtitle-text text-[var(--color-text-secondary)] text-sm">
                    {section.subtitle}
                  </span>
                )}
              </div>
              <div className="space-y-4">
                {section.steps.map((step) => (
                  <div key={step.step} className="step">
                    <div className="step-number">{step.step}</div>
                    <div className="step-content">
                      <h4 className="font-[family-name:var(--font-display)] font-medium text-[15px] text-[var(--color-text-primary)]">
                        {step.title}
                      </h4>
                      <p className="text-[13px] text-[var(--color-text-secondary)]">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <div className="divider" />

          <section className="section">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] text-[var(--color-text-primary)] mb-6">
              Interactive Sandboxes
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-6 max-w-[680px]">
              Visual experimenting and simulation for easier understanding
            </p>
            <div className="sandbox-grid">
              {data.sandboxes.map((sandbox) => (
                <div key={sandbox.id} className="sandbox-card">
                  <h3 className="sandbox-title">{sandbox.title}</h3>
                  <p className="sandbox-desc">{sandbox.description}</p>
                  <span className="sandbox-type">{sandbox.type}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="divider" />

          <section className="section">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] text-[var(--color-text-primary)] mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-6 max-w-[680px]">
              Quick answers to common questions — improving SEO and reducing support load
            </p>
            <div className="space-y-3">
              {data.faqs.map((faq) => (
                <details key={faq.question} className="faq-item group">
                  <summary className="faq-question">
                    {faq.question}
                    <span className="text-[var(--color-accent)] transition-transform group-open:rotate-180">▼</span>
                  </summary>
                  <div className="faq-answer mt-3">
                    {faq.answer}
                  </div>
                  <div className="faq-category">{faq.category}</div>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}