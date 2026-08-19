import { db } from "@/lib/db";
import { auditLog, user } from "@/drizzle/schema";
import { and, desc, eq, type SQL } from "drizzle-orm";

export interface AuditLogInput {
  userId: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
}

export interface AuditListOptions {
  action?: string;
  entity?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Centralised audit-trail writer + reader. Every admin mutation that changes
 * platform state should call `AuditService.log(...)` so there is one place that
 * owns the `audit_log` schema shape (oldValue/newValue captured at the moment
 * of the change, plus the acting admin's id). `list()` joins the actor's name
 * and email so UIs can display "who did it".
 */
export class AuditService {
  static async log(input: AuditLogInput): Promise<void> {
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      userId: input.userId,
      action: input.action,
      entity: input.entity ?? null,
      entityId: input.entityId ?? null,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
    });
  }

  static async list(options: AuditListOptions = {}): Promise<AuditLogEntry[]> {
    const conditions = buildConditions(options);
    const rows = await db
      .select({
        id: auditLog.id,
        userId: auditLog.userId,
        actorName: user.name,
        actorEmail: user.email,
        action: auditLog.action,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        oldValue: auditLog.oldValue,
        newValue: auditLog.newValue,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .leftJoin(user, eq(auditLog.userId, user.id))
      .where(conditions)
      .orderBy(desc(auditLog.createdAt))
      .limit(options.limit ?? 100)
      .offset(options.offset ?? 0);

    return rows.map(mapRow);
  }

  static async count(options: AuditListOptions = {}): Promise<number> {
    const rows = await db
      .select({ id: auditLog.id })
      .from(auditLog)
      .where(buildConditions(options));
    return rows.length;
  }
}

function buildConditions(options: AuditListOptions): SQL | undefined {
  const conditions: SQL[] = [];
  if (options.action) conditions.push(eq(auditLog.action, options.action));
  if (options.entity) conditions.push(eq(auditLog.entity, options.entity));
  if (options.entityId) conditions.push(eq(auditLog.entityId, options.entityId));
  return conditions.length ? and(...conditions) : undefined;
}

function mapRow(row: {
  id: string;
  userId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: Date | string;
}): AuditLogEntry {
  return {
    id: row.id,
    userId: row.userId,
    actorName: row.actorName,
    actorEmail: row.actorEmail,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    oldValue: row.oldValue,
    newValue: row.newValue,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}