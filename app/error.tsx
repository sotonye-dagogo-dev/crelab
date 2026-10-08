"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ClButton } from "@/components/ui";
import { usePlatformConfig } from "@/lib/config-context";
import { getErrorLogEntries } from "@/lib/error-log-buffer";
import { sanitizeErrorContext, sanitizeText, stashErrorContext } from "@/lib/sanitize-error";
import { AlertTriangle, Bug, RotateCcw } from "lucide-react";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * F4.5 — Route-segment error boundary.
 *
 * The user can always continue: `reset()` re-renders the failed segment, Reload
 * starts fresh, and the sanitised error is stashed so "Report this error"
 * carries the technical details into the bug-report form.
 */
export default function RouteError({ error, reset }: RouteErrorProps) {
  const { bugReport } = usePlatformConfig();
  const enabled = bugReport?.enabled !== false;

  const safeMessage =
    sanitizeText(error?.message ?? "") || "This part of the page failed to render.";

  useEffect(() => {
    if (!enabled) return;
    try {
      const ctx = sanitizeErrorContext({
        message: `${error?.name ?? "Error"}: ${error?.message ?? ""}`,
        stack: error?.stack ?? null,
        source: "react-route-boundary",
        url: window.location.href,
        timestamp: new Date().toISOString(),
        consoleLogs: getErrorLogEntries(),
      });
      if (ctx) stashErrorContext(ctx);
    } catch {
      // stashing is best-effort — recovery must not depend on it
    }
  }, [error, enabled]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-[560px] rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-error)]/10">
            <AlertTriangle className="h-6 w-6 text-[var(--color-error)]" />
          </div>

          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-[-0.02em]">
              Something went wrong
            </h1>
            <p className="text-[14px] leading-relaxed text-[var(--color-text-secondary)] break-words">
              {safeMessage}
            </p>
            {error?.digest && (
              <p className="text-[12px] text-[var(--color-text-tertiary)]">Reference: {error.digest}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <ClButton type="button" onClick={reset}>
              Continue
            </ClButton>
            <ClButton type="button" variant="outlined" onClick={() => window.location.reload()}>
              <RotateCcw className="h-4 w-4" />
              Reload
            </ClButton>
          </div>

          {enabled && (
            <Link
              href="/bug-report?e=1"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-secondary)] underline underline-offset-4 hover:text-[var(--color-text-primary)]"
            >
              <Bug className="h-4 w-4" />
              Report this error
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
