import { describe, it, expect } from "vitest";
import {
  serializeAuditValue,
  summarizeAuditValue,
  describeAuditValue,
} from "@/lib/audit";

describe("lib/audit — serializeAuditValue", () => {
  it("returns an empty string for null/undefined", () => {
    expect(serializeAuditValue(null)).toBe("");
    expect(serializeAuditValue(undefined)).toBe("");
  });

  it("stringifies primitives directly", () => {
    expect(serializeAuditValue("hello")).toBe("hello");
    expect(serializeAuditValue(5)).toBe("5");
    expect(serializeAuditValue(true)).toBe("true");
  });

  it("pretty-prints objects and arrays", () => {
    expect(serializeAuditValue({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(serializeAuditValue([1, 2])).toContain("2");
  });
});

describe("lib/audit — summarizeAuditValue", () => {
  it("passes short values through untouched", () => {
    const out = summarizeAuditValue("short", 20);
    expect(out).toEqual({ summary: "short", full: "short", truncated: false });
  });

  it("collapses long HTML strings onto one line with an ellipsis", () => {
    const html = "<p>" + "x".repeat(400) + "</p>";
    const out = summarizeAuditValue(html, 50);
    expect(out.truncated).toBe(true);
    expect(out.summary.length).toBeLessThanOrEqual(51);
    expect(out.summary.endsWith("…")).toBe(true);
    expect(out.full).toBe(html);
  });

  it("renders an em-dash for empty values", () => {
    expect(summarizeAuditValue(null)).toEqual({ summary: "—", full: "", truncated: false });
  });

  it("marks zero-length values as not truncated", () => {
    const out = summarizeAuditValue("");
    expect(out.truncated).toBe(false);
  });
});

describe("lib/audit — describeAuditValue", () => {
  it("describes strings by character count", () => {
    expect(describeAuditValue("hello")).toBe("5 chars");
  });

  it("describes arrays by item count", () => {
    expect(describeAuditValue([1, 2, 3])).toBe("3 items");
  });

  it("describes objects by serialized byte size", () => {
    expect(describeAuditValue({ a: 1 })).toBe("7 bytes");
  });

  it("describes empty values", () => {
    expect(describeAuditValue(null)).toBe("empty");
  });
});