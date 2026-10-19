import type { IBooking, IExploreCard } from "./index";
import type { BookingStatus } from "./index";

/**
 * Dashboard types for the role-aware `/dashboard` route.
 * Provider view: earnings, kanban booking pipeline, availability calendar,
 * portfolio performance. Client view: active bookings, booking history,
 * payment history.
 */

export interface IDashboardBooking {
  id: string;
  booking: IBooking;
  providerId: string;
  providerName: string;
  clientId: string;
  clientName: string;
  packageId: string;
  packageLabel: string;
  packageTier: string;
}

export interface IDashboardPipelineColumn {
  key: string;
  label: string;
  statuses: BookingStatus[];
  bookings: IDashboardBooking[];
}

export type DashboardStatTone =
  | "success"
  | "warning"
  | "accent"
  | "held"
  | "tertiary";

export interface IDashboardStat {
  /** Pre-formatted display value (e.g. "₦248,500") */
  value: string;
  /** Raw integer value backing the formatted display */
  rawValue: number;
  label: string;
  sub?: string;
  subTone?: DashboardStatTone;
  /**
   * Optional info-tip key (see lib/hints.ts HintKey) — when present and the
   * hint resolves, StatCard renders a ClInfoTip next to the label explaining
   * what the stat means (e.g. "dashboardEscrow" on the earnings/escrow stat).
   */
  hintKey?: string;
}

export interface IPortfolioPerformanceRow {
  id: string;
  title: string;
  mimeType: string;
  thumbnailUrl: string | null;
  /** 0-100 */
  conversionRate: number;
  plays: number;
  clicks: number;
  visible: boolean;
}

export interface IDashboardAvailabilitySlot {
  /** ISO date (YYYY-MM-DD) */
  date: string;
  status: "AVAILABLE" | "BOOKED" | "PAST";
  bookingId?: string;
  label?: string;
}

export interface IProfileCompletenessItem {
  key: string;
  label: string;
  completed: boolean;
}

export interface IProfileCompleteness {
  percent: number;
  completedItems: number;
  totalItems: number;
  items: IProfileCompletenessItem[];
}

export interface IDashboardQuickAction {
  label: string;
  href: string;
  variant: "primary" | "outlined" | "accent-outlined" | "ghost";
}

export interface IProviderDashboard {
  role: "PROVIDER";
  profile: {
    id: string;
    userId: string;
    displayName: string;
    categoryLabel: string;
    active: boolean;
    verified: boolean;
    profileViews: number;
  } | null;
  completeness: IProfileCompleteness;
  stats: IDashboardStat[];
  pipeline: IDashboardPipelineColumn[];
  portfolioPerformance: IPortfolioPerformanceRow[];
  portfolioGallery: {
    id: string;
    title: string | null;
    url: string;
    thumbnailUrl: string | null;
    mimeType: string;
    source: string;
    visible: boolean;
    orderIndex: number;
  }[];
  availability: IDashboardAvailabilitySlot[];
  quickActions: IDashboardQuickAction[];
}

export interface IClientPaymentRecord {
  id: string;
  bookingId: string;
  providerId: string;
  providerName: string;
  packageLabel: string;
  /** Money in kobo */
  amount: number;
  /** Money in kobo */
  fee: number;
  /** Money in kobo */
  netAmount: number;
  status: string;
  paystackRef: string;
  /** ISO 8601 */
  createdAt: string;
  /**
   * Present ONLY on derived rows (a charge was initiated but no `payments`
   * row settled yet) — the UI shows this instead of implying money moved.
   */
  stage?: string;
}

export interface IClientDashboard {
  role: "CLIENT";
  stats: IDashboardStat[];
  pipeline: IDashboardPipelineColumn[];
  paymentHistory: IClientPaymentRecord[];
  discover: IExploreCard[];
}
