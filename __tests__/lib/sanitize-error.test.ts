import { describe, it, expect } from "vitest";
import {
  sanitizeText,
  sanitizeErrorContext,
  MAX_ERROR_CONTEXT_BYTES,
} from "@/lib/sanitize-error";

const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBPa2Fmb3IiLCJpYXQiOjE1MTYyMzkwMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

describe("sanitizeText — redaction", () => {
  it("redacts email addresses", () => {
    const out = sanitizeText("Contact ada.okafor@example.com or support@crellab.dev now");
    expect(out).not.toContain("ada.okafor@example.com");
    expect(out).not.toContain("support@crellab.dev");
    expect(out).toContain("[redacted-email]");
    expect(out).toContain("Contact");
    expect(out).toContain("now");
  });

  it("redacts bearer tokens", () => {
    const out = sanitizeText("Authorization: Bearer abc123DEF.ghi_jkl-XYZ987");
    expect(out).not.toContain("abc123DEF.ghi_jkl-XYZ987");
    expect(out).toContain("Bearer [redacted-token]");
    expect(out).toContain("Authorization:");
  });

  it("redacts JWTs", () => {
    const out = sanitizeText(`request failed for ${JWT} while decoding`);
    expect(out).not.toContain(JWT);
    expect(out).not.toContain("SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c");
    expect(out).toContain("[redacted-jwt]");
  });

  it("redacts JWTs embedded in a token parameter", () => {
    const out = sanitizeText(`token=${JWT}`);
    expect(out).not.toContain(JWT);
    expect(out).toContain("[redacted-");
  });

  it("redacts cookie headers", () => {
    const out = sanitizeText("Cookie: session=abc123; theme=dark; Path=/");
    expect(out).not.toContain("session=abc123");
    expect(out).not.toContain("theme=dark");
    expect(out).toContain("Cookie: [redacted-cookie]");
  });

  it("redacts Set-Cookie headers", () => {
    const out = sanitizeText("Set-Cookie: connect.sid=s%3Averysecret; HttpOnly");
    expect(out).not.toContain("verysecret");
    expect(out.toLowerCase()).toContain("set-cookie: [redacted-cookie]");
  });

  it("redacts data URIs", () => {
    const out = sanitizeText('background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==)');
    expect(out).not.toContain("iVBORw0KGgo");
    expect(out).toContain("[redacted-data-uri]");
    expect(out).toContain("background: url(");
  });

  it("redacts session / access-token assignments", () => {
    const out = sanitizeText("access_token=super-secret-value&next=1 sessionid=abcDEF123");
    expect(out).not.toContain("super-secret-value");
    expect(out).not.toContain("abcDEF123");
    expect(out).toContain("[redacted-token]");
  });

  it("leaves ordinary text untouched", () => {
    expect(sanitizeText("Rendered the explore page in 120ms")).toBe(
      "Rendered the explore page in 120ms",
    );
  });
});

