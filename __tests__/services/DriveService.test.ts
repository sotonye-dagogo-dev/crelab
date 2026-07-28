import { describe, it, expect } from "vitest";
import { parseFolderId, validateFolderUrl, isSupportedMimeType, getSupportedMimeType, DriveAccessError, DriveValidationError } from "@/lib/drive";

describe("lib/drive — Folder URL parsing", () => {
  it("parseFolderId extracts folder ID from standard Drive URL", () => {
    expect(parseFolderId("https://drive.google.com/drive/folders/abc123DEF")).toBe("abc123DEF");
  });

  it("parseFolderId extracts folder ID with dashes and underscores", () => {
    expect(parseFolderId("https://drive.google.com/drive/folders/aBc_123-XYZ")).toBe("aBc_123-XYZ");
  });

  it("parseFolderId returns null for non-Drive URL", () => {
    expect(parseFolderId("https://example.com")).toBeNull();
  });

  it("parseFolderId returns null for empty string", () => {
    expect(parseFolderId("")).toBeNull();
  });

  it("validateFolderUrl returns true for valid Drive folder URL", () => {
    expect(validateFolderUrl("https://drive.google.com/drive/folders/abc123")).toBe(true);
  });

  it("validateFolderUrl returns false for invalid URL", () => {
    expect(validateFolderUrl("https://example.com")).toBe(false);
  });

  it("validateFolderUrl returns false for empty string", () => {
    expect(validateFolderUrl("")).toBe(false);
  });
});

describe("lib/drive — MIME type support", () => {
  it("isSupportedMimeType returns true for video/mp4", () => {
    expect(isSupportedMimeType("video/mp4")).toBe(true);
  });

  it("isSupportedMimeType returns true for image/jpeg", () => {
    expect(isSupportedMimeType("image/jpeg")).toBe(true);
  });

  it("isSupportedMimeType returns true for application/pdf", () => {
    expect(isSupportedMimeType("application/pdf")).toBe(true);
  });

  it("isSupportedMimeType returns false for unsupported type", () => {
    expect(isSupportedMimeType("audio/mp3")).toBe(false);
  });

  it("getSupportedMimeType returns the type for a supported MIME", () => {
    expect(getSupportedMimeType("video/mp4")).toBe("video/mp4");
  });

  it("getSupportedMimeType returns null for unsupported MIME", () => {
    expect(getSupportedMimeType("audio/mp3")).toBeNull();
  });
});

describe("lib/drive — Error classes", () => {
  it("DriveAccessError has correct name and default message", () => {
    const err = new DriveAccessError("Access denied");
    expect(err.name).toBe("DriveAccessError");
    expect(err.message).toBe("Access denied");
  });

  it("DriveValidationError has correct name and message", () => {
    const err = new DriveValidationError("Invalid URL");
    expect(err.name).toBe("DriveValidationError");
    expect(err.message).toBe("Invalid URL");
  });
});