import { AsyncLocalStorage } from "node:async_hooks";
import type { EmailSendResult } from "@/services/EmailService";

/**
 * Request-scoped sink that records the outcome of every transactional email
 * attempted while a request is in flight.
 *
 * Better Auth's email callbacks swallow send failures (they log and continue so
 * auth never breaks), so a route that delegates to `auth.api.*` cannot know
 * whether an email actually went out. Route handlers wrap the auth call in
 * `runWithEmailSendSink` and read the captured result afterwards to surface
 * accurate feedback to the user instead of a false "email sent" success.
 *
 * AsyncLocalStorage keeps the capture concurrency-safe: each request gets its
 * own sink and the storage is not shared across requests on a warm lambda.
 */
export interface EmailSendSink {
  results: EmailSendResult[];
}

const storage = new AsyncLocalStorage<EmailSendSink>();

/**
 * Runs `fn` inside a fresh email-send sink and returns the captured results.
 * `results` is empty when no email send was attempted at all (e.g. Better Auth
 * resolved without invoking a send callback). `result` is the last captured
 * outcome for convenience.
 */
export async function runWithEmailSendSink<T>(
  fn: () => Promise<T>,
): Promise<{ value: T; results: EmailSendResult[]; result?: EmailSendResult }> {
  const sink: EmailSendSink = { results: [] };
  const value = await storage.run(sink, () => fn());
  return { value, results: sink.results, result: sink.results.at(-1) };
}

/** Returns the current request's sink (if any) so senders can record outcomes. */
export function getEmailSendSink(): EmailSendSink | undefined {
  return storage.getStore();
}