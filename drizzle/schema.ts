import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ── Enums ── */

export const userRoleEnum = pgEnum("user_role", ["CLIENT", "PROVIDER", "ADMIN"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "REQUESTED", "ACCEPTED", "DECLINED", "CANCELLED",
  "HELD", "IN_PROGRESS", "RELEASED", "DISPUTED", "REFUNDED",
]);
export const escrowStateEnum = pgEnum("escrow_state", [
  "PENDING", "HELD", "IN_PROGRESS", "RELEASED", "DISPUTED", "REFUNDED",
]);
export const portfolioSourceEnum = pgEnum("portfolio_source", ["DIRECT", "DRIVE"]);
export const experienceLevelEnum = pgEnum("experience_level", ["EMERGING", "ESTABLISHED", "VETERAN"]);
export const consentTypeEnum = pgEnum("consent_type", ["TERMS", "MARKETING", "ANALYTICS"]);

/* ── Better Auth Core Tables ── */

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    /** Custom app fields */
    phone: text("phone"),
    phoneNumber: text("phone_number"),
    phoneNumberVerified: boolean("phone_number_verified").notNull().default(false),
    role: userRoleEnum("role").notNull().default("CLIENT"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("user_email_idx").on(table.email)],
);

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Application Tables ── */

export const providers = pgTable("providers", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  categorySlug: text("category_slug").notNull(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  location: text("location"),
  yearsActive: integer("years_active"),
  experienceLevel: experienceLevelEnum("experience_level"),
  /** JSONB field schema values */
  categoryFields: jsonb("category_fields"),
  coverVideoUrl: text("cover_video_url"),
  avatarUrl: text("avatar_url"),
  active: boolean("active").notNull().default(false),
  verified: boolean("verified").notNull().default(false),
  featured: boolean("featured").notNull().default(false),
  driveFolderUrl: text("drive_folder_url"),
  /** Money in kobo - profile view count */
  profileViews: integer("profile_views").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const portfolioItems = pgTable("portfolio_items", {
  id: text("id").primaryKey(),
  providerId: text("provider_id")
    .notNull()
    .references(() => providers.id, { onDelete: "cascade" }),
  source: portfolioSourceEnum("source").notNull().default("DIRECT"),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  title: text("title"),
  caption: text("caption"),
  driveFileId: text("drive_file_id"),
  mimeType: text("mime_type").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const servicePackages = pgTable("service_packages", {
  id: text("id").primaryKey(),
  providerId: text("provider_id")
    .notNull()
    .references(() => providers.id, { onDelete: "cascade" }),
  tier: text("tier", { enum: ["BASIC", "STANDARD", "PREMIUM"] }).notNull(),
  label: text("label").notNull(),
  /** Money in kobo */
  price: integer("price").notNull(),
  deliverables: jsonb("deliverables").notNull().default([]),
  turnaroundDays: integer("turnaround_days").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  providerId: text("provider_id")
    .notNull()
    .references(() => providers.id),
  clientId: text("client_id")
    .notNull()
    .references(() => user.id),
  packageId: text("package_id")
    .notNull()
    .references(() => servicePackages.id),
  status: bookingStatusEnum("status").notNull().default("REQUESTED"),
  escrowState: escrowStateEnum("escrow_state").notNull().default("PENDING"),
  /** Money in kobo */
  subtotal: integer("subtotal").notNull(),
  /** Money in kobo */
  fee: integer("fee").notNull(),
  /** Money in kobo */
  total: integer("total").notNull(),
  serviceDate: timestamp("service_date", { withTimezone: true }),
  scopeNotes: text("scope_notes"),
  releaseDeadline: timestamp("release_deadline", { withTimezone: true }),
  paystackRef: text("paystack_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id),
  /** Money in kobo */
  amount: integer("amount").notNull(),
  /** Money in kobo */
  fee: integer("fee").notNull(),
  /** Money in kobo */
  netAmount: integer("net_amount").notNull(),
  paystackRef: text("paystack_ref").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id),
  reviewerId: text("reviewer_id")
    .notNull()
    .references(() => user.id),
  providerId: text("provider_id")
    .notNull()
    .references(() => providers.id),
  /** 1-5 */
  rating: integer("rating").notNull(),
  body: text("body"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const disputes = pgTable("disputes", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id),
  raisedById: text("raised_by_id")
    .notNull()
    .references(() => user.id),
  reason: text("reason").notNull(),
  outcome: text("outcome", { enum: ["RESOLVED", "REFUNDED"] }),
  adminNotes: text("admin_notes"),
  resolvedById: text("resolved_by_id").references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const consentRecords = pgTable("consent_records", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: consentTypeEnum("type").notNull(),
  granted: boolean("granted").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const platformConfig = pgTable(
  "platform_config",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("platform_config_key_idx").on(table.key)],
);

/* ── Relations ── */

export const userRelations = relations(user, ({ many, one }) => ({
  provider: one(providers, { fields: [user.id], references: [providers.userId] }),
  bookingsAsClient: many(bookings, { relationName: "client" }),
  sessions: many(session),
  accounts: many(account),
  reviews: many(reviews, { relationName: "reviewer" }),
  disputesRaised: many(disputes, { relationName: "raisedBy" }),
  disputesResolved: many(disputes, { relationName: "resolvedBy" }),
  consentRecords: many(consentRecords),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const verificationRelations = relations(verification, () => ({}));

export const providersRelations = relations(providers, ({ one, many }) => ({
  user: one(user, { fields: [providers.userId], references: [user.id] }),
  portfolioItems: many(portfolioItems),
  servicePackages: many(servicePackages),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const portfolioItemsRelations = relations(portfolioItems, ({ one }) => ({
  provider: one(providers, { fields: [portfolioItems.providerId], references: [providers.id] }),
}));

export const servicePackagesRelations = relations(servicePackages, ({ one, many }) => ({
  provider: one(providers, { fields: [servicePackages.providerId], references: [providers.id] }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  provider: one(providers, { fields: [bookings.providerId], references: [providers.id] }),
  client: one(user, { fields: [bookings.clientId], references: [user.id] }),
  package: one(servicePackages, { fields: [bookings.packageId], references: [servicePackages.id] }),
  payments: many(payments),
  reviews: many(reviews),
  disputes: many(disputes),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  booking: one(bookings, { fields: [reviews.bookingId], references: [bookings.id] }),
  reviewer: one(user, { fields: [reviews.reviewerId], references: [user.id] }),
  provider: one(providers, { fields: [reviews.providerId], references: [providers.id] }),
}));

export const disputesRelations = relations(disputes, ({ one }) => ({
  booking: one(bookings, { fields: [disputes.bookingId], references: [bookings.id] }),
  raisedBy: one(user, { fields: [disputes.raisedById], references: [user.id] }),
  resolvedBy: one(user, { fields: [disputes.resolvedById], references: [user.id] }),
}));

export const consentRecordsRelations = relations(consentRecords, ({ one }) => ({
  user: one(user, { fields: [consentRecords.userId], references: [user.id] }),
}));

export const platformConfigRelations = relations(platformConfig, () => ({}));
