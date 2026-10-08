import { describe, it, expect } from "vitest";
import {
  normalizeSocialPlatform,
  toStoredPlatform,
  shortPlatformLabel,
} from "@/lib/social-platforms";

describe("lib/social-platforms — normalizeSocialPlatform", () => {
  it("maps legacy free-typed values to canonical kinds", () => {
    expect(normalizeSocialPlatform("Twitter").kind).toBe("x");
    expect(normalizeSocialPlatform("twitter").canonical).toBe("X");
    expect(normalizeSocialPlatform("X").kind).toBe("x");
    expect(normalizeSocialPlatform("LinkedIn").kind).toBe("linkedin");
    expect(normalizeSocialPlatform("GitHub").kind).toBe("github");
    expect(normalizeSocialPlatform("Dribbble").kind).toBe("dribbble");
  });

  it("keeps unknown legacy values verbatim as custom labels", () => {
    const n = normalizeSocialPlatform("Behance");
    expect(n.kind).toBe("other");
    expect(n.customLabel).toBe("Behance");
    expect(n.canonical).toBe("Behance");
  });

  it("handles empty input as blank other", () => {
    expect(normalizeSocialPlatform("").kind).toBe("other");
    expect(normalizeSocialPlatform(null).customLabel).toBe("");
  });
});

describe("lib/social-platforms — toStoredPlatform", () => {
  it("stores canonical labels for known kinds", () => {
    expect(toStoredPlatform("x", "")).toBe("X");
    expect(toStoredPlatform("linkedin", "")).toBe("LinkedIn");
  });

  it("stores custom text for other", () => {
    expect(toStoredPlatform("other", "  Behance ")).toBe("Behance");
  });
});

describe("lib/social-platforms — shortPlatformLabel", () => {
  it("returns badge text with legacy fallback", () => {
    expect(shortPlatformLabel("Twitter")).toBe("X");
    expect(shortPlatformLabel("LinkedIn")).toBe("in");
    expect(shortPlatformLabel("Behance")).toBe("Be");
  });
});
