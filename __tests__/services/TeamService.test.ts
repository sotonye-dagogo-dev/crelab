import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSelect } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect },
}));

import { normalizeSocialLinks, serializeTeamMember, TeamService } from "@/services/TeamService";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "m-1",
    name: "Ada Okafor",
    role: "Engineer",
    bio: "Bio",
    avatarUrl: null,
    socialLinks: [],
    orderIndex: 0,
    active: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  } as Parameters<typeof serializeTeamMember>[0];
}

function chain(result: unknown[]) {
  // db.select().from().where().orderBy() — orderBy resolves to the rows
  const orderBy = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ orderBy });
  const from = vi.fn().mockReturnValue({ where });
  mockSelect.mockReturnValue({ from });
  return { from, where, orderBy };
}

beforeEach(() => {
  mockSelect.mockReset();
});

describe("TeamService.normalizeSocialLinks", () => {
  it("passes valid array links through", () => {
    expect(
      normalizeSocialLinks([{ platform: "X", url: "https://x.com" }]),
    ).toEqual([{ platform: "X", url: "https://x.com" }]);
  });

  it("parses legacy JSON-stringified links", () => {
    const stored = JSON.stringify([{ platform: "LinkedIn", url: "https://linkedin.com" }]);
    expect(normalizeSocialLinks(stored)).toEqual([
      { platform: "LinkedIn", url: "https://linkedin.com" },
    ]);
  });

  it("drops malformed entries and returns [] for null/garbage", () => {
    expect(
      normalizeSocialLinks([
        { platform: "X", url: "https://x.com" },
        { platform: "", url: "https://x.com" },
        { platform: "X", url: "" },
        null,
        "nope",
      ]),
    ).toEqual([{ platform: "X", url: "https://x.com" }]);
    expect(normalizeSocialLinks(null)).toEqual([]);
    expect(normalizeSocialLinks(undefined)).toEqual([]);
    expect(normalizeSocialLinks("not-json{{")).toEqual([]);
  });
});

describe("TeamService.serializeTeamMember", () => {
  it("normalises links and ISO dates", () => {
    const member = serializeTeamMember(
      row({ socialLinks: JSON.stringify([{ platform: "X", url: "https://x.com" }]) }),
    );
    expect(member.socialLinks).toEqual([{ platform: "X", url: "https://x.com" }]);
    expect(member.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("TeamService.listPublic", () => {
  it("returns serialised rows from the DB", async () => {
    chain([row(), row({ id: "m-2", orderIndex: 1 })]);
    const members = await TeamService.listPublic();
    expect(members).toHaveLength(2);
    expect(members[0].id).toBe("m-1");
    expect(members[0].socialLinks).toEqual([]);
  });

  it("propagates DB errors so callers can fall back", async () => {
    mockSelect.mockImplementation(() => {
      throw new Error("db down");
    });
    await expect(TeamService.listPublic()).rejects.toThrow("db down");
  });
});
