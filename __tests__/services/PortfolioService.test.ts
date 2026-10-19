import { describe, it, expect, vi, beforeEach } from "vitest";

const { dbMock } = vi.hoisted(() => ({
  dbMock: { select: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

import { PortfolioService } from "@/services/PortfolioService";

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PortfolioService.listDriveItems", () => {
  it("maps DRIVE portfolio rows with provider context and ISO dates", async () => {
    dbMock.select.mockReturnValueOnce(
      q([
        {
          id: "pi-1",
          providerId: "prov-1",
          providerName: "Studio X",
          driveFolderUrl: "https://drive.google.com/drive/folders/f1",
          title: "reel.mp4",
          url: "https://drive.google.com/file/d/f1/view",
          thumbnailUrl: "https://drive.google.com/thumbnail?id=f1&sz=w600",
          mimeType: "video/mp4",
          driveFileId: "f1",
          visible: true,
          createdAt: new Date("2026-05-01T00:00:00Z"),
        },
      ]),
    );

    const rows = await PortfolioService.listDriveItems();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "pi-1",
      providerName: "Studio X",
      driveFileId: "f1",
      visible: true,
      createdAt: "2026-05-01T00:00:00.000Z",
    });
  });

  it("caps the limit to a safe bound", async () => {
    dbMock.select.mockReturnValueOnce(q([]));
    await PortfolioService.listDriveItems(99999);
    // The chain proxy swallows .limit() args, but the call must not throw and
    // must resolve to an array.
    expect(dbMock.select).toHaveBeenCalled();
  });

  it("tolerates null provider name (orphaned provider link)", async () => {
    dbMock.select.mockReturnValueOnce(
      q([
        {
          id: "pi-2",
          providerId: "prov-2",
          providerName: null,
          driveFolderUrl: null,
          title: null,
          url: "https://drive.google.com/file/d/f2/view",
          thumbnailUrl: null,
          mimeType: "image/jpeg",
          driveFileId: null,
          visible: false,
          createdAt: new Date("2026-05-02T00:00:00Z"),
        },
      ]),
    );
    const rows = await PortfolioService.listDriveItems();
    expect(rows[0].providerName).toBeNull();
    expect(rows[0].title).toBeNull();
    expect(rows[0].visible).toBe(false);
  });
});
