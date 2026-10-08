import type { EmailTemplateBlock } from "@/types";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { resolveAbsoluteUrl, resolveRelativeUrlsInHtml } from "@/lib/url";

/**
 * Serializes structured template blocks (the visual, no-HTML editor format)
 * into email-safe inline-styled HTML. The generated markup mirrors the default
 * transactional template styling so visual and HTML modes stay consistent.
 */
export function blocksToHtml(blocks: EmailTemplateBlock[]): string {
  const out: string[] = [
    `<div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:24px;">`,
  ];

  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        out.push(
          `<h2 style="font-family:Syne,sans-serif;font-size:22px;font-weight:800;color:#E8FF47;margin:24px 0 8px;">${escapeHtml(block.text)}</h2>`,
        );
        break;
      case "paragraph":
        out.push(
          `<p style="font-size:14px;color:#9A9A9A;line-height:1.6;margin:0 0 16px;">${escapeHtml(block.text).replace(/\n/g, "<br />")}</p>`,
        );
        break;
      case "list":
        out.push(
          `<ul style="font-size:14px;color:#9A9A9A;line-height:1.8;padding-left:20px;">${block.items
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join("")}</ul>`,
        );
        break;
      case "button":
        out.push(
          `<div style="text-align:center;margin:24px 0;"><a href="${escapeHtml(block.url)}" style="display:inline-block;padding:12px 24px;background:#E8FF47;color:#0A0A0A;text-decoration:none;font-weight:600;font-size:14px;border-radius:8px;">${escapeHtml(block.text)}</a></div>`,
        );
        break;
      case "image":
        out.push(
          `<div style="text-align:center;margin:24px 0;"><img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt)}" style="max-width:160px;border-radius:8px;" /></div>`,
        );
        break;
      case "divider":
        out.push(
          `<div style="height:1px;background:#2A2A2A;margin:24px 0;"></div>`,
        );
        break;
    }
  }

  out.push(`</div>`);
  return out.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function unescapeHtml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Strip tags, turn <br> into newlines, collapse whitespace, unescape entities. */
function htmlToText(inner: string): string {
  const withBreaks = inner
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n");
  const stripped = withBreaks.replace(/<[^>]*>/g, "");
  return unescapeHtml(stripped)
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? unescapeHtml(m[1]) : "";
}

/**
 * Parses email HTML back into visual-builder blocks — the inverse of
 * `blocksToHtml()`. Regex-based (no DOM dependency) so it runs identically on
 * the server and the client. Unknown/empty fragments are skipped, bare
 * `{{variable}}` text between elements becomes a paragraph so template tokens
 * (e.g. `{{adminNotesBlock}}`) are never lost when toggling Visual ↔ HTML.
 */
