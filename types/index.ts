/* ── Enums ── */

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

export interface IPlatformConfig {
  name: string;
  tagline: string;
  primaryColor: string;
  feeRate: number;
  escrowReleaseDays: number;
  cancellationPolicy: ICancellationPolicy;
  categories: ICategoryConfig[];
  features: IFeatureFlags;
  devCredit?: IDevCredit;
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
