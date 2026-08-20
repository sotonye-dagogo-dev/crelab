import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => {
  let probeFails = false;
  let orderByFails = 0; // number of orderBy calls to reject (0 = never)
  let rows: unknown[] = [];

  const chain: {
    from: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    orderBy: ReturnType<typeof vi.fn>;
  } = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    orderBy: vi.fn(),
  };

  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.limit.mockImplementation(() =>
    probeFails
      ? Promise.reject(new Error('relation "blog_posts" does not exist'))
      : Promise.resolve(rows.slice(0, 1)),
  );
  chain.orderBy.mockImplementation(() => {
    if (orderByFails > 0) {
      orderByFails -= 1;
      return Promise.reject(new Error('column "blog_posts.created_at" does not exist'));
    }
    return Promise.resolve(rows);
  });

  return {
    mockDb: {
      chain,
      setProbeFails(v: boolean) {
        probeFails = v;
      },
      setOrderByFails(n: number) {
        orderByFails = n;
      },
      setRows(r: unknown[]) {
        rows = r;
      },
    },
  };
});

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn(() => mockDb.chain) },
}));

import { BlogPostService } from "@/services/BlogPostService";
import { getFallbackPosts } from "@/lib/blog-fallback";

beforeEach(() => {
  mockDb.setProbeFails(false);
  mockDb.setOrderByFails(0);
  mockDb.setRows([]);
});

const blogRow = {
  id: "row-1",
  title: "A Real Post",
  slug: "a-real-post",
  content: [],
  metaDescription: "meta",
  heroImageUrl: null,
  category: "pricing",
  tags: [],
  author: "Crelab Editorial",
  publishedAt: "2026-08-01T00:00:00Z",
  published: true,
  spotlightProviderSlug: null,
};

describe("services/BlogPostService — adminList resilience", () => {
  it("returns fallback posts when the DB is unavailable", async () => {
    mockDb.setProbeFails(true);
    const posts = await BlogPostService.adminList();
    expect(posts).toHaveLength(getFallbackPosts().length);
  });

  it("returns mapped DB rows when the normal query succeeds", async () => {
    mockDb.setRows([blogRow]);
    const posts = await BlogPostService.adminList();
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe("A Real Post");
    expect(posts[0].slug.current).toBe("a-real-post");
  });

  it("falls back to another ordering instead of erroring when created_at ordering fails", async () => {
    mockDb.setRows([blogRow]);
    mockDb.setOrderByFails(1);
    const posts = await BlogPostService.adminList();
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe("A Real Post");
  });

  it("returns fallback posts when every DB ordering fails", async () => {
    mockDb.setRows([blogRow]);
    mockDb.setOrderByFails(99);
    const posts = await BlogPostService.adminList();
    expect(posts).toHaveLength(getFallbackPosts().length);
  });
});