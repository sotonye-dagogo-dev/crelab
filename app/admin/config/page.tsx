"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClButton,
  ClCard,
  ClDataTable,
  ClInput,
  ClTabs,
  ClTabsContent,
  ClTabsList,
  ClTabsTrigger,
  type ClColumn,
} from "@/components/ui";
import { ConfigField } from "@/components/admin/ConfigField";
import { AuditValueCell } from "@/components/admin/AuditValueCell";
import { useToast } from "@/lib/toast";
import {
  CreditCard,
  History,
  Image as ImageIcon,
  Lightbulb,
  Mail,
  Navigation,
  Palette,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";

interface ChangeLogEntry {
  id: string;
  entity: string;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
  userId: string | null;
  actorName: string | null;
  actorEmail: string | null;
}

const configFields = [
  { key: "name", label: "Platform Name", type: "text" as const, section: "Branding" },
  { key: "tagline", label: "Tagline", type: "text" as const, section: "Branding" },
  { key: "primaryColor", label: "Primary Colour", type: "color" as const, section: "Branding" },
  { key: "payments.provider.active", label: "Active Payment Provider", type: "select" as const, section: "Fees & Escrow", options: [{ label: "Paystack", value: "PAYSTACK" }, { label: "Monnify", value: "MONNIFY" }], hint: "Routes new checkouts; refunds and payouts always use the provider recorded on the original payment. Credentials stay in environment variables; test mode is per provider below." },
  { key: "payments.provider.fallback", label: "Fallback Provider", type: "select" as const, section: "Fees & Escrow", options: [{ label: "Paystack", value: "PAYSTACK" }, { label: "Monnify", value: "MONNIFY" }], hint: "Used only when the active provider is disabled or has no credentials. Every fallback is audited." },
  { key: "payments.provider.providers.paystack.enabled", label: "Paystack Enabled", type: "toggle" as const, section: "Fees & Escrow" },
  { key: "payments.provider.providers.paystack.testMode", label: "Paystack Test Mode", type: "toggle" as const, section: "Fees & Escrow", hint: "Requires PAYSTACK_TEST_SECRET_KEY. Sandbox payments are tagged in finance/analytics." },
  { key: "payments.provider.providers.monnify.enabled", label: "Monnify Enabled", type: "toggle" as const, section: "Fees & Escrow", hint: "Requires MONNIFY_* (or MONNIFY_TEST_* in test mode) credentials." },
  { key: "payments.provider.providers.monnify.testMode", label: "Monnify Test Mode", type: "toggle" as const, section: "Fees & Escrow", hint: "Uses the Monnify sandbox keys and tags payments as test in finance/analytics." },
  { key: "payments.status.userTestModeNoticeEnabled", label: "Show User Test-Mode Banner", type: "toggle" as const, section: "Fees & Escrow", hint: "Warns users wherever money actions happen (wallet, booking payment, payment result) that checkout is running in sandbox mode." },
  { key: "payments.status.userTestModeTitle", label: "User Test-Mode Title", type: "text" as const, section: "Fees & Escrow" },
  { key: "payments.status.userTestModeBody", label: "User Test-Mode Body", type: "textarea" as const, section: "Fees & Escrow", hint: "Tokens: {{name}}. Never name the processor in user-facing copy." },
  { key: "payments.status.unavailableTitle", label: "User Payments-Unavailable Title", type: "text" as const, section: "Fees & Escrow" },
  { key: "payments.status.unavailableBody", label: "User Payments-Unavailable Body", type: "textarea" as const, section: "Fees & Escrow", hint: "Shown on money pages and returned when a checkout has no usable provider." },
  { key: "payments.status.bankTransferUnavailableBody", label: "Bank Top-Up Unavailable Body", type: "textarea" as const, section: "Fees & Escrow", hint: "Shown when cards work but the Paystack dedicated-virtual-account rail is unavailable." },
  { key: "payments.status.userFallbackNoticeEnabled", label: "Show User Fallback Banner", type: "toggle" as const, section: "Fees & Escrow", hint: "Tells users when a backup payment partner is handling their checkout." },
  { key: "payments.status.userFallbackTitle", label: "User Fallback Title", type: "text" as const, section: "Fees & Escrow" },
  { key: "payments.status.userFallbackBody", label: "User Fallback Body", type: "textarea" as const, section: "Fees & Escrow" },
  { key: "payments.status.adminBannerEnabled", label: "Show Admin Environment Banner", type: "toggle" as const, section: "Fees & Escrow", hint: "Admin-wide banner for test mode, fallback routing and no-usable-provider outages. Links to this page." },
  { key: "payments.status.adminTestModeTitle", label: "Admin Test-Mode Title", type: "text" as const, section: "Fees & Escrow" },
  { key: "payments.status.adminTestModeBody", label: "Admin Test-Mode Body", type: "textarea" as const, section: "Fees & Escrow", hint: "Tokens: {{name}}, {{provider}}" },
  { key: "payments.status.adminUnavailableTitle", label: "Admin Unavailable Title", type: "text" as const, section: "Fees & Escrow" },
  { key: "payments.status.adminUnavailableBody", label: "Admin Unavailable Body", type: "textarea" as const, section: "Fees & Escrow", hint: "Tokens: {{name}}" },
  { key: "payments.status.adminFallbackTitle", label: "Admin Fallback Title", type: "text" as const, section: "Fees & Escrow" },
  { key: "payments.status.adminFallbackBody", label: "Admin Fallback Body", type: "textarea" as const, section: "Fees & Escrow", hint: "Tokens: {{name}}, {{provider}} (intended), {{fallback}} (used)" },
  { key: "feeRate", label: "Platform Fee Rate", type: "number" as const, section: "Fees & Escrow", unit: "%" },
  { key: "escrowReleaseDays", label: "Escrow Release Days", type: "number" as const, section: "Fees & Escrow", unit: "days" },
  { key: "cancellationPolicy.fullRefundThresholdHours", label: "Client Cancel Threshold", type: "number" as const, section: "Fees & Escrow", unit: "hours" },
  { key: "payments.notices.payoutDetails.enabled", label: "Payout-Details Notice", type: "toggle" as const, section: "Fees & Escrow", hint: "Bank/payout accuracy disclaimer shown in the withdraw modal, terms and payment docs." },
  { key: "payments.notices.payoutDetails.title", label: "Payout Notice Title", type: "text" as const, section: "Fees & Escrow" },
  { key: "payments.notices.payoutDetails.body", label: "Payout Notice Body", type: "textarea" as const, section: "Fees & Escrow", hint: "Tokens: {{name}}, {{feeRate}}, {{escrowWindow}}" },
  { key: "payments.notices.processingFees.enabled", label: "Fees Notice", type: "toggle" as const, section: "Fees & Escrow", hint: "Transaction/platform fee transparency notice." },
  { key: "payments.notices.processingFees.title", label: "Fees Notice Title", type: "text" as const, section: "Fees & Escrow" },
  { key: "payments.notices.processingFees.body", label: "Fees Notice Body", type: "textarea" as const, section: "Fees & Escrow", hint: "Tokens: {{name}}, {{feeRate}}, {{escrowWindow}}" },
  { key: "payments.notices.escrowExplainer.enabled", label: "Escrow Explainer Notice", type: "toggle" as const, section: "Fees & Escrow", hint: "Sanitized escrow + payout story shown in the booking drawer, terms and payment docs." },
  { key: "payments.notices.escrowExplainer.title", label: "Escrow Notice Title", type: "text" as const, section: "Fees & Escrow" },
  { key: "payments.notices.escrowExplainer.body", label: "Escrow Notice Body", type: "textarea" as const, section: "Fees & Escrow", hint: "Tokens: {{name}}, {{feeRate}}, {{escrowWindow}}" },
  { key: "features.guestBrowse", label: "Guest Browse", type: "toggle" as const, section: "Features" },
  { key: "features.googleDriveSync", label: "Google Drive Sync", type: "toggle" as const, section: "Features" },
  { key: "features.blogEnabled", label: "Blog", type: "toggle" as const, section: "Features" },
  { key: "features.emailNotifications", label: "Email Notifications", type: "toggle" as const, section: "Features" },
  { key: "dashboard.availabilityLookaheadDays", label: "Availability Calendar Days", type: "number" as const, section: "Features", unit: "days" },
  { key: "dashboard.paymentHistoryDays", label: "Payment History Window", type: "number" as const, section: "Features", unit: "days", hint: "0 = show full history (capped by row count only)." },
  { key: "hints.enabled", label: "Info Tooltips", type: "toggle" as const, section: "Guidance", hint: "Shows info-icon tooltips (fees, escrow, release window, disputes, wallet, audit trail) across money-path pages. Copy overrides live in the raw config JSON under `hints.copy` (empty string hides one tip)." },
  { key: "bookingFlow.enabled", label: "Next-Step Guidance Banner", type: "toggle" as const, section: "Guidance", hint: "\"Who acts next?\" banner on the booking detail page for states without their own action panel. Copy overrides live in the raw config JSON under `bookingFlow.copy`, keyed `${status}:${side}` (empty string hides one state)." },
  { key: "emailConfig.fromName", label: "Email From Name", type: "text" as const, section: "Email" },
  { key: "emailConfig.fromEmail", label: "Email From Address", type: "text" as const, section: "Email", hint: "Resend recommends a real address on a subdomain (e.g. hello@mail.yourdomain.com), not a \"no-reply\" address — recipients need a reply path to build trust and report spam. The subdomain must be verified in Resend." },
  { key: "emailVerification.bannerEnabled", label: "Verify-Email Banner", type: "toggle" as const, section: "Email", hint: "Shows a dismissible reminder with resend to signed-in users whose email is unverified." },
  { key: "mediaUpload.enabled", label: "Media Uploads", type: "toggle" as const, section: "Media" },
  { key: "mediaUpload.cloudinaryEnabled", label: "Direct Uploads", type: "toggle" as const, section: "Media" },
  { key: "mediaUpload.maxFileSizeMb", label: "Max Upload Size", type: "number" as const, section: "Media", unit: "MB" },
  { key: "mediaUpload.cleanupEnabled", label: "Orphan Cleanup Job", type: "toggle" as const, section: "Media" },
  { key: "mediaUpload.cleanupOrphanAfterHours", label: "Delete Orphans After", type: "number" as const, section: "Media", unit: "hours" },
  { key: "features.referralsEnabled", label: "Referrals & Leaderboard", type: "toggle" as const, section: "Growth" },
  { key: "features.webinarsEnabled", label: "Webinars", type: "toggle" as const, section: "Growth" },
  { key: "firstHundred.enabled", label: "Founding-100 Badge", type: "toggle" as const, section: "Growth" },
  { key: "firstHundred.limit", label: "Founding-100 Limit", type: "number" as const, section: "Growth" },
  { key: "firstHundred.badgeLabel", label: "Founding-100 Badge Label", type: "text" as const, section: "Growth" },
  { key: "firstHundred.title", label: "Founding-100 Title", type: "text" as const, section: "Growth" },
  { key: "firstHundred.showRank", label: "Show Founding Rank", type: "toggle" as const, section: "Growth" },
  { key: "referral.enabled", label: "Referral Programme", type: "toggle" as const, section: "Growth" },
  { key: "referral.directPoints", label: "Direct Referral Points", type: "number" as const, section: "Growth" },
  { key: "referral.secondDegreePoints", label: "Second-Degree Points", type: "number" as const, section: "Growth" },
  { key: "referral.heroTitle", label: "Referrals Page Title", type: "text" as const, section: "Growth" },
  { key: "referral.shareLabel", label: "Referral Share Button", type: "text" as const, section: "Growth" },
  { key: "leaderboard.enabled", label: "Leaderboard", type: "toggle" as const, section: "Growth" },
  { key: "leaderboard.title", label: "Leaderboard Title", type: "text" as const, section: "Growth" },
  { key: "leaderboard.pageSize", label: "Leaderboard Page Size", type: "number" as const, section: "Growth" },
  { key: "leaderboard.factors.referrals.enabled", label: "Factor · Referrals", type: "toggle" as const, section: "Growth" },
  { key: "leaderboard.factors.referrals.label", label: "Factor Label · Referrals", type: "text" as const, section: "Growth" },
  { key: "leaderboard.factors.referrals.description", label: "Factor Description · Referrals", type: "text" as const, section: "Growth" },
  { key: "leaderboard.factors.referrals.weight", label: "Factor Weight · Referrals", type: "number" as const, section: "Growth" },
  { key: "leaderboard.factors.referrals.showRawValue", label: "Show Raw Value · Referrals", type: "toggle" as const, section: "Growth" },
  { key: "leaderboard.factors.portfolio.enabled", label: "Factor · Portfolio", type: "toggle" as const, section: "Growth" },
  { key: "leaderboard.factors.portfolio.label", label: "Factor Label · Portfolio", type: "text" as const, section: "Growth" },
  { key: "leaderboard.factors.portfolio.description", label: "Factor Description · Portfolio", type: "text" as const, section: "Growth" },
  { key: "leaderboard.factors.portfolio.weight", label: "Factor Weight · Portfolio", type: "number" as const, section: "Growth" },
  { key: "leaderboard.factors.portfolio.showRawValue", label: "Show Raw Value · Portfolio", type: "toggle" as const, section: "Growth" },
  { key: "leaderboard.factors.bookings.enabled", label: "Factor · Bookings", type: "toggle" as const, section: "Growth" },
  { key: "leaderboard.factors.bookings.label", label: "Factor Label · Bookings", type: "text" as const, section: "Growth" },
  { key: "leaderboard.factors.bookings.description", label: "Factor Description · Bookings", type: "text" as const, section: "Growth" },
  { key: "leaderboard.factors.bookings.weight", label: "Factor Weight · Bookings", type: "number" as const, section: "Growth" },
  { key: "leaderboard.factors.bookings.showRawValue", label: "Show Raw Value · Bookings", type: "toggle" as const, section: "Growth" },
  { key: "leaderboard.factors.ratings.enabled", label: "Factor · Ratings", type: "toggle" as const, section: "Growth" },
  { key: "leaderboard.factors.ratings.label", label: "Factor Label · Ratings", type: "text" as const, section: "Growth" },
  { key: "leaderboard.factors.ratings.description", label: "Factor Description · Ratings", type: "text" as const, section: "Growth" },
  { key: "leaderboard.factors.ratings.weight", label: "Factor Weight · Ratings", type: "number" as const, section: "Growth" },
  { key: "leaderboard.factors.ratings.showRawValue", label: "Show Raw Value · Ratings", type: "toggle" as const, section: "Growth" },
  { key: "countdown.enabled", label: "Countdown Widgets", type: "toggle" as const, section: "Growth", hint: "Widget content, timeline and icons are managed on the Countdown admin page." },
  { key: "bugReport.enabled", label: "Error Report Popup", type: "toggle" as const, section: "Growth" },
  { key: "bugReport.popupTitle", label: "Error Popup Title", type: "text" as const, section: "Growth" },
  { key: "bugReport.popupMessage", label: "Error Popup Message", type: "text" as const, section: "Growth" },
  { key: "bugReport.reportButtonLabel", label: "Error Popup Report Label", type: "text" as const, section: "Growth" },
  { key: "bugReport.continueButtonLabel", label: "Error Popup Continue Label", type: "text" as const, section: "Growth" },
  { key: "bugReport.severity", label: "Error Report Severity", type: "text" as const, section: "Growth", hint: "One of LOW, MEDIUM, HIGH, CRITICAL." },
  { key: "bugReport.includeConsoleLogs", label: "Attach Console Logs", type: "toggle" as const, section: "Growth" },
  { key: "landingStats.items.creators.enabled", label: "Stat · Creators", type: "toggle" as const, section: "Growth" },
  { key: "landingStats.items.creators.label", label: "Stat Label · Creators", type: "text" as const, section: "Growth" },
  { key: "landingStats.items.creators.fallbackValue", label: "Stat Fallback · Creators", type: "text" as const, section: "Growth" },
  { key: "landingStats.items.bookings.enabled", label: "Stat · Bookings", type: "toggle" as const, section: "Growth" },
  { key: "landingStats.items.bookings.label", label: "Stat Label · Bookings", type: "text" as const, section: "Growth" },
  { key: "landingStats.items.bookings.fallbackValue", label: "Stat Fallback · Bookings", type: "text" as const, section: "Growth" },
  { key: "landingStats.items.avgRating.enabled", label: "Stat · Avg Rating", type: "toggle" as const, section: "Growth" },
  { key: "landingStats.items.avgRating.label", label: "Stat Label · Avg Rating", type: "text" as const, section: "Growth" },
  { key: "landingStats.items.avgRating.fallbackValue", label: "Stat Fallback · Avg Rating", type: "text" as const, section: "Growth" },
  { key: "landingStats.items.portfolio.enabled", label: "Stat · Portfolio Items", type: "toggle" as const, section: "Growth" },
  { key: "landingStats.items.members.enabled", label: "Stat · Members", type: "toggle" as const, section: "Growth" },
  { key: "landingStats.items.team.enabled", label: "Stat · Team", type: "toggle" as const, section: "Growth" },
  { key: "scrollToTop.enabled", label: "Back-to-Top Button", type: "toggle" as const, section: "Growth" },
  { key: "scrollToTop.thresholdPx", label: "Back-to-Top Threshold", type: "number" as const, section: "Growth", unit: "px" },
  { key: "scrollToTop.label", label: "Back-to-Top Label", type: "text" as const, section: "Growth" },
  { key: "webinars.heroTitle", label: "Webinars Page Title", type: "text" as const, section: "Growth" },
  { key: "webinars.heroSubtitle", label: "Webinars Page Subtitle", type: "text" as const, section: "Growth" },
  { key: "webinars.upcomingTitle", label: "Webinars Upcoming Heading", type: "text" as const, section: "Growth" },
  { key: "webinars.pastTitle", label: "Webinars Past Heading", type: "text" as const, section: "Growth" },
  { key: "webinars.maxRegistrantsPerWebinar", label: "Webinar Registration Limit", type: "number" as const, section: "Growth", hint: "Seats per webinar — 0 means unlimited." },
  { key: "webinars.guestPrompt", label: "Webinar Guest Prompt", type: "text" as const, section: "Growth" },
  { key: "webinars.guestPromptCtaLabel", label: "Webinar Guest CTA Label", type: "text" as const, section: "Growth" },
  { key: "webinars.registerCtaLabel", label: "Webinar Register CTA Label", type: "text" as const, section: "Growth" },
  { key: "webinars.registeredLabel", label: "Webinar Registered Label", type: "text" as const, section: "Growth" },
  { key: "webinars.marketingConsentLabel", label: "Webinar Consent Label", type: "text" as const, section: "Growth" },
  { key: "webinars.cancelCtaLabel", label: "Webinar Cancel CTA Label", type: "text" as const, section: "Growth" },
  { key: "webinars.cancelConfirmMessage", label: "Webinar Cancel Confirm Message", type: "text" as const, section: "Growth" },
  { key: "webinars.registrationCancelledLabel", label: "Webinar Cancelled Toast Label", type: "text" as const, section: "Growth" },
  { key: "navigation.maxDesktopLinks", label: "Desktop Nav Max Links", type: "number" as const, section: "Navigation", hint: "Links shown inline on desktop before the rest spill into the More dropdown." },
  { key: "navigation.moreLabel", label: "Overflow Dropdown Label", type: "text" as const, section: "Navigation" },
  { key: "navigation.showWalletInNav", label: "Show Wallet in Navbar", type: "toggle" as const, section: "Navigation", hint: "Wallet link renders for signed-in users only, and only while wallet payouts are enabled." },
  { key: "navigation.walletLabel", label: "Wallet Link Label", type: "text" as const, section: "Navigation" },
  { key: "navigation.walletHref", label: "Wallet Link Target", type: "text" as const, section: "Navigation" },
];

type ConfigFieldDef = (typeof configFields)[number];

const SECTION_TABS = [
  {
    id: "branding",
    section: "Branding",
    label: "Branding",
    icon: Palette,
    description: "Platform name, tagline and accent colour.",
  },
  {
    id: "fees-escrow",
    section: "Fees & Escrow",
    label: "Fees & Escrow",
    icon: CreditCard,
    description: "Payment providers, fees, escrow window and the notices shown around money.",
  },
  {
    id: "features",
    section: "Features",
    label: "Features",
    icon: SlidersHorizontal,
    description: "Platform feature flags plus availability and history windows.",
  },
  {
    id: "guidance",
    section: "Guidance",
    label: "Guidance",
    icon: Lightbulb,
    description: "Info tooltips and the next-step guidance banner.",
  },
  {
    id: "email",
    section: "Email",
    label: "Email",
    icon: Mail,
    description: "Sender identity and the verify-email reminder.",
  },
  {
    id: "media",
    section: "Media",
    label: "Media",
    icon: ImageIcon,
    description: "Upload limits and orphaned-media cleanup.",
  },
  {
    id: "growth",
    section: "Growth",
    label: "Growth",
    icon: TrendingUp,
    description: "Referrals, leaderboard, webinars, stats, countdown and error reporting.",
  },
  {
    id: "navigation",
    section: "Navigation",
    label: "Navigation",
    icon: Navigation,
    description: "Navbar overflow behaviour and the wallet link.",
  },
] as const;

const CHANGE_LOG_TAB = {
  id: "change-log",
  label: "Change Log",
  icon: History,
  description: "Audit trail of configuration updates — who changed what, with old and new values.",
} as const;

const DEFAULT_TAB_ID = SECTION_TABS[0].id;

const TAB_IDS: ReadonlySet<string> = new Set([
  ...SECTION_TABS.map((tab) => tab.id),
  CHANGE_LOG_TAB.id,
]);

function fieldMatchesQuery(field: ConfigFieldDef, query: string): boolean {
  if (!query) return true;
  const haystack = [
    field.label,
    field.key,
    "hint" in field ? field.hint : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc, part) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj as unknown);
}

