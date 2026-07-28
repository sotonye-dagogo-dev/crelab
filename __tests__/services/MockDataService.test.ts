import { describe, it, expect, beforeEach } from "vitest";

describe("MockDataService", () => {
  const ORIGINAL_ENV = process.env.NEXT_PUBLIC_MOCK_DATA;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_MOCK_DATA = "true";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_MOCK_DATA = ORIGINAL_ENV;
  });

  it("isEnabled returns true when env is 'true'", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    expect(MockDataService.isEnabled()).toBe(true);
  });

  it("isEnabled returns false when env is not 'true'", async () => {
    process.env.NEXT_PUBLIC_MOCK_DATA = "false";
    const { MockDataService } = await import("@/services/MockDataService");
    expect(MockDataService.isEnabled()).toBe(false);
  });

  it("getTeamMembers returns 6 members when enabled", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const members = MockDataService.getTeamMembers();
    expect(members).toHaveLength(6);
    expect(members[0]).toHaveProperty("name");
    expect(members[0]).toHaveProperty("role");
    expect(members[0]).toHaveProperty("bio");
  });

  it("getTeamMembers returns empty array when disabled", async () => {
    process.env.NEXT_PUBLIC_MOCK_DATA = "false";
    const { MockDataService } = await import("@/services/MockDataService");
    expect(MockDataService.getTeamMembers()).toEqual([]);
  });

  it("getExploreProviders returns 6 providers", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const providers = MockDataService.getExploreProviders();
    expect(providers).toHaveLength(6);
    expect(providers[0]).toHaveProperty("slug");
    expect(providers[0]).toHaveProperty("displayName");
    expect(providers[0]).toHaveProperty("rating");
    expect(providers[0]).toHaveProperty("packagePriceFromKobo");
  });

  it("getExploreProviders includes all expected slugs", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const slugs = MockDataService.getExploreProviders().map((p) => p.slug);
    expect(slugs).toContain("amara-studios");
    expect(slugs).toContain("lens-and-light");
    expect(slugs).toContain("kelechi-media");
    expect(slugs).toContain("tunde-films");
    expect(slugs).toContain("zara-creative");
    expect(slugs).toContain("lens-collective");
  });

  it("getMockProviders returns 3 providers", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const providers = MockDataService.getMockProviders();
    expect(providers).toHaveLength(3);
    expect(providers[0]).toHaveProperty("displayName");
    expect(providers[0]).toHaveProperty("bio");
    expect(providers[0]).toHaveProperty("categorySlug");
  });

  it("getMockProviderBySlug matches explore card slug", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const provider = MockDataService.getMockProviderBySlug("amara-studios");
    expect(provider).not.toBeNull();
    expect(provider!.id).toBe("mock-provider-1");
    expect(provider!.displayName).toBe("Amara Studios");
  });

  it("getMockProviderBySlug returns null for unknown slug", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    expect(MockDataService.getMockProviderBySlug("unknown-slug")).toBeNull();
  });

  it("getMockProviderBySlug returns null when disabled", async () => {
    process.env.NEXT_PUBLIC_MOCK_DATA = "false";
    const { MockDataService } = await import("@/services/MockDataService");
    expect(MockDataService.getMockProviderBySlug("amara-studios")).toBeNull();
  });

  it("getMockServicePackages returns packages for known providers", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const packages = MockDataService.getMockServicePackages("mock-provider-1");
    expect(packages).toHaveLength(3);
    expect(packages[0]).toHaveProperty("tier");
    expect(packages[0]).toHaveProperty("price");
    expect(packages[0]).toHaveProperty("deliverables");
  });

  it("getMockServicePackages returns empty for unknown provider", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    expect(MockDataService.getMockServicePackages("unknown")).toEqual([]);
  });

  it("getMockPortfolioItems returns items for known providers", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const items = MockDataService.getMockPortfolioItems("mock-provider-1");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveProperty("title");
    expect(items[0]).toHaveProperty("mimeType");
  });

  it("getMockPortfolioItems returns empty for unknown provider", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    expect(MockDataService.getMockPortfolioItems("unknown")).toEqual([]);
  });

  it("getMockBookings returns 4 bookings in various states", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const bookings = MockDataService.getMockBookings();
    expect(bookings).toHaveLength(4);
    const states = bookings.map((b) => b.status);
    expect(states).toContain("HELD");
    expect(states).toContain("IN_PROGRESS");
    expect(states).toContain("REQUESTED");
    expect(states).toContain("RELEASED");
  });

  it("getMockReviews returns 3 reviews", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const reviews = MockDataService.getMockReviews();
    expect(reviews).toHaveLength(3);
    expect(reviews[0]).toHaveProperty("rating");
    expect(reviews[0]).toHaveProperty("body");
  });

  it("getMockReviewsForProvider returns filtered reviews", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const reviews = MockDataService.getMockReviewsForProvider("mock-provider-1");
    expect(reviews).toHaveLength(2);
    expect(reviews.every((r) => r.providerId === "mock-provider-1")).toBe(true);
  });

  it("getMockReviewsForProvider returns empty for unknown provider", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    expect(MockDataService.getMockReviewsForProvider("unknown")).toEqual([]);
  });

  it("getMockWorkHistoryForProvider returns released bookings", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const history = MockDataService.getMockWorkHistoryForProvider("mock-provider-1");
    expect(history).toHaveLength(1);
    expect(history[0]).toHaveProperty("title");
    expect(history[0]).toHaveProperty("clientName");
  });

  it("getMockWorkHistoryForProvider returns empty for provider with no released bookings", async () => {
    const { MockDataService } = await import("@/services/MockDataService");
    const history = MockDataService.getMockWorkHistoryForProvider("mock-provider-3");
    expect(history).toEqual([]);
  });
});