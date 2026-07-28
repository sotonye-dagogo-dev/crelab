import { describe, it, expect } from "vitest";
import { encodeCursor, decodeCursor } from "@/services/ExploreService";

describe("ExploreService — Cursor encoding/decoding", () => {
  it("encodeCursor produces a base64url string", () => {
    const result = encodeCursor({ v: "2024-01-01T00:00:00.000Z", id: "abc123" });
    expect(typeof result).toBe("string");
    expect(result).not.toContain("+");
    expect(result).not.toContain("/");
    expect(result).not.toContain("=");
  });

  it("decodeCursor returns the original payload", () => {
    const payload = { v: "2024-06-15T12:30:00.000Z", id: "cm-xyz-789" };
    const cursor = encodeCursor(payload);
    const decoded = decodeCursor(cursor);
    expect(decoded).toEqual(payload);
  });

  it("decodeCursor works with numeric v values", () => {
    const payload = { v: 1718460000000, id: "cm-123" };
    const cursor = encodeCursor(payload);
    const decoded = decodeCursor(cursor);
    expect(decoded).toEqual(payload);
  });

  it("decodeCursor returns null for malformed input", () => {
    expect(decodeCursor("not-valid-base64url!!")).toBeNull();
  });

  it("decodeCursor returns null for empty string", () => {
    expect(decodeCursor("")).toBeNull();
  });

  it("decodeCursor returns null for non-JSON base64url", () => {
    const encoded = Buffer.from("not-json").toString("base64url");
    expect(decodeCursor(encoded)).toBeNull();
  });

  it("round-trip preserves object shape", () => {
    const payload = { v: "2024-01-01T00:00:00.000Z", id: "some-long-id-here" };
    const decoded = decodeCursor(encodeCursor(payload));
    expect(decoded).toHaveProperty("v");
    expect(decoded).toHaveProperty("id");
    expect(typeof decoded!.v).toBe("string");
    expect(typeof decoded!.id).toBe("string");
  });
});