/* ── Enums ── */

export enum WalletTransactionType {
  TOPUP_CARD = "TOPUP_CARD",
  TOPUP_BANK = "TOPUP_BANK",
  BOOKING_DEBIT = "BOOKING_DEBIT",
  ESCROW_HOLD = "ESCROW_HOLD",
  ESCROW_RELEASE = "ESCROW_RELEASE",
  MILESTONE_DEBIT = "MILESTONE_DEBIT",
  MILESTONE_RELEASE = "MILESTONE_RELEASE",
  DIRECT_PAYMENT_DEBIT = "DIRECT_PAYMENT_DEBIT",
  DIRECT_PAYMENT_CREDIT = "DIRECT_PAYMENT_CREDIT",
  WITHDRAWAL = "WITHDRAWAL",
  FEE_DEBIT = "FEE_DEBIT",
  REFUND = "REFUND",
}

export enum MilestoneStatus {
  PENDING = "PENDING",
  FUNDED = "FUNDED",
  IN_PROGRESS = "IN_PROGRESS",
  SUBMITTED = "SUBMITTED",
  APPROVED = "APPROVED",
  DISPUTED = "DISPUTED",
  RELEASED = "RELEASED",
  REFUNDED = "REFUNDED",
  CANCELLED = "CANCELLED",
}

export enum PaymentMode {
  ESCROW = "ESCROW",
  MILESTONE = "MILESTONE",
  DIRECT = "DIRECT",
}

export enum UserRole {
  CLIENT = "CLIENT",
  PROVIDER = "PROVIDER",
  ADMIN = "ADMIN",
}

export enum BookingStatus {
  REQUESTED = "REQUESTED",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  CANCELLED = "CANCELLED",
  HELD = "HELD",
  IN_PROGRESS = "IN_PROGRESS",
  RELEASED = "RELEASED",
  DISPUTED = "DISPUTED",
  REFUNDED = "REFUNDED",
}

export enum EscrowState {
  PENDING = "PENDING",
  HELD = "HELD",
  IN_PROGRESS = "IN_PROGRESS",
  RELEASED = "RELEASED",
  DISPUTED = "DISPUTED",
  REFUNDED = "REFUNDED",
}

export enum PortfolioItemSource {
  DIRECT = "DIRECT",
  DRIVE = "DRIVE",
}

export enum ExperienceLevel {
  EMERGING = "EMERGING",
  ESTABLISHED = "ESTABLISHED",
  VETERAN = "VETERAN",
}

export enum ConsentType {
  TERMS = "TERMS",
  MARKETING = "MARKETING",
  ANALYTICS = "ANALYTICS",
}

/* ── Entity Interfaces ── */

export interface IUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  phone: string | null;
  role: UserRole;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
}

export interface IProvider {
  id: string;
  userId: string;
  categorySlug: string;
  displayName: string;
  bio: string | null;
  location: string | null;
  yearsActive: number | null;
  experienceLevel: ExperienceLevel | null;
  categoryFields: Record<string, unknown> | null;
  coverVideoUrl: string | null;
  avatarUrl: string | null;
  active: boolean;
  verified: boolean;
  driveFolderUrl: string | null;
  /** Money in kobo */
  profileViews: number;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
}

export interface IPortfolioItem {
  id: string;
  providerId: string;
  source: PortfolioItemSource;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  caption: string | null;
  driveFileId: string | null;
  mimeType: string;
  orderIndex: number;
  visible: boolean;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
  // Extended fields for gallery view (from explore portfolio API)
  providerName?: string;
  providerSlug?: string;
  providerAvatarUrl?: string | null;
  providerCategorySlug?: string;
  providerCategoryLabel?: string;
  providerLocation?: string | null;
  providerVerified?: boolean;
  providerFeatured?: boolean;
  avgRating?: number | null;
  reviewCount?: number;
}

export interface IServicePackage {
  id: string;
  providerId: string;
  tier: "BASIC" | "STANDARD" | "PREMIUM";
  label: string;
  /** Money in kobo */
  price: number;
  deliverables: string[];
  turnaroundDays: number;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
}

