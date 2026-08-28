"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClButton, ClCard } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import type { IAboutPage } from "@/types";

const inputClass =
  "h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)]";

const labelClass =
  "block mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]";

const DEFAULT_ABOUT: IAboutPage = {
  id: "about-1",
  heroTitle: "About Crellab",
  heroSubtitle: "We're building the future of creative hiring in Africa — connecting brands with talented creators, cinematographers, and videographers.",
  sections: [
    {
      id: "mission",
      title: "Our Mission",
      content: "To democratize access to creative opportunities across Africa. We believe talent shouldn't be limited by geography, network, or follower count.",
    },
    {
      id: "vision",
      title: "Our Vision",
      content: "A thriving creative economy where every creator can build a sustainable career doing what they love, and every brand can find the perfect creative partner.",
    },
    {
      id: "values",
      title: "Our Values",
      content: "Creator-first • Transparency • Quality over quantity • Community-driven • Built for Africa",
    },
  ],
  quickLinks: [
    { label: "How It Works", href: "/how-it-works" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Report a Bug", href: "/bug-report" },
    { label: "Contact Us", href: "#contact" },
  ],
  metaTitle: "About Crellab - Connecting African Creatives with Opportunity",
  metaDescription: "Learn about Crellab's mission to connect brands with talented African creators, cinematographers, and videographers. Built for African creativity.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export default function AdminAboutPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [about, setAbout] = useState<IAboutPage | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-about-page"],
    queryFn: async () => {
      const res = await fetch("/api/admin/about-page");
      const json = await res.json();
      if (json.success) return json.data;
      throw new Error(json.error ?? "Failed to load About page content");
    },
  });

  useEffect(() => {
    if (data) {
      setAbout(data);
    } else {
      setAbout(DEFAULT_ABOUT);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: IAboutPage) => {
      const res = await fetch("/api/admin/about-page", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to save");
      return json;
    },
    onSuccess: () => {
      toast("About page content saved", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-about-page"] });
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const addSection = () => {
    if (!about) return;
    const newSection = {
      id: `section-${Date.now()}`,
      title: "",
      content: "",
    };
    setAbout({ ...about, sections: [...about.sections, newSection] });
  };

  const removeSection = (index: number) => {
    if (!about) return;
    setAbout({ ...about, sections: about.sections.filter((_, i) => i !== index) });
  };

  const moveSection = (index: number, delta: number) => {
    if (!about) return;
    const next = [...about.sections];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setAbout({ ...about, sections: next });
  };

  const addQuickLink = () => {
    if (!about) return;
    setAbout({ ...about, quickLinks: [...about.quickLinks, { label: "", href: "" }] });
  };

  const removeQuickLink = (index: number) => {
    if (!about) return;
    setAbout({ ...about, quickLinks: about.quickLinks.filter((_, i) => i !== index) });
  };

  const handleSave = () => {
    if (!about) return;
    saveMutation.mutate(about);
  };

  if (isLoading) {
    return (
      <div className="text-[var(--color-text-secondary)] text-[14px]">
        Loading About page content...
      </div>
    );
  }

  const cfg = about ?? DEFAULT_ABOUT;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">
            About Page Content
          </h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Edit the About page content. All changes are config-driven and previewed live on the public /about page.
          </div>
        </div>
        <ClButton variant="primary" size="default" onClick={handleSave} loading={saveMutation.isPending}>
          Save About Page
        </ClButton>
      </div>

      <div className="grid grid-cols-2 gap-6 items-start max-lg:grid-cols-1">
        <ClCard className="p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Hero title</label>
              <input
                className={inputClass}
                value={cfg.heroTitle}
                onChange={(e) => setAbout({ ...cfg, heroTitle: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Hero subtitle</label>
              <textarea
                className={`${inputClass} h-auto py-2 resize-y`}
                rows={2}
                value={cfg.heroSubtitle ?? ""}
                onChange={(e) => setAbout({ ...cfg, heroSubtitle: e.target.value })}
              />
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
              <label className={labelClass}>Meta title (SEO)</label>
              <input
                className={inputClass}
                value={cfg.metaTitle ?? ""}
                onChange={(e) => setAbout({ ...cfg, metaTitle: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Meta description (SEO)</label>
              <textarea
                className={`${inputClass} h-auto py-2 resize-y`}
                rows={2}
                value={cfg.metaDescription ?? ""}
                onChange={(e) => setAbout({ ...cfg, metaDescription: e.target.value })}
              />
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass}>Content sections</label>
                <ClButton variant="outlined" size="sm" onClick={addSection}>
                  <Plus size={14} strokeWidth={2} className="inline mr-1" />
                  Add section
                </ClButton>
              </div>
              <div className="flex flex-col gap-3">
                {cfg.sections.map((section, index) => (
                  <div
                    key={section.id}
                    className="flex flex-col gap-2 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[var(--color-text-tertiary)]">
                        Section {index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveSection(index, -1)}
                          disabled={index === 0}
                          className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer disabled:opacity-40 border-none bg-transparent p-1"
                          aria-label="Move section up"
                        >
                          <ArrowUp size={12} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => moveSection(index, 1)}
                          disabled={index === cfg.sections.length - 1}
                          className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer disabled:opacity-40 border-none bg-transparent p-1"
                          aria-label="Move section down"
                        >
                          <ArrowDown size={12} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => removeSection(index)}
                          className="text-[var(--color-error)] hover:opacity-70 cursor-pointer border-none bg-transparent p-1"
                          aria-label="Remove section"
                        >
                          <Trash2 size={12} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Section title</label>
                      <input
                        className={inputClass}
                        value={section.title}
                        onChange={(e) => {
                          const next = [...cfg.sections];
                          next[index] = { ...next[index], title: e.target.value };
                          setAbout({ ...cfg, sections: next });
                        }}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Section content</label>
                      <textarea
                        className={`${inputClass} h-auto py-2 resize-y`}
                        rows={3}
                        value={section.content}
                        onChange={(e) => {
                          const next = [...cfg.sections];
                          next[index] = { ...next[index], content: e.target.value };
                          setAbout({ ...cfg, sections: next });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass}>Quick links</label>
                <ClButton variant="outlined" size="sm" onClick={addQuickLink}>
                  <Plus size={14} strokeWidth={2} className="inline mr-1" />
                  Add link
                </ClButton>
              </div>
              <div className="flex flex-col gap-2">
                {cfg.quickLinks.map((link, index) => (
                  <div
                    key={index}
                    className="flex gap-2 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3"
                  >
                    <input
                      className={`${inputClass} flex-1`}
                      placeholder="Label"
                      value={link.label}
                      onChange={(e) => {
                        const next = [...cfg.quickLinks];
                        next[index] = { ...next[index], label: e.target.value };
                        setAbout({ ...cfg, quickLinks: next });
                      }}
                    />
                    <input
                      className={`${inputClass} flex-1`}
                      placeholder="Href (e.g. /how-it-works)"
                      value={link.href}
                      onChange={(e) => {
                        const next = [...cfg.quickLinks];
                        next[index] = { ...next[index], href: e.target.value };
                        setAbout({ ...cfg, quickLinks: next });
                      }}
                    />
                    <button
                      onClick={() => removeQuickLink(index)}
                      className="text-[var(--color-error)] hover:opacity-70 cursor-pointer border-none bg-transparent p-1 self-center"
                      aria-label="Remove link"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ClCard>

        <ClCard className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Live preview</span>
          </div>
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-bg)] p-5 max-h-[600px] overflow-auto">
            <h1 className="font-[family-name:var(--font-display)] font-extrabold text-3xl md:text-4xl tracking-[-0.02em] leading-[1.2] mb-4">
              {cfg.heroTitle}
            </h1>
            {cfg.heroSubtitle && (
              <p className="text-[var(--color-text-secondary)] text-lg leading-relaxed mb-8 max-w-[680px]">
                {cfg.heroSubtitle}
              </p>
            )}

            <div className="space-y-10">
              {cfg.sections.map((section) => (
                <div key={section.id} className="space-y-3">
                  <h2 className="font-[family-name:var(--font-display)] font-bold text-[20px] text-[var(--color-text-primary)]">
                    {section.title}
                  </h2>
                  <div className="text-[14px] leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap">
                    {section.content}
                  </div>
                </div>
              ))}

              <div className="pt-6 border-t border-[var(--color-border)]">
                <h2 className="font-[family-name:var(--font-display)] font-bold text-[20px] text-[var(--color-text-primary)] mb-4">
                  Quick Links
                </h2>
                <div className="flex flex-wrap gap-2">
                  {cfg.quickLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.href}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] text-sm font-medium no-underline hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-raised)] transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ClCard>
      </div>
    </div>
  );
}