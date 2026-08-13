"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClButton, ClCard } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { Eye } from "lucide-react";
import type { IBlogConfig } from "@/types";

const inputClass =
  "h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)]";

const labelClass =
  "block mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]";

const DEFAULT_BLOG: IBlogConfig = {
  heroTitle: "Insights for Nigerian Creators & Brands",
  heroSubtitle:
    "Hiring guides, pricing tips, and spotlights on the creators making Nigeria's best content.",
  newsletter: {
    enabled: true,
    title: "The Creator's Brief",
    subtitle:
      "One email a month with hiring trends, pricing benchmarks, and the creators moving the industry forward.",
    buttonLabel: "Subscribe",
    successMessage: "You're on the list — check your inbox for the first issue.",
  },
  footerTagline: "Get hired for your creativity, not your follower count.",
};

export default function AdminBlogTemplatesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [blog, setBlog] = useState<IBlogConfig | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-config"],
    queryFn: async () => {
      const res = await fetch("/api/admin/config");
      const json = await res.json();
      if (json.success) return json.data;
      throw new Error(json.error ?? "Failed to load config");
    },
  });

  useEffect(() => {
    if (data?.blogConfig) {
      setBlog(data.blogConfig as IBlogConfig);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: { key: string; value: unknown }) => {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to save");
      return json;
    },
    onSuccess: () => {
      toast("Blog template saved", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-config"] });
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const cfg = blog ?? DEFAULT_BLOG;

  if (isLoading) {
    return (
      <div className="text-[var(--color-text-secondary)] text-[14px]">
        Loading blog templates...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">
            Blog Templates
          </h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Edit the copy and sections of the public blog page. Every change is config-driven and previewed live — no code or HTML needed.
          </div>
        </div>
        <ClButton variant="primary" size="default" onClick={() => saveMutation.mutate({ key: "blogConfig", value: cfg })} loading={saveMutation.isPending}>
          Save Blog Template
        </ClButton>
      </div>

      <div className="grid grid-cols-2 gap-6 items-start max-lg:grid-cols-1">
        <ClCard>
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Hero title</label>
              <input className={inputClass} value={cfg.heroTitle} onChange={(e) => setBlog({ ...cfg, heroTitle: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Hero subtitle</label>
              <textarea
                className={`${inputClass} h-auto py-2 resize-y`}
                rows={2}
                value={cfg.heroSubtitle}
                onChange={(e) => setBlog({ ...cfg, heroSubtitle: e.target.value })}
              />
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13px] font-semibold text-[var(--color-text-primary)]">Newsletter section</label>
                <button
                  onClick={() => setBlog({ ...cfg, newsletter: { ...cfg.newsletter, enabled: !cfg.newsletter.enabled } })}
                  className={`inline-flex items-center w-9 h-5 rounded-[9999px] relative transition-colors cursor-pointer border-none ${
                    cfg.newsletter.enabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-mid)]"
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${cfg.newsletter.enabled ? "translate-x-4" : ""}`} />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className={labelClass}>Title</label>
                  <input className={inputClass} value={cfg.newsletter.title} onChange={(e) => setBlog({ ...cfg, newsletter: { ...cfg.newsletter, title: e.target.value } })} />
                </div>
                <div>
                  <label className={labelClass}>Subtitle</label>
                  <textarea className={`${inputClass} h-auto py-2 resize-y`} rows={2} value={cfg.newsletter.subtitle} onChange={(e) => setBlog({ ...cfg, newsletter: { ...cfg.newsletter, subtitle: e.target.value } })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Button label</label>
                    <input className={inputClass} value={cfg.newsletter.buttonLabel} onChange={(e) => setBlog({ ...cfg, newsletter: { ...cfg.newsletter, buttonLabel: e.target.value } })} />
                  </div>
                  <div>
                    <label className={labelClass}>Success message</label>
                    <input className={inputClass} value={cfg.newsletter.successMessage} onChange={(e) => setBlog({ ...cfg, newsletter: { ...cfg.newsletter, successMessage: e.target.value } })} />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
              <label className={labelClass}>Footer tagline</label>
              <input className={inputClass} value={cfg.footerTagline} onChange={(e) => setBlog({ ...cfg, footerTagline: e.target.value })} />
            </div>
          </div>
        </ClCard>

        <ClCard>
          <div className="flex items-center gap-2 mb-4">
            <Eye size={15} strokeWidth={2} className="text-[var(--color-accent)]" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Live preview</span>
          </div>
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
            <h3 className="font-[family-name:var(--font-display)] font-extrabold text-[22px] text-[var(--color-text-primary)] max-w-[420px] leading-tight tracking-[-0.02em]">
              {cfg.heroTitle || "—"}
            </h3>
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-2 max-w-[360px] leading-normal">
              {cfg.heroSubtitle || "—"}
            </p>

            {cfg.newsletter.enabled && (
              <div className="mt-6 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6 text-center">
                <h4 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)]">
                  {cfg.newsletter.title || "—"}
                </h4>
                <p className="text-[13px] text-[var(--color-text-secondary)] mt-1.5 max-w-[360px] mx-auto leading-normal">
                  {cfg.newsletter.subtitle || "—"}
                </p>
                <div className="flex items-center gap-2 justify-center mt-4">
                  <span className="h-9 flex-1 max-w-[240px] rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)]" />
                  <span className="h-9 px-4 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] inline-flex items-center text-[13px] font-semibold">
                    {cfg.newsletter.buttonLabel || "Subscribe"}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-[var(--color-border)] text-center text-[12px] text-[var(--color-text-tertiary)]">
              {cfg.footerTagline || "—"}
            </div>
          </div>
        </ClCard>
      </div>
    </div>
  );
}
