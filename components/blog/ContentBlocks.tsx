"use client";

import type { EmailTemplateBlock } from "@/types";
import { resolveUrlForRender } from "@/lib/url";

/**
 * Renders visual-builder blocks (heading, paragraph, list, button, image,
 * divider) as styled page sections. Used to render the config-driven content
 * sections an admin builds with the blog visual builder. Relative image/link
 * URLs are resolved absolute via the shared URL util so they render wherever
 * the block is surfaced (blog page, admin preview).
 */
export function ContentBlocks({ blocks }: { blocks: EmailTemplateBlock[] }) {
  if (!blocks?.length) return null;

  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return (
              <h3
                key={i}
                className="font-[family-name:var(--font-display)] font-bold text-[24px] text-[var(--color-text-primary)] tracking-[-0.01em] leading-tight max-sm:text-[20px]"
              >
                {block.text || "—"}
              </h3>
            );
          case "paragraph":
            return (
              <p key={i} className="font-[family-name:var(--font-body)] text-[15px] text-[var(--color-text-secondary)] leading-normal">
                {block.text}
              </p>
            );
          case "list":
            return (
              <ul key={i} className="flex flex-col gap-2 pl-5 list-disc text-[15px] text-[var(--color-text-secondary)] leading-normal">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            );
          case "button":
            return block.url ? (
              <div key={i}>
                <a
                  href={resolveUrlForRender(block.url)}
                  className="inline-flex items-center justify-center h-10 px-5 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold text-[13px] no-underline transition-colors hover:bg-[var(--color-accent-dim)]"
                >
                  {block.text || "Learn more"}
                </a>
              </div>
            ) : null;
          case "image":
            return block.url ? (
              <div key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveUrlForRender(block.url)}
                  alt={block.alt || ""}
                  className="max-w-full h-auto rounded-[12px] border border-[var(--color-border)]"
                />
              </div>
            ) : null;
          case "divider":
            return <hr key={i} className="border-0 border-t border-[var(--color-border)] my-2" />;
          default:
            return null;
        }
      })}
    </div>
  );
}
