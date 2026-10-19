import { db } from "@/lib/db";
import { scheduledJobs } from "@/drizzle/schema";
import { and, eq, lte, sql } from "drizzle-orm";

/**
 * DB-backed scheduled job queue.
 *
 * Vercel Hobby plans only allow **daily** cron invocations, so intra-day work
 * (the escrow safety sweep that used to run every 6 hours) is enqueued as rows
 * here and drained in bulk by the daily cron (`/api/cron/escrow` →
 * `runFullSweep`) plus a throttled opportunistic drain on warm authenticated
 * traffic. This keeps deployment possible on Hobby while preserving timely
 * processing — and it is fully ACID:
 *
 *  - claiming uses `UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED)
 *    RETURNING`, so concurrent drainers never process the same row twice;
 *  - enqueue is idempotent via the unique `dedupe_key` (ON CONFLICT DO NOTHING);
 *  - every handler is idempotent (the escrow sweep collapses duplicate runs).
 */

export type ScheduledJobType = "escrow_sweep";

export interface IScheduledJob {
  id: string;
  type: string;
  runAt: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  dedupeKey: string | null;
}

export interface DrainResult {
  claimed: number;
  completed: number;
  failed: number;
  skipped: number;
  errors: string[];
}

type JobRow = typeof scheduledJobs.$inferSelect;

function mapJob(row: JobRow): IScheduledJob {
  return {
    id: row.id,
    type: row.type,
    runAt: row.runAt.toISOString(),
    payload: (row.payload ?? {}) as Record<string, unknown>,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    lastError: row.lastError,
    dedupeKey: row.dedupeKey,
  };
}

/** 6-hour UTC bucket label used for escrow-sweep dedupe keys. */
export function sixHourBucket(date: Date): string {
  const hourBucket = Math.floor(date.getTime() / (6 * 60 * 60 * 1000));
  return String(hourBucket);
}

export class JobQueueService {
  /**
   * Enqueue a job. When `dedupeKey` is given and already queued (in any
   * non-terminal state or completed — the unique index covers all rows), the
   * insert is a no-op and `null` is returned.
   */
  async enqueue(
    type: ScheduledJobType,
    runAt: Date,
    payload: Record<string, unknown> = {},
    dedupeKey?: string,
  ): Promise<IScheduledJob | null> {
    const [row] = await db
      .insert(scheduledJobs)
      .values({
        type,
        runAt,
        payload,
        dedupeKey: dedupeKey ?? null,
      })
      .onConflictDoNothing({ target: scheduledJobs.dedupeKey })
      .returning();
    return row ? mapJob(row) : null;
  }

  /**
   * Enqueue the follow-up escrow safety sweeps for a freshly held booking.
   * One sweep per 6-hour bucket keeps the queue small while restoring the
   * pre-Hobby-limit ~6-hour repair cadence (drained opportunistically or by
   * the daily cron, whichever comes first — the sweep itself is idempotent).
   */
  async enqueueEscrowFollowUps(bookingId: string, from: Date = new Date()): Promise<void> {
    try {
      for (const hoursAhead of [6, 12, 24]) {
        const runAt = new Date(from.getTime() + hoursAhead * 60 * 60 * 1000);
        await this.enqueue("escrow_sweep", runAt, { bookingId }, `escrow-sweep-${sixHourBucket(runAt)}`);
      }
    } catch (err) {
      // Never let queue bookkeeping fail a money path.
      console.error(`[job-queue] failed to enqueue escrow follow-ups for booking ${bookingId}:`, err);
    }
  }

  /**
   * Atomically claim up to `limit` due PENDING jobs (locked FOR UPDATE SKIP
   * LOCKED, flipped to RUNNING) and return them. Safe under concurrency.
   */
  async claimDue(limit = 10): Promise<IScheduledJob[]> {
    const bounded = Math.max(1, Math.min(limit, 50));
    const rows = (await db.execute(sql`
      UPDATE scheduled_jobs
      SET status = 'RUNNING', attempts = attempts + 1, updated_at = now()
      WHERE id IN (
        SELECT id FROM scheduled_jobs
        WHERE status = 'PENDING' AND run_at <= now()
        ORDER BY run_at
        LIMIT ${bounded}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `)) as unknown as Array<Record<string, unknown>>;

    return rows.map((r) => ({
      id: String(r.id),
      type: String(r.type),
      runAt: new Date(String(r.run_at)).toISOString(),
      payload: (typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload ?? {}) as Record<string, unknown>,
      status: String(r.status),
      attempts: Number(r.attempts),
      maxAttempts: Number(r.max_attempts),
      lastError: r.last_error ? String(r.last_error) : null,
      dedupeKey: r.dedupe_key ? String(r.dedupe_key) : null,
    }));
  }

