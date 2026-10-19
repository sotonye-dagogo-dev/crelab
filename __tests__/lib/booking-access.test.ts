import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

import {
  getProviderIdForUser,
  resolveBookingViewer,
  assertProviderActor,
  assertClientActor,
} from "@/lib/booking-access";

/** Stub the `select().from().where().limit()` chain with `rows`. */
function stubProviderLookup(rows: { id: string }[]) {
  dbMock.select.mockReturnValueOnce({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(rows),
      }),
    }),
  });
}

function stubProviderLookupError() {
  dbMock.select.mockImplementationOnce(() => {
    throw new Error("db down");
  });
}

const OWNERSHIP = { clientId: "client-1", providerId: "provider-1" };

describe("booking-access — resolveBookingViewer", () => {
  const ORIGINAL_ENV = process.env.NEXT_PUBLIC_MOCK_DATA;

  beforeEach(() => {
    dbMock.select.mockReset();
    process.env.NEXT_PUBLIC_MOCK_DATA = undefined;
    delete process.env.NEXT_PUBLIC_MOCK_DATA;
    // Fail-closed path logs — keep test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_MOCK_DATA = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  it("ADMIN passes unconditionally", async () => {
    const role = await resolveBookingViewer(OWNERSHIP, { id: "anyone", role: "ADMIN" });
    expect(role).toBe("ADMIN");
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it("the booking's client is CLIENT (no provider lookup needed)", async () => {
    const role = await resolveBookingViewer(OWNERSHIP, { id: "client-1", role: "CLIENT" });
    expect(role).toBe("CLIENT");
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it("the booking's provider is PROVIDER", async () => {
    stubProviderLookup([{ id: "provider-1" }]);
    const role = await resolveBookingViewer(OWNERSHIP, { id: "user-x", role: "PROVIDER" });
    expect(role).toBe("PROVIDER");
  });

  it("a stranger with a different provider row gets null", async () => {
    stubProviderLookup([{ id: "provider-other" }]);
    const role = await resolveBookingViewer(OWNERSHIP, { id: "user-x", role: "PROVIDER" });
    expect(role).toBeNull();
  });

  it("a stranger who is not a provider at all gets null", async () => {
    stubProviderLookup([]);
    const role = await resolveBookingViewer(OWNERSHIP, { id: "user-x", role: "CLIENT" });
    expect(role).toBeNull();
  });

  it("fails CLOSED when the provider lookup throws", async () => {
    stubProviderLookupError();
    const role = await resolveBookingViewer(OWNERSHIP, { id: "user-x", role: "PROVIDER" });
    expect(role).toBeNull();
  });

  it("rejects an empty session id", async () => {
    const role = await resolveBookingViewer(OWNERSHIP, { id: "", role: "CLIENT" });
    expect(role).toBeNull();
  });

  it("mock/demo mode keeps a stranger browsable as CLIENT", async () => {
    process.env.NEXT_PUBLIC_MOCK_DATA = "true";
    stubProviderLookup([]);
    const role = await resolveBookingViewer(OWNERSHIP, { id: "mock-stranger", role: "CLIENT" });
    expect(role).toBe("CLIENT");
  });
});

describe("booking-access — getProviderIdForUser", () => {
  beforeEach(() => {
    dbMock.select.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the provider row id", async () => {
    stubProviderLookup([{ id: "provider-9" }]);
    await expect(getProviderIdForUser("user-9")).resolves.toBe("provider-9");
  });

  it("returns null on db error (never grants a role)", async () => {
    stubProviderLookupError();
    await expect(getProviderIdForUser("user-9")).resolves.toBeNull();
  });

  it("returns null for an empty user id without touching the db", async () => {
    await expect(getProviderIdForUser("")).resolves.toBeNull();
    expect(dbMock.select).not.toHaveBeenCalled();
  });
});

describe("booking-access — actor asserts", () => {
  const ORIGINAL_ENV = process.env.NEXT_PUBLIC_MOCK_DATA;

  beforeEach(() => {
    dbMock.select.mockReset();
    delete process.env.NEXT_PUBLIC_MOCK_DATA;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_MOCK_DATA = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  it("assertProviderActor lets the owner through", async () => {
    stubProviderLookup([{ id: "provider-1" }]);
    await expect(
      assertProviderActor(OWNERSHIP, { id: "user-x", role: "PROVIDER" }),
    ).resolves.toBeUndefined();
  });

  it("assertProviderActor rejects a stranger with the mapped message", async () => {
    stubProviderLookup([{ id: "provider-other" }]);
    await expect(
      assertProviderActor(OWNERSHIP, { id: "user-x", role: "PROVIDER" }),
    ).rejects.toThrow("Only the provider for this booking can do that");
  });

  it("assertProviderActor lets ADMIN through", async () => {
    await expect(
      assertProviderActor(OWNERSHIP, { id: "admin-1", role: "ADMIN" }),
    ).resolves.toBeUndefined();
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it("assertClientActor rejects a non-client", () => {
    expect(() =>
      assertClientActor(OWNERSHIP, { id: "user-x", role: "CLIENT" }),
    ).toThrow("Only the client for this booking can do that");
  });

  it("assertClientActor lets the client and ADMIN through", () => {
    expect(() =>
      assertClientActor(OWNERSHIP, { id: "client-1", role: "CLIENT" }),
    ).not.toThrow();
    expect(() =>
      assertClientActor(OWNERSHIP, { id: "admin-1", role: "ADMIN" }),
    ).not.toThrow();
  });

  it("both asserts reject an empty session", async () => {
    expect(() => assertClientActor(OWNERSHIP, { id: "", role: "CLIENT" })).toThrow(
      "Unauthorized",
    );
    await expect(
      assertProviderActor(OWNERSHIP, { id: "", role: "PROVIDER" }),
    ).rejects.toThrow("Unauthorized");
  });
});
