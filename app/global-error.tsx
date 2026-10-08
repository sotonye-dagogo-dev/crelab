"use client";

import { useEffect, type CSSProperties } from "react";
import { AlertTriangle, Bug, RotateCcw } from "lucide-react";
import { getErrorLogEntries } from "@/lib/error-log-buffer";
import { sanitizeErrorContext, sanitizeText, stashErrorContext } from "@/lib/sanitize-error";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * F4.6 — Root-layout error boundary.
 *
 * This replaces the whole layout (including globals.css), so the shell is
 * rendered with inline styles only. Continue (`reset()`), Reload and Report all
 * remain available — the user is never trapped on this screen.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const safeMessage =
    sanitizeText(error?.message ?? "") || "The application failed to start correctly.";

  useEffect(() => {
    try {
      const ctx = sanitizeErrorContext({
        message: `${error?.name ?? "Error"}: ${error?.message ?? ""}`,
        stack: error?.stack ?? null,
        source: "react-global-boundary",
        url: typeof window !== "undefined" ? window.location.href : null,
        timestamp: new Date().toISOString(),
        consoleLogs: getErrorLogEntries(),
      });
      if (ctx) stashErrorContext(ctx);
    } catch {
      // stashing is best-effort — never block the recovery actions
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#0a0a0a",
          color: "#f2f2f2",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: 520,
            textAlign: "center",
            background: "#151515",
            border: "1px solid #2a2a2a",
            borderRadius: 20,
            padding: "32px 24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <AlertTriangle size={40} style={{ color: "#F87171" }} />
          </div>

          <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 6px", fontSize: 14, lineHeight: 1.6, color: "#a3a3a3", wordBreak: "break-word" }}>
            {safeMessage}
          </p>
          {error?.digest && (
            <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b6b6b" }}>Reference: {error.digest}</p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 20 }}>
            <button
              type="button"
              onClick={reset}
              style={primaryButtonStyle}
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={outlinedButtonStyle}
            >
              <RotateCcw size={16} style={{ marginRight: 8 }} />
              Reload
            </button>
          </div>

          {/* The root layout failed — a hard navigation deliberately avoids relying on app state. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/bug-report?e=1"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 18,
              fontSize: 13,
              color: "#a3a3a3",
              textDecoration: "underline",
            }}
          >
            <Bug size={14} />
            Report this error
          </a>
        </main>
      </body>
    </html>
  );
}

const primaryButtonStyle: CSSProperties = {
  height: 40,
  padding: "0 20px",
  borderRadius: 8,
  border: "none",
  background: "#E8FF47",
  color: "#0a0a0a",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const outlinedButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  background: "transparent",
  color: "#f2f2f2",
  border: "1px solid #3D3D3D",
  display: "inline-flex",
  alignItems: "center",
};
