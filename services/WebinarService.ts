import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lte,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { webinars, webinarRegistrations } from "@/drizzle/schema";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { normalizeSeatLimit } from "@/lib/webinars";
import type { EmailTemplateBlock, IWebinar, IWebinarRegistration, WebinarStatus } from "@/types";

/**
 * Webinars: public listings (upcoming/past, paginated), ACID seat registration
 * and admin CRUD. Phase ("upcoming" vs "past") is derived, never stored — a
 * session moves to the past on its own once its effective end passes, so the
 * UI stays correct even if nobody flips the status column.
 */

export type WebinarPhase = "upcoming" | "past";

export interface WebinarListPage {
  items: IWebinar[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RegisterParams {
  webinarId: string;
  email: string;
  name?: string | null;
  consentMarketing: boolean;
  userId?: string | null;
}

export interface RegisterResult {
  registration: IWebinarRegistration;
  webinar: IWebinar;
  alreadyRegistered: boolean;
}

export interface WebinarInput {
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  coverUrl?: string | null;
  status?: WebinarStatus;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  durationMinutes?: number | null;
  locationNote?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  recordingUrl?: string | null;
  contentBlocks?: EmailTemplateBlock[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  orderIndex?: number;
  active?: boolean;
}

export type WebinarErrorCode = "not_found" | "inactive" | "closed" | "full" | "invalid" | "slug_taken";

export class WebinarError extends Error {
  readonly code: WebinarErrorCode;
  constructor(message: string, code: WebinarErrorCode) {
    super(message);
    this.name = "WebinarError";
    this.code = code;
  }
}

export const DEFAULT_PUBLIC_PAGE_SIZE = 6;
export const MAX_PUBLIC_PAGE_SIZE = 24;
/** Used when a webinar has no explicit end but a start + no duration. */
export const DEFAULT_DURATION_FALLBACK_MINUTES = 120;

type WebinarRow = typeof webinars.$inferSelect;
type RegistrationRow = typeof webinarRegistrations.$inferSelect;

/* ── Pure helpers (tested without a DB) ── */

/** Uniqueness key for guest registrations — trimmed + lowercased, mirrors the schema's `email_key`. */
export function registrationEmailKey(email: string): string {
  return email.trim().toLowerCase();
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * When the session stops being joinable: explicit end wins, otherwise start +
 * duration (falling back to a generic 1-hour-plus slot). Null when there is not
 * enough information — such a session stays "upcoming" until an admin marks it.
 */
export function effectiveEnd(
  startsAt: Date | string | null | undefined,
  endsAt: Date | string | null | undefined,
  durationMinutes: number | null | undefined,
): Date | null {
  const explicitEnd = toDate(endsAt);
  if (explicitEnd) return explicitEnd;
  const start = toDate(startsAt);
  if (!start) return null;
  const minutes = Number(durationMinutes);
  const safeMinutes =
    Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_DURATION_FALLBACK_MINUTES;
  return new Date(start.getTime() + safeMinutes * 60_000);
}

/**
 * Which public section a webinar belongs to. `CANCELLED`/`ENDED` are past by
 * declaration; otherwise the effective end decides. This is the JS mirror of
 * `phaseCondition()` below — both must agree or rows will sort into the wrong
 * section.
 */
export function deriveWebinarPhase(
  webinar: {
    status: WebinarStatus | string;
    startsAt: Date | string | null | undefined;
    endsAt: Date | string | null | undefined;
    durationMinutes: number | null | undefined;
  },
  now: Date = new Date(),
): WebinarPhase {
  if (webinar.status === "ENDED" || webinar.status === "CANCELLED") return "past";
  const end = effectiveEnd(webinar.startsAt, webinar.endsAt, webinar.durationMinutes);
  if (end && end.getTime() <= now.getTime()) return "past";
  return "upcoming";
}

/** Clamped pagination for the public listings (§21). */
export function normalizePagination(
  page: number | string | null | undefined,
  pageSize: number | string | null | undefined,
  opts: { defaultSize: number; maxSize: number },
): { page: number; pageSize: number; offset: number } {
  const rawPage = Number(page);
  const safePage = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const rawSize = Number(pageSize);
  const safeSize =
    Number.isFinite(rawSize) && rawSize >= 1
      ? Math.min(opts.maxSize, Math.floor(rawSize))
      : opts.defaultSize;
  return { page: safePage, pageSize: safeSize, offset: (safePage - 1) * safeSize };
}

/* ── SQL mirrors of the pure helpers ── */

/** `COALESCE(ends_at, starts_at + duration) ` — NULL when the webinar has no timing at all. */
const effectiveEndSql = sql<Date>`COALESCE(${webinars.endsAt}, ${webinars.startsAt} + COALESCE(${webinars.durationMinutes}, ${DEFAULT_DURATION_FALLBACK_MINUTES}) * interval '1 minute')`;

const DECLARED_PAST: WebinarStatus[] = ["ENDED", "CANCELLED"];

function phaseCondition(phase: WebinarPhase, now: Date): SQL {
  if (phase === "past") {
    return or(inArray(webinars.status, DECLARED_PAST), lte(effectiveEndSql, now)) as SQL;
  }
  return and(
    notInArray(webinars.status, DECLARED_PAST),
    or(isNull(effectiveEndSql), gt(effectiveEndSql, now)),
  ) as SQL;
}

/* ── Row → API serialization ── */

function serializeDate(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function serializeBlocks(value: unknown): EmailTemplateBlock[] {
  return Array.isArray(value) ? (value as EmailTemplateBlock[]) : [];
}

function serializeWebinar(row: WebinarRow, registrationCount?: number): IWebinar {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    coverUrl: row.coverUrl,
    status: row.status,
    startsAt: serializeDate(row.startsAt),
    endsAt: serializeDate(row.endsAt),
    durationMinutes: row.durationMinutes,
    locationNote: row.locationNote,
    ctaLabel: row.ctaLabel,
    ctaHref: row.ctaHref,
    recordingUrl: row.recordingUrl,
    contentBlocks: serializeBlocks(row.contentBlocks),
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    orderIndex: row.orderIndex,
    active: row.active,
    createdAt: serializeDate(row.createdAt) ?? "",
    updatedAt: serializeDate(row.updatedAt) ?? "",
    ...(registrationCount !== undefined ? { registrationCount } : {}),
  };
}

function serializeRegistration(row: RegistrationRow): IWebinarRegistration {
  return {
    id: row.id,
    webinarId: row.webinarId,
    userId: row.userId,
    email: row.email,
    emailKey: row.emailKey,
    name: row.name,
    consentMarketing: row.consentMarketing,
    status: row.status,
    createdAt: serializeDate(row.createdAt) ?? "",
    updatedAt: serializeDate(row.updatedAt) ?? "",
  };
}

function toDateOrNull(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function resolveMaxSeats(): Promise<number> {
  let raw: number | undefined;
  try {
    const { PlatformConfigService } = await import("@/services/PlatformConfigService");
    const config = await PlatformConfigService.get();
    raw = config.webinars?.maxRegistrantsPerWebinar;
  } catch {
    raw = DEFAULT_CONFIG.webinars?.maxRegistrantsPerWebinar;
  }
  return normalizeSeatLimit(raw ?? DEFAULT_CONFIG.webinars?.maxRegistrantsPerWebinar);
}

export class WebinarService {
  /**
   * One public section (upcoming or past), paginated. Only `active` rows are
   * listed; ordering is by session date (soonest first for upcoming, most
   * recent first for past).
   */
  static async listPublic(
    phase: WebinarPhase,
    opts: { page?: number | string | null; pageSize?: number | string | null } = {},
  ): Promise<WebinarListPage> {
    const { page, pageSize, offset } = normalizePagination(opts.page, opts.pageSize, {
      defaultSize: DEFAULT_PUBLIC_PAGE_SIZE,
      maxSize: MAX_PUBLIC_PAGE_SIZE,
    });
    const now = new Date();
    const where = and(eq(webinars.active, true), phaseCondition(phase, now));

    const [countRows, rows] = await Promise.all([
      db.select({ total: sql<number>`count(*)` }).from(webinars).where(where),
      db
        .select()
        .from(webinars)
        .where(where)
        .orderBy(
          phase === "past" ? desc(webinars.startsAt) : asc(webinars.startsAt),
          desc(webinars.orderIndex),
        )
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = Math.max(0, Number(countRows[0]?.total ?? 0));
    return {
      items: rows.map((row) => serializeWebinar(row)),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  /** Admin list — includes inactive/unscheduled rows and a registration count per webinar. */
  static async adminList(): Promise<IWebinar[]> {
    const rows = await db
      .select({
        row: webinars,
        registrationCount: sql<number>`(SELECT count(*) FROM ${webinarRegistrations} WHERE ${webinarRegistrations.webinarId} = ${webinars.id} AND ${webinarRegistrations.status} = 'REGISTERED')`,
      })
      .from(webinars)
      .orderBy(asc(webinars.orderIndex), desc(webinars.startsAt));
    return rows.map((r) => serializeWebinar(r.row, Math.max(0, Number(r.registrationCount ?? 0))));
  }

  static async adminGet(id: string): Promise<IWebinar | null> {
    const rows = await db
      .select({
        row: webinars,
        registrationCount: sql<number>`(SELECT count(*) FROM ${webinarRegistrations} WHERE ${webinarRegistrations.webinarId} = ${webinars.id} AND ${webinarRegistrations.status} = 'REGISTERED')`,
      })
      .from(webinars)
      .where(eq(webinars.id, id))
      .limit(1);
    if (!rows.length) return null;
    return serializeWebinar(rows[0].row, Math.max(0, Number(rows[0].registrationCount ?? 0)));
  }

  static async getBySlug(slug: string): Promise<IWebinar | null> {
    const rows = await db.select().from(webinars).where(eq(webinars.slug, slug)).limit(1);
    if (!rows.length) return null;
    return serializeWebinar(rows[0]);
  }

  /**
   * Reserve a seat. ACID and idempotent per email:
   * - the webinar row is locked for the transaction, so concurrent submits for
   *   the same webinar serialise and the capacity check cannot race;
   * - a row that already exists (same email or same signed-in user) is updated
   *   and reported as `alreadyRegistered` instead of erroring — double submits
   *   resolve to one row via the unique indexes, not a pre-read check;
   * - a lost insert race (`onConflictDoNothing`) re-reads the winning row.
   */
  static async register(params: RegisterParams): Promise<RegisterResult> {
    const emailKey = registrationEmailKey(params.email);
    const name = params.name?.trim() || null;
    const userId = params.userId ?? null;
    const now = new Date();

    return db.transaction(async (tx) => {
      const webinarRows = await tx
        .select()
        .from(webinars)
        .where(eq(webinars.id, params.webinarId))
        .for("update");
      const webinar = webinarRows[0];
      if (!webinar) throw new WebinarError("Webinar not found", "not_found");
      if (!webinar.active) {
        throw new WebinarError("This webinar is not accepting registrations", "inactive");
      }
      if (deriveWebinarPhase(webinar, now) === "past") {
        throw new WebinarError("Registration for this webinar is closed", "closed");
      }

      const existingWhere = userId
        ? and(
            eq(webinarRegistrations.webinarId, webinar.id),
            or(eq(webinarRegistrations.emailKey, emailKey), eq(webinarRegistrations.userId, userId)),
          )
        : and(
            eq(webinarRegistrations.webinarId, webinar.id),
            eq(webinarRegistrations.emailKey, emailKey),
          );
      const existingRows = await tx
        .select()
        .from(webinarRegistrations)
        .where(existingWhere)
        .limit(1);

      if (existingRows.length > 0) {
        const existing = existingRows[0];
        const updated = await tx
          .update(webinarRegistrations)
          .set({
            name: name ?? existing.name,
            userId: userId ?? existing.userId,
            consentMarketing: params.consentMarketing,
            status: "REGISTERED",
            updatedAt: now,
          })
          .where(eq(webinarRegistrations.id, existing.id))
          .returning();
        return {
          registration: serializeRegistration(updated[0] ?? existing),
          webinar: serializeWebinar(webinar),
          alreadyRegistered: existing.status === "REGISTERED",
        };
      }

      const maxSeats = await resolveMaxSeats();
      if (maxSeats > 0) {
        const countRows = await tx
          .select({ value: sql<number>`count(*)` })
          .from(webinarRegistrations)
          .where(
            and(
              eq(webinarRegistrations.webinarId, webinar.id),
              eq(webinarRegistrations.status, "REGISTERED"),
            ),
          );
        const taken = Math.max(0, Number(countRows[0]?.value ?? 0));
        if (taken >= maxSeats) {
          throw new WebinarError("This webinar has reached its registration limit", "full");
        }
      }

      const inserted = await tx
        .insert(webinarRegistrations)
        .values({
          id: crypto.randomUUID(),
          webinarId: webinar.id,
          userId,
          email: params.email.trim(),
          emailKey,
          name,
          consentMarketing: params.consentMarketing,
          status: "REGISTERED",
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .returning();

      if (inserted.length > 0) {
        return {
          registration: serializeRegistration(inserted[0]),
          webinar: serializeWebinar(webinar),
          alreadyRegistered: false,
        };
      }

      // Unique-index conflict: another request won the race — surface its row
      // so the client still ends up with exactly one registration.
      const winner = await tx.select().from(webinarRegistrations).where(existingWhere).limit(1);
      if (!winner.length) {
        throw new WebinarError("Could not save your registration", "invalid");
      }
      return {
        registration: serializeRegistration(winner[0]),
        webinar: serializeWebinar(webinar),
        alreadyRegistered: true,
      };
    });
  }

  static async create(input: WebinarInput): Promise<IWebinar> {
    const now = new Date();
    try {
      const rows = await db
        .insert(webinars)
        .values({
          id: crypto.randomUUID(),
          slug: input.slug,
          title: input.title,
          subtitle: input.subtitle ?? null,
          description: input.description ?? null,
          coverUrl: input.coverUrl ?? null,
          status: input.status ?? "UPCOMING",
          startsAt: toDateOrNull(input.startsAt),
          endsAt: toDateOrNull(input.endsAt),
          durationMinutes: input.durationMinutes ?? null,
          locationNote: input.locationNote ?? null,
          ctaLabel: input.ctaLabel ?? null,
          ctaHref: input.ctaHref ?? null,
          recordingUrl: input.recordingUrl ?? null,
          contentBlocks: input.contentBlocks ?? [],
          metaTitle: input.metaTitle ?? null,
          metaDescription: input.metaDescription ?? null,
          orderIndex: input.orderIndex ?? 0,
          active: input.active ?? true,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return serializeWebinar(rows[0], 0);
    } catch (err) {
      if (err instanceof Error && err.message.includes("webinars_slug_idx")) {
        throw new WebinarError("A webinar with this slug already exists", "slug_taken");
      }
      throw err;
    }
  }

  static async update(id: string, patch: Partial<WebinarInput>): Promise<IWebinar | null> {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.slug !== undefined) set.slug = patch.slug;
    if (patch.title !== undefined) set.title = patch.title;
    if (patch.subtitle !== undefined) set.subtitle = patch.subtitle ?? null;
    if (patch.description !== undefined) set.description = patch.description ?? null;
    if (patch.coverUrl !== undefined) set.coverUrl = patch.coverUrl ?? null;
    if (patch.status !== undefined) set.status = patch.status;
    if (patch.startsAt !== undefined) set.startsAt = toDateOrNull(patch.startsAt);
    if (patch.endsAt !== undefined) set.endsAt = toDateOrNull(patch.endsAt);
    if (patch.durationMinutes !== undefined) set.durationMinutes = patch.durationMinutes ?? null;
    if (patch.locationNote !== undefined) set.locationNote = patch.locationNote ?? null;
    if (patch.ctaLabel !== undefined) set.ctaLabel = patch.ctaLabel ?? null;
    if (patch.ctaHref !== undefined) set.ctaHref = patch.ctaHref ?? null;
    if (patch.recordingUrl !== undefined) set.recordingUrl = patch.recordingUrl ?? null;
    if (patch.contentBlocks !== undefined) set.contentBlocks = patch.contentBlocks;
    if (patch.metaTitle !== undefined) set.metaTitle = patch.metaTitle ?? null;
    if (patch.metaDescription !== undefined) set.metaDescription = patch.metaDescription ?? null;
    if (patch.orderIndex !== undefined) set.orderIndex = patch.orderIndex;
    if (patch.active !== undefined) set.active = patch.active;

    try {
      const rows = await db.update(webinars).set(set).where(eq(webinars.id, id)).returning();
      if (!rows.length) return null;
      const withCount = await this.adminGet(id);
      return withCount ?? serializeWebinar(rows[0]);
    } catch (err) {
      if (err instanceof Error && err.message.includes("webinars_slug_idx")) {
        throw new WebinarError("A webinar with this slug already exists", "slug_taken");
      }
      throw err;
    }
  }

  /** Deletes the webinar; registrations cascade with it. Returns false when missing. */
  static async remove(id: string): Promise<boolean> {
    const rows = await db.delete(webinars).where(eq(webinars.id, id)).returning({ id: webinars.id });
    return rows.length > 0;
  }
}
