import { describe, it, expect } from "vitest";
import {
  normalizeReferralCode,
  resolveClaimCode,
} from "@/lib/referral-cookie";

describe("resolveClaimCode — claim carrier resolution", () => {
  it("prefers the cookie carrier when both are well-formed", () => {
    expect(resolveClaimCode("COOK1E01", "BODY0001")).toBe("COOK1E01");
  });

  it("falls back to the body code when the cookie is missing", () => {
    expect(resolveClaimCode(null, "BODY0001")).toBe("BODY0001");
    expect(resolveClaimCode(undefined, "BODY0001")).toBe("BODY0001");
  });

  it("falls back to the body code when the cookie value is malformed", () => {
    expect(resolveClaimCode("!!!", "BODY0001")).toBe("BODY0001");
    expect(resolveClaimCode("abc", "BODY0001")).toBe("BODY0001");
  });

  it("returns null when neither carrier holds a well-formed code", () => {
    expect(resolveClaimCode(null, null)).toBeNull();
    expect(resolveClaimCode("!!!", "bad code!")).toBeNull();
    expect(resolveClaimCode(undefined, undefined)).toBeNull();
  });

  it("rejects attacker-controlled values on both carriers", () => {
    expect(normalizeReferralCode("<script>")).toBeNull();
    expect(resolveClaimCode("<script>", "DROP; TABLE")).toBeNull();
  });
});
