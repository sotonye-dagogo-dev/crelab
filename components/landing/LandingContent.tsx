import Link from "next/link";
import { ClLogo } from "@/components/ui";
import type { IPlatformConfig } from "@/types";
import {
  Search,
  Shield,
  Wallet,
  Users,
  ArrowRight,
  Play,
  Sparkles,
  Video,
  Camera,
  Star,
  Zap,
} from "lucide-react";
import { LandingHeroActions } from "./LandingHeroActions";

interface Props {
  config: IPlatformConfig;
}

export function LandingContent({ config }: Props) {
  const categories = config.categories.filter((c) => c.active);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* ── Hero ── */}
      <section className="w-full bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-bg)] border-b border-[var(--color-border)]">
        <div className="max-w-[1200px] w-full mx-auto flex flex-row justify-between items-center gap-8 px-6 py-12 md:py-16 max-[900px]:flex-col-reverse max-[900px]:text-center">
          <div className="flex-1 max-w-[580px]">
            <span className="inline-flex items-center gap-1.5 mb-4 px-3 py-1 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] text-[11px] font-semibold uppercase tracking-[0.06em] border border-[var(--color-accent)]/20">
              <Sparkles size={12} strokeWidth={2} /> Config-driven · Escrow-secured · Built for Africa
            </span>
            <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[2.5rem] md:text-[3rem] text-[var(--color-text-primary)] leading-[1.1] tracking-[-0.02em] mb-4">
              {config.tagline}
            </h1>
            <p className="text-[15px] md:text-[17px] leading-[1.7] text-[var(--color-text-secondary)] mb-8">
              Discover vetted creators, book securely with escrow, and bring your vision to life — without chasing follower counts.
              From UGC to cinematic shoots, find the right talent in minutes.
            </p>

            <LandingHeroActions />

            <div className="mt-6 flex gap-4 flex-wrap max-[900px]:justify-center text-[13px]">
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline underline-offset-4 font-medium"
              >
                How it works <ArrowRight size={14} strokeWidth={2} />
              </Link>
              <Link
                href="/about"
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:underline underline-offset-4"
              >
                About CreLab
              </Link>
              <Link
                href="/team"
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:underline underline-offset-4"
              >
                Meet the team
              </Link>
            </div>

            {/* Trust row */}
            <div className="mt-8 flex flex-wrap gap-4 max-[900px]:justify-center text-[12px] text-[var(--color-text-tertiary)]">
              <span className="inline-flex items-center gap-1.5"><Shield size={14} /> Escrow protected</span>
              <span className="inline-flex items-center gap-1.5"><Wallet size={14} /> Paystack & wallet</span>
              <span className="inline-flex items-center gap-1.5"><Star size={14} /> Verified creators</span>
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col items-center gap-4">
            <ClLogo variant="full" logoWidth={520} logoHeight={180} priority />
            {/* Mini stats under logo */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-[360px]">
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] px-3 py-3 text-center">
                <div className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)]">1.2k+</div>
                <div className="text-[11px] text-[var(--color-text-tertiary)] font-medium">Creators</div>
              </div>
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] px-3 py-3 text-center">
                <div className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)]">5k+</div>
                <div className="text-[11px] text-[var(--color-text-tertiary)] font-medium">Bookings</div>
              </div>
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] px-3 py-3 text-center">
                <div className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-accent)]">4.9</div>
                <div className="text-[11px] text-[var(--color-text-tertiary)] font-medium">Avg rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories teaser ── */}
      <section className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] md:text-[26px] text-[var(--color-text-primary)] tracking-[-0.01em]">Browse by category</h2>
            <p className="text-[14px] text-[var(--color-text-secondary)] mt-1 max-w-[520px]">Pick a lane — content or cinematography — and find creators who match your brief, budget, and location.</p>
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-accent)] hover:underline underline-offset-4 shrink-0"
          >
            Explore all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/${cat.slug}`}
              className="group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] p-5 md:p-6 flex gap-4 hover:border-[var(--color-border-mid)] hover:-translate-y-0.5 transition-all duration-200 no-underline"
            >
              <div className="w-10 h-10 rounded-[10px] bg-[var(--color-accent-muted)] border border-[var(--color-accent)]/20 flex items-center justify-center shrink-0 text-[var(--color-accent)]">
                {cat.slug === "cinematographer" ? <Camera size={18} /> : <Video size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-[family-name:var(--font-display)] font-semibold text-[15px] text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                  {cat.label}
                </div>
                <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mt-1 line-clamp-2">{cat.description}</div>
                <div className="text-[12px] font-semibold text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent)] mt-3 inline-flex items-center gap-1">
                  Browse {cat.label} <ArrowRight size={12} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How it works teaser ── */}
      <section className="bg-[var(--color-surface)] border-y border-[var(--color-border)]">
        <div className="max-w-[1200px] mx-auto px-6 py-12">
          <div className="text-center max-w-[640px] mx-auto mb-8">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] md:text-[26px] text-[var(--color-text-primary)] tracking-[-0.01em]">How CreLab works</h2>
            <p className="text-[14px] text-[var(--color-text-secondary)] mt-2 leading-relaxed">
              Whether you&apos;re a creator looking for work or a brand searching for talent — the flow is simple, transparent, and escrow-protected.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[12px] p-5">
              <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] text-[var(--color-text-inverse)] flex items-center justify-center font-bold text-[13px] mb-3">1</div>
              <h3 className="font-[family-name:var(--font-display)] font-semibold text-[14px] text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Search size={14} /> Discover
              </h3>
              <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mt-1">
                Browse creators by category, location, and budget. Watch portfolios, check ratings, and shortlist who fits.
              </p>
            </div>
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[12px] p-5">
              <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] text-[var(--color-text-inverse)] flex items-center justify-center font-bold text-[13px] mb-3">2</div>
              <h3 className="font-[family-name:var(--font-display)] font-semibold text-[14px] text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Zap size={14} /> Book & pay
              </h3>
              <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mt-1">
                Pick a package, set a date, pay securely. Funds are held in escrow — not released until you&apos;re happy.
              </p>
            </div>
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[12px] p-5">
              <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] text-[var(--color-text-inverse)] flex items-center justify-center font-bold text-[13px] mb-3">3</div>
              <h3 className="font-[family-name:var(--font-display)] font-semibold text-[14px] text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Shield size={14} /> Deliver & get paid
              </h3>
              <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mt-1">
                Collaborate, deliver, approve. Funds auto-release after {config.escrowReleaseDays} days, or instantly on approval.
              </p>
            </div>
          </div>
          <div className="flex justify-center mt-6">
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center h-10 px-6 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold text-[13px] no-underline hover:bg-[var(--color-accent-dim)] transition-colors gap-1.5"
            >
              <Play size={14} /> See how it works in detail
            </Link>
          </div>
        </div>
      </section>

      {/* ── Social proof / features ── */}
      <section className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] p-5">
            <div className="w-9 h-9 rounded-[8px] bg-[var(--color-accent-muted)] flex items-center justify-center text-[var(--color-accent)] mb-3">
              <Shield size={18} />
            </div>
            <h3 className="font-semibold text-[14px] text-[var(--color-text-primary)]">Escrow & dispute handling</h3>
            <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mt-1">Payments are held by Paystack. Admin mediation if anything goes wrong — fair, documented, auditable.</p>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] p-5">
            <div className="w-9 h-9 rounded-[8px] bg-[var(--color-accent-muted)] flex items-center justify-center text-[var(--color-accent)] mb-3">
              <Video size={18} />
            </div>
            <h3 className="font-semibold text-[14px] text-[var(--color-text-primary)]">Video-first portfolios</h3>
            <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mt-1">Every creator leads with motion — no blank tiles. Avatars, reels, and Google Drive sync keep profiles alive.</p>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[12px] p-5">
            <div className="w-9 h-9 rounded-[8px] bg-[var(--color-accent-muted)] flex items-center justify-center text-[var(--color-accent)] mb-3">
              <Users size={18} />
            </div>
            <h3 className="font-semibold text-[14px] text-[var(--color-text-primary)]">Built for Nigerian creatives</h3>
            <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mt-1">Naira pricing, local payouts, NDPR-aware — designed for the realities of creating in Africa.</p>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="max-w-[1200px] mx-auto px-6 pb-12">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] p-8 md:p-10 text-center">
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] md:text-[26px] text-[var(--color-text-primary)]">Ready to get started?</h2>
          <p className="text-[14px] text-[var(--color-text-secondary)] mt-2 max-w-[520px] mx-auto leading-relaxed">
            Join thousands of creators and brands already building together on {config.name}. Explore talent now — or create your own creator profile.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Link
              href="/explore"
              className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold text-[14px] no-underline hover:bg-[var(--color-accent-dim)] transition-colors gap-1.5"
            >
              Explore creators <ArrowRight size={16} />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] font-semibold text-[14px] no-underline hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
            >
              Learn more about us
            </Link>
            <Link
              href="/team"
              className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] border border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] font-semibold text-[14px] no-underline hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-mid)] transition-colors"
            >
              Meet the team
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
