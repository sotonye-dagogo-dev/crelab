/**
 * F4.2 — Error sanitiser.
 *
 * Turns any captured error payload (client stash or untrusted client request)
 * into a safe, size-bounded `IErrorContext`:
 *
 *  - redacts emails, bearer/JWT/session tokens, cookies and data URIs;
 *  - truncates message / stack / console logs;
 *  - enforces an 8 KB byte cap on the serialised payload.
 *
 * Runs on the client (before the payload is stashed) and again on the server
 * (before it is persisted) — the server never trusts the client's version.
 */

import type { IErrorLogEntry } from "@/lib/error-log-buffer";

/** Hard cap for the serialised payload, in bytes. */
export const MAX_ERROR_CONTEXT_BYTES = 8 * 1024;

/** sessionStorage key used to hand the payload from a boundary to the form. */
export const ERROR_CONTEXT_STORAGE_KEY = "crelab-error-context";

const TRUNCATION_SUFFIX = "…[truncated]";

const MAX_MESSAGE_CHARS = 2000;
const MAX_STACK_CHARS = 6000;
const MAX_URL_CHARS = 1000;
const MAX_SOURCE_CHARS = 64;
const MAX_LOG_MESSAGE_CHARS = 400;
const MAX_TIME_CHARS = 64;
const MAX_LOG_ENTRIES = 60;

const LOG_LEVELS = new Set<string>(["log", "info", "warn", "error", "debug"]);

export interface IErrorContext {
  message: string;
  stack: string | null;
  /** Where the payload came from: window.onerror / unhandledrejection / react boundary */
  source: string | null;
  url: string | null;
  /** ISO-8601 */
  timestamp: string;
  consoleLogs: IErrorLogEntry[];
}

/* ------------------------------------------------------------------ */
/* Redaction                                                           */
/* ------------------------------------------------------------------ */

// Order matters: structured secrets are stripped before generic word scans so a
// token payload can never leak through a looser pattern. Quantifiers are bounded
// so redaction stays linear on very long messages/stacks.
const DATA_URI_RE = /\bdata:[^\s"'<>)]+/gi;
const COOKIE_RE = /\b(set-cookie|cookie)\s*[:=]\s*[^\n\r]+/gi;
const BEARER_RE = /\b(bearer)\s+\S+/gi;
const JWT_RE = /\beyJ[\w-]{10,2048}\.[\w-]{10,2048}\.[\w-]{10,2048}/g;
const SESSION_TOKEN_RE =
  /\b(sessionid|session[_-]?id|session|sid|connect\.sid|csrf|xsrf|access[_-]?token|refresh[_-]?token|id[_-]?token|auth[_-]?token|token|api[_-]?key|apikey|password)(\s*[:=]\s*)(["']?)[^\s;&"']+/gi;
const EMAIL_RE = /[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,}/g;

/** Redacts emails, bearer/JWT/session tokens, cookies and data URIs. */
export function sanitizeText(input: string): string {
  if (!input) return "";
  return input
    .replace(DATA_URI_RE, "[redacted-data-uri]")
    .replace(COOKIE_RE, "$1: [redacted-cookie]")
    .replace(BEARER_RE, "$1 [redacted-token]")
    .replace(JWT_RE, "[redacted-jwt]")
    .replace(SESSION_TOKEN_RE, "$1$2$3[redacted-token]")
    .replace(EMAIL_RE, "[redacted-email]");
}

/* ------------------------------------------------------------------ */
/* Coercion helpers                                                    */
/* ------------------------------------------------------------------ */

function toSafeString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === "object") {
    try {
      return JSON.stringify(value) ?? "";
    } catch {
      return "[object]";
    }
  }
  return String(value);
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const keep = Math.max(0, max - TRUNCATION_SUFFIX.length);
  return `${value.slice(0, keep)}${TRUNCATION_SUFFIX}`;
}

function sanitizeOptionalString(value: unknown, max: number): string | null {
  if (typeof value !== "string" || !value) return null;
  return truncate(sanitizeText(value), max);
}

function sanitizeLogs(raw: unknown): IErrorLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: IErrorLogEntry[] = [];
  for (const item of raw.slice(-MAX_LOG_ENTRIES)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const level =
      typeof rec.level === "string" && LOG_LEVELS.has(rec.level)
        ? (rec.level as IErrorLogEntry["level"])
        : "log";
    entries.push({
      level,
      time:
        typeof rec.time === "string"
          ? truncate(sanitizeText(rec.time), MAX_TIME_CHARS)
          : "",
      message: truncate(sanitizeText(toSafeString(rec.message)), MAX_LOG_MESSAGE_CHARS),
    });
  }
  return entries;
}

