/**
 * F4.1 — Console ring buffer.
 *
 * Keeps the last {@link MAX_ERROR_LOG_ENTRIES} console entries in memory so the
 * error boundary can attach recent console output to a bug report. Installation
 * is idempotent: the store lives on the console object itself, so calling
 * install twice (double mount, HMR, duplicated module instance) never wraps a
 * method twice — which would double-record every entry.
 */

export type ErrorLogLevel = "log" | "info" | "warn" | "error" | "debug";

export interface IErrorLogEntry {
  level: ErrorLogLevel;
  /** ISO-8601 timestamp */
  time: string;
  message: string;
}

/** Ring-buffer capacity — last 60 entries are kept. */
export const MAX_ERROR_LOG_ENTRIES = 60;

/** Per-entry cap so one pathological `console.log(hugeObject)` cannot blow memory. */
const MAX_ENTRY_MESSAGE_CHARS = 1000;

const CAPTURED_LEVELS: ErrorLogLevel[] = ["log", "info", "warn", "error", "debug"];

const STORE_KEY = "__crellabErrorLogBuffer";

type ConsoleLike = Pick<Console, "log" | "info" | "warn" | "error" | "debug">;

interface LogBufferStore {
  installed: boolean;
  entries: IErrorLogEntry[];
}

type ConsoleWithStore = ConsoleLike & { [STORE_KEY]?: LogBufferStore };

/** Used when the console object refuses the marker (frozen/sealed target). */
let fallbackStore: LogBufferStore | null = null;

function getStore(target: ConsoleLike): LogBufferStore {
  const holder = target as ConsoleWithStore;
  try {
    const existing = holder[STORE_KEY];
    if (existing) return existing;
    const store: LogBufferStore = { installed: false, entries: [] };
    holder[STORE_KEY] = store;
    if (holder[STORE_KEY] === store) return store;
  } catch {
    // fall through to the module-level store
  }
  fallbackStore ??= { installed: false, entries: [] };
  return fallbackStore;
}

function formatArgs(args: unknown[]): string {
  const parts = args.map((arg) => {
    if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
    if (typeof arg === "string") return arg;
    try {
      const json = JSON.stringify(arg);
      if (typeof json === "string") return json;
    } catch {
      // circular / BigInt / throwing toJSON — fall through
    }
    try {
      return String(arg);
    } catch {
      return "[unstringifiable]";
    }
  });
  const joined = parts.join(" ");
  if (joined.length <= MAX_ENTRY_MESSAGE_CHARS) return joined;
  return `${joined.slice(0, MAX_ENTRY_MESSAGE_CHARS)}…`;
}

function record(store: LogBufferStore, level: ErrorLogLevel, message: string): void {
  store.entries.push({ level, time: new Date().toISOString(), message });
  while (store.entries.length > MAX_ERROR_LOG_ENTRIES) {
    store.entries.shift();
  }
}

/**
 * Wrap the console methods of `target` so every call is mirrored into the ring
 * buffer. The original methods are always called through (console keeps
 * working exactly as before).
 *
 * @returns `true` when this call installed the hooks, `false` when they were
 * already installed (idempotent).
 */
export function installErrorLogBuffer(target: ConsoleLike = console): boolean {
  const store = getStore(target);
  if (store.installed) return false;
  store.installed = true;

  for (const level of CAPTURED_LEVELS) {
    const original = (target as unknown as Record<string, unknown>)[level];
    if (typeof original !== "function") continue;
    const wrapped = (...args: unknown[]) => {
      try {
        record(store, level, formatArgs(args));
      } catch {
        // never let bookkeeping break the console
      }
      return (original as (...callArgs: unknown[]) => unknown).apply(target, args);
    };
    try {
      (target as unknown as Record<string, unknown>)[level] = wrapped;
    } catch {
      // read-only console method — capture for the other levels
    }
  }
  return true;
}

/** Snapshot of the buffered entries (oldest first). Returns a copy. */
export function getErrorLogEntries(target: ConsoleLike = console): IErrorLogEntry[] {
  return [...getStore(target).entries];
}

/** Drop every buffered entry. */
export function clearErrorLogEntries(target: ConsoleLike = console): void {
  getStore(target).entries.length = 0;
}

/** True once the console hooks are installed on `target`. */
export function isErrorLogBufferInstalled(target: ConsoleLike = console): boolean {
  return getStore(target).installed;
}
