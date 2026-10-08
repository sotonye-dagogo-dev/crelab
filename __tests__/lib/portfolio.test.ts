import { describe, it, expect } from "vitest";
import {
  buildCoverFallbackItem,
  withCoverFallback,
  coverMimeType,
  isImageCoverUrl,
  dedupePortfolioItems,
} from "@/lib/portfolio";
import { PortfolioItemSource, type IPortfolioItem } from "@/types";

function item(overrides: Partial<IPortfolioItem> = {}): IPortfolioItem {
  return {
    id: "item-1",
    providerId: "prov-1",
    source: PortfolioItemSource.DIRECT,
    url: "https://cdn.example/work.mp4",
    thumbnailUrl: null,
    title: "Work",
    caption: null,
    driveFileId: null,
    mimeType: "video/mp4",
    orderIndex: 0,
    visible: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    ...overrides,
  };
}

describe("lib/portfolio — cover fallback (video/photo in, avatar never)", () => {
  it("detects image vs video covers", () => {
    expect(isImageCoverUrl("https://cdn.example/cover.jpg")).toBe(true);
    expect(isImageCoverUrl("https://cdn.example/cover.PNG?w=1")).toBe(true);
    expect(isImageCoverUrl("https://cdn.example/reel.mp4")).toBe(false);
    expect(isImageCoverUrl("https://res.cloudinary.com/d/video/upload/v1/reel")).toBe(false);
  });

  it("guesses mime types for covers", () => {
    expect(coverMimeType("https://cdn.example/c.png")).toBe("image/png");
    expect(coverMimeType("https://cdn.example/c.jpg")).toBe("image/jpeg");
    expect(coverMimeType("https://cdn.example/r.mp4")).toBe("video/mp4");
    expect(coverMimeType("https://res.cloudinary.com/d/video/upload/v1/reel")).toBe("video/mp4");
    expect(coverMimeType("https://res.cloudinary.com/d/image/upload/v1/photo")).toBe("image/jpeg");
  });

  it("builds a deterministic synthetic item for a video cover", () => {
    const a = buildCoverFallbackItem("prov-1", "https://cdn.example/cover.mp4", "https://cdn.example/cover.jpg");
    expect(a.id).toBe("cover-prov-1");
    expect(a.providerId).toBe("prov-1");
    expect(a.url).toBe("https://cdn.example/cover.mp4");
    expect(a.thumbnailUrl).toBe("https://cdn.example/cover.jpg");
    expect(a.mimeType).toBe("video/mp4");
    expect(a.visible).toBe(true);
    expect(a.orderIndex).toBe(-1);
  });

  it("uses the cover itself as thumbnail for photo covers", () => {
    const a = buildCoverFallbackItem("prov-1", "https://cdn.example/cover.jpg");
    expect(a.thumbnailUrl).toBe("https://cdn.example/cover.jpg");
    expect(a.mimeType).toBe("image/jpeg");
  });

  it("prepends the cover when missing from the portfolio", () => {
    const merged = withCoverFallback([item()], "prov-1", "https://cdn.example/cover.mp4", "https://cdn.example/cover.jpg");
    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe("cover-prov-1");
    expect(merged[1].id).toBe("item-1");
  });

  it("is a no-op when the cover is blank", () => {
    const list = [item()];
    expect(withCoverFallback(list, "prov-1", null)).toBe(list);
    expect(withCoverFallback(list, "prov-1", "  ")).toBe(list);
  });

  it("is a no-op when the cover already exists as a portfolio item", () => {
    const list = [item({ url: "https://cdn.example/cover.mp4" })];
    const merged = withCoverFallback(list, "prov-1", "https://CDN.example/cover.mp4");
    expect(merged).toBe(list);
  });

  it("never duplicates after dedupe (cover idempotent by URL)", () => {
    const merged = withCoverFallback([item()], "prov-1", "https://cdn.example/cover.mp4");
    const again = withCoverFallback(merged, "prov-1", "https://cdn.example/cover.mp4");
    expect(dedupePortfolioItems(again)).toHaveLength(2);
  });
});
