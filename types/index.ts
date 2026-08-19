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
  blogConfig?: IBlogConfig;
  emailConfig?: IEmailConfig;
  devCredit?: IDevCredit;
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