export function htmlToBlocks(html: string): EmailTemplateBlock[] {
  if (!html || !html.trim()) return [];
  const blocks: EmailTemplateBlock[] = [];
  const push = (b: EmailTemplateBlock) => {
    if (blocks.length < 60) blocks.push(b);
  };
  // Matches, in alternation order: button-wrapper divs, headings, paragraphs,
  // lists, standalone links, images, dividers/hr. Global scan preserves order.
  const re =
    /<div[^>]*text-align\s*:\s*center[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>\s*<\/div>|<h[12][^>]*>([\s\S]*?)<\/h[12]>|<p[^>]*>([\s\S]*?)<\/p>|<(ul|ol)[^>]*>([\s\S]*?)<\/(ul|ol)>|<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>|<img[^>]*>|<hr[^>]*\/?>|<div[^>]*height\s*:\s*1px[^>]*>(?:[\s\S]*?)<\/div>|<div[^>]*height\s*:\s*1px[^>]*\/?>/gi;

  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const flushGap = (gap: string) => {
    const text = htmlToText(gap);
    if (text) push({ type: "paragraph", text });
  };

  while ((m = re.exec(html)) !== null) {
    if (m.index > lastIndex) flushGap(html.slice(lastIndex, m.index));
    lastIndex = re.lastIndex;
    const [full, btnHref, btnText, heading, para, listTag, listInner, , linkHref, linkText] = m;
    if (btnHref !== undefined) {
      const text = htmlToText(btnText ?? "") || "View";
      push({ type: "button", text, url: unescapeHtml(btnHref) });
    } else if (heading !== undefined) {
      const text = htmlToText(heading);
      if (text) push({ type: "heading", text });
    } else if (para !== undefined) {
      const text = htmlToText(para);
      if (text) push({ type: "paragraph", text });
    } else if (listTag !== undefined) {
      const items: string[] = [];
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let li: RegExpExecArray | null;
      while ((li = liRe.exec(listInner ?? "")) !== null) {
        const text = htmlToText(li[1]);
        if (text) items.push(text);
      }
      if (items.length) push({ type: "list", items });
    } else if (linkHref !== undefined) {
      const text = htmlToText(linkText ?? "") || unescapeHtml(linkHref);
      push({ type: "button", text, url: unescapeHtml(linkHref) });
    } else if (/^<img/i.test(full)) {
      const url = attr(full, "src");
      if (url) push({ type: "image", url, alt: attr(full, "alt") });
    } else {
      // <hr> or 1px divider div
      push({ type: "divider" });
    }
  }
  if (lastIndex < html.length) flushGap(html.slice(lastIndex));
  // Drop a trailing divider-only artefact from wrapper closes; keep content.
  return blocks;
}

/** Sample variable values used for live previews in the template editor. */
export const SAMPLE_EMAIL_VARS: Record<string, string> = {
  // `name` is the platform name (used throughout templates as the brand). It is
  // NOT the recipient's username — keep them distinct so previews reflect what
  // a real send will render.
  name: DEFAULT_CONFIG.name,
  userName: "Ada Okafor",
  providerName: "Tunde Films",
  packageName: "Wedding Highlight (60s)",
  amount: "₦180,000",
  bookingDate: "Friday, 24 July",
  exploreUrl: `${appOriginForPreview()}/explore`,
  bookingUrl: `${appOriginForPreview()}/dashboard`,
  verifyUrl: `${appOriginForPreview()}/verify-email?token=preview-token`,
  resetUrl: `${appOriginForPreview()}/reset-password?token=preview-token`,
  webinarTitle: "Pricing Your Creative Work",
  startsAt: "Saturday, 10 October 2026, 5:00 pm (WAT)",
  joinUrl: `${appOriginForPreview()}/webinars`,
  reportTitle: "Video upload stalls at 90%",
  statusLabel: "Resolved",
  adminNotesBlock: "Thanks — a fix is on the way.",
  logoUrl: resolveAbsoluteUrl(DEFAULT_CONFIG.logoPath),
};

/**
 * Builds sample preview vars from an actual platform config so the admin preview
 * captures the *configured* logo and platform name (not the code defaults). Relative
 * `logoPath` values are resolved to absolute via the shared URL util so the image
 * renders inside the preview iframe / email clients.
 */
export function previewVarsFor(
  config: { name?: string; logoPath?: string } | null | undefined,
): Record<string, string> {
  if (!config) return SAMPLE_EMAIL_VARS;
  return {
    ...SAMPLE_EMAIL_VARS,
    name: config.name || SAMPLE_EMAIL_VARS.name,
    logoUrl: config.logoPath ? resolveAbsoluteUrl(config.logoPath) : SAMPLE_EMAIL_VARS.logoUrl,
  };
}

function appOriginForPreview(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://crellab.example")
  );
}

/**
 * Replaces `{{variable}}` tokens with sample values so admins can preview a
 * template without sending a real email. Unknown tokens are left intact. Any
 * relative image/link URLs remaining after substitution are resolved to absolute
 * via the shared URL util (a `/primary-logo.png` src does not render in the
 * preview iframe or email clients otherwise).
 */
export function substituteSampleVars(
  html: string,
  vars: Record<string, string> = SAMPLE_EMAIL_VARS,
): string {
  const substituted = html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  return resolveRelativeUrlsInHtml(substituted);
}
