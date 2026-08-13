import { describe, it, expect, afterEach } from "vitest";
import { blocksToHtml, SAMPLE_EMAIL_VARS, substituteSampleVars, previewVarsFor } from "@/lib/email-blocks";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import type { EmailTemplateBlock } from "@/types";

const ORIGINAL_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  if (ORIGINAL_APP_URL === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_APP_URL;
  }
});

describe("lib/email-blocks — sample variables", () => {
  it("resolves {{name}} to the platform name, not the recipient username", () => {
    expect(SAMPLE_EMAIL_VARS.name).toBe(DEFAULT_CONFIG.name);
    expect(SAMPLE_EMAIL_VARS.name).not.toBe(SAMPLE_EMAIL_VARS.userName);
  });

  it("preview substitution uses the platform name for {{name}}", () => {
    const html = blocksToHtml([{ type: "heading", text: "Welcome to {{name}} — Hi {{userName}}" }]);
    const out = substituteSampleVars(html);
    expect(out).toContain(`Welcome to ${DEFAULT_CONFIG.name}`);
    expect(out).toContain("Hi Ada Okafor");
  });

  it("resolves the sample logoUrl to an absolute URL ending in the logo path", () => {
    expect(SAMPLE_EMAIL_VARS.logoUrl).toMatch(/^https?:\/\//);
    expect(SAMPLE_EMAIL_VARS.logoUrl).toMatch(/primary-logo\.png$/);
  });

  it("previewVarsFor captures the configured platform name and logoPath", () => {
    const vars = previewVarsFor({ name: "Acme Studio", logoPath: "/brand/acme.png" });
    expect(vars.name).toBe("Acme Studio");
    expect(vars.logoUrl).toMatch(/^https?:\/\/.*\/brand\/acme\.png$/);
    expect(vars.userName).toBe(SAMPLE_EMAIL_VARS.userName);
  });

  it("previewVarsFor falls back to sample vars when no config is given", () => {
    expect(previewVarsFor(null)).toBe(SAMPLE_EMAIL_VARS);
  });

  it("substituteSampleVars resolves a relative logo image src to an absolute URL", () => {
    const html = `<img src="/primary-logo.png" alt="logo" />`;
    const out = substituteSampleVars(html);
    expect(out).not.toContain('src="/primary-logo.png"');
    expect(out).toMatch(/src="https?:\/\/[^"]+\/primary-logo\.png"/);
  });

  it("substituteSampleVars resolves a relative image added via the visual builder and leaves absolute URLs alone", () => {
    const html = `<img src="{{logoUrl}}" alt="logo" /><img src="https://cdn.example/x.png" alt="x" />`;
    const out = substituteSampleVars(html);
    expect(out).toMatch(/src="https?:\/\/[^"]+\/primary-logo\.png"/);
    expect(out).toContain('src="https://cdn.example/x.png"');
  });

  it("substituteSampleVars leaves data:/mailto:/fragment URLs untouched", () => {
    const html = `<a href="#top">top</a><a href="mailto:a@b.com">m</a><img src="data:image/png;base64,AAAA" alt="" />`;
    const out = substituteSampleVars(html);
    expect(out).toContain('href="#top"');
    expect(out).toContain('href="mailto:a@b.com"');
    expect(out).toContain('src="data:image/png;base64,AAAA"');
  });
});

describe("lib/email-blocks — default heading colour", () => {
  it("renders headings in the platform accent #E8FF47", () => {
    const html = blocksToHtml([{ type: "heading", text: "Hello" }]);
    expect(html).toContain("color:#E8FF47");
    expect(html).not.toContain("color:#F2F2F2");
  });

  it("preserves a full block render with all types", () => {
    const blocks: EmailTemplateBlock[] = [
      { type: "heading", text: "Header" },
      { type: "paragraph", text: "Body" },
      { type: "list", items: ["a", "b"] },
      { type: "button", text: "Go", url: "{{exploreUrl}}" },
      { type: "image", url: "{{logoUrl}}", alt: "logo" },
      { type: "divider" },
    ];
    const html = blocksToHtml(blocks);
    expect(html).toContain("<ul");
    expect(html).toContain("color:#E8FF47");
    expect(html).toContain("<img");
  });
});

describe("lib/email-blocks — default template config colours", () => {
  it("uses #E8FF47 for every h1 in the default email templates", () => {
    const templates = DEFAULT_CONFIG.emailConfig!.templates;
    for (const [key, tpl] of Object.entries(templates)) {
      const h1 = tpl.bodyHtml.match(/<h1[^>]*>/)?.[0] ?? "";
      expect(h1).toContain("color:#E8FF47");
    }
  });
});
