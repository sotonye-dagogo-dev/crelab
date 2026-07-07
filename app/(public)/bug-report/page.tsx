"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClButton, ClInput, ClTextarea, ClSelect } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { Bug } from "lucide-react";

export default function BugReportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const body = {
      title: form.get("title") as string,
      description: form.get("description") as string,
      stepsToReproduce: (form.get("stepsToReproduce") as string) || undefined,
      expectedBehavior: (form.get("expectedBehavior") as string) || undefined,
      actualBehavior: (form.get("actualBehavior") as string) || undefined,
      severity: (form.get("severity") as string) || "MEDIUM",
      pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
    };

    try {
      const res = await fetch("/api/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!json.success) {
        const errMsg = typeof json.error === "string" ? json.error : "Validation failed";
        toast(errMsg, "error");
        return;
      }

      toast("Bug report submitted. Thank you!", "success");
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
            <ClSelect name="severity" defaultValue="MEDIUM">
              <option value="LOW">Low — Minor cosmetic issue</option>
              <option value="MEDIUM">Medium — Affects workflow</option>
              <option value="HIGH">High — Feature broken</option>
              <option value="CRITICAL">Critical — App unusable</option>
            </ClSelect>
          </label>

          <div className="flex gap-3 pt-4">
            <ClButton type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Report"}
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
