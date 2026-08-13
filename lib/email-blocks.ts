import type { EmailTemplateBlock } from "@/types";

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
          `<h2 style="font-family:Syne,sans-serif;font-size:22px;font-weight:800;color:#F2F2F2;margin:24px 0 8px;">${escapeHtml(block.text)}</h2>`,
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

/** Sample variable values used for live previews in the template editor. */
export const SAMPLE_EMAIL_VARS: Record<string, string> = {
  name: "Ada Okafor",
  userName: "Ada Okafor",
  providerName: "Tunde Films",
  packageName: "Wedding Highlight (60s)",
  amount: "₦180,000",
  bookingDate: "Friday, 24 July",
  exploreUrl: "https://crelab.example/explore",
  bookingUrl: "https://crelab.example/dashboard",
  verifyUrl: "https://crelab.example/verify-email?token=preview-token",
  logoUrl:
    "https://res.cloudinary.com/demo/image/upload/w_200/q_auto/cdplogo.png",
};

/**
 * Replaces `{{variable}}` tokens with sample values so admins can preview a
 * template without sending a real email. Unknown tokens are left intact.
 */
export function substituteSampleVars(
  html: string,
  vars: Record<string, string> = SAMPLE_EMAIL_VARS,
): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}