export interface IBooking {
  id: string;
  providerId: string;
  clientId: string;
  packageId: string;
  status: BookingStatus;
  escrowState: EscrowState;
  /** Money in kobo */
  subtotal: number;
  /** Money in kobo */
  fee: number;
  /** Money in kobo */
  total: number;
  serviceDate: string | null;
  scopeNotes: string | null;
  /** ISO 8601 */
  releaseDeadline: string | null;
  paymentMode: PaymentMode;
  paystackRef: string | null;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
}

export interface IPayment {
  id: string;
  bookingId: string;
  /** Money in kobo */
  amount: number;
  /** Money in kobo */
  fee: number;
  /** Money in kobo */
  netAmount: number;
  paystackRef: string;
  status: string;
  /** ISO 8601 */
  createdAt: string;
}

export interface IWallet {
  id: string;
  userId: string;
  balanceKobo: number;
  escrowKobo: number;
  totalEarnedKobo: number;
  dvaAccountNumber?: string;
  dvaBankName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IWalletTransaction {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amountKobo: number;
  direction: "CREDIT" | "DEBIT";
  balanceAfterKobo: number;
  reference: string;
  relatedBookingId?: string;
  relatedMilestoneId?: string;
  paystackRef?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface IBookingMilestone {
  id: string;
  bookingId: string;
  index: number;
  title: string;
  description?: string;
  amountKobo: number;
  feeKobo: number;
  status: MilestoneStatus;
  dueDate?: string;
  fundedAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  releasedAt?: string;
  createdAt: string;
}

export interface IReview {
  id: string;
  bookingId: string;
  reviewerId: string;
  providerId: string;
  /** 1-5 */
  rating: number;
  body: string | null;
  /** ISO 8601 */
  createdAt: string;
}

export interface IDispute {
  id: string;
  bookingId: string;
  raisedById: string;
  reason: string;
  outcome: "RESOLVED" | "REFUNDED" | null;
  adminNotes: string | null;
  resolvedById: string | null;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  resolvedAt: string | null;
}

export interface IConsentRecord {
  id: string;
  userId: string;
  type: ConsentType;
  granted: boolean;
  /** ISO 8601 */
  createdAt: string;
}

/* ── Config Interfaces ── */

export interface ICancellationPolicy {
  fullRefundThresholdHours: number;
  lateCancellationHoldPercent: number;
}

export interface IFieldSchemaField {
  key: string;
  label: string;
  type: "text" | "tags" | "select" | "number";
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface ICategoryConfig {
  slug: string;
  label: string;
  description: string;
  icon: string;
  fieldSchema: IFieldSchemaField[];
  active: boolean;
}

export interface IFeatureFlags {
  guestBrowse: boolean;
  googleDriveSync: boolean;
  blogEnabled: boolean;
  emailNotifications?: boolean;
  /** Referral programme + public leaderboard (nav links, /referrals, /leaderboard) */
  referralsEnabled?: boolean;
  /** Public webinars landing + registration (/webinars) */
  webinarsEnabled?: boolean;
}

export type EmailTemplateBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "button"; text: string; url: string }
  | { type: "image"; url: string; alt: string }
  | { type: "divider" };

export interface IEmailTemplate {
  /** Human-friendly display name shown in the admin template list */
  name?: string;
  subject: string;
  bodyHtml: string;
  enabled: boolean;
  /** Optional structured blocks backing the visual (no-HTML) editor */
  blocks?: EmailTemplateBlock[];
}

export interface IEmailConfig {
  fromName: string;
  fromEmail: string;
  templates: Record<string, IEmailTemplate>;
}

export interface ITeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatarUrl: string | null;
  socialLinks: {
    platform: string;
    url: string;
  }[];
  orderIndex: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IDevCredit {
  text: string;
  url: string;
}

/** Public `/team` page hiring/join block — admin-editable from `/admin/team`. */
export interface ITeamPageConfig {
  /** Master switch — when false the hiring block is hidden entirely */
  hiringEnabled: boolean;
  hiringTitle: string;
  hiringSubtitle: string;
  hiringCtaLabel: string;
  /** Relative path (e.g. `/bug-report`) or full URL (e.g. `https://…`, `mailto:…`) */
  hiringCtaHref: string;
}

export interface IMilestonePaymentsConfig {
  enabled: boolean;
  minBookingAmountKobo: number;
  maxMilestones: number;
  minMilestones: number;
  minMilestoneAmountKobo: number;
  reviewWindowDays: number;
}

export interface IWalletConfig {
  enabled: boolean;
  minTopUpKobo: number;
  minWithdrawalKobo: number;
  maxDvaAccounts: number;
}

export interface IMediaUploadConfig {
  /** Master switch — admin can disable all direct media uploads */
  enabled: boolean;
  /** Toggle Cloudinary-powered direct uploads. When off, only paste-link mode is offered */
  cloudinaryEnabled: boolean;
  /** Maximum accepted file size in MB */
  maxFileSizeMb: number;
  /** Accepted video MIME types */
  videoTypes: string[];
  /** Accepted image MIME types */
  imageTypes: string[];
  /** Delete unreferenced uploads older than this many hours (0 disables orphan sweep) */
  cleanupOrphanAfterHours: number;
  /** Master switch for the orphan-asset cleanup job */
  cleanupEnabled: boolean;
}

export interface IMediaAsset {
  id: string;
  publicId: string;
  cloudName: string;
  resourceType: "video" | "image";
  url: string;
  thumbnailUrl: string | null;
  mimeType: string | null;
  ownerId: string | null;
  ownerName?: string | null;
  status: "ACTIVE" | "DELETED";
  /** ISO 8601 */
  createdAt: string;
  /** Whether the asset URL/publicId is currently used by a profile or portfolio item */
  referenced?: boolean;
}

export interface IDashboardConfig {
  /** Number of days shown in the provider availability calendar */
  availabilityLookaheadDays: number;
}

/* ── Growth: founding-100, referrals, leaderboard, countdown, bug report,
     landing stats, back-to-top, webinars ── */

export interface IEarlyMemberConfig {
  /** Master switch — when off, no rank fetch and no badge render */
  enabled: boolean;
  /** Number of earliest registrations that qualify for the badge */
  limit: number;
  badgeLabel: string;
  title: string;
  description: string;
  /** Show the member's registration rank (e.g. "#42") alongside the badge */
  showRank: boolean;
}

export interface IReferralConfig {
  enabled: boolean;
  /** Points awarded for a direct (degree-1) referral */
  directPoints: number;
  /** Points awarded for a second-degree (referral-of-referral) signup */
  secondDegreePoints: number;
  heroTitle: string;
  heroSubtitle: string;
  shareLabel: string;
  copiedLabel: string;
  explainerTitle: string;
  explainerItems: string[];
}

/** Config row for one leaderboard scoring factor (F7 — factors are data). */
export interface LeaderboardFactor {
  key: string;
  enabled: boolean;
  label: string;
  description: string;
  /** Relative contribution to the weighted score */
  weight: number;
  /** Render the unscaled factor value next to the weighted score */
  showRawValue: boolean;
}

export interface ILeaderboardConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  howItWorksTitle: string;
  /** Rows per page on the public leaderboard */
  pageSize: number;
  /**
   * Factor registry rows keyed by factor key (`referrals`, `portfolio`,
   * `bookings`, `ratings`). A record rather than an array so admin editors can
   * save dotted paths (e.g. `leaderboard.factors.referrals.weight`) without the
   * config deep-set logic replacing the collection.
   */
  factors: Record<string, LeaderboardFactor>;
}

export interface ILeaderboardRow {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  /** Weighted score used for ranking */
  score: number;
  /** Weighted contribution per factor key */
  breakdown: Record<string, number>;
  /** Unscaled factor values (rendered when the factor has showRawValue) */
  rawValues?: Record<string, number>;
  isCurrentUser?: boolean;
}

export interface IReferralCode {
  id: string;
  userId: string;
  code: string;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
}

export interface IReferralEvent {
  id: string;
  /** Who earns the points */
  userId: string;
  /** The account created through the referral */
  inviteeId: string;
  /** Direct owner of the code that was used */
  referrerId: string;
  code: string | null;
  /** 1 = direct signup, 2 = referral of a referral */
  degree: number;
  points: number;
  source: string;
  /** ISO 8601 */
  createdAt: string;
}

export interface IReferralSummary {
  code: string;
  shareUrl: string;
  totalPoints: number;
  directReferrals: number;
  secondDegreeReferrals: number;
  inviteeCount: number;
}

export type CountdownArea = "landing" | "explore";

export interface ICountdownWidget {
  id: string;
  enabled: boolean;
  title: string;
  description?: string;
  /** ISO 8601 moment the widget counts down to */
  endsAt: string;
  /** Slots this widget renders in */
  areas: CountdownArea[];
  /** Ascending render order within a slot */
  orderIndex: number;
  /** lucide icon name — must be listed in `ICountdownConfig.iconAllowlist` */
  icon?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface ICountdownConfig {
  /** Master switch for every countdown slot */
  enabled: boolean;
  /** Curated lucide icon names offered in the admin icon picker (§15 — lucide only) */
  iconAllowlist: string[];
  /**
   * Widgets rendered by filtering `enabled` + `areas`, ordered by `orderIndex`.
   * Empty by default so slots render nothing until an admin adds one.
   */
  widgets: ICountdownWidget[];
}

export type BugReportSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface IBugReportConfig {
  /** Master switch for the error-boundary report popup */
  enabled: boolean;
  popupTitle: string;
  popupMessage: string;
  reportButtonLabel: string;
  continueButtonLabel: string;
  /** Severity preselected on reports raised from the popup */
  severity: BugReportSeverity;
  /** Attach captured console-log entries to the report */
  includeConsoleLogs: boolean;
}

export type LandingStatFormat = "count" | "compact" | "rating";

export interface ILandingStatItem {
  id: string;
  /** Aggregate resolved by PlatformStatsService (providers, bookings, reviews, portfolioItems, user, teamMembers) */
  key: string;
  label: string;
  format: LandingStatFormat;
  orderIndex: number;
  enabled: boolean;
  /** Rendered when the aggregate is unavailable — never blank or NaN */
  fallbackValue: string;
}

export interface ILandingStatsConfig {
  /**
   * Stat items keyed by item id. A record rather than an array so admin editors
   * can save dotted paths (e.g. `landingStats.items.creators.fallbackValue`)
   * without the config deep-set logic replacing the collection. Order within a
   * slot comes from each item's `orderIndex`.
   */
  items: Record<string, ILandingStatItem>;
}

export interface IScrollToTopConfig {
  enabled: boolean;
  /** Scroll distance in px before the button appears */
  thresholdPx: number;
  /** Visible label / aria-label on the button */
  label: string;
}

export type WebinarStatus = "UPCOMING" | "LIVE" | "CANCELLED" | "ENDED";

export type WebinarRegistrationStatus = "REGISTERED" | "CANCELLED";

export interface IWebinar {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  coverUrl: string | null;
  status: WebinarStatus;
  /** ISO 8601 */
  startsAt: string | null;
  /** ISO 8601 */
  endsAt: string | null;
  durationMinutes: number | null;
  locationNote: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  recordingUrl: string | null;
  /** Past-webinar materials — EmailTemplateBlock[] */
  contentBlocks: EmailTemplateBlock[];
  metaTitle: string | null;
  metaDescription: string | null;
  orderIndex: number;
  active: boolean;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
  /** Aggregate count for the admin list */
  registrationCount?: number;
}

export interface IWebinarRegistration {
  id: string;
  webinarId: string;
  /** Null for guest registrations — guests only leave an email */
  userId: string | null;
  email: string;
  /** Lowercased uniqueness key */
  emailKey: string;
  name: string | null;
  /** NDPR: marketing consent is explicit and stored, never assumed */
  consentMarketing: boolean;
  status: WebinarRegistrationStatus;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
}

export interface IWebinarsConfig {
  heroTitle: string;
  heroSubtitle: string;
  upcomingTitle: string;
  pastTitle: string;
  /** Seats per webinar (0 = unlimited) */
  maxRegistrantsPerWebinar: number;
  /** Prompt shown to guests after a successful registration */
  guestPrompt: string;
  guestPromptCtaLabel: string;
  registerCtaLabel: string;
  registeredLabel: string;
  marketingConsentLabel: string;
}

export interface IPlatformConfig {
  name: string;
  tagline: string;
  primaryColor: string;
  logoPath: string;
  iconPath: string;
  feeRate: number;
  escrowReleaseDays: number;
  cancellationPolicy: ICancellationPolicy;
  categories: ICategoryConfig[];
  features: IFeatureFlags;
  milestonePayments: IMilestonePaymentsConfig;
  wallet: IWalletConfig;
  mediaUpload?: IMediaUploadConfig;
  dashboard?: IDashboardConfig;
  firstHundred?: IEarlyMemberConfig;
  referral?: IReferralConfig;
  leaderboard?: ILeaderboardConfig;
  countdown?: ICountdownConfig;
  bugReport?: IBugReportConfig;
  landingStats?: ILandingStatsConfig;
  scrollToTop?: IScrollToTopConfig;
  webinars?: IWebinarsConfig;
  blogConfig?: IBlogConfig;
  emailConfig?: IEmailConfig;
  devCredit?: IDevCredit;
  teamPage?: ITeamPageConfig;
}

export interface IBlogNewsletterConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  buttonLabel: string;
  successMessage: string;
}

export type BlogPageSection = "posts" | "sections" | "newsletter" | "footer";

export interface IBlogConfig {
  heroTitle: string;
  heroSubtitle: string;
  newsletter: IBlogNewsletterConfig;
  footerTagline: string;
  /** Optional visual-builder content sections rendered on the blog landing page */
  sections?: EmailTemplateBlock[];
  /**
   * Render order of the default landing-page sections. The hero (with category
   * chips) is always first; the remaining sections can be reordered by the
   * admin (e.g. moving the newsletter block above the posts grid).
   */
  sectionOrder?: BlogPageSection[];
}

export interface IBugReport {
  id: string;
  userId: string | null;
  title: string;
  description: string;
  stepsToReproduce: string | null;
  expectedBehavior: string | null;
  actualBehavior: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  pageUrl: string | null;
  userAgent: string | null;
  attachments: unknown[];
  adminNotes: string | null;
  reporterEmail: string | null;
  reporterName: string | null;
  screenshotUrls: string[];
  resolvedAt: string | null;
  resolvedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IAuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
}

/* ── Public Pages ── */

export interface IAboutPage {
  id: string;
  heroTitle: string;
  heroSubtitle?: string;
  sections: {
    id: string;
    title: string;
    content: string;
  }[];
  quickLinks: {
    label: string;
    href: string;
  }[];
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IHowItWorksPage {
  id: string;
  heroTitle: string;
  heroSubtitle?: string;
  sections: {
    id: string;
    title: string;
    subtitle?: string;
    steps: {
      step: number;
      title: string;
      description: string;
    }[];
  }[];
  sandboxes: {
    id: string;
    title: string;
    description: string;
    type: string;
  }[];
  faqs: {
    question: string;
    answer: string;
    category: string;
  }[];
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
}

/* ── API Wrappers ── */

export type { IExploreCard, IExploreFilters } from "./explore";
export { ExploreSort } from "./explore";

/* ── Dashboard ── */

export type {
  IDashboardBooking,
  IDashboardPipelineColumn,
  IDashboardStat,
  DashboardStatTone,
  IPortfolioPerformanceRow,
  IDashboardAvailabilitySlot,
  IProfileCompletenessItem,
  IProfileCompleteness,
  IDashboardQuickAction,
  IProviderDashboard,
  IClientPaymentRecord,
  IClientDashboard,
} from "./dashboard";

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  cursor: string | null;
  hasMore: boolean;
  error: string | null;
}
