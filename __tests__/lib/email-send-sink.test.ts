import { describe, it, expect } from "vitest";
import {
  runWithEmailSendSink,
  getEmailSendSink,
} from "@/lib/email-send-sink";

describe("lib/email-send-sink — request-scoped email outcome capture", () => {
  it("returns no result when no email send happened", async () => {
    const { result } = await runWithEmailSendSink(() => Promise.resolve(42));
    expect(result).toBeUndefined();
  });

  it("captures the last email result pushed during the wrapped call", async () => {
    const { result } = await runWithEmailSendSink(async () => {
      const sink = getEmailSendSink();
      expect(sink).toBeDefined();
      sink?.results.push({ sent: true });
      sink?.results.push({ sent: false, reason: "resend_api_error", error: "403" });
    });
    expect(result).toEqual({
      sent: false,
      reason: "resend_api_error",
      error: "403",
    });
  });

  it("sinks are isolated per call — no cross-request leakage", async () => {
    await runWithEmailSendSink(async () => {
      getEmailSendSink()?.results.push({ sent: true });
    });
    // A second run starts with an empty sink.
    const { result } = await runWithEmailSendSink(async () => {
      getEmailSendSink()?.results.push({ sent: false, reason: "network_error" });
    });
    expect(result).toEqual({ sent: false, reason: "network_error" });
  });
});