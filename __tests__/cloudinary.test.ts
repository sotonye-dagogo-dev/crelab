import { describe, it, expect, afterEach } from "vitest";
import {
  isCloudinaryConfigured,
  isCloudinaryAdminConfigured,
  getResourceType,
  CloudinaryNotConfiguredError,
  CloudinaryAdminNotConfiguredError,
  parseCloudinaryUrl,
  extractPublicId,
} from "@/lib/cloudinary";

const ORIGINAL_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const ORIGINAL_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const ORIGINAL_API_KEY = process.env.CLOUDINARY_API_KEY;
const ORIGINAL_API_SECRET = process.env.CLOUDINARY_API_SECRET;

function clearCloudinaryEnv() {
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  delete process.env.CLOUDINARY_UPLOAD_PRESET;
  delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  delete process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
}

function restoreEnv(key: string, original: string | undefined) {
  if (original === undefined) delete process.env[key];
  else process.env[key] = original;
}

afterEach(() => {
  restoreEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", ORIGINAL_CLOUD_NAME);
  restoreEnv("NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET", ORIGINAL_UPLOAD_PRESET);
  restoreEnv("CLOUDINARY_API_KEY", ORIGINAL_API_KEY);
  restoreEnv("CLOUDINARY_API_SECRET", ORIGINAL_API_SECRET);
});

describe("lib/cloudinary — isCloudinaryConfigured", () => {
  it("returns false when no env vars are present", () => {
    clearCloudinaryEnv();
    expect(isCloudinaryConfigured()).toBe(false);
  });

  it("returns false when only the cloud name is present", () => {
    clearCloudinaryEnv();
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
    expect(isCloudinaryConfigured()).toBe(false);
  });

  it("returns true when the new conventional vars are present", () => {
    clearCloudinaryEnv();
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
    process.env.CLOUDINARY_UPLOAD_PRESET = "test-preset";
    expect(isCloudinaryConfigured()).toBe(true);
  });

  it("honours legacy NEXT_PUBLIC vars as fallbacks", () => {
    clearCloudinaryEnv();
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test-cloud";
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = "test-preset";
    expect(isCloudinaryConfigured()).toBe(true);
  });
});

describe("lib/cloudinary — isCloudinaryAdminConfigured", () => {
  it("returns false without api key and secret", () => {
    clearCloudinaryEnv();
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
    process.env.CLOUDINARY_UPLOAD_PRESET = "test-preset";
    expect(isCloudinaryAdminConfigured()).toBe(false);
  });

  it("returns true when key and secret are present", () => {
    clearCloudinaryEnv();
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
    process.env.CLOUDINARY_UPLOAD_PRESET = "test-preset";
    process.env.CLOUDINARY_API_KEY = "test-key";
    process.env.CLOUDINARY_API_SECRET = "test-secret";
    expect(isCloudinaryAdminConfigured()).toBe(true);
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

describe("lib/cloudinary — CloudinaryAdminNotConfiguredError", () => {
  it("carries the right name and status", () => {
    const err = new CloudinaryAdminNotConfiguredError();
    expect(err.name).toBe("CloudinaryAdminNotConfiguredError");
    expect(err.status).toBe(503);
    expect(err.code).toBe("CLOUDINARY_ADMIN_NOT_CONFIGURED");
  });
});

describe("lib/cloudinary — parseCloudinaryUrl", () => {
  it("parses a plain image url", () => {
    expect(
      parseCloudinaryUrl(
        "https://res.cloudinary.com/demo/image/upload/v123/photo.png",
      ),
    ).toEqual({ cloudName: "demo", resourceType: "image", publicId: "photo" });
  });

  it("parses a video url with version", () => {
    expect(
      parseCloudinaryUrl(
        "https://res.cloudinary.com/demo/video/upload/v987/clip.mp4",
      ),
    ).toEqual({ cloudName: "demo", resourceType: "video", publicId: "clip" });
  });

  it("parses a transformed thumbnail url", () => {
    expect(
      parseCloudinaryUrl(
        "https://res.cloudinary.com/demo/video/upload/w_600,q_auto,g_auto/clip.jpg",
      ),
    ).toEqual({ cloudName: "demo", resourceType: "video", publicId: "clip" });
  });

  it("returns null for non-cloudinary urls", () => {
    expect(parseCloudinaryUrl("https://drive.google.com/file/xyz")).toBeNull();
  });
});

describe("lib/cloudinary — extractPublicId", () => {
  it("extracts public ids (backwards-compatible alias)", () => {
    expect(
      extractPublicId(
        "https://res.cloudinary.com/demo/video/upload/v1/reel.mp4",
      ),
    ).toBe("reel");
  });
});
