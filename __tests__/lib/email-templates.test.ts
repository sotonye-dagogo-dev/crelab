import { describe, it, expect } from "vitest";
import {
  WIRED_EMAIL_TEMPLATES,
  isWiredEmailTemplate,
  resolveEmailTemplates,
  resolveEmailTemplate,
  resolveEmailConfig,
} from "@/lib/email-templates";
import { DEFAULT_CONFIG } from "@/config/platform.config";

describe("lib/email-templates — wired email templates", () => {
  it("marks the code-triggered transactional emails as wired", () => {
    expect(isWiredEmailTemplate("welcome")).toBe(true);
    expect(isWiredEmailTemplate("verifyEmail")).toBe(true);
    expect(isWiredEmailTemplate("emailChanged")).toBe(true);
    expect(isWiredEmailTemplate("passwordReset")).toBe(true);
    expect(isWiredEmailTemplate("bookingConfirmation")).toBe(true);
    expect(isWiredEmailTemplate("paymentReceived")).toBe(true);
  });

  it("treats admin-created templates as non-wired", () => {
    expect(isWiredEmailTemplate("customPromo")).toBe(false);
    expect(isWiredEmailTemplate("summerSale2026")).toBe(false);
    expect(isWiredEmailTemplate("")).toBe(false);
  });

  it("exposes a trigger description for every wired template", () => {
    for (const [key, meta] of Object.entries(WIRED_EMAIL_TEMPLATES)) {
      expect(meta.label, `label missing for ${key}`).toBeTruthy();
      expect(meta.trigger, `trigger missing for ${key}`).toContain("when");
    }
  });

  it("contains every template key used by the EmailService send methods", () => {
    expect(WIRED_EMAIL_TEMPLATES).toHaveProperty("welcome");
    expect(WIRED_EMAIL_TEMPLATES).toHaveProperty("verifyEmail");
    expect(WIRED_EMAIL_TEMPLATES).toHaveProperty("emailChanged");
    expect(WIRED_EMAIL_TEMPLATES).toHaveProperty("bookingConfirmation");
    expect(WIRED_EMAIL_TEMPLATES).toHaveProperty("paymentReceived");
    expect(WIRED_EMAIL_TEMPLATES).toHaveProperty("passwordReset");
  });

  it("has a passwordReset template configured as a wired default", async () => {
    const { DEFAULT_CONFIG } = await import("@/config/platform.config");
    expect(DEFAULT_CONFIG.emailConfig?.templates).toHaveProperty("passwordReset");
    expect(DEFAULT_CONFIG.emailConfig?.templates?.passwordReset?.enabled).toBe(true);
  });
});

describe("lib/email-templates — template resolution fallbacks", () => {
  it("keeps hardcoded defaults for templates not saved into the config/DB", () => {
    // Simulate a DB config that was saved before verifyEmail existed in code.
    const partial = {
      emailConfig: {
        fromName: "Crellab",
        fromEmail: "hello@mail.crellab.com",
        templates: {
          welcome: DEFAULT_CONFIG.emailConfig!.templates.welcome,
        },
      },
    };
    const templates = resolveEmailTemplates(partial);
    expect(templates.verifyEmail).toBeDefined();
    expect(templates.verifyEmail?.enabled).toBe(true);
    expect(templates.welcome).toBeDefined();
  });

  it("lets DB/config values win over hardcoded defaults", () => {
    const partial = {
      emailConfig: {
        fromName: "Crellab",
        fromEmail: "hello@mail.crellab.com",
        templates: {
          welcome: {
            ...DEFAULT_CONFIG.emailConfig!.templates.welcome,
            enabled: false,
            subject: "Custom subject",
          },
        },
      },
    };
    const templates = resolveEmailTemplates(partial);
    expect(templates.welcome?.enabled).toBe(false);
    expect(templates.welcome?.subject).toBe("Custom subject");
  });

  it("preserves admin-created templates that are not hardcoded defaults", () => {
    const adminCreated = {
      emailConfig: {
        fromName: "Crellab",
        fromEmail: "hello@mail.crellab.com",
        templates: {
          customPromo: {
            subject: "Special offer",
            bodyHtml: "<p>hi</p>",
            enabled: true,
          },
        },
      },
    };
    expect(resolveEmailTemplates(adminCreated).customPromo).toBeDefined();
  });

  it("resolveEmailTemplate returns undefined only for truly unknown keys", () => {
    expect(resolveEmailTemplate(undefined, "verifyEmail")).toBeDefined();
    expect(resolveEmailTemplate(undefined, "doesNotExist")).toBeUndefined();
  });

  it("resolveEmailConfig fills sender identity from hardcoded defaults", () => {
    const resolved = resolveEmailConfig(undefined);
    expect(resolved.fromName).toBe("Crellab");
    expect(resolved.fromEmail).toBe("hello@mail.crellab.com");
    expect(resolved.templates.verifyEmail).toBeDefined();
  });

  it("resolveEmailConfig honours config-saved sender identity", () => {
    const resolved = resolveEmailConfig({
      emailConfig: {
        fromName: "Crellab Team",
        fromEmail: "team@mail.crellab.com",
        templates: {},
      },
    });
    expect(resolved.fromName).toBe("Crellab Team");
    expect(resolved.fromEmail).toBe("team@mail.crellab.com");
  });
});
