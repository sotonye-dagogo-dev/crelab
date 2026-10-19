import { describe, it, expect } from "vitest";
import { sixHourBucket } from "@/services/JobQueueService";

describe("JobQueueService — six-hour bucket dedupe keys", () => {
  it("maps timestamps within the same 6h UTC window to the same bucket", () => {
    const a = new Date("2026-10-19T01:00:00Z");
    const b = new Date("2026-10-19T05:59:00Z");
    expect(sixHourBucket(a)).toBe(sixHourBucket(b));
  });

  it("maps timestamps in different 6h windows to different buckets", () => {
    const a = new Date("2026-10-19T01:00:00Z");
    const b = new Date("2026-10-19T07:00:00Z");
    expect(sixHourBucket(a)).not.toBe(sixHourBucket(b));
  });

  it("is deterministic for the same instant", () => {
    const t = new Date("2026-10-19T13:37:00Z");
    expect(sixHourBucket(t)).toBe(sixHourBucket(new Date(t.getTime())));
  });
});
