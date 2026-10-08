import { describe, it, expect } from "vitest";
import { buildVerifyUrl } from "@/lib/verify-email";
import { WIRED_EMAIL_TEMPLATES, isWiredEmailTemplate, resolveEmailTemplate } from "@/lib/email-templates";
import { DEFAULT_CONFIG } from "@/config/platform.config";

describe("buildVerifyUrl", () => {
  it("carries the token alone (no done=1) so the page verifies on load", () => {
    const url = buildVerifyUrl("abc-123");
    expect(url).toContain("/verify-email?token=abc-123");
    expect(url).not.toContain("done=1");
  });

  it("encodes token characters", () => {
    expect(buildVerifyUrl("a/b?c=d")).toContain(`token=${encodeURIComponent("a/b?c=d")}`);
  });
});

describe("bugReportReceived wired template", () => {
  it("is registered as wired (preview/simulate-only, editable)", () => {
    expect(isWiredEmailTemplate("bugReportReceived")).toBe(true);
    expect(WIRED_EMAIL_TEMPLATES).toHaveProperty("bugReportReceived");
  });

  it("ships a default template that resolves even with an empty DB config", () => {
    const tpl = resolveEmailTemplate({ emailConfig: { fromName: "", fromEmail: "", templates: {} } }, "bugReportReceived");
    expect(tpl).toBeDefined();
    expect(tpl?.enabled).toBe(true);
    expect(tpl?.subject).toContain("{{reportTitle}}");
  });

  it("DB customisations win over the default", () => {
    const tpl = resolveEmailTemplate(
      {
        emailConfig: {
          fromName: "",
          fromEmail: "",
          templates: {
            bugReportReceived: { subject: "Custom", bodyHtml: "<p>x</p>", enabled: false },
          },
        },
      },
      "bugReportReceived",
    );
    expect(tpl?.subject).toBe("Custom");
    expect(tpl?.enabled).toBe(false);
  });
});

describe("emailVerification config defaults", () => {
  it("banner is on by default (non-breaking nudge, no hard gate)", () => {
    expect(DEFAULT_CONFIG.emailVerification?.bannerEnabled).toBe(true);
  });
});
