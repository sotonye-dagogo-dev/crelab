"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClButton, ClInput } from "@/components/ui";
import {
  Upload,
  Link2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Cloud,
  Image as ImageIcon,
  Film,
} from "lucide-react";
import { isMediaFileAllowed, isValidMediaUrl } from "@/lib/media";

type AcceptKind = "video" | "image" | "both";
type PreviewKind = "video" | "image" | "link";

interface MediaStatus {
  enabled: boolean;
  cloudinaryConfigured: boolean;
  maxFileSizeMb: number;
  videoTypes: string[];
  imageTypes: string[];
}

interface MediaUploadProps {
  label: string;
  hint?: string;
  accept?: AcceptKind;
  value: string;
  onChange: (url: string) => void;
}

function inferPreviewKind(url: string, accept: AcceptKind): PreviewKind {
  const lower = url.toLowerCase();
  if (/\.(mp4|webm|mov|avi|m4v)$/.test(lower)) return "video";
  if (/\.(jpe?g|png|webp|gif)$/.test(lower)) return "image";
  return accept === "video"
    ? "video"
    : accept === "image"
      ? "image"
      : "link";
}

export function MediaUpload({
  label,
  hint,
  accept = "both",
  value,
  onChange,
}: MediaUploadProps) {
  const [status, setStatus] = useState<MediaStatus | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [tab, setTab] = useState<"upload" | "link">("upload");
  const [uploading, setUploading] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [error, setError] = useState("");
  const [previewKind, setPreviewKind] = useState<PreviewKind>("link");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/media/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && json.data) setStatus(json.data);
        else setStatusError(true);
      })
      .catch(() => setStatusError(true));
  }, []);

  useEffect(() => {
    if (value) {
      setPreviewKind(inferPreviewKind(value, accept));
    }
  }, [value, accept]);

  const canUpload = Boolean(
    status?.enabled && status.cloudinaryConfigured && !statusError,
  );

  const acceptAttr = useCallback(() => {
    if (!status) return "*/*";
    if (accept === "video") return status.videoTypes.join(",");
    if (accept === "image") return status.imageTypes.join(",");
    return [...status.videoTypes, ...status.imageTypes].join(",");
  }, [status, accept]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (!status) return;

    const validation = isMediaFileAllowed(file, {
      enabled: true,
      cloudinaryEnabled: true,
      maxFileSizeMb: status.maxFileSizeMb,
      videoTypes: status.videoTypes,
      imageTypes: status.imageTypes,
      cleanupOrphanAfterHours: 0,
      cleanupEnabled: false,
    });

    if (!validation.ok) {
      setError(validation.reason ?? "Invalid file");
      return;
    }

    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Upload failed. Please try again.");
        return;
      }

      setPreviewKind(json.data.resourceType === "video" ? "video" : "image");
      onChange(json.data.url as string);
    } catch {
      setError("Upload failed. Please try again or paste a link instead.");
    } finally {
      setUploading(false);
    }
  };

  const handleLink = () => {
    if (!isValidMediaUrl(linkInput)) {
      setError("Please enter a valid public link (https://...)");
      return;
    }
    setError("");
    onChange(linkInput.trim());
    setPreviewKind(inferPreviewKind(linkInput, accept));
  };

  const handleRemove = () => {
    onChange("");
    setLinkInput("");
    setPreviewKind("link");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (statusError) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-tertiary)]">
        <AlertCircle size={14} color="var(--color-warning)" />
        Media upload settings could not be loaded. You can still paste a link below.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {accept === "video" ? (
          <Film size={16} strokeWidth={1.5} color="var(--color-accent)" />
        ) : accept === "image" ? (
          <ImageIcon size={16} strokeWidth={1.5} color="var(--color-accent)" />
        ) : (
          <Cloud size={16} strokeWidth={1.5} color="var(--color-accent)" />
        )}
        <span className="font-semibold text-[13px] text-[var(--color-text-primary)]">
          {label}
        </span>
      </div>

      {hint && (
        <p className="text-[12px] text-[var(--color-text-secondary)]">{hint}</p>
      )}

      {value ? (
        <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="bg-[var(--color-surface-raised)]">
            {previewKind === "video" ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={value}
                muted
                playsInline
                controls
                className="w-full max-h-[220px] object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt=""
                className="w-full max-h-[220px] object-contain"
              />
            )}
          </div>
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle
                size={16}
                fill="var(--color-success)"
                color="var(--color-surface)"
                className="shrink-0"
              />
              <span className="text-[12px] text-[var(--color-text-secondary)] truncate">
                {value}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ClButton
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  onChange("");
                  setLinkInput("");
                  setPreviewKind("link");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Change
              </ClButton>
              <button
                type="button"
                aria-label="Remove media"
                className="p-1.5 rounded-[6px] text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] cursor-pointer"
                onClick={handleRemove}
              >
                <Trash2 size={16} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          {canUpload && (
            <div className="flex gap-1 mb-3">
              <button
                type="button"
                onClick={() => setTab("upload")}
                className={`flex-1 h-9 rounded-[8px] text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 ${
                  tab === "upload"
                    ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
                    : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Upload size={14} strokeWidth={2} />
                Upload
              </button>
              <button
                type="button"
                onClick={() => setTab("link")}
                className={`flex-1 h-9 rounded-[8px] text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 ${
                  tab === "link"
                    ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
                    : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Link2 size={14} strokeWidth={2} />
                Paste link
              </button>
            </div>
          )}

          {tab === "upload" && canUpload ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptAttr()}
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-[8px] border border-dashed border-[var(--color-border-mid)] bg-[var(--color-surface-raised)] hover:border-[var(--color-accent)] py-8 flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[13px] text-[var(--color-text-secondary)]">
                      Uploading...
                    </span>
                  </>
                ) : (
                  <>
                    <Upload size={22} strokeWidth={1.5} color="var(--color-accent)" />
                    <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
                      Upload your work
                    </span>
                    <span className="text-[12px] text-[var(--color-text-tertiary)]">
                      Click to choose a file · max {status?.maxFileSizeMb}MB
                    </span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="text-[12px] text-[var(--color-text-tertiary)] mb-2">
              Direct upload is temporarily unavailable — paste a public link
              instead.
            </p>
          )}

          {(!canUpload || tab === "link") && (
            <div className="flex flex-col gap-2">
              <ClInput
                placeholder="https://drive.google.com/... or any public link"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
              />
              <ClButton
                variant="outlined"
                size="sm"
                type="button"
                onClick={handleLink}
              >
                Use this link
              </ClButton>
            </div>
          )}

          {error && (
            <p className="mt-2 text-[12px] text-[var(--color-error)]">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
