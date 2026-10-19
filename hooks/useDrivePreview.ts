"use client";

import { useCallback, useEffect, useState } from "react";
import { validateFolderUrl } from "@/lib/drive";
import type { DrivePreviewResult } from "@/services/DriveService";

/** Client-side mirror of the server's per-user preview budget (429 -> Retry-After). */
const PREVIEW_FALLBACK_COOLDOWN_SECONDS = 15;
const PREVIEW_COOLDOWN_CAP_SECONDS = 120;

/**
 * Shared Drive quick-preview state machine (read-only /api/portfolio/drive/preview).
 * Used by DriveConnectSettings and MediaUpload so the cooldown / 429 handling
 * stays identical everywhere the preview button appears.
 */
export function useDrivePreview() {
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<DrivePreviewResult | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewCooldown, setPreviewCooldown] = useState(0);

  useEffect(() => {
    if (previewCooldown <= 0) return;
    const t = setTimeout(() => setPreviewCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [previewCooldown]);

  const clearPreview = useCallback(() => {
    setPreview(null);
    setPreviewError("");
  }, []);

  const runPreview = useCallback(async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed || previewing || previewCooldown > 0) return;

    // Fast client-side shape check so a typo fails instantly and doesn't
    // spend any of the per-user API budget (server re-validates anyway).
    if (!validateFolderUrl(trimmed)) {
      setPreview(null);
      setPreviewError("That doesn't look like a public Google Drive folder link.");
      return;
    }

    setPreviewing(true);
    setPreviewError("");
    setPreview(null);

    try {
      const res = await fetch("/api/portfolio/drive/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderUrl: trimmed }),
      });

      let json: {
        success?: boolean;
        error?: string;
        data?: DrivePreviewResult;
        retryAfterSeconds?: number;
      } | null = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (!res.ok) {
        if (res.status === 429 || res.status === 503) {
          const retry = Number(json?.retryAfterSeconds);
          const seconds =
            Number.isFinite(retry) && retry > 0
              ? Math.min(Math.ceil(retry), PREVIEW_COOLDOWN_CAP_SECONDS)
              : PREVIEW_FALLBACK_COOLDOWN_SECONDS;
          setPreviewCooldown(seconds);
        }
        setPreviewError(json?.error ?? "Preview failed. Please try again.");
        return;
      }

      if (json?.data) {
        setPreview(json.data);
      } else {
        setPreviewError("Preview failed. Please try again.");
      }
    } catch {
      setPreviewError("Network error. Please try again.");
    } finally {
      setPreviewing(false);
    }
  }, [previewing, previewCooldown]);

  /** True when the URL has the shape of a Drive folder (preview worth offering). */
  const isPreviewable = useCallback((url: string) => validateFolderUrl(url.trim()), []);

  return {
    previewing,
    preview,
    previewError,
    previewCooldown,
    runPreview,
    clearPreview,
    isPreviewable,
  };
}
