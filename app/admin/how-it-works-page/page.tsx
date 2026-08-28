"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClButton, ClCard, ClBadge } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { ArrowUp, ArrowDown, Trash2, Plus, GripVertical } from "lucide-react";
import type { IHowItWorksPage } from "@/types";

const inputClass =
  "h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)]";

const labelClass =
  "block mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]";

const DEFAULT_HOW_IT_WORKS: IHowItWorksPage = {
  id: "how-it-works-1",
  heroTitle: "How It Works",
  heroSubtitle: "Everything you need to know to get started — whether you're a creator looking for work or a brand searching for talent.",
  sections: [
    {
      id: "for-creators",
      title: "For Creators",
      subtitle: "Turn your creativity into income",
      steps: [
        { step: 1, title: "Create Your Profile", description: "Showcase your work, set your rates, and define your niche. Add portfolio items from your device or sync from Google Drive." },
        { step: 2, title: "Get Discovered", description: "Brands browse our Explore feed and search for creators like you. Your profile appears in relevant searches based on your category, location, and tags." },
        { step: 3, title: "Receive Booking Requests", description: "Clients send booking requests with project details. You can accept, decline, or negotiate scope and timeline." },
        { step: 4, title: "Deliver & Get Paid", description: "Work is protected by escrow. Funds are held securely and released automatically after completion (or when you mark milestones as done)." },
      ],
    },
    {
      id: "for-clients",
      title: "For Clients & Brands",
      subtitle: "Find the right creative talent, fast",
      steps: [
        { step: 1, title: "Browse & Search", description: "Explore creators by category, location, experience level, and budget. Watch video portfolios to evaluate style and quality." },
        { step: 2, title: "Book with Confidence", description: "Select a package, set a date, and pay securely. Your payment is held in escrow until the work is delivered to your satisfaction." },
        { step: 3, title: "Collaborate Seamlessly", description: "Communicate directly with your creator, share briefs, and track progress. Milestone payments keep larger projects on track." },
        { step: 4, title: "Review & Release", description: "Review deliverables, request revisions if needed, and release payment. Leave a review to help the community." },
      ],
    },
    {
      id: "escrow",
      title: "Secure Payments with Escrow",
      subtitle: "Your money is protected every step of the way",
      steps: [
        { step: 1, title: "Payment Held in Escrow", description: "When you book, funds are securely held by our payment partner (Paystack) — not released to the creator until you're happy." },
        { step: 2, title: "Auto-Release Timeline", description: "If no dispute is raised, funds auto-release 5 days after the service date. You're always in control." },
        { step: 3, title: "Dispute Resolution", description: "If something goes wrong, our admin team mediates. We review evidence from both sides and make a fair decision." },
        { step: 4, title: "Milestone Payments", description: "For larger projects, split payments into milestones. Each milestone is funded upfront and released upon approval." },
      ],
    },
  ],
  sandboxes: [
    { id: "booking-flow", title: "Booking Flow Simulator", description: "Experience the end-to-end booking process as a client or creator", type: "booking-simulator" },
    { id: "escrow-timeline", title: "Escrow Timeline Explorer", description: "Visualize how escrow works — from payment to release or dispute", type: "escrow-timeline" },
    { id: "pricing-calculator", title: "Pricing Calculator", description: "Estimate costs for different project types and creator levels", type: "pricing-calculator" },
    { id: "search-simulator", title: "Search & Discovery Simulator", description: "See how creators appear in search results based on profile completeness", type: "search-simulator" },
  ],
  faqs: [
    { question: "How do I get paid as a creator?", answer: "Payments are held in escrow via Paystack. Once the client approves your work (or after 5 days with no dispute), funds are automatically released to your CreLab wallet. You can withdraw to your bank account anytime.", category: "payments" },
    { question: "What's the platform fee?", answer: "CreLab charges a 5% platform fee on each booking. This covers payment processing, escrow protection, platform maintenance, and support.", category: "payments" },
    { question: "Can I cancel a booking?", answer: "Yes. Full refunds are available within 48 hours of booking. After that, a 50% cancellation fee applies to protect the creator's time.", category: "bookings" },
    { question: "How do I build my portfolio?", answer: "Upload videos and images directly, or connect Google Drive to sync your existing portfolio. Portfolio items appear on your public profile and in the Explore feed.", category: "creators" },
    { question: "What types of creators can I hire?", answer: "We support Content Creators (UGC, lifestyle, brand content) and Cinematographers/Videographers (events, commercials, narrative, documentary). Each has tailored profile fields.", category: "clients" },
    { question: "Is my data secure?", answer: "Yes. We use bank-grade encryption, row-level database security, and comply with NDPR 2023. Payment data is handled by Paystack (PCI DSS Level 1 certified).", category: "security" },
  ],
  metaTitle: "How It Works - Crellab",
  metaDescription: "Learn how Crellab works for creators and clients. Booking flow, escrow protection, milestone payments, and more.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export default function AdminHowItWorksPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState<IHowItWorksPage | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-how-it-works-page"],
    queryFn: async () => {
      const res = await fetch("/api/admin/how-it-works-page");
      const json = await res.json();
      if (json.success) return json.data;
      throw new Error(json.error ?? "Failed to load How It Works page content");
    },
  });

  useEffect(() => {
    if (data) {
      setPage(data);
    } else {
      setPage(DEFAULT_HOW_IT_WORKS);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: IHowItWorksPage) => {
      const res = await fetch("/api/admin/how-it-works-page", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to save");
      return json;
    },
    onSuccess: () => {
      toast("How It Works page content saved", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-how-it-works-page"] });
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  // Section helpers
  const addSection = () => {
    if (!page) return;
    const newSection = {
      id: `section-${Date.now()}`,
      title: "",
      subtitle: "",
      steps: [{ step: 1, title: "", description: "" }],
    };
    setPage({ ...page, sections: [...page.sections, newSection] });
  };

  const removeSection = (index: number) => {
    if (!page) return;
    setPage({ ...page, sections: page.sections.filter((_, i) => i !== index) });
  };

  const moveSection = (index: number, delta: number) => {
    if (!page) return;
    const next = [...page.sections];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPage({ ...page, sections: next });
  };

  const addStep = (sectionIndex: number) => {
    if (!page) return;
    const next = [...page.sections];
    const newStep = { step: next[sectionIndex].steps.length + 1, title: "", description: "" };
    next[sectionIndex] = { ...next[sectionIndex], steps: [...next[sectionIndex].steps, newStep] };
    setPage({ ...page, sections: next });
  };

  const removeStep = (sectionIndex: number, stepIndex: number) => {
    if (!page) return;
    const next = [...page.sections];
    next[sectionIndex] = { ...next[sectionIndex], steps: next[sectionIndex].steps.filter((_, i) => i !== stepIndex) };
    // Renumber steps
    next[sectionIndex].steps.forEach((s, i) => { s.step = i + 1; });
    setPage({ ...page, sections: next });
  };

  const moveStep = (sectionIndex: number, stepIndex: number, delta: number) => {
    if (!page) return;
    const next = [...page.sections];
    const target = stepIndex + delta;
    if (target < 0 || target >= next[sectionIndex].steps.length) return;
    [next[sectionIndex].steps[stepIndex], next[sectionIndex].steps[target]] = [next[sectionIndex].steps[target], next[sectionIndex].steps[stepIndex]];
    // Renumber steps
    next[sectionIndex].steps.forEach((s, i) => { s.step = i + 1; });
    setPage({ ...page, sections: next });
  };

  // Sandbox helpers
  const addSandbox = () => {
    if (!page) return;
    setPage({ ...page, sandboxes: [...page.sandboxes, { id: `sandbox-${Date.now()}`, title: "", description: "", type: "" }] });
  };

  const removeSandbox = (index: number) => {
    if (!page) return;
    setPage({ ...page, sandboxes: page.sandboxes.filter((_, i) => i !== index) });
  };

  // FAQ helpers
  const addFaq = () => {
    if (!page) return;
    setPage({ ...page, faqs: [...page.faqs, { question: "", answer: "", category: "" }] });
  };

  const removeFaq = (index: number) => {
    if (!page) return;
    setPage({ ...page, faqs: page.faqs.filter((_, i) => i !== index) });
  };

  const handleSave = () => {
    if (!page) return;
    saveMutation.mutate(page);
  };

  if (isLoading) {
    return (
      <div className="text-[var(--color-text-secondary)] text-[14px]">
        Loading How It Works page content...
      </div>
    );
  }

  const cfg = page ?? DEFAULT_HOW_IT_WORKS;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">
            How It Works Page Content
          </h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Edit the How It Works page content including guides, interactive sandboxes, and FAQs. All changes are config-driven and previewed live.
          </div>
        </div>
        <ClButton variant="primary" size="default" onClick={handleSave} loading={saveMutation.isPending}>
          Save How It Works Page
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
                onChange={(e) => setPage({ ...cfg, heroTitle: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Hero subtitle</label>
              <textarea
                className={`${inputClass} h-auto py-2 resize-y`}
                rows={2}
                value={cfg.heroSubtitle ?? ""}
                onChange={(e) => setPage({ ...cfg, heroSubtitle: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Meta title (SEO)</label>
              <input
                className={inputClass}
                value={cfg.metaTitle ?? ""}
                onChange={(e) => setPage({ ...cfg, metaTitle: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Meta description (SEO)</label>
              <textarea
                className={`${inputClass} h-auto py-2 resize-y`}
                rows={2}
                value={cfg.metaDescription ?? ""}
                onChange={(e) => setPage({ ...cfg, metaDescription: e.target.value })}
              />
            </div>

            {/* Sections */}
            <div className="border-t border-[var(--color-border)] pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass}>Process sections</label>
                <ClButton variant="outlined" size="sm" onClick={addSection}>
                  <Plus size={14} strokeWidth={2} className="inline mr-1" />
                  Add section
                </ClButton>
              </div>
              <div className="flex flex-col gap-4">
                {cfg.sections.map((section, sIndex) => (
                  <div
                    key={section.id}
                    className="flex flex-col gap-2 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical size={14} strokeWidth={1.5} className="text-[var(--color-text-tertiary)] cursor-grab" />
                        <span className="text-[12px] text-[var(--color-text-tertiary)]">Section {sIndex + 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveSection(sIndex, -1)}
                          disabled={sIndex === 0}
                          className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer disabled:opacity-40 border-none bg-transparent p-1"
                          aria-label="Move section up"
                        >
                          <ArrowUp size={12} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => moveSection(sIndex, 1)}
                          disabled={sIndex === cfg.sections.length - 1}
                          className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer disabled:opacity-40 border-none bg-transparent p-1"
                          aria-label="Move section down"
                        >
                          <ArrowDown size={12} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => removeSection(sIndex)}
                          className="text-[var(--color-error)] hover:opacity-70 cursor-pointer border-none bg-transparent p-1"
                          aria-label="Remove section"
                        >
                          <Trash2 size={12} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Section title</label>
                        <input
                          className={inputClass}
                          value={section.title}
                          onChange={(e) => {
                            const next = [...cfg.sections];
                            next[sIndex] = { ...next[sIndex], title: e.target.value };
                            setPage({ ...cfg, sections: next });
                          }}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Section subtitle</label>
                        <input
                          className={inputClass}
                          value={section.subtitle ?? ""}
                          onChange={(e) => {
                            const next = [...cfg.sections];
                            next[sIndex] = { ...next[sIndex], subtitle: e.target.value };
                            setPage({ ...cfg, sections: next });
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {section.steps.map((step, stepIndex) => (
                        <div
                          key={stepIndex}
                          className="flex items-center gap-2 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                        >
                          <span className="w-6 text-center text-[11px] font-[family-name:var(--font-mono)] text-[var(--color-text-tertiary)]">
                            {step.step}
                          </span>
                          <div className="flex-1 min-w-0">
                            <input
                              className={`${inputClass} text-sm`}
                              placeholder="Step title"
                              value={step.title}
                              onChange={(e) => {
                                const next = [...cfg.sections];
                                next[sIndex] = { ...next[sIndex], steps: [...next[sIndex].steps] };
                                next[sIndex].steps[stepIndex] = { ...next[sIndex].steps[stepIndex], title: e.target.value };
                                setPage({ ...cfg, sections: next });
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <input
                              className={`${inputClass} text-sm`}
                              placeholder="Step description"
                              value={step.description}
                              onChange={(e) => {
                                const next = [...cfg.sections];
                                next[sIndex] = { ...next[sIndex], steps: [...next[sIndex].steps] };
                                next[sIndex].steps[stepIndex] = { ...next[sIndex].steps[stepIndex], description: e.target.value };
                                setPage({ ...cfg, sections: next });
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveStep(sIndex, stepIndex, -1)}
                              disabled={stepIndex === 0}
                              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer disabled:opacity-40 border-none bg-transparent p-1"
                              aria-label="Move step up"
                            >
                              <ArrowUp size={12} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => moveStep(sIndex, stepIndex, 1)}
                              disabled={stepIndex === section.steps.length - 1}
                              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer disabled:opacity-40 border-none bg-transparent p-1"
                              aria-label="Move step down"
                            >
                              <ArrowDown size={12} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => removeStep(sIndex, stepIndex)}
                              className="text-[var(--color-error)] hover:opacity-70 cursor-pointer border-none bg-transparent p-1"
                              aria-label="Remove step"
                            >
                              <Trash2 size={12} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      ))}
                      <ClButton variant="ghost" size="sm" onClick={() => addStep(sIndex)} className="w-full">
                        <Plus size={14} strokeWidth={2} className="inline mr-1" />
                        Add step
                      </ClButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sandboxes */}
            <div className="border-t border-[var(--color-border)] pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass}>Interactive sandboxes</label>
                <ClButton variant="outlined" size="sm" onClick={addSandbox}>
                  <Plus size={14} strokeWidth={2} className="inline mr-1" />
                  Add sandbox
                </ClButton>
              </div>
              <div className="flex flex-col gap-2">
                {cfg.sandboxes.map((sandbox, index) => (
                  <div
                    key={sandbox.id}
                    className="flex gap-2 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3"
                  >
                    <input
                      className={`${inputClass} flex-1`}
                      placeholder="Title"
                      value={sandbox.title}
                      onChange={(e) => {
                        const next = [...cfg.sandboxes];
                        next[index] = { ...next[index], title: e.target.value };
                        setPage({ ...cfg, sandboxes: next });
                      }}
                    />
                    <input
                      className={`${inputClass} flex-1`}
                      placeholder="Description"
                      value={sandbox.description}
                      onChange={(e) => {
                        const next = [...cfg.sandboxes];
                        next[index] = { ...next[index], description: e.target.value };
                        setPage({ ...cfg, sandboxes: next });
                      }}
                    />
                    <input
                      className={`${inputClass} w-48`}
                      placeholder="Type (e.g. booking-simulator)"
                      value={sandbox.type}
                      onChange={(e) => {
                        const next = [...cfg.sandboxes];
                        next[index] = { ...next[index], type: e.target.value };
                        setPage({ ...cfg, sandboxes: next });
                      }}
                    />
                    <button
                      onClick={() => removeSandbox(index)}
                      className="text-[var(--color-error)] hover:opacity-70 cursor-pointer border-none bg-transparent p-1 self-center"
                      aria-label="Remove sandbox"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQs */}
            <div className="border-t border-[var(--color-border)] pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass}>FAQs</label>
                <ClButton variant="outlined" size="sm" onClick={addFaq}>
                  <Plus size={14} strokeWidth={2} className="inline mr-1" />
                  Add FAQ
                </ClButton>
              </div>
              <div className="flex flex-col gap-2">
                {cfg.faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-center text-[11px] font-[family-name:var(--font-mono)] text-[var(--color-text-tertiary)]">
                        {index + 1}
                      </span>
                      <ClBadge variant="info" className="text-[10px]">
                        {faq.category}
                      </ClBadge>
                    </div>
                    <div>
                      <label className={labelClass}>Question</label>
                      <input
                        className={inputClass}
                        value={faq.question}
                        onChange={(e) => {
                          const next = [...cfg.faqs];
                          next[index] = { ...next[index], question: e.target.value };
                          setPage({ ...cfg, faqs: next });
                        }}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Answer</label>
                      <textarea
                        className={`${inputClass} h-auto py-2 resize-y`}
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => {
                          const next = [...cfg.faqs];
                          next[index] = { ...next[index], answer: e.target.value };
                          setPage({ ...cfg, faqs: next });
                        }}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Category</label>
                      <input
                        className={inputClass}
                        value={faq.category}
                        onChange={(e) => {
                          const next = [...cfg.faqs];
                          next[index] = { ...next[index], category: e.target.value };
                          setPage({ ...cfg, faqs: next });
                        }}
                      />
                    </div>
                    <button
                      onClick={() => removeFaq(index)}
                      className="text-[var(--color-error)] hover:opacity-70 cursor-pointer border-none bg-transparent p-1 self-start"
                      aria-label="Remove FAQ"
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
                <div key={section.id} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h2 className="font-[family-name:var(--font-display)] font-bold text-[20px] text-[var(--color-text-primary)]">
                      {section.title}
                    </h2>
                    {section.subtitle && (
                      <span className="text-[var(--color-text-secondary)] text-sm">{section.subtitle}</span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {section.steps.map((step) => (
                      <div key={step.step} className="flex gap-3 p-3 rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)]">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-accent)] text-[var(--color-text-inverse)] flex items-center justify-center font-bold text-sm">
                          {step.step}
                        </div>
                        <div>
                          <h4 className="font-[family-name:var(--font-display)] font-medium text-[14px] text-[var(--color-text-primary)]">
                            {step.title}
                          </h4>
                          <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-6 border-t border-[var(--color-border)]">
                <h2 className="font-[family-name:var(--font-display)] font-bold text-[20px] text-[var(--color-text-primary)] mb-4">
                  Interactive Sandboxes
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {cfg.sandboxes.map((sandbox) => (
                    <div key={sandbox.id} className="p-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)]">
                      <h4 className="font-[family-name:var(--font-display)] font-medium text-[13px] text-[var(--color-text-primary)]">
                        {sandbox.title}
                      </h4>
                      <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">{sandbox.description}</p>
                      <span className="inline-block mt-2 px-2 py-0.5 rounded-[4px] bg-[var(--color-accent-muted)] text-[var(--color-accent)] text-[10px] font-medium">
                        {sandbox.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-[var(--color-border)]">
                <h2 className="font-[family-name:var(--font-display)] font-bold text-[20px] text-[var(--color-text-primary)] mb-4">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-2">
                  {cfg.faqs.map((faq) => (
                    <div key={faq.question} className="p-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)]">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-[family-name:var(--font-display)] font-medium text-[13px] text-[var(--color-text-primary)] flex-1">
                          {faq.question}
                        </h4>
                        <ClBadge variant="info" className="text-[9px]">
                          {faq.category}
                        </ClBadge>
                      </div>
                      <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
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