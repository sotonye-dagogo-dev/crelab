import { describe, it, expect, afterEach } from "vitest";
import {
  isCloudinaryConfigured,
  getResourceType,
  CloudinaryNotConfiguredError,
} from "@/lib/cloudinary";

const ORIGINAL_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const ORIGINAL_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

afterEach(() => {
  if (ORIGINAL_CLOUD_NAME === undefined) {
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  } else {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = ORIGINAL_CLOUD_NAME;
  }
  if (ORIGINAL_UPLOAD_PRESET === undefined) {
    delete process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  } else {
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = ORIGINAL_UPLOAD_PRESET;
  }
});

describe("lib/cloudinary — isCloudinaryConfigured", () => {
  it("returns false when both env vars are missing", () => {
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    delete process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    expect(isCloudinaryConfigured()).toBe(false);
  });

  it("returns false when only the cloud name is present", () => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test-cloud";
    delete process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    expect(isCloudinaryConfigured()).toBe(false);
  });

  it("returns true when both env vars are present", () => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test-cloud";
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = "test-preset";
    expect(isCloudinaryConfigured()).toBe(true);
  });
});

describe("lib/cloudinary — getResourceType", () => {
  it("maps video mime types to video", () => {
    expect(getResourceType("video/mp4")).toBe("video");
    expect(getResourceType("video/quicktime")).toBe("video");
  });

  it("maps image mime types to image", () => {
    expect(getResourceType("image/png")).toBe("image");
    expect(getResourceType("image/webp")).toBe("image");
  });

  it("returns null for unsupported types", () => {
    expect(getResourceType("audio/mp3")).toBeNull();
    expect(getResourceType("application/pdf")).toBeNull();
  });
});

describe("lib/cloudinary — CloudinaryNotConfiguredError", () => {
  it("carries the right name and status", () => {
    const err = new CloudinaryNotConfiguredError();
    expect(err.name).toBe("CloudinaryNotConfiguredError");
    expect(err.status).toBe(503);
    expect(err.code).toBe("CLOUDINARY_NOT_CONFIGURED");
  });
});
