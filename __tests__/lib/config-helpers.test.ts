import { describe, it, expect } from "vitest";
import { setNestedValue } from "@/services/PlatformConfigService";
import { appOrigin, resolveAbsoluteUrl, resolveUrlForRender, resolveRelativeUrlsInHtml } from "@/lib/url";
import { blocksToHtml, substituteSampleVars } from "@/lib/email-blocks";
import { buildSeoMetadata } from "@/lib/seo";

describe("PlatformConfigService.setNestedValue", () => {
  it("sets a dotted key as a nested object path", () => {
    const target: Record<string, unknown> = {};
    setNestedValue(target, "emailConfig.templates.verifyEmail.subject", "Hello");
    expect(target).toEqual({
      emailConfig: {
        templates: { verifyEmail: { subject: "Hello" } },
      },
    });
  });

  it("preserves existing sibling keys when setting a nested value", () => {
    const target: Record<string, unknown> = { emailConfig: { fromName: "Crellab" } };
    setNestedValue(target, "emailConfig.templates.bookingConfirmed.enabled", true);
    expect(target).toEqual({
      emailConfig: {
        fromName: "Crellab",
        templates: { bookingConfirmed: { enabled: true } },
      },
    });
  });

  it("overwrites a plain leaf value with a nested object when needed", () => {
    const target: Record<string, unknown> = { features: true };
    setNestedValue(target, "features.emailNotifications", true);
    expect(target).toEqual({ features: { emailNotifications: true } });
  });

  it("skips null values so they never clobber existing defaults", () => {
    const target: Record<string, unknown> = { name: "Crellab" };
    setNestedValue(target, "name", null);
    expect(target).toEqual({ name: "Crellab" });
  });

  it("preserves arrays when set as a leaf value", () => {
    const target: Record<string, unknown> = {};
    setNestedValue(target, "categories", [{ slug: "videography" }]);
    expect(target.categories).toEqual([{ slug: "videography" }]);
  });
});

describe("lib/url", () => {
  it("appOrigin falls back to localhost in development", () => {
    expect(appOrigin()).toMatch(/^http:\/\/localhost:3000$/);
  });

  it("resolveAbsoluteUrl prefixes the origin for relative paths", () => {
    expect(resolveAbsoluteUrl("/logo.png")).toMatch(/^http:\/\/localhost:3000\/logo\.png$/);
  });

  it("resolveAbsoluteUrl returns absolute http(s) URLs unchanged", () => {
    expect(resolveAbsoluteUrl("https://cdn.example/logo.png")).toBe("https://cdn.example/logo.png");
  });

  it("resolveAbsoluteUrl returns protocol-relative URLs unchanged", () => {
    expect(resolveAbsoluteUrl("//cdn.example/logo.png")).toBe("//cdn.example/logo.png");
  });

  it("resolveAbsoluteUrl leaves already-absolute paths rooted at the origin", () => {
    expect(resolveAbsoluteUrl("http://localhost:3000/x")).toBe("http://localhost:3000/x");
  });

  it("resolveUrlForRender resolves relative paths but leaves template tokens intact", () => {
    expect(resolveUrlForRender("/primary-logo.png")).toMatch(/^http:\/\/localhost:3000\/primary-logo\.png$/);
    expect(resolveUrlForRender("{{logoUrl}}")).toBe("{{logoUrl}}");
    expect(resolveUrlForRender("https://cdn.example/x.png")).toBe("https://cdn.example/x.png");
    expect(resolveUrlForRender("//cdn.example/x.png")).toBe("//cdn.example/x.png");
  });

  it("resolveRelativeUrlsInHtml resolves relative img/a URLs and ignores absolute/schemed/fragment ones", () => {
    const html = [
      '<img src="/primary-logo.png" alt="logo" />',
      '<img src="https://cdn.example/x.png" alt="x" />',
      '<a href="/explore">Go</a>',
      '<a href="mailto:a@b.com">Mail</a>',
      '<a href="#top">Top</a>',
      '<img src="data:image/png;base64,AAAA" alt="" />',
    ].join("");
    const out = resolveRelativeUrlsInHtml(html);
    expect(out).toContain('src="http://localhost:3000/primary-logo.png"');
    expect(out).toContain('src="https://cdn.example/x.png"');
    expect(out).toContain('href="http://localhost:3000/explore"');
    expect(out).toContain('href="mailto:a@b.com"');
    expect(out).toContain('href="#top"');
    expect(out).toContain('src="data:image/png;base64,AAAA"');
  });

  it("resolveRelativeUrlsInHtml ignores unresolved template tokens", () => {
    const out = resolveRelativeUrlsInHtml('<img src="{{logoUrl}}" alt="logo" />');
    expect(out).toContain('src="{{logoUrl}}"');
  });
});

describe("lib/email-blocks", () => {
  it("blocksToHtml escapes user content", () => {
    const html = blocksToHtml([{ type: "paragraph", text: `<script>alert(1)</script>` }]);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("blocksToHtml renders each supported block type", () => {
    const html = blocksToHtml([
      { type: "heading", text: "Hi" },
      { type: "list", items: ["a", "b"] },
      { type: "button", text: "Go", url: "{{exploreUrl}}" },
      { type: "image", url: "{{logoUrl}}", alt: "Logo" },
      { type: "divider" },
    ]);
    expect(html).toContain("<h2");
    expect(html).toContain("<ul");
    expect(html).toContain("<a href=");
    expect(html).toContain("<img");
  });

  it("substituteSampleVars fills known variables and leaves unknown intact", () => {
    const out = substituteSampleVars("Hi {{userName}}, visit {{exploreUrl}} and {{unknownVar}}");
    expect(out).toContain("Ada Okafor");
    expect(out).toContain("https://crelab.example/explore");
    expect(out).toContain("{{unknownVar}}");
  });
});

describe("lib/seo — buildSeoMetadata", () => {
  const config = { name: "Crellab", tagline: "Creative marketplace", logoPath: "/logo.png" };

  it("suffixes page titles with the platform name", () => {
    const meta = buildSeoMetadata(config, { title: "Hire Videographers", path: "/explore" });
    expect(meta.title).toBe("Hire Videographers | Crellab");
  });

  it("keeps titles that already contain the platform name", () => {
    const meta = buildSeoMetadata(config, { title: "Crellab Blog" });
    expect(meta.title).toBe("Crellab Blog");
  });

  it("resolves the logo to an absolute og:image URL", () => {
    const meta = buildSeoMetadata(config, { title: "Home" });
    const images = meta.openGraph?.images;
    expect(images).toBeTruthy();
    const img = Array.isArray(images) ? images[0] : images;
    const url = typeof img === "string" ? img : (img as { url?: string } | null)?.url;
    expect(url).toMatch(/^http:\/\/localhost:3000\/logo\.png$/);
  });

  it("uses a custom og image when provided", () => {
    const meta = buildSeoMetadata(config, { title: "Post", ogImage: "https://cdn.example/hero.jpg" });
    const images = meta.openGraph?.images;
    const img = Array.isArray(images) ? images[0] : images;
    const url = typeof img === "string" ? img : (img as { url?: string } | null)?.url;
    expect(url).toBe("https://cdn.example/hero.jpg");
  });

  it("sets noindex when requested", () => {
    const meta = buildSeoMetadata(config, { title: "Private", noindex: true });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});