function byteLength(value: string): number {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(value).length;
  return value.length;
}

/**
 * Progressive trim until the payload fits in {@link MAX_ERROR_CONTEXT_BYTES}:
 * oldest console entries first, then the stack, then the message.
 */
function enforceByteCap(ctx: IErrorContext): IErrorContext {
  const result: IErrorContext = { ...ctx, consoleLogs: [...ctx.consoleLogs] };
  const fits = () => byteLength(JSON.stringify(result)) <= MAX_ERROR_CONTEXT_BYTES;

  while (!fits() && result.consoleLogs.length > 0) {
    result.consoleLogs.shift();
  }
  while (!fits() && result.stack && result.stack.length > 512) {
    result.stack = truncate(result.stack, Math.floor(result.stack.length / 2));
  }
  while (!fits() && result.message.length > 256) {
    result.message = truncate(result.message, Math.floor(result.message.length / 2));
  }
  if (!fits()) {
    // Pathological input — keep only the essentials.
    result.consoleLogs = [];
    result.stack = null;
    result.url = result.url ? truncate(result.url, 256) : null;
    result.message = truncate(result.message, 512);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Payload sanitiser                                                   */
/* ------------------------------------------------------------------ */

/**
 * Normalises an untrusted payload (object or JSON string) into a sanitised,
 * size-capped {@link IErrorContext}. Returns `null` for anything that is not a
 * usable error payload.
 */
export function sanitizeErrorContext(raw: unknown): IErrorContext | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;

  const message = truncate(sanitizeText(toSafeString(rec.message)), MAX_MESSAGE_CHARS);
  const stack = sanitizeOptionalString(rec.stack, MAX_STACK_CHARS);
  const source = sanitizeOptionalString(rec.source, MAX_SOURCE_CHARS);
  const url = sanitizeOptionalString(rec.url, MAX_URL_CHARS);
  const timestamp =
    typeof rec.timestamp === "string" && rec.timestamp && !Number.isNaN(Date.parse(rec.timestamp))
      ? rec.timestamp
      : new Date().toISOString();

  return enforceByteCap({ message, stack, source, url, timestamp, consoleLogs: sanitizeLogs(rec.consoleLogs) });
}

/* ------------------------------------------------------------------ */
/* sessionStorage handoff (boundary → bug-report form)                 */
/* ------------------------------------------------------------------ */

/** Persist a sanitised payload under {@link ERROR_CONTEXT_STORAGE_KEY}. */
export function stashErrorContext(ctx: IErrorContext): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(ERROR_CONTEXT_STORAGE_KEY, JSON.stringify(ctx));
    return true;
  } catch {
    return false; // storage disabled (private mode / quota) — never throw
  }
}

/** Read + re-sanitise the stashed payload. Returns `null` when absent/invalid. */
export function readErrorContext(): IErrorContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ERROR_CONTEXT_STORAGE_KEY);
    if (!raw) return null;
    return sanitizeErrorContext(raw);
  } catch {
    return null;
  }
}

/** Remove the stashed payload (user detached it, or the report was sent). */
export function clearErrorContext(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ERROR_CONTEXT_STORAGE_KEY);
  } catch {
    // ignore — nothing to clean up
  }
}
