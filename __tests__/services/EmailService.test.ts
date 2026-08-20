import { describe, it, expect, afterEach, vi } from "vitest";
import {
  EmailService,
  emailNotSentLabel,
  isResendConfigured,
  getResendConfig,
  getResendSender,
  DEFAULT_FROM_EMAIL,
} from "@/services/EmailService";
import { DEFAULT_CONFIG } from "@/config/platform.config";

const ORIGINAL_RESEND_KEY = process.env.RESEND_API_KEY;
const ORIGINAL_APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const ORIGINAL_RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const ORIGINAL_RESEND_FROM_NAME = process.env.RESEND_FROM_NAME;

afterEach(() => {
  if (ORIGINAL_RESEND_KEY === undefined) {
    delete process.env.RESEND_API_KEY;
  } else {
    process.env.RESEND_API_KEY = ORIGINAL_RESEND_KEY;
  }
  if (ORIGINAL_APP_URL === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_APP_URL;
  }
  if (ORIGINAL_RESEND_FROM_EMAIL === undefined) {
    delete process.env.RESEND_FROM_EMAIL;
  } else {
    process.env.RESEND_FROM_EMAIL = ORIGINAL_RESEND_FROM_EMAIL;
  }
  if (ORIGINAL_RESEND_FROM_NAME === undefined) {
    delete process.env.RESEND_FROM_NAME;
  } else {
    process.env.RESEND_FROM_NAME = ORIGINAL_RESEND_FROM_NAME;
  }
  vi.unstubAllGlobals();
});

describe("services/EmailService — isResendConfigured", () => {
  it("returns false when RESEND_API_KEY is missing", () => {
    delete process.env.RESEND_API_KEY;
    expect(isResendConfigured()).toBe(false);
  });

  it("returns true when RESEND_API_KEY is present", () => {
    process.env.RESEND_API_KEY = "re_test_key";
    expect(isResendConfigured()).toBe(true);
  });

  it("getResendConfig mirrors the configured state", () => {
    delete process.env.RESEND_API_KEY;
    expect(getResendConfig()).toEqual({ apiKeyPresent: false });
    process.env.RESEND_API_KEY = "re_test_key";
    expect(getResendConfig()).toEqual({ apiKeyPresent: true });
  });
});

describe("services/EmailService — sender identity (Resend recommendations)", () => {
  it("defaults to a real address (not a no-reply), overridable via env/config", () => {
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.RESEND_FROM_NAME;
    const sender = getResendSender(DEFAULT_CONFIG);
    expect(sender.fromEmail).toBe(DEFAULT_FROM_EMAIL);
    expect(sender.fromEmail).toContain("@");
    expect(sender.fromEmail).not.toMatch(/noreply|no-reply/i);
    expect(sender.fromName).toBe("Crellab");
  });

  it("lets RESEND_FROM_EMAIL / RESEND_FROM_NAME env vars override the config", () => {
    process.env.RESEND_FROM_EMAIL = "updates@mail.crellab.com";
    process.env.RESEND_FROM_NAME = "Crellab Updates";
    const sender = getResendSender(DEFAULT_CONFIG);
    expect(sender.fromEmail).toBe("updates@mail.crellab.com");
    expect(sender.fromName).toBe("Crellab Updates");
  });

  it("uses the admin-configured sender when no env override is set", () => {
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.RESEND_FROM_NAME;
    const config = {
      ...DEFAULT_CONFIG,
      emailConfig: {
        ...DEFAULT_CONFIG.emailConfig!,
        fromName: "Crellab Team",
        fromEmail: "team@mail.crellab.com",
      },
    };
    const sender = getResendSender(config);
    expect(sender.fromEmail).toBe("team@mail.crellab.com");
    expect(sender.fromName).toBe("Crellab Team");
  });
});

