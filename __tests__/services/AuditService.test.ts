import { describe, it, expect, vi, beforeEach } from "vitest";

const { dbMock, insertValues } = vi.hoisted(() => {
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn(() => ({ values: insertValues }));
  const select = vi.fn();
  return { dbMock: { insert, select }, insertValues };
});

vi.mock("@/lib/db", () => ({ db: dbMock }));

import { AuditService } from "@/services/AuditService";

describe("services/AuditService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("log() inserts a row with id, actor and captured values", async () => {
    await AuditService.log({
      userId: "admin-1",
      action: "team.create",
      entity: "team",
      entityId: "member-1",
      newValue: { name: "Ada" },
    });

    expect(dbMock.insert).toHaveBeenCalledTimes(1);
    const values = insertValues.mock.calls[0][0];
    expect(values).toEqual(
      expect.objectContaining({
        userId: "admin-1",
        action: "team.create",
        entity: "team",
        entityId: "member-1",
        newValue: { name: "Ada" },
        oldValue: null,
      }),
    );
    expect(values.id).toBeTypeOf("string");
  });

  it("log() defaults optional fields to null", async () => {
    await AuditService.log({ userId: null, action: "media.cleanup" });
    const values = insertValues.mock.calls[0][0];
    expect(values.entity).toBeNull();
    expect(values.entityId).toBeNull();
    expect(values.oldValue).toBeNull();
    expect(values.newValue).toBeNull();
  });

  it("list() joins the actor user and returns ISO dates", async () => {
    const offset = vi.fn().mockResolvedValue([
      {
        id: "log-1",
        userId: "admin-1",
        actorName: "Ada",
        actorEmail: "ada@crelab.com",
        action: "config.update",
        entity: "feeRate",
        entityId: null,
        oldValue: 0.04,
        newValue: 0.05,
        createdAt: new Date("2026-08-19T10:00:00.000Z"),
      },
    ]);
    dbMock.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({ limit: vi.fn(() => ({ offset })) })),
          })),
        })),
      })),
    });

    const rows = await AuditService.list({ action: "config.update", limit: 25, offset: 0 });

    expect(rows).toHaveLength(1);
    expect(rows[0].actorName).toBe("Ada");
    expect(rows[0].createdAt).toBe("2026-08-19T10:00:00.000Z");
  });

  it("count() counts matching rows", async () => {
    dbMock.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{}, {}, {}]),
      })),
    });

    const total = await AuditService.count();
    expect(total).toBe(3);
  });
});