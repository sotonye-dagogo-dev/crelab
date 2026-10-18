import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseFolderId,
  validateFolderUrl,
  isSupportedMimeType,
  getSupportedMimeType,
  buildStableDriveThumbnailUrl,
  isExpiringDriveThumbnailUrl,
  driveThumbnailHealSrc,
  fetchFileList,
  fetchAllFiles,
  __resetDriveThrottleForTests,
  DriveAccessError,
  DriveRateLimitError,
  DriveValidationError,
} from "@/lib/drive";

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

describe("lib/drive — Stable thumbnail URLs (hot-link expiry mitigation)", () => {
  it("buildStableDriveThumbnailUrl builds the unsigned endpoint", () => {
    expect(buildStableDriveThumbnailUrl("file-123")).toBe(
      "https://drive.google.com/thumbnail?id=file-123&sz=w600",
    );
  });

  it("buildStableDriveThumbnailUrl honours a custom size (clamped ≤ 2000)", () => {
    expect(buildStableDriveThumbnailUrl("file-123", 2000)).toBe(
      "https://drive.google.com/thumbnail?id=file-123&sz=w2000",
    );
    expect(buildStableDriveThumbnailUrl("file-123", 99_999)).toContain("sz=w2000");
  });

  it("buildStableDriveThumbnailUrl URL-encodes the file id", () => {
    expect(buildStableDriveThumbnailUrl("a b&c")).toBe(
      "https://drive.google.com/thumbnail?id=a%20b%26c&sz=w600",
    );
  });

  it("buildStableDriveThumbnailUrl returns null for blank id", () => {
    expect(buildStableDriveThumbnailUrl("")).toBeNull();
    expect(buildStableDriveThumbnailUrl("   ")).toBeNull();
  });

  it("isExpiringDriveThumbnailUrl detects signed googleusercontent URLs", () => {
    expect(
      isExpiringDriveThumbnailUrl("https://lh3.googleusercontent.com/abc=s220"),
    ).toBe(true);
    expect(
      isExpiringDriveThumbnailUrl("https://doc-00-00-docs.googleusercontent.com/x=s220"),
    ).toBe(true);
  });

  it("isExpiringDriveThumbnailUrl is false for stable/other URLs", () => {
    expect(
      isExpiringDriveThumbnailUrl("https://drive.google.com/thumbnail?id=x&sz=w600"),
    ).toBe(false);
    expect(
      isExpiringDriveThumbnailUrl("https://res.cloudinary.com/demo/video/upload/v1/x.jpg"),
    ).toBe(false);
    expect(isExpiringDriveThumbnailUrl(null)).toBe(false);
  });

  it("driveThumbnailHealSrc heals legacy DRIVE rows with expiring thumbs", () => {
    expect(
      driveThumbnailHealSrc({
        source: "DRIVE",
        driveFileId: "f-1",
        thumbnailUrl: "https://lh3.googleusercontent.com/abc=s220",
      }),
    ).toBe("https://drive.google.com/thumbnail?id=f-1&sz=w600");
  });

  it("driveThumbnailHealSrc returns null for non-Drive rows", () => {
    expect(
      driveThumbnailHealSrc({
        source: "DIRECT",
        driveFileId: null,
        thumbnailUrl: "https://lh3.googleusercontent.com/abc=s220",
      }),
    ).toBeNull();
  });

  it("driveThumbnailHealSrc returns null when thumbnail is already stable", () => {
    expect(
      driveThumbnailHealSrc({
        source: "DRIVE",
        driveFileId: "f-1",
        thumbnailUrl: "https://drive.google.com/thumbnail?id=f-1&sz=w600",
      }),
    ).toBeNull();
  });

  it("driveThumbnailHealSrc returns null when driveFileId is missing", () => {
    expect(
      driveThumbnailHealSrc({
        source: "DRIVE",
        driveFileId: null,
        thumbnailUrl: "https://lh3.googleusercontent.com/abc=s220",
      }),
    ).toBeNull();
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

  it("DriveRateLimitError extends DriveAccessError (back-compat for catch sites)", () => {
    const err = new DriveRateLimitError("throttled", { retryAfterMs: 1000 });
    expect(err).toBeInstanceOf(DriveAccessError);
    expect(err.name).toBe("DriveRateLimitError");
    expect(err.retryAfterMs).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// fetchFileList / fetchAllFiles — rate limits, retries, pagination cap.
// Throttle + backoff envs zeroed so the suite stays fast; throttle state reset
// between cases so the sliding-window bookkeeping never leaks across tests.
// ---------------------------------------------------------------------------

function jsonResponse(
  data: unknown,
  init?: { status?: number; headers?: Record<string, string> },
): Response {
  return new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
}

function filePayload(ids: string[], nextPageToken?: string) {
  return {
    files: ids.map((id) => ({
      id,
      name: `${id}.mp4`,
      mimeType: "video/mp4",
      webViewLink: `https://drive.google.com/file/d/${id}/view`,
      thumbnailLink: `https://lh3.googleusercontent.com/${id}=s220`,
    })),
    nextPageToken: nextPageToken ?? null,
  };
}

describe("lib/drive — fetchFileList rate-limit handling", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_API_KEY", "test-key");
    vi.stubEnv("DRIVE_FETCH_RETRY_BASE_MS", "0");
    vi.stubEnv("DRIVE_MIN_REQUEST_INTERVAL_MS", "0");
    vi.stubEnv("DRIVE_MAX_REQUESTS_PER_MINUTE", "0");
    vi.stubEnv("DRIVE_FETCH_MAX_RETRIES", "2");
    __resetDriveThrottleForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns files on success", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(filePayload(["f1"])));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFileList("folder-1");
    expect(result.files).toHaveLength(1);
    expect(result.files[0].id).toBe("f1");
    expect(result.nextPageToken).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a 429 then succeeds (honours Retry-After: 0)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("Too Many Requests", {
          status: 429,
          headers: { "retry-after": "0" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(filePayload(["f1"])));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFileList("folder-1");
    expect(result.files).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a 403 whose body carries userRateLimitExceeded, then succeeds", async () => {
    const rateLimitBody = JSON.stringify({
      error: {
        code: 403,
        errors: [{ reason: "userRateLimitExceeded" }],
        message: "User Rate Limit Exceeded",
      },
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(rateLimitBody, { status: 403 }))
      .mockResolvedValueOnce(jsonResponse(filePayload(["f1"])));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFileList("folder-1");
    expect(result.files).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws DriveRateLimitError when 429 persists past the retry budget", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("Too Many Requests", {
        status: 429,
        headers: { "retry-after": "0" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFileList("folder-1")).rejects.toThrow(DriveRateLimitError);
    // 1 initial + 2 retries
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("maps a plain 403 to the private-folder access error (not a rate limit)", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        { error: { code: 403, message: "The caller does not have permission" } },
        { status: 403 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const err = await fetchFileList("folder-1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DriveAccessError);
    expect(err).not.toBeInstanceOf(DriveRateLimitError);
    expect((err as Error).message).toBe(
      "Folder is private or sharing settings prevent access",
    );
    // 403-private must NOT burn the retry budget
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps 404 to folder-not-found", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: { code: 404 } }, { status: 404 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFileList("folder-1")).rejects.toThrow(
      "Folder not found or not accessible",
    );
  });
});

describe("lib/drive — fetchAllFiles pagination cap (folder quota guard)", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_API_KEY", "test-key");
    vi.stubEnv("DRIVE_FETCH_RETRY_BASE_MS", "0");
    vi.stubEnv("DRIVE_MIN_REQUEST_INTERVAL_MS", "0");
    vi.stubEnv("DRIVE_MAX_REQUESTS_PER_MINUTE", "0");
    vi.stubEnv("DRIVE_FETCH_MAX_RETRIES", "0");
    __resetDriveThrottleForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("stops at maxFiles and flags truncated when more pages remain", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(filePayload(["f1", "f2"], "page-2")))
      .mockResolvedValueOnce(jsonResponse(filePayload(["f3", "f4"], "page-3")));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAllFiles("folder-1", { maxFiles: 3 });
    expect(result.files.map((f) => f.id)).toEqual(["f1", "f2", "f3"]);
    expect(result.truncated).toBe(true);
    expect(result.total).toBe(3);
    // Cap hit mid-page-2 → no page-3 request
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("collects everything under the cap with truncated=false", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(filePayload(["f1", "f2"], "page-2")))
      .mockResolvedValueOnce(jsonResponse(filePayload(["f3"])));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAllFiles("folder-1", { maxFiles: 100 });
    expect(result.files).toHaveLength(3);
    expect(result.truncated).toBe(false);
    expect(result.total).toBe(3);
  });

  it("flags truncated when the cap equals the first page exactly but a token remains", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(filePayload(["f1", "f2"], "page-2")),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAllFiles("folder-1", { maxFiles: 2 });
    expect(result.files).toHaveLength(2);
    expect(result.truncated).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// DriveService — stable-thumbnail ingest + rate-limit abort across providers.
// ---------------------------------------------------------------------------

const { portfolioMock, dbMock } = vi.hoisted(() => ({
  portfolioMock: {
    getAllByProvider: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    setHidden: vi.fn(),
  },
  dbMock: {
    select: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("@/services/PortfolioService", () => ({
  PortfolioService: portfolioMock,
}));

import { DriveService } from "@/services/DriveService";

/** Thenable query-chain stub: chain methods return the proxy; awaiting resolves to `value`. */
function q<T>(value: T) {
  const chain: Record<string, unknown> = {};
  const proxy = new Proxy(chain, {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: (v: T) => void) => resolve(value);
      }
      return () => proxy;
    },
  });
  return proxy as unknown;
}

describe("DriveService — ingestFolder stores stable, non-expiring thumbnails", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_API_KEY", "test-key");
    vi.stubEnv("DRIVE_FETCH_RETRY_BASE_MS", "0");
    vi.stubEnv("DRIVE_MIN_REQUEST_INTERVAL_MS", "0");
    vi.stubEnv("DRIVE_MAX_REQUESTS_PER_MINUTE", "0");
    vi.stubEnv("DRIVE_FETCH_MAX_RETRIES", "0");
    __resetDriveThrottleForTests();
    portfolioMock.getAllByProvider.mockResolvedValue([]);
    portfolioMock.addItem.mockResolvedValue({});
    portfolioMock.updateItem.mockResolvedValue({});
    portfolioMock.setHidden.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("adds supported files with the stable Drive thumbnail URL (not the signed thumbnailLink)", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        files: [
          {
            id: "f-1",
            name: "clip.mp4",
            mimeType: "video/mp4",
            webViewLink: "https://drive.google.com/file/d/f-1/view",
            thumbnailLink: "https://lh3.googleusercontent.com/signed=s220",
          },
          {
            id: "f-2",
            name: "notes.txt",
            mimeType: "text/plain",
            webViewLink: "https://drive.google.com/file/d/f-2/view",
            thumbnailLink: null,
          },
        ],
        nextPageToken: null,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const service = new DriveService();
    const result = await service.ingestFolder(
      "provider-1",
      "https://drive.google.com/drive/folders/folder-1",
    );

    expect(result.added).toBe(1);
    expect(result.total).toBe(1);
    expect(result.truncated).toBe(false);
    expect(portfolioMock.addItem).toHaveBeenCalledTimes(1);
    const payload = portfolioMock.addItem.mock.calls[0][0];
    expect(payload.driveFileId).toBe("f-1");
    expect(payload.thumbnailUrl).toBe(
      "https://drive.google.com/thumbnail?id=f-1&sz=w600",
    );
    expect(payload.url).toBe("https://drive.google.com/file/d/f-1/view");
    // The signed, expiring link must never be persisted
    expect(JSON.stringify(portfolioMock.addItem.mock.calls)).not.toContain(
      "lh3.googleusercontent.com",
    );
  });

  it("propagates truncated from the capped fetch into the ingest result", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(filePayload(["f1", "f2"], "more")));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("DRIVE_MAX_FILES_PER_FOLDER", "2");

    const service = new DriveService();
    const result = await service.ingestFolder(
      "provider-1",
      "https://drive.google.com/drive/folders/folder-1",
    );
    expect(result.truncated).toBe(true);
    expect(result.added).toBe(2);
  });

  it("rejects invalid folder URLs with DriveValidationError", async () => {
    const service = new DriveService();
    await expect(service.ingestFolder("p", "https://example.com")).rejects.toThrow(
      DriveValidationError,
    );
  });
});

describe("DriveService — syncAll aborts on Google rate limits", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_API_KEY", "test-key");
    vi.stubEnv("DRIVE_FETCH_RETRY_BASE_MS", "0");
    vi.stubEnv("DRIVE_MIN_REQUEST_INTERVAL_MS", "0");
    vi.stubEnv("DRIVE_MAX_REQUESTS_PER_MINUTE", "0");
    vi.stubEnv("DRIVE_FETCH_MAX_RETRIES", "0");
    __resetDriveThrottleForTests();
    portfolioMock.getAllByProvider.mockResolvedValue([]);
    portfolioMock.addItem.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("stops syncing remaining providers once throttled and reports rateLimited", async () => {
    dbMock.select.mockReturnValue(
      q([
        { id: "p1", displayName: "Provider One", active: true, verified: true, driveFolderUrl: "https://drive.google.com/drive/folders/a" },
        { id: "p2", displayName: "Provider Two", active: true, verified: true, driveFolderUrl: "https://drive.google.com/drive/folders/b" },
        { id: "p3", displayName: "Provider Three", active: true, verified: true, driveFolderUrl: "https://drive.google.com/drive/folders/c" },
      ]),
    );
    const fetchMock = vi.fn(async () =>
      new Response("Too Many Requests", {
        status: 429,
        headers: { "retry-after": "0" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const service = new DriveService();
    const result = await service.syncAll();

    expect(result.synced).toBe(0);
    expect(result.rateLimited).toBe(true);
    expect(result.errors).toHaveLength(3);
    expect(result.errors[0]).toContain("Provider One");
    expect(result.errors[1]).toContain("skipped");
    expect(result.errors[2]).toContain("skipped");
    // Only the first provider's folder was contacted — the rest are skipped.
    const folderIds = (fetchMock.mock.calls as unknown[][]).map((c) => {
      const url = new URL(String(c[0]));
      const q = url.searchParams.get("q") ?? "";
      return q.match(/^'([^']+)'/)?.[1];
    });
    expect(folderIds).toEqual(["a"]);
  });

  it("returns rateLimited=false on a clean run", async () => {
    dbMock.select.mockReturnValue(
      q([
        { id: "p1", displayName: "Provider One", active: true, verified: true, driveFolderUrl: "https://drive.google.com/drive/folders/a" },
      ]),
    );
    const fetchMock = vi.fn(async () => jsonResponse(filePayload(["f1"])));
    vi.stubGlobal("fetch", fetchMock);

    const service = new DriveService();
    const result = await service.syncAll();
    expect(result).toEqual({ synced: 1, errors: [], rateLimited: false });
  });
});
