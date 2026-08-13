"use client";

import type { EmailTemplateBlock } from "@/types";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

const BLOCK_TYPES = ["heading", "paragraph", "list", "button", "image", "divider"] as const;

const EMPTY_BLOCK: Record<string, EmailTemplateBlock> = {
  heading: { type: "heading", text: "" },
  paragraph: { type: "paragraph", text: "" },
  list: { type: "list", items: [""] },
  button: { type: "button", text: "", url: "{{exploreUrl}}" },
  image: { type: "image", url: "{{logoUrl}}", alt: "Logo" },
  divider: { type: "divider" },
};

const inputClass =
  "h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)]";

export function EmailTemplateBlocksEditor({
  blocks,
  onChange,
}: {
  blocks: EmailTemplateBlock[];
  onChange: (blocks: EmailTemplateBlock[]) => void;
}) {
  const updateBlock = (index: number, block: EmailTemplateBlock) => {    onChange(blocks.map((b, i) => (i === index ? block : b)));
  };

  const addBlock = (type: EmailTemplateBlock["type"]) => {
    onChange([...blocks, { ...EMPTY_BLOCK[type] } as EmailTemplateBlock]);
  };

  const removeBlock = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
  };

  const moveBlock = (index: number, delta: number) => {
    const next = [...blocks];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const insertVar = (index: number, field: "text" | "url" | "items", varName: string) => {
    const block = blocks[index];
    if (!block) return;
    if (field === "items" && block.type === "list") {
      const items = [...block.items];
      items[items.length - 1] = `${items[items.length - 1] ?? ""}{{${varName}}}`;
      updateBlock(index, { ...block, items });
    } else if (block.type === "button" || block.type === "image") {
      updateBlock(index, { ...block, [field]: `${(block as Record<string, string>)[field]} {{${varName}}}` } as EmailTemplateBlock);
    } else if (block.type === "heading" || block.type === "paragraph") {
      const current = block.type === "heading" ? block.text : block.text;
      updateBlock(index, { ...block, text: `${current} {{${varName}}}` } as EmailTemplateBlock);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {blocks.length === 0 && (
        <div className="rounded-[8px] border border-dashed border-[var(--color-border-mid)] p-6 text-center text-[13px] text-[var(--color-text-tertiary)]">
          No blocks yet — add a heading, paragraph, button or list to build your email visually.
        </div>
      )}

      {blocks.map((block, index) => (
        <div
          key={index}
          className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                {block.type}
              </span>
              <select
                className="h-7 rounded-[6px] bg-[var(--color-surface)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-secondary)] outline-none cursor-pointer"
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  const field =
                    block.type === "button" || block.type === "image"
                      ? "url"
                      : block.type === "list"
                        ? "items"
                        : "text";
                  insertVar(index, field, e.target.value);
                }}
              >
                <option value="">Insert variable…</option>
                {VARIABLES.map((v) => (
                  <option key={v} value={v}>{`{{${v}}}`}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => moveBlock(index, -1)} disabled={index === 0} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer disabled:opacity-40" aria-label="Move up">
                <ArrowUp size={14} strokeWidth={2} />
              </button>
              <button onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer disabled:opacity-40" aria-label="Move down">
                <ArrowDown size={14} strokeWidth={2} />
              </button>
              <button onClick={() => removeBlock(index)} className="text-[var(--color-error)] hover:opacity-80 cursor-pointer" aria-label="Remove block">
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </div>
          </div>

          {block.type === "heading" && (
            <input className={inputClass} placeholder="Heading text" value={block.text} onChange={(e) => updateBlock(index, { ...block, text: e.target.value })} />
          )}
          {block.type === "paragraph" && (
            <textarea
              className={`${inputClass} h-auto py-2 resize-y font-[family-name:var(--font-body)]`}
              rows={3}
              placeholder="Paragraph text"
              value={block.text}
              onChange={(e) => updateBlock(index, { ...block, text: e.target.value })}
            />
          )}
          {block.type === "list" && (
            <div className="flex flex-col gap-2">
              {block.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex gap-2 items-center">
                  <input
                    className={inputClass}
                    placeholder="List item"
                    value={item}
                    onChange={(e) => {
                      const items = [...block.items];
                      items[itemIndex] = e.target.value;
                      updateBlock(index, { ...block, items });
                    }}
                  />
                  {block.items.length > 1 && (
                    <button onClick={() => updateBlock(index, { ...block, items: block.items.filter((_, i) => i !== itemIndex) })} className="text-[var(--color-error)] cursor-pointer text-[11px] shrink-0" aria-label="Remove item">
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => updateBlock(index, { ...block, items: [...block.items, ""] })}
                className="text-[12px] text-[var(--color-accent)] cursor-pointer bg-transparent border-none p-0 text-left"
              >
                + Add item
              </button>
            </div>
          )}
          {block.type === "button" && (
            <div className="flex flex-col gap-2">
              <input className={inputClass} placeholder="Button text (e.g. Verify Email)" value={block.text} onChange={(e) => updateBlock(index, { ...block, text: e.target.value })} />
              <input className={inputClass} placeholder="Button link (e.g. {{exploreUrl}})" value={block.url} onChange={(e) => updateBlock(index, { ...block, url: e.target.value })} />
            </div>
          )}
          {block.type === "image" && (
            <div className="flex flex-col gap-2">
              <input className={inputClass} placeholder="Image URL (e.g. {{logoUrl}})" value={block.url} onChange={(e) => updateBlock(index, { ...block, url: e.target.value })} />
              <input className={inputClass} placeholder="Alt text" value={block.alt} onChange={(e) => updateBlock(index, { ...block, alt: e.target.value })} />
            </div>
          )}
          {block.type === "divider" && (
            <div className="text-[12px] text-[var(--color-text-tertiary)]">Horizontal divider</div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mr-1">Add</span>
        {BLOCK_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => addBlock(type)}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-[8px] border border-[var(--color-border-mid)] bg-transparent text-[12px] font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
          >
            <Plus size={13} strokeWidth={2} />
            {type}
          </button>
        ))}
      </div>
    </div>
  );
}

const VARIABLES = [
  "name",
  "userName",
  "providerName",
  "packageName",
  "amount",
  "bookingDate",
  "exploreUrl",
  "bookingUrl",
  "verifyUrl",
  "logoUrl",
];
