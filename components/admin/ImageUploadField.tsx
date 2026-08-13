"use client";

import { useRef, useState } from "react";
import { useToast } from "@/lib/toast";
import { ImagePlus, Loader2, X, CloudOff } from "lucide-react";
import { resolveUrlForRender } from "@/lib/url";

/**
 * Reusable image upload field backed by the shared Cloudinary pipeline
 * (`/api/media/upload`). Falls back gracefully to a paste-URL input when direct
 * uploads are disabled or Cloudinary isn't configured. Used across admin editors
 * (blog hero images, content image blocks) for a consistent upload experience.
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  helper,
  aspect = "banner",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  helper?: string;
  aspect?: "banner" | "square";
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Upload failed");
      onChange(json.data.url);
      toast("Image uploaded", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Upload failed — you can paste a link instead.",
        "error",
      );
      setPasteMode(true);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="block text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
        {label}
      </label>

      {value ? (
        <div
          className={`relative rounded-[12px] overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-raised)] ${
            aspect === "banner" ? "h-[160px]" : "h-[120px] w-[120px]"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveUrlForRender(value)}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-[8px] bg-black/60 text-white text-[11px] font-semibold cursor-pointer border border-white/20 disabled:opacity-50"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
              Replace
            </button>
            <button
              onClick={() => onChange("")}
              className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] bg-black/60 text-white cursor-pointer border border-white/20"
              aria-label="Remove image"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-[var(--color-border-mid)] text-[var(--color-text-tertiary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer disabled:opacity-60 transition-colors duration-150 ${
            aspect === "banner" ? "h-[160px]" : "h-[120px] w-[120px]"
          }`}
        >
          {uploading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <ImagePlus size={18} strokeWidth={1.8} />
          )}
          <span className="text-[11px] font-semibold">
            {uploading ? "Uploading…" : "Upload image"}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {pasteMode || !value ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="…or paste an image URL"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[13px] text-[var(--color-text-primary)] outline-none w-full min-w-0 focus:border-[var(--color-accent)]"
          />
          {pasteMode && (
            <CloudOff size={14} strokeWidth={1.8} className="text-[var(--color-warning)] shrink-0" />
          )}
        </div>
      ) : null}

      {helper && <p className="text-[11px] text-[var(--color-text-tertiary)]">{helper}</p>}
    </div>
  );
}
