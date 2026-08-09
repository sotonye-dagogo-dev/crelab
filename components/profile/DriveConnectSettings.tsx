"use client";

import { useState } from "react";
import { ClButton, ClInput } from "@/components/ui";
import { Cloud, CheckCircle, AlertCircle } from "lucide-react";
import { validateFolderUrl } from "@/lib/drive";

type DriveState =
  | "DISCONNECTED"
  | "SYNCING"
  | "SYNCED"
  | "ERROR_PRIVATE"
  | "ERROR_EMPTY"
  | "ERROR_INVALID";

interface DriveConnectSettingsProps {
  currentUrl: string | null;
  providerId: string;
  onStateChange?: (state: DriveState) => void;
  /** "live" syncs immediately (requires an existing provider). "collect" only
   *  saves the folder URL — used during onboarding when no provider row exists yet. */
  mode?: "live" | "collect";
  onUrlChange?: (url: string) => void;
}

export function DriveConnectSettings({
  currentUrl,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  providerId,
  onStateChange,
  mode = "live",
  onUrlChange,
}: DriveConnectSettingsProps) {
  const [folderUrl, setFolderUrl] = useState(currentUrl ?? "");
  const [state, setState] = useState<DriveState>(
    currentUrl ? "SYNCED" : "DISCONNECTED",
  );
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    added: number;
    updated: number;
    hidden: number;
    total: number;
  } | null>(null);

  const handleSync = async () => {
    if (!folderUrl.trim()) return;

    setState("SYNCING");
    setError("");
    setResult(null);
    onStateChange?.("SYNCING");

    try {
      const res = await fetch("/api/portfolio/drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderUrl: folderUrl.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 502) {
          setState("ERROR_PRIVATE");
          onStateChange?.("ERROR_PRIVATE");
        } else {
          setState("DISCONNECTED");
          onStateChange?.("DISCONNECTED");
        }
        setError(json.error ?? "Sync failed");
        return;
      }

      if (json.data.total === 0) {
        setState("ERROR_EMPTY");
        onStateChange?.("ERROR_EMPTY");
        setError("No supported files found in this folder");
        return;
      }

      setState("SYNCED");
      setResult(json.data);
      onStateChange?.("SYNCED");
      onUrlChange?.(folderUrl.trim());
    } catch {
      setState("DISCONNECTED");
      setError("Network error. Please try again.");
      onStateChange?.("DISCONNECTED");
    }
  };

  const handleCollect = () => {
    const url = folderUrl.trim();
    if (!url) return;

    if (!validateFolderUrl(url)) {
      setState("ERROR_INVALID");
      setError("That doesn't look like a public Google Drive folder link.");
      onStateChange?.("ERROR_INVALID");
      return;
    }

    setError("");
    setState("SYNCED");
    onStateChange?.("SYNCED");
    onUrlChange?.(url);
  };

  const handleInputChange = (value: string) => {
    setFolderUrl(value);
    if (state === "SYNCED") {
      setState("DISCONNECTED");
      onStateChange?.("DISCONNECTED");
    }
  };

  const handleDisconnect = async () => {
    setFolderUrl("");
    setState("DISCONNECTED");
    setError("");
    setResult(null);
    onStateChange?.("DISCONNECTED");
    onUrlChange?.("");
  };

  return (
    <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <Cloud size={20} strokeWidth={1.5} color="var(--color-accent)" />
        <h3 className="font-[family-name:var(--font-display)] font-bold text-[16px] text-[var(--color-text-primary)]">
          Google Drive Sync
        </h3>
      </div>

      <p className="text-[13px] text-[var(--color-text-secondary)] mb-4">
        {mode === "collect"
          ? "Connect a publicly accessible Google Drive folder to auto-sync your portfolio. We'll pull it in once your profile is published. Supported formats: MP4, WebM, MOV, AVI, JPEG, PNG, WebP, PDF."
          : "Connect a Google Drive folder to automatically sync your portfolio. Supported formats: MP4, WebM, MOV, AVI, JPEG, PNG, WebP, PDF."}
      </p>

      {state === "DISCONNECTED" && (
        <div className="flex flex-col gap-3">
          <ClInput
            placeholder="https://drive.google.com/drive/folders/..."
            value={folderUrl}
            onChange={(e) => handleInputChange(e.target.value)}
          />
          {error && (
            <p className="text-[12px] text-[var(--color-error)]">{error}</p>
          )}
          {mode === "collect" ? (
            <ClButton
              variant="primary"
              onClick={handleCollect}
              disabled={!folderUrl.trim()}
            >
              Save folder
            </ClButton>
          ) : (
            <ClButton
              variant="primary"
              onClick={handleSync}
              disabled={!folderUrl.trim()}
            >
              Connect & Sync
            </ClButton>
          )}
        </div>
      )}

      {state === "SYNCING" && (
        <div className="flex items-center gap-3 py-6">
          <div className="w-5 h-5 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-[13px] text-[var(--color-text-secondary)]">
            Syncing files from Drive...
          </span>
        </div>
      )}

      {state === "SYNCED" && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} fill="var(--color-success)" color="var(--color-surface)" />
            <span className="text-[13px] font-medium text-[var(--color-success)]">
              {mode === "collect"
                ? "Folder saved"
                : "Sync complete"}
            </span>
          </div>

          {mode === "collect" ? (
            <p className="text-[12px] text-[var(--color-text-tertiary)] mb-4">
              We&apos;ll sync your Drive folder into your portfolio when your
              profile is published.
            </p>
          ) : result ? (
            <div className="flex gap-3 mb-4">
              <div className="flex-1 rounded-[8px] bg-[var(--color-surface-raised)] p-3 text-center">
                <p className="text-[20px] font-bold text-[var(--color-text-primary)]">
                  {result.added}
                </p>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">
                  Added
                </p>
              </div>
              <div className="flex-1 rounded-[8px] bg-[var(--color-surface-raised)] p-3 text-center">
                <p className="text-[20px] font-bold text-[var(--color-text-primary)]">
                  {result.updated}
                </p>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">
                  Updated
                </p>
              </div>
              <div className="flex-1 rounded-[8px] bg-[var(--color-surface-raised)] p-3 text-center">
                <p className="text-[20px] font-bold text-[var(--color-text-primary)]">
                  {result.total}
                </p>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">
                  Total
                </p>
              </div>
            </div>
          ) : null}

          <ClButton variant="outlined" onClick={handleDisconnect}>
            Disconnect
          </ClButton>
        </div>
      )}

      {(state === "ERROR_PRIVATE" ||
        state === "ERROR_EMPTY" ||
        state === "ERROR_INVALID") && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} fill="var(--color-error)" color="var(--color-surface)" />
            <span className="text-[13px] font-medium text-[var(--color-error)]">
              {state === "ERROR_PRIVATE"
                ? "Access Error"
                : state === "ERROR_EMPTY"
                  ? "Empty Folder"
                  : "Invalid Link"}
            </span>
          </div>
          <p className="text-[12px] text-[var(--color-text-tertiary)] mb-3">
            {error}
          </p>
          <ClButton variant="outlined" onClick={() => setState("DISCONNECTED")}>
            Try Again
          </ClButton>
        </div>
      )}
    </div>
  );
}
