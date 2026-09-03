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
  X,
  Loader2,
  Clock,
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

interface UploadProgress {
  id: string;
  file: File;
  progress: number;
  loaded: number;
  total: number;
  speed: number; // bytes per second
  startTime: number;
  remainingTime?: number; // milliseconds
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
  result?: {
    assetId: string;
    url: string;
    thumbnailUrl: string | null;
    mimeType: string;
    resourceType: "video" | "image";
    publicId: string;
  };
}

interface MediaUploadProps {
  label: string;
  hint?: string;
  accept?: AcceptKind;
  value: string;
  onChange: (url: string) => void;
  maxFiles?: number;
  multiple?: boolean;
}

interface MediaStatus {
  enabled: boolean;
  cloudinaryConfigured: boolean;
  maxFileSizeMb: number;
  videoTypes: string[];
  imageTypes: string[];
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatTime(ms: number): string {
  if (ms < 1000) return "< 1s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function MediaUpload({
  label,
  hint,
  accept = "both",
  value,
  onChange,
  maxFiles = 5,
  multiple = true,
}: MediaUploadProps) {
  const [status, setStatus] = useState<MediaStatus | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [tab, setTab] = useState<"upload" | "link">("upload");
  const [linkInput, setLinkInput] = useState("");
  const [error, setError] = useState("");
  const [previewKind, setPreviewKind] = useState<PreviewKind>("link");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Multiple upload state
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

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

  const getUploadsByStatus = useCallback((statusFilter: UploadProgress["status"]) => 
    uploads.filter(u => u.status === statusFilter)
  , [uploads]);

  const hasActiveUploads = getUploadsByStatus("uploading").length > 0;
  const hasPendingUploads = getUploadsByStatus("pending").length > 0;

  const removeUpload = useCallback((id: string) => {
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(id);
    }
    setUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  const clearCompletedUploads = useCallback(() => {
    setUploads(prev => prev.filter(u => u.status !== "completed"));
  }, []);

  const clearErroredUploads = useCallback(() => {
    setUploads(prev => prev.filter(u => u.status !== "error"));
  }, []);

  const uploadStartTimesRef = useRef<Map<string, number>>(new Map());
  const uploadSingleFileRef = useRef<typeof uploadSingleFile | null>(null);
  const uploadSingleFile = useCallback(async (file: File, uploadId: string) => {
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
      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, status: "error" as const, error: validation.reason ?? "Invalid file" } : u
      ));
      return;
    }

    // Update status to uploading
    const startedAt = Date.now();
    uploadStartTimesRef.current.set(uploadId, startedAt);
    setUploads(prev => prev.map(u => 
      u.id === uploadId ? { ...u, status: "uploading" as const, startTime: startedAt, error: undefined } : u
    ));

    const controller = new AbortController();
    abortControllersRef.current.set(uploadId, controller);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Helper to turn any API error payload into a readable string (avoids [object Object])
      const extractErrorMessage = (json: unknown, fallback: string): string => {
        if (typeof json === "object" && json !== null) {
          const j = json as Record<string, unknown>;
          const parts: string[] = [];
          if (typeof j.error === "string" && j.error) parts.push(j.error);
          else if (j.error && typeof j.error === "object") {
            try { parts.push(JSON.stringify(j.error)); } catch { parts.push(String(j.error)); }
          }
          if (Array.isArray(j.details) && j.details.length) {
            const detailStr = j.details.map((d) => (typeof d === "string" ? d : JSON.stringify(d))).join("; ");
            if (detailStr) parts.push(detailStr);
          } else if (typeof j.details === "string" && j.details) {
            parts.push(j.details);
          }
          // if json itself is array
          if (parts.length) return parts.join(" — ");
          if (typeof j.message === "string") return j.message;
        }
        return fallback;
      };

      // Use XMLHttpRequest for progress tracking
      const result = await new Promise<{
        assetId: string;
        url: string;
        thumbnailUrl: string | null;
        mimeType: string;
        resourceType: "video" | "image";
        publicId: string;
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            const started = uploadStartTimesRef.current.get(uploadId) ?? startedAt;
            const elapsed = Date.now() - started;
            const speed = elapsed > 0 ? (event.loaded / elapsed) * 1000 : 0;
            const remaining = speed > 0 ? (event.total - event.loaded) / speed : 0;
            
            setUploads(prev => prev.map(u => 
              u.id === uploadId 
                ? { ...u, progress, loaded: event.loaded, total: event.total, speed, remainingTime: remaining }
                : u
            ));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText);
              if (json.success && json.data) {
                // batch-upload returns an array, single upload returns an object — handle both
                const data = Array.isArray(json.data) ? json.data[0] : json.data;
                if (data && data.url) resolve(data);
                else reject(new Error(extractErrorMessage(json, "Upload failed: invalid response shape")));
              } else {
                reject(new Error(extractErrorMessage(json, "Upload failed")));
              }
            } catch (e) {
              if (e instanceof Error && e.message !== "Invalid response from server") {
                reject(e);
              } else {
                reject(new Error("Invalid response from server"));
              }
            }
          } else {
            try {
              const json = JSON.parse(xhr.responseText);
              reject(new Error(extractErrorMessage(json, `Upload failed with status ${xhr.status}`)));
            } catch {
              const text = xhr.responseText?.trim();
              if (text && text !== "[object Object]") reject(new Error(text.slice(0, 500)));
              else reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload cancelled"));
        });

        // Single-file uploads should hit /api/media/upload (expects "file").
        // batch-upload is kept as fallback but also now accepts "file" for compat.
        xhr.open("POST", "/api/media/upload");
        xhr.setRequestHeader("Accept", "application/json");
        
        xhr.send(formData);
      });

      // Update with result
      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, progress: 100, status: "completed" as const, result, loaded: u.total, speed: 0, remainingTime: 0 }
          : u
      ));

      // If this is the first completed upload and we don't have a value yet, use it
      if (!value) {
        onChange(result.url);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setUploads(prev => prev.filter(u => u.id !== uploadId));
      } else {
        let errorMessage: string;
        if (err instanceof Error) errorMessage = err.message;
        else if (typeof err === "string") errorMessage = err;
        else if (err && typeof err === "object" && "message" in (err as Record<string, unknown>) && typeof (err as Record<string, unknown>).message === "string") {
          errorMessage = (err as Record<string, unknown>).message as string;
        } else {
          try { errorMessage = JSON.stringify(err); } catch { errorMessage = String(err); }
          if (!errorMessage || errorMessage === "{}" || errorMessage === "[object Object]") errorMessage = "Upload failed";
        }
        setUploads(prev => prev.map(u => 
          u.id === uploadId 
            ? { ...u, status: "error" as const, error: errorMessage, progress: 0 }
            : u
        ));
      }
    } finally {
      abortControllersRef.current.delete(uploadId);
      uploadStartTimesRef.current.delete(uploadId);
    }
  }, [status, value, onChange]);

  uploadSingleFileRef.current = uploadSingleFile;

  const retryUpload = useCallback(async (id: string) => {
    const upload = uploads.find(u => u.id === id);
    if (!upload || upload.status !== "error") return;
    
    // Reset to pending
    setUploads(prev => prev.map(u => 
      u.id === id ? { ...u, status: "pending" as const, error: undefined, progress: 0, loaded: 0 } : u
    ));
    
    // Start upload
    if (uploadSingleFileRef.current) {
      await uploadSingleFileRef.current(upload.file, id);
    }
  }, [uploads]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || !files.length) return;
    if (!status) return;

    const fileArray = Array.from(files);
    
    // Check total files limit
    const pendingCount = uploads.filter(u => u.status === "pending" || u.status === "uploading").length;
    const availableSlots = maxFiles - pendingCount - uploads.filter(u => u.status === "completed").length;
    
    if (fileArray.length > availableSlots) {
      setError(`Maximum ${maxFiles} files allowed. You can add ${availableSlots} more.`);
      return;
    }

    setError("");

    for (const file of fileArray.slice(0, availableSlots)) {
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
        setError(`${file.name}: ${validation.reason ?? "Invalid file"}`);
        continue;
      }

      const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const newUpload: UploadProgress = {
        id: uploadId,
        file,
        progress: 0,
        loaded: 0,
        total: file.size,
        speed: 0,
        startTime: Date.now(),
        status: "pending",
      };

      setUploads(prev => [...prev, newUpload]);
      
      // Start upload immediately
      uploadSingleFile(file, uploadId);
    }
  }, [status, uploads, maxFiles, uploadSingleFile]);

  const handleLink = useCallback(() => {
    if (!isValidMediaUrl(linkInput)) {
      setError("Please enter a valid public link (https://...)");
      return;
    }
    setError("");
    onChange(linkInput.trim());
    setPreviewKind(inferPreviewKind(linkInput, accept));
    // Clear uploads when using link
    setUploads([]);
  }, [linkInput, accept, onChange]);

  const handleRemove = useCallback(() => {
    onChange("");
    setLinkInput("");
    setPreviewKind("link");
    setError("");
    setUploads([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [onChange]);

  if (statusError) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-tertiary)]">
        <AlertCircle size={14} color="var(--color-warning)" />
        Media upload settings could not be loaded. You can still paste a link below.
      </div>
    );
  }

  const hasUploads = uploads.length > 0;
  const completedUploads = getUploadsByStatus("completed");
  const erroredUploads = getUploadsByStatus("error");
  const activeUploads = getUploadsByStatus("uploading");
  const pendingUploads = getUploadsByStatus("pending");

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
        {hasUploads && (
          <span className="text-[11px] text-[var(--color-text-tertiary)] px-2 py-0.5 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
            {uploads.length} file{uploads.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {hint && (
        <p className="text-[12px] text-[var(--color-text-secondary)]">{hint}</p>
      )}

      {value && !hasUploads ? (
        // Show single existing value
        <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="bg-[var(--color-surface-raised)]">
            {previewKind === "video" ? (
              <video
                src={value}
                muted
                playsInline
                controls
                className="w-full max-h-[220px] object-contain"
              />
            ) : (
              <img
                src={value}
                alt=""
                className="w-full max-h-[220px] object-contain"
              />
            )}
          </div>
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle size={16} fill="var(--color-success)" color="var(--color-surface)" className="shrink-0" />
              <span className="text-[12px] text-[var(--color-text-secondary)] truncate">{value}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ClButton variant="ghost" size="sm" type="button" onClick={handleRemove}>
                Change
              </ClButton>
              <button type="button" aria-label="Remove media" className="p-1.5 rounded-[6px] text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] cursor-pointer" onClick={handleRemove}>
                <Trash2 size={16} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Upload interface
        <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          {canUpload && multiple && (
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
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <button
                type="button"
                disabled={hasActiveUploads || hasPendingUploads}
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-[8px] border border-dashed border-[var(--color-border-mid)] bg-[var(--color-surface-raised)] hover:border-[var(--color-accent)] py-8 flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {hasActiveUploads || hasPendingUploads ? (
                  <>
                    <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[13px] text-[var(--color-text-secondary)]">
                      {hasActiveUploads ? "Uploading..." : "Queued..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Upload size={22} strokeWidth={1.5} color="var(--color-accent)" />
                    <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
                      {multiple ? "Upload up to 5 files" : "Upload your work"}
                    </span>
                    <span className="text-[12px] text-[var(--color-text-tertiary)]">
                      Click to choose files · max {status?.maxFileSizeMb}MB each
                    </span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="text-[12px] text-[var(--color-text-tertiary)] mb-2">
              Paste a public link to a folder on your Google Drive housing your projects.
            </p>
          )}

          {(!canUpload || tab === "link") && (
            <div className="flex flex-col gap-2">
              <ClInput
                placeholder="https://drive.google.com/... or any public link"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
              />
              <ClButton variant="outlined" size="sm" type="button" onClick={handleLink}>
                Use this link
              </ClButton>
            </div>
          )}

          {/* Upload Progress List */}
          {hasUploads && (
            <div className="mt-4 space-y-2">
              {completedUploads.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-[0.06em]">
                    Completed ({completedUploads.length})
                  </p>
                  {completedUploads.map((upload) => (
                    <div key={upload.id} className="flex items-center gap-2 p-2 rounded-[8px] bg-[var(--color-success)]/10 border border-[var(--color-success)]/20">
                      <CheckCircle size={16} fill="var(--color-success)" color="var(--color-surface)" className="shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate">{upload.file.name}</p>
                        <p className="text-[11px] text-[var(--color-text-secondary)]">
                          {formatBytes(upload.file.size)} · {upload.result?.resourceType}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeUpload(upload.id)}
                        className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] cursor-pointer"
                        aria-label="Remove"
                      >
                        <X size={14} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                  {(completedUploads.length > 0 || erroredUploads.length > 0) && (
                    <div className="flex gap-2 pt-2">
                      {completedUploads.length > 0 && (
                        <ClButton variant="ghost" size="sm" onClick={clearCompletedUploads}>
                          Clear completed
                        </ClButton>
                      )}
                      {erroredUploads.length > 0 && (
                        <ClButton variant="ghost" size="sm" onClick={clearErroredUploads}>
                          Clear errors
                        </ClButton>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeUploads.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-[0.06em]">
                    Uploading ({activeUploads.length})
                  </p>
                  {activeUploads.map((upload) => (
                    <div key={upload.id} className="space-y-1.5 p-2 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-[var(--color-text-primary)] truncate max-w-[200px]">{upload.file.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const controller = abortControllersRef.current.get(upload.id);
                            if (controller) controller.abort();
                          }}
                          className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] cursor-pointer"
                          aria-label="Cancel upload"
                        >
                          <X size={14} strokeWidth={2} />
                        </button>
                      </div>
                      <div className="w-full h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-200 ease-out"
                          style={{ width: `${Math.min(upload.progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[var(--color-text-secondary)]">
                        <span>{formatBytes(upload.loaded)} / {formatBytes(upload.total)}</span>
                        <span>
                          {upload.speed > 0 ? `${formatBytes(upload.speed)}/s` : "Calculating..."}
                        </span>
                        <span>
                          {upload.remainingTime ? (
                            <>
                              <Clock size={10} strokeWidth={1.5} className="inline mr-0.5" />
                              ~{formatTime(upload.remainingTime)} remaining
                            </>
                          ) : (
                            "Estimating..."
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pendingUploads.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-[0.06em]">
                    Queued ({pendingUploads.length})
                  </p>
                  {pendingUploads.map((upload) => (
                    <div key={upload.id} className="flex items-center gap-2 p-2 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
                      <Loader2 size={14} strokeWidth={1.5} className="text-[var(--color-text-tertiary)] animate-spin" />
                      <span className="text-[12px] text-[var(--color-text-secondary)] truncate max-w-[200px]">{upload.file.name}</span>
                      <span className="text-[11px] text-[var(--color-text-tertiary)]">{formatBytes(upload.file.size)}</span>
                    </div>
                  ))}
                </div>
              )}

              {erroredUploads.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-[0.06em]">
                    Errors ({erroredUploads.length})
                  </p>
                  {erroredUploads.map((upload) => (
                    <div key={upload.id} className="p-2 rounded-[8px] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={14} color="var(--color-error)" className="shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-[var(--color-text-primary)]">{upload.file.name}</p>
                          <p className="text-[11px] text-[var(--color-error)] mt-0.5">{upload.error}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <ClButton variant="ghost" size="sm" onClick={() => retryUpload(upload.id)}>
                            Retry
                          </ClButton>
                          <button type="button" onClick={() => removeUpload(upload.id)} className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] cursor-pointer">
                            <X size={12} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {erroredUploads.length > 0 && (
                    <ClButton variant="ghost" size="sm" onClick={clearErroredUploads} className="w-full">
                      Clear all errors
                    </ClButton>
                  )}
                </div>
              )}
            </div>
          )}

          {(!canUpload || tab === "link") && (
            <div className="flex flex-col gap-2">
              <ClInput
                placeholder="https://drive.google.com/... or any public link"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
              />
              <ClButton variant="outlined" size="sm" type="button" onClick={handleLink}>
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