describe("services/EmailService — send without Resend key (preview fallback)", () => {
  it("returns a preview instead of sending when no API key is present", async () => {
    delete process.env.RESEND_API_KEY;
    const result = await EmailService.sendWelcome("creator@example.com", "Ada");
    expect(result.sent).toBe(false);
    expect(result.preview).toBeDefined();
    expect(result.preview).toContain("Hi Ada");
    expect(result.preview).toContain("Welcome to Crellab");
  });

  it("substitutes template variables from the config", async () => {
    delete process.env.RESEND_API_KEY;
    const result = await EmailService.send(
      "client@example.com",
      "bookingConfirmation",
      {
        userName: "Bayo",
        providerName: "Amara Studios",
        packageName: "Brand Video",
        bookingDate: "2026-09-01",
        amount: "₦250,000",
        bookingUrl: "https://crelab.ng/bookings/1",
      },
      DEFAULT_CONFIG,
    );
    expect(result.preview).toBeDefined();
    expect(result.preview).toContain("Hi Bayo");
    expect(result.preview).toContain("Amara Studios");
    expect(result.preview).toContain("Brand Video");
    expect(result.preview).toContain("₦250,000");
  });

  it("uses NEXT_PUBLIC_APP_URL for the welcome explore link", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.NEXT_PUBLIC_APP_URL = "https://crelab.example";
    const result = await EmailService.sendWelcome("a@example.com", "Zara");
    expect(result.preview).toContain("https://crelab.example/explore");
  });

  it("returns sent:false + reason for an unknown template key", async () => {
    delete process.env.RESEND_API_KEY;
    const result = await EmailService.send("a@example.com", "doesNotExist", {}, DEFAULT_CONFIG);
    expect(result).toEqual({ sent: false, to: "a@example.com", reason: "template_missing" });
  });

  it("falls back to the hardcoded template when the config/DB never saved it", async () => {
    delete process.env.RESEND_API_KEY;
    // A config whose emailConfig.templates is missing verifyEmail entirely —
    // exactly the DB state that produced the production `template_missing`.
    const config = {
      ...DEFAULT_CONFIG,
      emailConfig: {
        ...DEFAULT_CONFIG.emailConfig!,
        templates: {
          welcome: DEFAULT_CONFIG.emailConfig!.templates.welcome,
        },
      },
    };
    const result = await EmailService.send(
      "a@example.com",
      "verifyEmail",
      { userName: "Ada", verifyUrl: "https://crelab.ng/verify" },
      config,
    );
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("resend_not_configured");
    expect(result.preview).toContain("Verify your email");
    expect(result.preview).toContain("https://crelab.ng/verify");
  });

  it("returns sent:false + reason without preview when the template is disabled", async () => {
    delete process.env.RESEND_API_KEY;
    const config = {
      ...DEFAULT_CONFIG,
      emailConfig: {
        ...DEFAULT_CONFIG.emailConfig!,
        templates: {
          ...DEFAULT_CONFIG.emailConfig!.templates,
          welcome: {
            ...DEFAULT_CONFIG.emailConfig!.templates.welcome,
            enabled: false,
          },
        },
      },
    };
    const result = await EmailService.sendWelcome("a@example.com", "Ada", config);
    expect(result).toEqual({ sent: false, to: "a@example.com", reason: "template_disabled" });
  });

  it("reports resend_not_configured when no API key is present", async () => {
    delete process.env.RESEND_API_KEY;
    const result = await EmailService.sendWelcome("a@example.com", "Ada", DEFAULT_CONFIG);
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("resend_not_configured");
  });
});

describe("services/EmailService — send with Resend key", () => {
  it("calls the Resend API and reports success", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await EmailService.sendWelcome("creator@example.com", "Ada", DEFAULT_CONFIG);

    expect(result).toEqual({ sent: true, to: "creator@example.com" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer re_test_key");

    const body = JSON.parse(init.body);
    expect(body.to).toEqual(["creator@example.com"]);
    expect(body.subject).toContain("Welcome to Crellab");
    expect(body.from).toContain("Crellab");
    expect(body.html).toContain("Hi Ada");
  });

  it("falls back to a preview when the Resend API errors", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      text: async () => "missing from address",
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await EmailService.sendWelcome("a@example.com", "Ada", DEFAULT_CONFIG);
    expect(result.sent).toBe(false);
    expect(result.preview).toContain("Hi Ada");
    expect(result.reason).toBe("resend_api_error");
  });

  it("falls back to a preview when the Resend API throws", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await EmailService.sendWelcome("a@example.com", "Ada", DEFAULT_CONFIG);
    expect(result.sent).toBe(false);
    expect(result.preview).toContain("Hi Ada");
    expect(result.reason).toBe("network_error");
  });

  it("reports network_error and times out when fetch hangs", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    // A fetch that never resolves — the AbortController timeout must abort it.
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new Error("Aborted")),
            );
          }),
      ),
    );

    const result = await EmailService.sendWelcome("a@example.com", "Ada", DEFAULT_CONFIG);
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("network_error");
    expect(result.error).toContain("timed out");
  }, 15000);
});

describe("services/EmailService — emailNotSentLabel", () => {
  it("returns a human-readable label for every machine reason", () => {
    const reasons = [
      "template_missing",
      "template_disabled",
      "resend_not_configured",
      "network_error",
      "resend_api_error",
    ] as const;
    for (const reason of reasons) {
      expect(emailNotSentLabel(reason)).toBeTypeOf("string");
      expect(emailNotSentLabel(reason)!.length).toBeGreaterThan(0);
    }
  });

  it("returns null for an unknown/absent reason", () => {
    expect(emailNotSentLabel(undefined)).toBeNull();
    expect(emailNotSentLabel("something_else" as never)).toBeNull();
  });

  it("labels are user-facing, not raw codes", () => {
    expect(emailNotSentLabel("resend_api_error")).toContain("rejected");
    expect(emailNotSentLabel("network_error")).toContain("network");
    expect(emailNotSentLabel("template_missing")).toContain("missing");
  });
});
