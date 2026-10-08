"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ClButton, ClInput, ClTextarea, ClSelect } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { usePlatformConfig } from "@/lib/config-context";
import { clearErrorContext, readErrorContext, type IErrorContext } from "@/lib/sanitize-error";
import { Bug, X, Upload, Paperclip, Unlink, ChevronDown, ChevronUp } from "lucide-react";

const MAX_SCREENSHOTS = 3;
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;

function formatTimestamp(value: string): string {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? value : new Date(parsed).toLocaleString();
}

export default function BugReportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { bugReport } = usePlatformConfig();
  const [submitting, setSubmitting] = useState(false);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Technical context handed over by the error boundary via sessionStorage.
  // `?e=1` is only the signal that a payload should be picked up.
  const [attached, setAttached] = useState<IErrorContext | null>(null);
  const [showAttachedDetails, setShowAttachedDetails] = useState(false);
  const [severity, setSeverity] = useState<string>("MEDIUM");
  const severityPref = bugReport?.severity;

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("e") !== "1") return;
    const ctx = readErrorContext();
    if (!ctx) return;
    setAttached(ctx);
    // Severity preselected on reports raised from the error popup (config-driven)
    if (severityPref) setSeverity(severityPref);
  }, [severityPref]);

  function detachErrorContext() {
    clearErrorContext();
    setAttached(null);
    setShowAttachedDetails(false);
    toast("Captured error details detached", "success");
  }

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    const next: File[] = [...screenshots];
    for (const f of incoming) {
      if (next.length >= MAX_SCREENSHOTS) {
        toast(`Maximum ${MAX_SCREENSHOTS} screenshots allowed`, "error");
        break;
      }
      if (!f.type.startsWith("image/")) {
        toast(`"${f.name}" is not an image — skipped`, "error");
        continue;
      }
      if (f.size > MAX_SCREENSHOT_BYTES) {
        toast(`"${f.name}" is too large (max 8 MB) — skipped`, "error");
        continue;
      }
      // dedupe by name+size
      if (next.some((x) => x.name === f.name && x.size === f.size)) continue;
      next.push(f);
    }
    setScreenshots(next);
  }

  function removeScreenshot(idx: number) {
    setScreenshots((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const formEl = e.currentTarget;
    const base = new FormData(formEl);

    // Build multipart request — always use FormData so file uploads ride along
    const fd = new FormData();
    fd.set("title", (base.get("title") as string) ?? "");
    fd.set("description", (base.get("description") as string) ?? "");
    if (base.get("stepsToReproduce")) fd.set("stepsToReproduce", base.get("stepsToReproduce") as string);
    if (base.get("expectedBehavior")) fd.set("expectedBehavior", base.get("expectedBehavior") as string);
    if (base.get("actualBehavior")) fd.set("actualBehavior", base.get("actualBehavior") as string);
    fd.set("severity", severity);
    if (base.get("reporterEmail")) fd.set("reporterEmail", base.get("reporterEmail") as string);
    if (base.get("reporterName")) fd.set("reporterName", base.get("reporterName") as string);
    if (typeof window !== "undefined") fd.set("pageUrl", window.location.href);
    if (attached) fd.set("errorContext", JSON.stringify(attached));
    for (const f of screenshots) fd.append("screenshots", f);

    try {
      const res = await fetch("/api/bug-report", {
        method: "POST",
        body: fd,
      });

      const json = await res.json();
      if (!json.success) {
        const errMsg =
          typeof json.error === "string"
            ? json.error
            : json.error
              ? JSON.stringify(json.error)
              : "Validation failed";
        toast(errMsg, "error");
        return;
      }

      toast("Bug report submitted. Thank you!", "success");
      clearErrorContext();
      router.push("/");
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-[640px]">
        <div className="flex items-center gap-3 mb-8">
          <Bug className="w-6 h-6 text-[var(--color-primary)]" />
          <h1 className="font-[family-name:var(--font-display)] font-extrabold text-3xl tracking-[-0.02em]">
            Report a Bug
          </h1>
        </div>

        {/* Captured error handed over by the error boundary (sessionStorage) */}
        {attached && (
          <section
            aria-label="Attached error details"
            className="mb-6 rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-surface)] p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <Paperclip className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-primary)]" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold">Attached error details</p>
                  <p className="text-[12px] text-[var(--color-text-tertiary)]">
                    Captured automatically when the error happened — they will be sent with your report unless you detach them.
                  </p>
                </div>
              </div>
              <ClButton type="button" variant="outlined" size="sm" onClick={detachErrorContext}>
                <Unlink className="w-3.5 h-3.5" />
                Detach
              </ClButton>
            </div>

            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 space-y-1.5">
              <p className="text-[13px] font-mono break-words text-[var(--color-text-primary)]">
                {attached.message || "Unknown error"}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--color-text-tertiary)]">
                <span>{formatTimestamp(attached.timestamp)}</span>
                {attached.source && <span>{attached.source}</span>}
                {attached.url && (
                  <span className="truncate max-w-[300px]" title={attached.url}>
                    {attached.url}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAttachedDetails((prev) => !prev)}
              aria-expanded={showAttachedDetails}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              {showAttachedDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showAttachedDetails ? "Hide technical details" : "Show technical details"}
            </button>

            {showAttachedDetails && (
              <div className="space-y-3 text-[12px]">
                {attached.stack ? (
                  <div>
                    <span className="font-semibold text-[var(--color-text-tertiary)]">Stack trace</span>
                    <pre className="mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-[11px] text-[var(--color-text-secondary)]">
                      {attached.stack}
                    </pre>
                  </div>
                ) : (
                  <p className="text-[var(--color-text-tertiary)]">No stack trace was captured.</p>
                )}

                {attached.consoleLogs.length > 0 && (
                  <div>
                    <span className="font-semibold text-[var(--color-text-tertiary)]">
                      Console logs ({attached.consoleLogs.length})
                    </span>
                    <pre className="mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2 text-[11px] text-[var(--color-text-secondary)]">
                      {attached.consoleLogs
                        .map((entry) => `${entry.time || "—"} [${entry.level}] ${entry.message}`)
                        .join("\n")}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">Title</span>
            <ClInput
              name="title"
              placeholder="Brief summary of the issue"
              required
              minLength={5}
              maxLength={200}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">Description</span>
            <ClTextarea
              name="description"
              placeholder="Tell us what happened in detail"
              required
              minLength={20}
              maxLength={5000}
              rows={5}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">Steps to Reproduce</span>
            <ClTextarea
              name="stepsToReproduce"
              placeholder="1. Go to... 2. Click on... 3. See error"
              maxLength={5000}
              rows={4}
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">What did you expect?</span>
              <ClTextarea
                name="expectedBehavior"
                placeholder="What should have happened?"
                maxLength={2000}
                rows={3}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">What actually happened?</span>
              <ClTextarea
                name="actualBehavior"
                placeholder="What happened instead?"
                maxLength={2000}
                rows={3}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">Severity</span>
            <ClSelect name="severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="LOW">Low — Minor cosmetic issue</option>
              <option value="MEDIUM">Medium — Affects workflow</option>
              <option value="HIGH">High — Feature broken</option>
              <option value="CRITICAL">Critical — App unusable</option>
            </ClSelect>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">Your Name <span className="text-[var(--color-text-tertiary)]">(optional)</span></span>
              <ClInput name="reporterName" placeholder="Jane Doe" maxLength={120} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">Contact Email <span className="text-[var(--color-text-tertiary)]">(optional — for status updates)</span></span>
              <ClInput name="reporterEmail" type="email" placeholder="you@example.com" maxLength={254} />
            </label>
          </div>
          <p className="text-[12px] text-[var(--color-text-tertiary)]">If you are signed in we will use your account email automatically. Otherwise leave an email if you want to be notified when we update the report.</p>

          {/* Screenshot upload */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">
              Screenshot <span className="text-[var(--color-text-tertiary)]">(optional, up to {MAX_SCREENSHOTS} images, 8 MB each)</span>
            </span>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg px-4 py-6 cursor-pointer transition-colors ${
                dragOver
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                  : "border-[var(--color-border)] hover:border-[var(--color-text-tertiary)] bg-[var(--color-surface)]"
              }`}
            >
              <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <Upload className="w-4 h-4" />
                <span className="text-[13px] font-medium">Drop images here or click to browse</span>
              </div>
              <span className="text-[12px] text-[var(--color-text-tertiary)]">JPEG, PNG, WebP, GIF, AVIF, HEIC</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {screenshots.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-2">
                {screenshots.map((file, idx) => {
                  const preview = typeof URL !== "undefined" ? URL.createObjectURL(file) : "";
                  return (
                    <div key={`${file.name}-${idx}`} className="relative group border border-[var(--color-border)] rounded-lg overflow-hidden bg-[var(--color-surface)]">
                      {/* Use img with object URL — revoke is not critical for short-lived previews */}
                      <img
                        src={preview}
                        alt={file.name}
                        className="w-full h-28 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeScreenshot(idx); }}
                        className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="px-2 py-1.5">
                        <p className="text-[11px] font-medium truncate text-[var(--color-text-primary)]" title={file.name}>{file.name}</p>
                        <p className="text-[11px] text-[var(--color-text-tertiary)]">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <ClButton type="submit" loading={submitting} disabled={submitting}>
              Submit Report
            </ClButton>
            <ClButton type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </ClButton>
          </div>
        </form>
      </div>
    </div>
  );
}
