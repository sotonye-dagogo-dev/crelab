"use client";

import { useState } from "react";
import { ClButton, ClInput } from "@/components/ui";

type DriveState = "DISCONNECTED" | "SYNCING" | "SYNCED" | "ERROR_PRIVATE" | "ERROR_EMPTY";

interface DriveConnectSettingsProps {
  currentUrl: string | null;
  providerId: string;
  onStateChange?: (state: DriveState) => void;
}

export function DriveConnectSettings({
  currentUrl,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  providerId,
  onStateChange,
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
    } catch {
      setState("DISCONNECTED");
      setError("Network error. Please try again.");
      onStateChange?.("DISCONNECTED");
    }
  };

  const handleDisconnect = async () => {
    setFolderUrl("");
    setState("DISCONNECTED");
    setError("");
    setResult(null);
    onStateChange?.("DISCONNECTED");
  };

  return (
    <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1,18 12,2 23,18" />
          <polygon points="1,18 12,22 23,18" />
        </svg>
        <h3 className="font-[family-name:var(--font-display)] font-bold text-[16px] text-[var(--color-text-primary)]">
          Google Drive Sync
        </h3>
      </div>

      <p className="text-[13px] text-[var(--color-text-secondary)] mb-4">
        Connect a Google Drive folder to automatically sync your portfolio. Supported formats: MP4, WebM, MOV, AVI, JPEG, PNG, WebP, PDF.
      </p>

      {state === "DISCONNECTED" && (
        <div className="flex flex-col gap-3">
          <ClInput
            placeholder="https://drive.google.com/drive/folders/..."
            value={folderUrl}
            onChange={(e) => setFolderUrl(e.target.value)}
          />
          {error && (
            <p className="text-[12px] text-[var(--color-error)]">{error}</p>
          )}
          <ClButton
            variant="primary"
            onClick={handleSync}
            disabled={!folderUrl.trim()}
          >
            Connect & Sync
          </ClButton>
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

      {state === "SYNCED" && result && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-success)">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span className="text-[13px] font-medium text-[var(--color-success)]">
              Sync complete
            </span>
          </div>

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

          <ClButton variant="outlined" onClick={handleDisconnect}>
            Disconnect
          </ClButton>
        </div>
      )}

      {(state === "ERROR_PRIVATE" || state === "ERROR_EMPTY") && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-error)">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <span className="text-[13px] font-medium text-[var(--color-error)]">
              {state === "ERROR_PRIVATE" ? "Access Error" : "Empty Folder"}
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
