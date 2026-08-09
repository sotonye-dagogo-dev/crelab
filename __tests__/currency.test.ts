import { describe, it, expect } from "vitest";
import { nairaToKobo, formatNaira, formatKobo } from "@/lib/currency";

describe("lib/currency — nairaToKobo", () => {
  it("converts naira to kobo", () => {
    expect(nairaToKobo(75000)).toBe(7500000);
    expect(nairaToKobo(150000)).toBe(15000000);
    expect(nairaToKobo(250000)).toBe(25000000);
  });

  it("handles decimal input with rounding", () => {
    expect(nairaToKobo(75.5)).toBe(7550);
    expect(nairaToKobo(0.1)).toBe(10);
  });
});

describe("lib/currency — formatNaira", () => {
  it("formats with thousands separators and naira symbol", () => {
    expect(formatNaira(75000)).toBe("₦75,000");
    expect(formatNaira(150000)).toBe("₦150,000");
    expect(formatNaira(2500000)).toBe("₦2,500,000");
  });
});

describe("lib/currency — formatKobo", () => {
  it("divides kobo by 100 for display", () => {
    expect(formatKobo(7500000)).toBe("₦75,000");
    expect(formatKobo(15000000)).toBe("₦150,000");
    expect(formatKobo(25000000)).toBe("₦250,000");
  });

  it("formats a stored 75k package as ₦75,000 not ₦7,500,000", () => {
    expect(formatKobo(7500000)).not.toBe("₦7,500,000");
  });
});
