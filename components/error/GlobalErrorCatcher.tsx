"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorReportDialog } from "./ErrorReportDialog";
import { usePlatformConfig } from "@/lib/config-context";
import { getErrorLogEntries, installErrorLogBuffer } from "@/lib/error-log-buffer";
import { sanitizeErrorContext, stashErrorContext } from "@/lib/sanitize-error";

type ErrorSource = "window.onerror" | "unhandledrejection";

/**
 * F4.4 — Global, non-blocking error catcher.
 *
 * Hooks the window `error` event (the `window.onerror` path) and
 * `unhandledrejection`, stashes a sanitised payload in sessionStorage
 * (`crelab-error-context`) and offers the report dialog — the page keeps
 * running, nothing is thrown away. Gated on `bugReport.enabled`.
 */
export function GlobalErrorCatcher() {
  const { bugReport } = usePlatformConfig();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const capturingRef = useRef(false);

  const enabled = bugReport?.enabled !== false;
  const includeConsoleLogs = bugReport?.includeConsoleLogs !== false;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    installErrorLogBuffer();

    const capture = (source: ErrorSource, message: string, stack: string | null) => {
      if (capturingRef.current) return; // guard against re-entrant failures
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
        setOpen(true);
      } catch {
        // the catcher must never interfere with the running page
      } finally {
        capturingRef.current = false;
      }
    };

    const onWindowError = (event: ErrorEvent) => {
      const err = event.error;
      if (err instanceof Error) {
        capture("window.onerror", `${err.name}: ${err.message}`, err.stack ?? null);
        return;
      }
      if (!event.message && !err) return; // resource load errors — not app failures
      capture("window.onerror", event.message || toText(err), null);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason: unknown = event.reason;
      if (reason instanceof Error) {
        capture("unhandledrejection", `${reason.name}: ${reason.message}`, reason.stack ?? null);
        return;
      }
      capture("unhandledrejection", toText(reason) || "Unhandled promise rejection", null);
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

  return <ErrorReportDialog open={open} onReport={handleReport} onContinue={handleContinue} />;
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
