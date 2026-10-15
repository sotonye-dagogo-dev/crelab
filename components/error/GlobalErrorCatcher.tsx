"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorReportDialog } from "./ErrorReportDialog";
import { usePlatformConfig } from "@/lib/config-context";
import {
  getErrorLogEntries,
  installErrorLogBuffer,
} from "@/lib/error-log-buffer";
import { sanitizeErrorContext, isIgnorableCapture, stashErrorContext } from "@/lib/sanitize-error";

type ErrorSource = "window.onerror" | "unhandledrejection";

/**
 * F4.4 — Global, non-blocking error catcher.
 *
 * Hooks the window `error` event (the `window.onerror` path) and
 * `unhandledrejection`, stashes a sanitised payload in sessionStorage
 * (`crellab-error-context`) and offers the report dialog — the page keeps
 * running, nothing is thrown away. Gated on `bugReport.enabled`.
 *
 * Two popup guards keep the dialog meaningful:
 * - low-signal noise (browser-masked cross-origin `"Script error."` with no
 *   stack, `ResizeObserver` loop warnings, empty messages) is skipped
 *   silently via `isIgnorableCapture`;
 * - the dialog opens at most once per page view (`promptedRef`) — later
 *   errors still refresh the stashed payload, but a dismissed dialog never
 *   re-traps the user.
 */
export function GlobalErrorCatcher() {
  const { bugReport } = usePlatformConfig();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const capturingRef = useRef(false);
  const promptedRef = useRef(false);

  const enabled = bugReport?.enabled !== false;
  const includeConsoleLogs = bugReport?.includeConsoleLogs !== false;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    installErrorLogBuffer();

    const capture = (
      source: ErrorSource,
      message: string,
      stack: string | null,
      hasErrorObject = false,
    ) => {
      if (capturingRef.current) return; // guard against re-entrant failures
      // Low-signal noise (e.g. masked cross-origin "Script error.") never
      // stashes nor prompts — there is nothing actionable to report.
      if (isIgnorableCapture(message, stack, hasErrorObject)) return;
      capturingRef.current = true;
      try {
        const ctx = sanitizeErrorContext({
          message,
          stack,
          source,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          consoleLogs: includeConsoleLogs ? getErrorLogEntries() : [],
        });
        if (!ctx) return;
        stashErrorContext(ctx); // best-effort — the dialog still opens if storage is blocked
        // One prompt per page view: later errors refresh the stash (so the
        // Report action carries the latest diagnostics) without re-opening a
        // dialog the visitor already dismissed.
        if (!promptedRef.current) {
          promptedRef.current = true;
          setOpen(true);
        }
      } catch {
        // the catcher must never interfere with the running page
      } finally {
        capturingRef.current = false;
      }
    };

    const onWindowError = (event: ErrorEvent) => {
      const err = event.error;
      if (err instanceof Error) {
        capture(
          "window.onerror",
          `${err.name}: ${err.message}`,
          err.stack ?? null,
          true,
        );
        return;
      }
      if (!event.message && !err) return; // resource load errors — not app failures
      capture("window.onerror", event.message || toText(err), null);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason: unknown = event.reason;
      if (reason instanceof Error) {
        capture(
          "unhandledrejection",
          `${reason.name}: ${reason.message}`,
          reason.stack ?? null,
          true,
        );
        return;
      }
      capture(
        "unhandledrejection",
        toText(reason) || "Unhandled promise rejection",
        null,
      );
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [enabled, includeConsoleLogs]);

  if (!enabled) return null;

  function handleReport() {
    setOpen(false);
    router.push("/bug-report?e=1");
  }

  function handleContinue() {
    setOpen(false);
  }

  return (
    <ErrorReportDialog
      open={open}
      onReport={handleReport}
      onContinue={handleContinue}
    />
  );
}

function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
