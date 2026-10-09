"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Maximize2,
  MonitorPlay,
  Video,
  X,
} from "lucide-react";
import {
  ClBadge,
  ClButton,
  ClDialog,
  ClEmptyState,
  ClInput,
  ClPagination,
  ClSpinner,
} from "@/components/ui";
import { ContentBlocks } from "@/components/blog/ContentBlocks";
import { usePlatformConfig } from "@/lib/config-context";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/lib/toast";
import { formatWebinarStart, resolveWebinarsConfig, webinarStatusLabel, webinarStatusVariant } from "@/lib/webinars";
import type { IWebinar } from "@/types";

interface ListPage {
  items: IWebinar[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Listings {
  upcoming: ListPage;
  past: ListPage;
}

interface GuestPrompt {
  message: string;
  ctaLabel: string;
  href: string;
}

interface RegistrationOutcome {
  alreadyRegistered: boolean;
  guestPrompt?: GuestPrompt;
}

const labelClass =
  "block mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

/**
 * Public webinars landing: hero, upcoming sessions with the registration form
 * (guest: name + email + explicit consent; signed-in: pre-filled, one tap) and
 * past sessions with recording/materials. Both sections paginate against the
 * shared `GET /api/webinars` endpoint.
 */
export function WebinarsClient() {
  const router = useRouter();
  const config = usePlatformConfig();
  const webinars = resolveWebinarsConfig(config.webinars);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<Listings | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, RegistrationOutcome>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async (upcoming: number, past: number) => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(
        `/api/webinars?upcomingPage=${upcoming}&pastPage=${past}`,
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error("webinars request failed");
      setData(json.data as Listings);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(upcomingPage, pastPage);
  }, [upcomingPage, pastPage, load]);

  // Signed-in visitors get their identity pre-filled — the form is then one tap.
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && user) {
      setName((prev) => prev || user.name || "");
      setEmail((prev) => prev || user.email || "");
    }
  }, [authLoading, isAuthenticated, user]);

  const submit = useCallback(
    async (webinarId: string) => {
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      if (!isAuthenticated && (!trimmedName || !trimmedEmail)) {
        setErrors((prev) => ({
          ...prev,
          [webinarId]: "Enter your name and email to reserve a seat.",
        }));
        return;
      }

      setSubmittingId(webinarId);
      setErrors((prev) => ({ ...prev, [webinarId]: "" }));
      try {
        const res = await fetch(`/api/webinars/${webinarId}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(isAuthenticated ? {} : { name: trimmedName, email: trimmedEmail }),
            consentMarketing: consent,
          }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          const field = json?.error;
          const message =
            typeof field === "string"
              ? field
              : field?.email?.[0] ?? field?.name?.[0] ?? "Registration failed. Please try again.";
          throw new Error(message);
        }

        const outcome = (json.data ?? {}) as RegistrationOutcome;
        setOutcomes((prev) => ({ ...prev, [webinarId]: outcome }));
        toast(
          outcome.alreadyRegistered
            ? "You're already registered for this session."
            : "Your seat is reserved.",
          "success",
        );
      } catch (err) {
        const message = errorMessage(err);
        setErrors((prev) => ({ ...prev, [webinarId]: message }));
        toast(message, "error");
      } finally {
        setSubmittingId(null);
      }
    },
    [consent, email, isAuthenticated, name, toast],
  );

  if (config.features?.webinarsEnabled === false) {
    return null;
  }

  const upcomingItems = data?.upcoming.items ?? [];
  const pastItems = data?.past.items ?? [];

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 py-10 sm:py-12">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Video size={22} strokeWidth={2} className="text-[var(--color-accent)]" />
            <h1 className="font-[family-name:var(--font-display)] font-bold text-[26px] tracking-[-0.01em] text-[var(--color-text-primary)]">
              {webinars.heroTitle}
            </h1>
          </div>
          <p className="text-[14px] text-[var(--color-text-secondary)] leading-relaxed max-w-[680px]">
            {webinars.heroSubtitle}
          </p>
        </div>

        {loading && !data && (
          <div className="flex justify-center py-20">
            <ClSpinner className="text-[var(--color-text-primary)]" size={24} />
          </div>
        )}

        {failed && !data && (
          <ClEmptyState
            title="Couldn't load the webinars"
            message="Something went wrong while fetching the sessions."
            action={{ label: "Try again", onClick: () => load(upcomingPage, pastPage) }}
          />
        )}

        {data && (
          <div className={`flex flex-col gap-10 transition-opacity ${loading ? "opacity-60" : ""}`}>
            {/* Upcoming */}
            <section>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="font-[family-name:var(--font-display)] font-bold text-[19px] text-[var(--color-text-primary)]">
                  {webinars.upcomingTitle}
                </h2>
                <span className="text-[12px] text-[var(--color-text-tertiary)]">
                  {data.upcoming.total} session{data.upcoming.total === 1 ? "" : "s"}
                </span>
              </div>

              {upcomingItems.length === 0 ? (
                <ClEmptyState
                  title="No upcoming sessions"
                  message="New sessions are announced regularly — check back soon."
                  className="py-10"
                />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {upcomingItems.map((webinar) => (
                      <UpcomingCard
                        key={webinar.id}
                        webinar={webinar}
                        webinars={webinars}
                        isAuthenticated={isAuthenticated}
                        authLoading={authLoading}
                        name={name}
                        email={email}
                        consent={consent}
                        onNameChange={setName}
                        onEmailChange={setEmail}
                        onConsentChange={setConsent}
                        outcome={outcomes[webinar.id]}
                        error={errors[webinar.id]}
                        submitting={submittingId === webinar.id}
                        onSubmit={() => submit(webinar.id)}
                        onCreateAccount={() => router.push("/register?returnTo=/webinars")}
                      />
                    ))}
                  </div>
                  <ClPagination
                    page={data.upcoming.page}
                    totalPages={data.upcoming.totalPages}
                    onPageChange={setUpcomingPage}
                    pageSize={data.upcoming.pageSize}
                    totalItems={data.upcoming.total}
                    className="justify-between"
                  />
                </div>
              )}
            </section>

            {/* Past */}
            <section>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="font-[family-name:var(--font-display)] font-bold text-[19px] text-[var(--color-text-primary)]">
                  {webinars.pastTitle}
                </h2>
                <span className="text-[12px] text-[var(--color-text-tertiary)]">
                  {data.past.total} session{data.past.total === 1 ? "" : "s"}
                </span>
              </div>

              {pastItems.length === 0 ? (
                <ClEmptyState
                  title="No past sessions yet"
                  message="Recordings and materials will appear here after the first sessions wrap up."
                  className="py-10"
                />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pastItems.map((webinar) => (
                      <PastCard key={webinar.id} webinar={webinar} />
                    ))}
                  </div>
                  <ClPagination
                    page={data.past.page}
                    totalPages={data.past.totalPages}
                    onPageChange={setPastPage}
                    pageSize={data.past.pageSize}
                    totalItems={data.past.total}
                    className="justify-between"
                  />
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function MetaItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)]">
      {icon}
      {children}
    </span>
  );
}

/**
 * Responsive webinar cover with a dismissable expand overlay.
 *
 * Tile uses a 16:9 frame (`aspect-video`) so covers render at a legible
 * height on every breakpoint instead of the previous fixed `h-32`/`h-36`
 * strip. The image is wrapped in a button (keyboard accessible) that opens
 * a `ClDialog` overlay with the full-bleed image — dismissable via the
 * close button, backdrop click, or Escape (handled by `ClDialog`).
 */
function WebinarCoverImage({ src, title }: { src: string; title: string }) {
  const [expanded, setExpanded] = useState(false);
  const label = title ? `Expand cover image for ${title}` : "Expand cover image";

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label={label}
        title="View larger"
        className="group relative block w-full aspect-video overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={title ? `${title} cover` : ""}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] group-focus-visible:scale-[1.02]"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(10,10,10,0.65)] text-white opacity-0 backdrop-blur-[2px] transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <Maximize2 size={15} strokeWidth={2} />
        </span>
      </button>

      <ClDialog open={expanded} onClose={() => setExpanded(false)} aria-label={title || "Webinar cover image"}>
        <div className="relative flex flex-col">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Close image preview"
            className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text-primary)]"
          >
            <X size={16} />
          </button>
          <div className="rounded-[12px] overflow-hidden bg-black flex items-center justify-center min-h-[200px] max-h-[70vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={title ? `${title} cover` : ""}
              className="max-h-[70vh] w-auto max-w-full object-contain"
            />
          </div>
          {title && (
            <p className="pt-3 text-[13px] font-semibold text-[var(--color-text-primary)] leading-snug">
              {title}
            </p>
          )}
        </div>
      </ClDialog>
    </>
  );
}

function UpcomingCard({
  webinar,
  webinars,
  isAuthenticated,
  authLoading,
  name,
  email,
  consent,
  onNameChange,
  onEmailChange,
  onConsentChange,
  outcome,
  error,
  submitting,
  onSubmit,
  onCreateAccount,
}: {
  webinar: IWebinar;
  webinars: ReturnType<typeof resolveWebinarsConfig>;
  isAuthenticated: boolean;
  authLoading: boolean;
  name: string;
  email: string;
  consent: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onConsentChange: (value: boolean) => void;
  outcome?: RegistrationOutcome;
  error?: string;
  submitting: boolean;
  onSubmit: () => void;
  onCreateAccount: () => void;
}) {
  const when = formatWebinarStart(webinar.startsAt);
  const registered = Boolean(outcome);

  return (
    <article className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden flex flex-col">
      {webinar.coverUrl && (
        <WebinarCoverImage src={webinar.coverUrl} title={webinar.title} />
      )}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <ClBadge variant={webinarStatusVariant(webinar.status)}>
            {webinarStatusLabel(webinar.status)}
          </ClBadge>
          {when && (
            <MetaItem icon={<Calendar size={12} strokeWidth={2} />}>{when}</MetaItem>
          )}
          {webinar.durationMinutes ? (
            <MetaItem icon={<Clock size={12} strokeWidth={2} />}>{webinar.durationMinutes} min</MetaItem>
          ) : null}
          {webinar.locationNote ? (
            <MetaItem icon={<MapPin size={12} strokeWidth={2} />}>{webinar.locationNote}</MetaItem>
          ) : null}
        </div>

        <div>
          <h3 className="font-[family-name:var(--font-display)] font-bold text-[17px] text-[var(--color-text-primary)] leading-snug">
            {webinar.title}
          </h3>
          {webinar.subtitle && (
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-1 leading-relaxed">
              {webinar.subtitle}
            </p>
          )}
          {webinar.description && (
            <p className="text-[13px] text-[var(--color-text-tertiary)] mt-2 leading-relaxed">
              {webinar.description}
            </p>
          )}
        </div>

        <div className="mt-auto pt-2">
          {registered ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--color-success)]">
                <CheckCircle2 size={16} strokeWidth={2} />
                {webinars.registeredLabel}
              </div>
              {outcome?.guestPrompt && !isAuthenticated && (
                <div className="rounded-[8px] border border-[var(--color-accent)] bg-[var(--color-surface-raised)] p-4 flex flex-col gap-3">
                  <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
                    {outcome.guestPrompt.message}
                  </p>
                  <ClButton variant="primary" size="sm" onClick={onCreateAccount}>
                    {outcome.guestPrompt.ctaLabel}
                  </ClButton>
                </div>
              )}
            </div>
          ) : (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
              }}
            >
              {isAuthenticated && !authLoading ? (
                <p className="text-[12px] text-[var(--color-text-tertiary)]">
                  Registering as{" "}
                  <span className="font-semibold text-[var(--color-text-secondary)]">
                    {name || "you"}
                  </span>
                  {email ? (
                    <>
                      {" "}
                      · <span className="text-[var(--color-text-secondary)]">{email}</span>
                    </>
                  ) : null}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} htmlFor={`webinar-name-${webinar.id}`}>
                      Name
                    </label>
                    <ClInput
                      id={`webinar-name-${webinar.id}`}
                      autoComplete="name"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => onNameChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor={`webinar-email-${webinar.id}`}>
                      Email
                    </label>
                    <ClInput
                      id={`webinar-email-${webinar.id}`}
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => onEmailChange(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => onConsentChange(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-[var(--color-accent)] cursor-pointer"
                />
                <span className="text-[12px] text-[var(--color-text-secondary)] leading-snug">
                  {webinars.marketingConsentLabel}
                </span>
              </label>

              {error && <p className="text-[12px] text-[var(--color-error)]">{error}</p>}

              <ClButton type="submit" variant="primary" loading={submitting}>
                {webinars.registerCtaLabel}
              </ClButton>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}

function PastCard({ webinar }: { webinar: IWebinar }) {
  const when = formatWebinarStart(webinar.startsAt);
  const ctaHref = webinar.recordingUrl ?? webinar.ctaHref;
  const ctaLabel = webinar.recordingUrl ? "Watch recording" : (webinar.ctaLabel ?? "View details");
  const hasBlocks = Array.isArray(webinar.contentBlocks) && webinar.contentBlocks.length > 0;

  return (
    <article className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden flex flex-col">
      {webinar.coverUrl && (
        <WebinarCoverImage src={webinar.coverUrl} title={webinar.title} />
      )}
      <div className="p-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ClBadge variant={webinarStatusVariant(webinar.status)}>
            {webinarStatusLabel(webinar.status)}
          </ClBadge>
          {when && <MetaItem icon={<Calendar size={12} strokeWidth={2} />}>{when}</MetaItem>}
        </div>

        <div>
          <h3 className="font-[family-name:var(--font-display)] font-bold text-[17px] text-[var(--color-text-primary)] leading-snug">
            {webinar.title}
          </h3>
          {webinar.subtitle && (
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-1 leading-relaxed">
              {webinar.subtitle}
            </p>
          )}
          {webinar.description && (
            <p className="text-[13px] text-[var(--color-text-tertiary)] mt-2 leading-relaxed">
              {webinar.description}
            </p>
          )}
        </div>

        {ctaHref && (
          <a
            href={ctaHref}
            target={ctaHref.startsWith("http") ? "_blank" : undefined}
            rel={ctaHref.startsWith("http") ? "noopener noreferrer" : undefined}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[8px] border border-[var(--color-border-mid)] text-[13px] font-semibold text-[var(--color-text-primary)] no-underline hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors w-fit"
          >
            <MonitorPlay size={15} strokeWidth={1.8} />
            {ctaLabel}
          </a>
        )}

        {hasBlocks && (
          <div className="border-t border-[var(--color-border)] pt-3">
            <ContentBlocks blocks={webinar.contentBlocks} />
          </div>
        )}
      </div>
    </article>
  );
}
