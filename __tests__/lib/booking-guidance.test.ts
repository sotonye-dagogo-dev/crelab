import { describe, it, expect } from "vitest";
import {
  bookingNextStep,
  resolveBookingGuidance,
} from "@/lib/booking-guidance";

const ALL_STATUSES = [
  "REQUESTED",
  "ACCEPTED",
  "DECLINED",
  "CANCELLED",
  "HELD",
  "IN_PROGRESS",
  "RELEASED",
  "DISPUTED",
  "REFUNDED",
] as const;
const SIDES = ["client", "provider"] as const;

describe("lib/booking-guidance — bookingNextStep (exhaustive)", () => {
  it("returns non-null guidance for every status/side that lacks a panel, and null for those that have one", () => {
    // The banner must NEVER duplicate a bespoke action panel — these are the
    // exact states/sides BookingDetailClient renders a panel for.
    const panelStates = new Set([
      "REQUESTED:client",
      "REQUESTED:provider",
      "ACCEPTED:client",
      "ACCEPTED:provider",
      "HELD:provider",
      "DECLINED:client",
      "CANCELLED:client",
      "DISPUTED:client",
      "DISPUTED:provider",
    ]);

    for (const status of ALL_STATUSES) {
      for (const side of SIDES) {
        const guidance = bookingNextStep(status, side);
        const key = `${status}:${side}`;
        if (panelStates.has(key)) {
          expect(guidance, `${key} should be null (panel exists)`).toBeNull();
        } else {
          expect(guidance, `${key} should have guidance`).not.toBeNull();
          expect(guidance!.title.length).toBeGreaterThan(0);
          expect(guidance!.description.length).toBeGreaterThan(20);
          expect(["info", "success", "warning"]).toContain(guidance!.tone);
        }
      }
    }
  });

  it("returns null for an unknown status (never guess on money-adjacent copy)", () => {
    expect(bookingNextStep("WEIRD_STATE", "client")).toBeNull();
    expect(bookingNextStep("", "provider")).toBeNull();
  });

  it("names the counterparty when names are provided", () => {
    const g = bookingNextStep("HELD", "client", { providerName: "Amara Studios" });
    expect(g!.description).toContain("Amara Studios");
  });

  it("falls back to role nouns when names are missing", () => {
    const g = bookingNextStep("IN_PROGRESS", "provider");
    expect(g!.description).toContain("The client");
  });

  it("RELEASED:client tells the client the booking is complete", () => {
    const g = bookingNextStep("RELEASED", "client")!;
    expect(g.tone).toBe("success");
    expect(g.title.toLowerCase()).toContain("released");
  });

  it("REFUNDED:provider explains no payout will be made", () => {
    const g = bookingNextStep("REFUNDED", "provider")!;
    expect(g.description.toLowerCase()).toContain("no payout");
    expect(g.tone).toBe("warning");
  });

  it("DECLINED:provider and CANCELLED:provider are closing notes, not action items", () => {
    for (const status of ["DECLINED", "CANCELLED"] as const) {
      const g = bookingNextStep(status, "provider")!;
      expect(g.description.toLowerCase()).toContain("closed");
      expect(g.cta).toBeUndefined();
    }
  });
});

describe("lib/booking-guidance — resolveBookingGuidance (config-aware)", () => {
  const emptyConfig = { bookingFlow: undefined };
  const enabledConfig = { bookingFlow: { enabled: true, copy: {} } };

  it("returns guidance when the config block is absent (older/partial rows)", () => {
    expect(resolveBookingGuidance("HELD", "client", emptyConfig)).not.toBeNull();
  });

  it("returns null when the master toggle is off", () => {
    const config = { bookingFlow: { enabled: false } };
    expect(resolveBookingGuidance("HELD", "client", config)).toBeNull();
  });

  it("applies a ${status}:${side} copy override (description only)", () => {
    const config = {
      bookingFlow: { enabled: true, copy: { "HELD:client": "Custom escrow copy here." } },
    };
    const g = resolveBookingGuidance("HELD", "client", config)!;
    expect(g.description).toBe("Custom escrow copy here.");
    expect(g.title.length).toBeGreaterThan(0); // title stays curated
  });

  it("an empty-string override HIDES that state's banner", () => {
    const config = { bookingFlow: { enabled: true, copy: { "HELD:client": "" } } };
    expect(resolveBookingGuidance("HELD", "client", config)).toBeNull();
  });

  it("ignores overrides for states that return null anyway (panel exists)", () => {
    const config = {
      bookingFlow: { enabled: true, copy: { "REQUESTED:client": "Should never render" } },
    };
    expect(resolveBookingGuidance("REQUESTED", "client", config)).toBeNull();
  });

  it("enabled config with no override returns the built-in default", () => {
    const g = resolveBookingGuidance("IN_PROGRESS", "provider", enabledConfig)!;
    expect(g.description.length).toBeGreaterThan(20);
  });
});