describe("sanitizeErrorContext", () => {
  it("returns null for payloads that are not error objects", () => {
    expect(sanitizeErrorContext(null)).toBeNull();
    expect(sanitizeErrorContext(undefined)).toBeNull();
    expect(sanitizeErrorContext(42)).toBeNull();
    expect(sanitizeErrorContext(["nope"])).toBeNull();
    expect(sanitizeErrorContext("not json at all")).toBeNull();
  });

  it("accepts a JSON-string payload", () => {
    const out = sanitizeErrorContext(JSON.stringify({ message: "boom happened" }));
    expect(out?.message).toBe("boom happened");
    expect(typeof out?.timestamp).toBe("string");
  });

  it("redacts every string field of the payload", () => {
    const out = sanitizeErrorContext({
      message: "failed for user@example.com with Bearer secret-token-42",
      stack: "at fn (Cookie: session=leak123)",
      url: "https://x.test/?contact=user@example.com",
      source: "window.onerror",
      timestamp: "2026-01-02T03:04:05.000Z",
      consoleLogs: [
        { level: "warn", time: "2026-01-02T03:04:00.000Z", message: "leaky user@example.com" },
      ],
    })!;

    expect(out.message).not.toContain("user@example.com");
    expect(out.message).not.toContain("secret-token-42");
    expect(out.stack).not.toContain("leak123");
    expect(out.url).not.toContain("user@example.com");
    expect(out.consoleLogs[0].message).not.toContain("user@example.com");
    expect(out.message).toContain("[redacted-email]");
  });

  it("truncates oversized message, stack and log entries", () => {
    const messageOut = sanitizeErrorContext({ message: "m".repeat(9000), stack: "short" })!;
    expect(messageOut.message.length).toBeLessThan(9000);
    expect(messageOut.message.endsWith("…[truncated]")).toBe(true);

    const stackOut = sanitizeErrorContext({ message: "short", stack: "at line\n".repeat(4000) })!;
    expect(stackOut.stack!.length).toBeLessThan(32000);
    expect(stackOut.stack!.endsWith("…[truncated]")).toBe(true);

    const logOut = sanitizeErrorContext({
      message: "short",
      stack: "short",
      consoleLogs: [
        { level: "log", time: "2026-01-02T03:04:00.000Z", message: "x".repeat(5000) },
      ],
    })!;
    expect(logOut.consoleLogs).toHaveLength(1);
    expect(logOut.consoleLogs[0].message.length).toBeLessThanOrEqual(400);
    expect(logOut.consoleLogs[0].message.endsWith("…[truncated]")).toBe(true);
  });

  it("keeps only the most recent console log entries", () => {
    const out = sanitizeErrorContext({
      message: "boom",
      consoleLogs: Array.from({ length: 100 }, (_, i) => ({
        level: "log",
        time: "2026-01-02T03:04:00.000Z",
        message: `log-${i}`,
      })),
    })!;

    expect(out.consoleLogs).toHaveLength(60);
    expect(out.consoleLogs[0].message).toBe("log-40");
    expect(out.consoleLogs[59].message).toBe("log-99");
  });

  it("normalises malformed log entries", () => {
    const out = sanitizeErrorContext({
      message: "boom",
      consoleLogs: [
        { level: "explode", time: 123, message: 5 },
        "not-an-object",
        null,
      ],
    })!;

    expect(out.consoleLogs).toHaveLength(1);
    expect(out.consoleLogs[0]).toEqual({ level: "log", time: "", message: "5" });
  });

  it("never exceeds the 8 KB byte cap", () => {
    const out = sanitizeErrorContext({
      message: "m".repeat(40_000),
      stack: "s".repeat(40_000),
      url: "u".repeat(40_000),
      source: "window.onerror",
      timestamp: new Date().toISOString(),
      consoleLogs: Array.from({ length: 200 }, (_, i) => ({
        level: "log",
        time: new Date().toISOString(),
        message: `entry ${i} ${"x".repeat(500)}`,
      })),
    })!;

    const bytes = new TextEncoder().encode(JSON.stringify(out)).length;
    expect(bytes).toBeLessThanOrEqual(MAX_ERROR_CONTEXT_BYTES);
    expect(out.message.length).toBeGreaterThan(0);
  });

  it("is idempotent — sanitising an already sanitised payload changes nothing", () => {
    const once = sanitizeErrorContext({
      message: "failed for user@example.com",
      stack: "at fn (index.js:1:1)",
      url: "https://x.test/?a=b",
      timestamp: "2026-01-02T03:04:05.000Z",
      source: "window.onerror",
      consoleLogs: [{ level: "error", time: "2026-01-02T03:04:00.000Z", message: "user@example.com" }],
    })!;

    expect(sanitizeErrorContext(once)).toEqual(once);
  });

  it("fills in a timestamp when the payload has none", () => {
    const out = sanitizeErrorContext({ message: "no timestamp here" })!;
    expect(Number.isNaN(Date.parse(out.timestamp))).toBe(false);
    expect(out.stack).toBeNull();
    expect(out.url).toBeNull();
    expect(out.consoleLogs).toEqual([]);
  });
});