const changeLogColumns: ClColumn<ChangeLogEntry>[] = [
  {
    key: "key",
    header: "Key",
    cell: (entry) => (
      <span className="text-[12px] font-[family-name:var(--font-mono)] break-all">{entry.entity}</span>
    ),
  },
  {
    key: "old",
    header: "Old Value",
    cell: (entry) => <AuditValueCell value={entry.oldValue} />,
  },
  {
    key: "new",
    header: "New Value",
    cell: (entry) => <AuditValueCell value={entry.newValue} />,
  },
  {
    key: "performedBy",
    header: "Performed By",
    cell: (entry) => {
      if (!entry.actorName && !entry.actorEmail) {
        return (
          <span className="text-[11px] text-[var(--color-text-tertiary)]">System / unknown</span>
        );
      }
      return (
        <div className="min-w-0">
          <div className="text-[12px] truncate">{entry.actorName ?? "—"}</div>
          {entry.actorEmail && (
            <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">
              {entry.actorEmail}
            </div>
          )}
        </div>
      );
    },
  },
  {
    key: "timestamp",
    header: "Timestamp",
    hideOnMobile: true,
    cell: (entry) => (
      <span className="text-[11px] font-[family-name:var(--font-mono)] text-[var(--color-text-tertiary)] whitespace-nowrap">
        {new Date(entry.createdAt).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    ),
  },
];

function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const parts = path.split(".");
  const result = { ...obj };
  let current = result;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== "object") {
      current[part] = {};
    }
    current[part] = { ...(current[part] as Record<string, unknown>) };
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
  return result;
}

