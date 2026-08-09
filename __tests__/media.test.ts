import { describe, it, expect } from "vitest";
import {
  isMediaFileAllowed,
  isValidMediaUrl,
  getAcceptedTypes,
} from "@/lib/media";
import type { IMediaUploadConfig } from "@/types";

const testConfig: IMediaUploadConfig = {
  enabled: true,
  cloudinaryEnabled: true,
  maxFileSizeMb: 100,
  videoTypes: ["video/mp4", "video/webm"],
  imageTypes: ["image/jpeg", "image/png"],
};

describe("lib/media — getAcceptedTypes", () => {
  it("merges video and image types", () => {
    expect(getAcceptedTypes(testConfig)).toEqual([
      "video/mp4",
      "video/webm",
      "image/jpeg",
      "image/png",
    ]);
  });
});

describe("lib/media — isMediaFileAllowed", () => {
  it("accepts a supported video under the size limit", () => {
    const result = isMediaFileAllowed(
      { name: "clip.mp4", size: 10 * 1024 * 1024, type: "video/mp4" },
      testConfig,
    );
    expect(result.ok).toBe(true);
    expect(result.reason).toBeNull();
  });

  it("accepts a supported image under the size limit", () => {
    const result = isMediaFileAllowed(
      { name: "photo.png", size: 5 * 1024 * 1024, type: "image/png" },
      testConfig,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects an unsupported mime type", () => {
    const result = isMediaFileAllowed(
      { name: "audio.mp3", size: 1000, type: "audio/mp3" },
      testConfig,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("not supported");
  });

  it("rejects a file with an unknown type", () => {
    const result = isMediaFileAllowed(
      { name: "file.bin", size: 1000, type: "" },
      testConfig,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Could not determine");
  });

  it("rejects a file over the size limit", () => {
    const result = isMediaFileAllowed(
      { name: "huge.mp4", size: 101 * 1024 * 1024, type: "video/mp4" },
      testConfig,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("too large");
  });
});

describe("lib/media — isValidMediaUrl", () => {
  it("accepts an https URL", () => {
    expect(isValidMediaUrl("https://drive.google.com/drive/folders/abc")).toBe(true);
  });

  it("accepts an http URL", () => {
    expect(isValidMediaUrl("http://example.com/video.mp4")).toBe(true);
  });

  it("rejects a non-URL string", () => {
    expect(isValidMediaUrl("not a url")).toBe(false);
  });

  it("rejects an ftp URL", () => {
    expect(isValidMediaUrl("ftp://example.com/file.mp4")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidMediaUrl("")).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    expect(isValidMediaUrl("  https://example.com/a.mp4  ")).toBe(true);
  });
});