  async complete(jobId: string): Promise<void> {
    await db
      .update(scheduledJobs)
      .set({ status: "COMPLETED", lastError: null, updatedAt: new Date() })
      .where(eq(scheduledJobs.id, jobId));
  }

  /** Mark a failed run — PENDING again (with backoff) while attempts remain, else FAILED. */
  async fail(jobId: string, job: IScheduledJob, error: string): Promise<void> {
    const exhausted = job.attempts >= job.maxAttempts;
    const backoffMs = Math.min(60 * 60 * 1000, 2 ** job.attempts * 5 * 60 * 1000);
    await db
      .update(scheduledJobs)
      .set({
        status: exhausted ? "FAILED" : "PENDING",
        lastError: error.slice(0, 1000),
        runAt: exhausted ? new Date(job.runAt) : new Date(Date.now() + backoffMs),
        updatedAt: new Date(),
      })
      .where(eq(scheduledJobs.id, jobId));
  }

  /** Execute one claimed job via the handler registry. */
  async runJob(job: IScheduledJob): Promise<{ ok: boolean; error?: string }> {
    switch (job.type) {
      case "escrow_sweep": {
        // Dynamic import keeps this module free of a static circular dependency
        // with EscrowService (which enqueues follow-up sweeps through us).
        const { EscrowService } = await import("@/services/EscrowService");
        const sweep = await new EscrowService().runFullSweep();
        // Sweep errors are collected, not thrown — the job itself succeeded in
        // running (individual bookings self-heal on later sweeps).
        if (sweep.totalErrors.length > 0) {
          console.warn("[job-queue] escrow_sweep completed with errors:", sweep.totalErrors);
        }
        return { ok: true };
      }
      default:
        return { ok: false, error: `No handler registered for job type "${job.type}"` };
    }
  }

  /** Claim + run all currently due jobs (bounded). Used by the cron bulk drain. */
  async drainDueJobs(options: { limit?: number } = {}): Promise<DrainResult> {
    const claimed = await this.claimDue(options.limit ?? 25);
    const result: DrainResult = { claimed: claimed.length, completed: 0, failed: 0, skipped: 0, errors: [] };

    for (const job of claimed) {
      try {
        const run = await this.runJob(job);
        if (run.ok) {
          await this.complete(job.id);
          result.completed++;
        } else {
          await this.fail(job.id, job, run.error ?? "Handler rejected job");
          result.failed++;
          result.errors.push(`Job ${job.id} (${job.type}): ${run.error ?? "failed"}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown job error";
        await this.fail(job.id, job, message).catch(() => {});
        result.failed++;
        result.errors.push(`Job ${job.id} (${job.type}): ${message}`);
      }
    }

    return result;
  }

  /**
   * Opportunistic drain for warm authenticated traffic. Throttled in-process
   * (each serverless instance has its own timer — safe because claiming is
   * atomic and every handler is idempotent, so a rare double drain is a no-op).
   */
  static #lastOpportunisticDrainAt = 0;
  static #draining = false;

  async maybeDrainOnRequest(minIntervalMs = 10 * 60 * 1000): Promise<void> {
    const now = Date.now();
    if (JobQueueService.#draining) return;
    if (now - JobQueueService.#lastOpportunisticDrainAt < minIntervalMs) return;
    JobQueueService.#lastOpportunisticDrainAt = now;
    JobQueueService.#draining = true;
    try {
      await this.drainDueJobs({ limit: 5 });
    } catch (err) {
      console.error("[job-queue] opportunistic drain failed:", err);
    } finally {
      JobQueueService.#draining = false;
    }
  }

  /** Count of jobs currently due (used by the cron route for reporting). */
  async countDue(): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(scheduledJobs)
      .where(and(eq(scheduledJobs.status, "PENDING"), lte(scheduledJobs.runAt, new Date())));
    return row?.count ?? 0;
  }
}