export default function ConfigPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_TAB_ID);
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-config"],
    queryFn: async () => {
      const res = await fetch("/api/admin/config");
      const json = await res.json();
      if (json.success) return json.data;
      throw new Error(json.error ?? "Failed to load config");
    },
  });

  useEffect(() => {
    if (data) {
      setConfig(data as Record<string, unknown>);
    }
  }, [data]);

  useEffect(() => {
    fetch("/api/admin/config?log=true")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setChangeLog(json.data ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (TAB_IDS.has(hash)) {
        setActiveTab(hash);
        setQuery("");
      }
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setQuery("");
    try {
      window.history.replaceState(null, "", `#${tab}`);
    } catch {
      // History API unavailable — tab switching still works in-memory.
    }
  }, []);

  const dirtyFields = useMemo(() => {
    if (!data) return [] as ConfigFieldDef[];
    const saved = data as Record<string, unknown>;
    return configFields.filter(
      (field) =>
        getNestedValue(config as Record<string, unknown>, field.key) !==
        getNestedValue(saved, field.key),
    );
  }, [config, data]);

  const dirtyCount = dirtyFields.length;
  const dirtySections = useMemo(
    () => new Set(dirtyFields.map((field) => field.section)),
    [dirtyFields],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to save");
      return json;
    },
  });

  const handleChange = useCallback(
    (key: string, value: unknown) => {
      setConfig((prev) => setNestedValue(prev, key, value));
    },
    [],
  );

  const handleSave = useCallback(() => {
    const promises: Promise<unknown>[] = [];
    for (const field of configFields) {
      const currentValue = getNestedValue(config as Record<string, unknown>, field.key);
      const originalValue = getNestedValue(
        data as Record<string, unknown>,
        field.key,
      );
      if (currentValue !== originalValue) {
        promises.push(
          saveMutation.mutateAsync({ key: field.key, value: currentValue }),
        );
      }
    }
    if (promises.length === 0) {
      toast("No changes to save", "info");
      return;
    }
    Promise.allSettled(promises).then((results) => {
      queryClient.invalidateQueries({ queryKey: ["admin-config"] });

      const failures = results.filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );
      if (failures.length === 0) {
        toast(
          `${promises.length} ${promises.length === 1 ? "setting" : "settings"} saved`,
          "success",
        );
        return;
      }

      const reason = failures[0].reason;
      toast(
        failures.length === 1
          ? reason instanceof Error
            ? reason.message
            : "Failed to save setting"
          : `${failures.length} settings failed to save`,
        "error",
      );
    });
  }, [config, data, saveMutation, toast, queryClient]);

  const handleRevert = useCallback(() => {
    if (data) {
      setConfig(data as Record<string, unknown>);
      toast("Changes reverted", "info");
    }
  }, [data, toast]);

  const activeSection = SECTION_TABS.find((tab) => tab.id === activeTab);
  const normalizedQuery = query.trim().toLowerCase();
  const activeFields = activeSection
    ? configFields.filter((field) => field.section === activeSection.section)
    : [];
  const visibleFields = activeFields.filter((field) =>
    fieldMatchesQuery(field, normalizedQuery),
  );
  const activeDescription =
    activeSection?.description ?? CHANGE_LOG_TAB.description;

  if (isLoading) {
    return (
      <div className="text-[var(--color-text-secondary)] text-[14px]">
        Loading configuration...
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-5 gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">
            Platform Configuration
          </h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Changes apply immediately across the entire platform.
          </div>
        </div>
        <div
          className={`text-[12px] font-medium whitespace-nowrap ${
            dirtyCount > 0
              ? "text-[var(--color-warning)]"
              : "text-[var(--color-text-tertiary)]"
          }`}
          aria-live="polite"
        >
          {dirtyCount === 0
            ? "All changes saved"
            : `${dirtyCount} unsaved ${
                dirtyCount === 1 ? "change" : "changes"
              }`}
        </div>
      </div>

      <ClTabs value={activeTab} onValueChange={handleTabChange}>
        <div className="sticky top-14 lg:top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-4 bg-[var(--color-bg)]/95 backdrop-blur border-b border-[var(--color-border)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <ClTabsList
              ariaLabel="Configuration sections"
              className="min-w-0 flex-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {SECTION_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <ClTabsTrigger
                    key={tab.id}
                    value={tab.id}
                    title={tab.description}
                  >
                    <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
                    <span>{tab.label}</span>
                    {dirtySections.has(tab.section) && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)]"
                        title="Unsaved changes in this section"
                        aria-hidden="true"
                      />
                    )}
                  </ClTabsTrigger>
                );
              })}
              <ClTabsTrigger
                value={CHANGE_LOG_TAB.id}
                title={CHANGE_LOG_TAB.description}
              >
                <History size={14} strokeWidth={1.8} aria-hidden="true" />
                <span>{CHANGE_LOG_TAB.label}</span>
              </ClTabsTrigger>
            </ClTabsList>
            <div className="flex items-center gap-2 shrink-0">
              <ClButton
                variant="primary"
                size="sm"
                onClick={handleSave}
                loading={saveMutation.isPending}
              >
                Save Changes
              </ClButton>
              <ClButton
                variant="ghost"
                size="sm"
                onClick={handleRevert}
                disabled={dirtyCount === 0}
              >
                Revert
              </ClButton>
            </div>
          </div>
        </div>

        <div className="text-[12px] text-[var(--color-text-tertiary)] mb-3">
          {activeDescription}
        </div>

        {SECTION_TABS.map((tab) => (
          <ClTabsContent key={tab.id} value={tab.id}>
            {activeSection?.id === tab.id && activeFields.length > 8 && (
              <ClInput
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Filter ${tab.label.toLowerCase()} settings…`}
                aria-label={`Filter ${tab.label} settings`}
                className="max-w-[360px] mb-3"
              />
            )}
            <ClCard className="p-2 sm:p-4">
              {visibleFields.length === 0 ? (
                <div className="text-[12px] text-[var(--color-text-tertiary)] text-center py-8">
                  No settings match “{query}”.
                </div>
              ) : (
                visibleFields.map((field) => {
                  const currentValue = getNestedValue(
                    config as Record<string, unknown>,
                    field.key,
                  );
                  const defaultValue = getNestedValue(
                    (data ?? {}) as Record<string, unknown>,
                    field.key,
                  );
                  return (
                    <ConfigField
                      key={field.key}
                      label={field.label}
                      fieldKey={field.key}
                      type={field.type}
                      value={currentValue}
                      defaultValue={defaultValue}
                      unit={
                        "unit" in field
                          ? (field as { unit?: string }).unit
                          : undefined
                      }
                      hint={
                        "hint" in field
                          ? (field as { hint?: string }).hint
                          : undefined
                      }
                      options={
                        "options" in field
                          ? (
                              field as {
                                options?: { label: string; value: string }[];
                              }
                            ).options
                          : undefined
                      }
                      onChange={handleChange}
                    />
                  );
                })
              )}
            </ClCard>
            <div className="text-[11px] text-[var(--color-text-tertiary)] mt-2 mb-4">
              {activeFields.length}{" "}
              {activeFields.length === 1 ? "setting" : "settings"} in this
              section
              {normalizedQuery &&
              visibleFields.length !== activeFields.length
                ? ` · ${visibleFields.length} shown`
                : ""}
            </div>
          </ClTabsContent>
        ))}

        <ClTabsContent value={CHANGE_LOG_TAB.id}>
          <ClDataTable
            columns={changeLogColumns}
            rows={changeLog}
            rowKey={(e) => e.id}
            pageSize={8}
            emptyState={
              <div className="text-[12px] text-[var(--color-text-tertiary)] text-center py-8">
                No changes recorded yet.
              </div>
            }
          />
        </ClTabsContent>
      </ClTabs>
    </div>
  );
}
