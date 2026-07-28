import { describe, it, expect } from "vitest";
import { InsufficientBalanceError, MilestoneAmountMismatchError, MilestoneLimitError, MilestoneMinimumError, WebhookSignatureError, DuplicateWebhookError } from "@/lib/errors";

describe("lib/errors — Business error classes", () => {
  it("InsufficientBalanceError has correct defaults", () => {
    const err = new InsufficientBalanceError();
    expect(err.name).toBe("InsufficientBalanceError");
    expect(err.status).toBe(400);
    expect(err.code).toBe("INSUFFICIENT_BALANCE");
    expect(err.message).toBe("Insufficient wallet balance");
  });

  it("InsufficientBalanceError accepts custom message", () => {
    const err = new InsufficientBalanceError("custom");
    expect(err.message).toBe("custom");
  });

  it("MilestoneAmountMismatchError has correct defaults", () => {
    const err = new MilestoneAmountMismatchError();
    expect(err.name).toBe("MilestoneAmountMismatchError");
    expect(err.status).toBe(400);
    expect(err.code).toBe("MILESTONE_AMOUNT_MISMATCH");
  });

  it("MilestoneLimitError has correct defaults", () => {
    const err = new MilestoneLimitError();
    expect(err.name).toBe("MilestoneLimitError");
    expect(err.status).toBe(400);
    expect(err.code).toBe("MILESTONE_LIMIT_EXCEEDED");
    expect(err.message).toBe("Maximum 5 milestones per booking");
  });

  it("MilestoneMinimumError has correct defaults", () => {
    const err = new MilestoneMinimumError();
    expect(err.name).toBe("MilestoneMinimumError");
    expect(err.status).toBe(400);
    expect(err.code).toBe("MILESTONE_MINIMUM_REQUIRED");
    expect(err.message).toBe("Minimum 2 milestones required");
  });

  it("WebhookSignatureError has correct defaults", () => {
    const err = new WebhookSignatureError();
    expect(err.name).toBe("WebhookSignatureError");
    expect(err.status).toBe(401);
    expect(err.code).toBe("INVALID_WEBHOOK_SIGNATURE");
  });

  it("DuplicateWebhookError has correct defaults", () => {
    const err = new DuplicateWebhookError();
    expect(err.name).toBe("DuplicateWebhookError");
    expect(err.status).toBe(200);
    expect(err.code).toBe("DUPLICATE_WEBHOOK");
  });

  it("all error classes are instanceof Error", () => {
    expect(new InsufficientBalanceError()).toBeInstanceOf(Error);
    expect(new MilestoneAmountMismatchError()).toBeInstanceOf(Error);
    expect(new MilestoneLimitError()).toBeInstanceOf(Error);
    expect(new MilestoneMinimumError()).toBeInstanceOf(Error);
    expect(new WebhookSignatureError()).toBeInstanceOf(Error);
    expect(new DuplicateWebhookError()).toBeInstanceOf(Error);
  });
});