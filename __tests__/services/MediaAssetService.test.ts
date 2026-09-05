import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { dbMock, cloudinaryMock, configMock } = vi.hoisted(() => {
  const dbMock = {
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  };
  const cloudinaryMock = {
    deleteAsset: vi.fn(async () => true),
    isCloudinaryAdminConfigured: vi.fn(() => false),
  };
  const configMock = {
    getCached: vi.fn(async () => ({
      mediaUpload: { cleanupEnabled: true, cleanupOrphanAfterHours: 1 },
    })),
    get: vi.fn(async () => ({})),
    set: vi.fn(),
  };
  return { dbMock, cloudinaryMock, configMock };
});

vi.mock("@/lib/db", () => ({ db: dbMock }));

vi.mock("@/lib/cloudinary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cloudinary")>();
  return {
    ...actual,
    deleteAsset: cloudinaryMock.deleteAsset,
    isCloudinaryAdminConfigured: cloudinaryMock.isCloudinaryAdminConfigured,
  };
});

vi.mock("@/services/PlatformConfigService", () => ({
  PlatformConfigService: configMock,
}));

import {
  MediaAssetService,
  publicIdFromUrl,
  collectReferencedPublicIds,
  resolveDeletableAssets,
} from "@/services/MediaAssetService";

/**
 * A thenable query-chain stub: any chain method returns the proxy itself and
 * awaiting the chain resolves to `value`.
 */
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

type AssetRow = {
  id: string;
  publicId: string;
  cloudName: string;
  resourceType: "video" | "image";
  url: string;
  thumbnailUrl: string | null;
  mimeType: string | null;
  ownerId: string | null;
  status: "ACTIVE" | "DELETED";
  createdAt: Date;
};

function assetRow(overrides: Partial<AssetRow> = {}): AssetRow {
  return {
    id: "asset-1",
    publicId: "clip",
    cloudName: "demo",
    resourceType: "video",
    url: "https://res.cloudinary.com/demo/video/upload/v1/clip.mp4",
    thumbnailUrl: "https://res.cloudinary.com/demo/video/upload/w_600/clip.jpg",
    mimeType: "video/mp4",
    ownerId: "user-1",
    status: "ACTIVE",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("services/MediaAssetService — publicIdFromUrl", () => {
  it("extracts the public id from a cloudinary url", () => {
    expect(
      publicIdFromUrl("https://res.cloudinary.com/demo/video/upload/v1/clip.mp4"),
    ).toBe("clip");
  });

  it("returns null for null/undefined/empty input", () => {
    expect(publicIdFromUrl(null)).toBeNull();
    expect(publicIdFromUrl(undefined)).toBeNull();
  });

  it("returns null for non-cloudinary urls", () => {
    expect(publicIdFromUrl("https://drive.google.com/f/abc")).toBeNull();
  });
});

describe("services/MediaAssetService — collectReferencedPublicIds", () => {
  it("collects cover, avatar, portfolio url and thumbnail ids", () => {
    const ids = collectReferencedPublicIds(
      [
        {
          coverVideoUrl: "https://res.cloudinary.com/demo/video/upload/v1/reel.mp4",
          avatarUrl: "https://res.cloudinary.com/demo/image/upload/v1/avatar.png",
        },
        { coverVideoUrl: null, avatarUrl: null },
      ],
      [
        { url: "https://res.cloudinary.com/demo/video/upload/v2/portfolio.mp4", thumbnailUrl: null },
        {
          url: "https://res.cloudinary.com/demo/image/upload/v3/photo.jpg",
          thumbnailUrl: "https://res.cloudinary.com/demo/image/upload/w_200/photo.jpg",
        },
      ],
    );
    expect(ids).toEqual(new Set(["reel", "avatar", "portfolio", "photo"]));
  });
});

describe("services/MediaAssetService — resolveDeletableAssets", () => {
  const olderThan = new Date("2026-02-01T00:00:00.000Z");

  it("keeps only ACTIVE, old, unreferenced assets", () => {
    const rows = [
      assetRow({ id: "a1", publicId: "orphan-1", createdAt: new Date("2026-01-01") }),
      assetRow({ id: "a2", publicId: "used", createdAt: new Date("2026-01-01") }),
      assetRow({ id: "a3", publicId: "recent", createdAt: new Date("2026-03-01") }),
      assetRow({ id: "a4", publicId: "deleted-row", status: "DELETED", createdAt: new Date("2026-01-01") }),
    ];
    const deletable = resolveDeletableAssets(
      rows,
      new Set(["used"]),
      olderThan,
    );
    expect(deletable.map((r) => r.id)).toEqual(["a1"]);
  });
});

describe("services/MediaAssetService — deleteAsset", () => {
  it("clears references and removes the registry row", async () => {
    dbMock.select.mockReturnValue(q([assetRow()]));
    dbMock.update.mockReturnValue(q([{ id: "prov-1" }]));
    dbMock.delete.mockReturnValue(q([]));
    cloudinaryMock.isCloudinaryAdminConfigured.mockReturnValue(true);

    const result = await MediaAssetService.deleteAsset("asset-1");

    expect(result.deleted).toBe(true);
    expect(result.referencesCleared).toBe(2);
    expect(result.binaryDeleted).toBe(true);
    expect(cloudinaryMock.deleteAsset).toHaveBeenCalledWith("clip", "video", "demo");
  });

  it("throws when the asset does not exist", async () => {
    dbMock.select.mockReturnValue(q([]));
    await expect(MediaAssetService.deleteAsset("missing")).rejects.toThrow(
      "Media asset not found",
    );
  });
});

describe("services/MediaAssetService — cleanupOrphans", () => {
  it("deletes old unreferenced assets when enabled", async () => {
    dbMock.select
      .mockReturnValueOnce(
        q([assetRow({ id: "old-orphan", publicId: "orphan", createdAt: new Date("2026-01-01") })]),
      )
      .mockReturnValueOnce(
        q([
          { coverVideoUrl: null, avatarUrl: "https://res.cloudinary.com/demo/image/upload/v1/in-use.png" },
        ]),
      )
      .mockReturnValueOnce(q([]))
      .mockReturnValueOnce(q([]))
      .mockReturnValueOnce(q([]));
    dbMock.delete.mockReturnValue(q({ rowCount: 1 }));
    cloudinaryMock.isCloudinaryAdminConfigured.mockReturnValue(true);

    const result = await MediaAssetService.cleanupOrphans();

    expect(result.enabled).toBe(true);
    expect(result.candidates).toBe(1);
    expect(result.deleted).toBe(1);
    expect(cloudinaryMock.deleteAsset).toHaveBeenCalled();
  });

  it("reports skipped binary when admin credentials are absent", async () => {
    dbMock.select
      .mockReturnValueOnce(
        q([assetRow({ id: "old-orphan", publicId: "orphan", createdAt: new Date("2026-01-01") })]),
      )
      .mockReturnValueOnce(q([{ coverVideoUrl: null, avatarUrl: null }]))
      .mockReturnValueOnce(q([]))
      .mockReturnValueOnce(q([]))
      .mockReturnValueOnce(q([]));
    dbMock.delete.mockReturnValue(q({ rowCount: 1 }));
    cloudinaryMock.isCloudinaryAdminConfigured.mockReturnValue(false);

    const result = await MediaAssetService.cleanupOrphans();

    expect(result.deleted).toBe(1);
    expect(result.skippedBinary).toBe(1);
    expect(cloudinaryMock.deleteAsset).not.toHaveBeenCalled();
  });
});
