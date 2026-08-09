import { describe, it, expect } from "vitest";
import {
  buildProviderSlug,
  parseProviderSlug,
} from "@/lib/slug";

describe("lib/slug — buildProviderSlug", () => {
  it("slugifies name and appends the first 8 chars of the id", () => {
    const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    expect(buildProviderSlug("Chioma Eze Creative", id)).toBe(
      "chioma-eze-creative--a1b2c3d4",
    );
  });

  it("strips punctuation from the name", () => {
    const id = "abcdefgh-1111-2222-3333-444444444444";
    expect(buildProviderSlug("John O'Neil Films!", id)).toBe(
      "john-oneil-films--abcdefgh",
    );
  });

  it("keeps short seed ids intact", () => {
    expect(buildProviderSlug("Femi Films", "prov-2")).toBe(
      "femi-films--prov-2",
    );
  });
});

describe("lib/slug — parseProviderSlug", () => {
  it("extracts the id prefix after the last --", () => {
    expect(parseProviderSlug("chioma-eze-creative--a1b2c3d4")).toEqual({
      name: "chioma-eze-creative",
      idPrefix: "a1b2c3d4",
    });
  });

  it("round-trips buildProviderSlug", () => {
    const id = "01234567-89ab-cdef-0123-456789abcdef";
    const slug = buildProviderSlug("Test Creator", id);
    expect(parseProviderSlug(slug)).toEqual({
      name: "test-creator",
      idPrefix: "01234567",
    });
  });

  it("handles display names that contain --", () => {
    const parsed = parseProviderSlug("john--doe-films--ab12cd34");
    expect(parsed).toEqual({
      name: "john--doe-films",
      idPrefix: "ab12cd34",
    });
  });

  it("returns null for a slug without a separator", () => {
    expect(parseProviderSlug("no-separator-here")).toBeNull();
  });

  it("returns null for an empty id prefix", () => {
    expect(parseProviderSlug("name--")).toBeNull();
  });
});
