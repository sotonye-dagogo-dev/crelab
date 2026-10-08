"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  ClBadge,
  ClButton,
  ClCard,
  ClConfirmDialog,
  ClInput,
  ClSelect,
} from "@/components/ui";
import { CountdownWidget } from "@/components/shared/CountdownWidget";
import { useToast } from "@/lib/toast";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/countdown";
import { resolveCountdownIcon, resolveCountdownIconNames } from "@/lib/countdown-icons";
import type { CountdownArea, ICountdownWidget } from "@/types";

interface AdminConfigPayload {
  countdown?: {
    enabled?: boolean;
    iconAllowlist?: string[];
    widgets?: ICountdownWidget[];
  };
}

const AREAS: { value: CountdownArea; label: string }[] = [
  { value: "landing", label: "Landing" },
  { value: "explore", label: "Explore" },
];

function readWidgets(data: unknown): ICountdownWidget[] {
  const stored = (data as AdminConfigPayload | undefined)?.countdown?.widgets;
  if (!Array.isArray(stored)) return [];
  return [...stored].sort((a, b) => a.orderIndex - b.orderIndex);
}

function createWidget(orderIndex: number): ICountdownWidget {
  const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  endsAt.setSeconds(0, 0);
  return {
    id: crypto.randomUUID(),
    enabled: true,
    title: "New countdown",
    description: "",
    endsAt: endsAt.toISOString(),
    areas: ["landing"],
    orderIndex,
    icon: "Clock",
    ctaLabel: "",
    ctaHref: "",
  };
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)] mb-1.5">
      {children}
    </span>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-label={label}
      aria-pressed={checked}
      className="inline-flex items-center cursor-pointer bg-transparent border-none p-0"
    >
      <span
        className={`w-9 h-5 rounded-[9999px] relative transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-mid)]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </span>
    </button>
  );
}

const iconButtonClass =
  "inline-flex items-center justify-center w-8 h-8 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] cursor-pointer transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]";

export default function AdminCountdownPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [widgets, setWidgets] = useState<ICountdownWidget[] | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
    if (data) setWidgets(readWidgets(data));
  }, [data]);

  const config = (data ?? {}) as AdminConfigPayload;
  const masterEnabled = config.countdown?.enabled !== false;
  const allowlist = resolveCountdownIconNames(config.countdown?.iconAllowlist);

  const saveMutation = useMutation({
    mutationFn: async (next: ICountdownWidget[]) => {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "countdown.widgets", value: next }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to save");
      return json;
    },
    onSuccess: () => {
      toast("Countdown widgets saved", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-config"] });
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const updateWidget = (id: string, patch: Partial<ICountdownWidget>) => {
    setWidgets((prev) =>
      prev ? prev.map((w) => (w.id === id ? { ...w, ...patch } : w)) : prev,
    );
  };

  const handleAdd = () => {
    setWidgets((prev) => {
      const list = prev ?? [];
      return [...list, createWidget(list.length)];
    });
  };

  const handleMove = (id: string, direction: -1 | 1) => {
    setWidgets((prev) => {
      if (!prev) return prev;
      const index = prev.findIndex((w) => w.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const confirmDelete = () => {
    setWidgets((prev) =>
      prev ? prev.filter((w) => w.id !== pendingDeleteId) : prev,
    );
    setPendingDeleteId(null);
  };

  const handleSave = () => {
    if (!widgets) return;
    const invalid = widgets.find(
      (w) => !w.title.trim() || !w.endsAt || Number.isNaN(Date.parse(w.endsAt)),
    );
    if (invalid) {
      toast("Every widget needs a title and a valid end date", "error");
      return;
    }
    if (widgets.length === 0) {
      saveMutation.mutate([]);
      return;
    }
    saveMutation.mutate(widgets.map((w, index) => ({ ...w, orderIndex: index })));
  };

  const handleRevert = () => {
    if (data) {
      setWidgets(readWidgets(data));
      toast("Changes reverted", "info");
    }
  };

  if (isLoading || !widgets) {
    return (
      <div className="text-[var(--color-text-secondary)] text-[14px]">
        Loading countdown widgets...
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">
            Countdown Widgets
          </h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5 flex items-center gap-2 flex-wrap">
            <span>Timelines shown in the landing and explore countdown slots.</span>
            <ClBadge variant={masterEnabled ? "success" : "warning"}>
              {masterEnabled ? "Widgets enabled" : "Disabled in platform config"}
            </ClBadge>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ClButton variant="outlined" size="default" onClick={handleAdd}>
            <Plus size={14} strokeWidth={2.4} /> Add widget
          </ClButton>
          <ClButton
            variant="ghost"
            size="default"
            onClick={handleRevert}
            disabled={!data}
          >
            Revert
          </ClButton>
          <ClButton
            variant="primary"
            size="default"
            onClick={handleSave}
            loading={saveMutation.isPending}
          >
            Save Changes
          </ClButton>
        </div>
      </div>

      {widgets.length === 0 && (
        <ClCard className="p-8 text-center">
          <div className="text-[14px] font-semibold text-[var(--color-text-primary)]">
            No countdown widgets yet
          </div>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-1.5 mb-5 max-w-[440px] mx-auto leading-relaxed">
            Add one to show a launch, sale or event timeline on the landing or explore
            page. Slots stay hidden while the list is empty.
          </p>
          <ClButton variant="primary" size="default" onClick={handleAdd}>
            <Plus size={14} strokeWidth={2.4} /> Add widget
          </ClButton>
        </ClCard>
      )}

      {widgets.map((widget, index) => {
        const elapsed = Number.isNaN(Date.parse(widget.endsAt))
          ? true
          : Date.parse(widget.endsAt) <= Date.now();
        const Icon = resolveCountdownIcon(widget.icon);

        return (
          <ClCard key={widget.id} raised className="p-4 mb-4">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px] font-[family-name:var(--font-mono)] text-[var(--color-text-tertiary)]">
                  #{index + 1}
                </span>
                <ClBadge variant={widget.enabled ? "success" : "default"}>
                  {widget.enabled ? "Enabled" : "Disabled"}
                </ClBadge>
                <ClBadge variant="info">{widget.areas.join(" + ") || "no area"}</ClBadge>
                {elapsed && (
                  <ClBadge variant="warning">Elapsed — hidden on site</ClBadge>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className={iconButtonClass}
                  onClick={() => handleMove(widget.id, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${widget.title} up`}
                >
                  <ArrowUp size={14} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  className={iconButtonClass}
                  onClick={() => handleMove(widget.id, 1)}
                  disabled={index === widgets.length - 1}
                  aria-label={`Move ${widget.title} down`}
                >
                  <ArrowDown size={14} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  className={iconButtonClass}
                  onClick={() => setPendingDeleteId(widget.id)}
                  aria-label={`Delete ${widget.title}`}
                >
                  <Trash2 size={14} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Title</FieldLabel>
                <ClInput
                  value={widget.title}
                  onChange={(e) => updateWidget(widget.id, { title: e.target.value })}
                  placeholder="Launch week"
                />
              </div>
              <div>
                <FieldLabel>Ends at</FieldLabel>
                <ClInput
                  type="datetime-local"
                  value={toDatetimeLocalValue(widget.endsAt)}
                  onChange={(e) =>
                    updateWidget(widget.id, { endsAt: fromDatetimeLocalValue(e.target.value) })
                  }
                />
              </div>
              <div>
                <FieldLabel>Description</FieldLabel>
                <ClInput
                  value={widget.description ?? ""}
                  onChange={(e) => updateWidget(widget.id, { description: e.target.value })}
                  placeholder="Optional supporting copy"
                />
              </div>
              <div>
                <FieldLabel>Icon</FieldLabel>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <ClSelect
                      value={widget.icon ?? "Clock"}
                      onChange={(e) => updateWidget(widget.id, { icon: e.target.value })}
                    >
                      {allowlist.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </ClSelect>
                  </div>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--color-accent-muted)] border border-[var(--color-accent)]/20 text-[var(--color-accent)]">
                    <Icon size={16} strokeWidth={2} aria-hidden="true" />
                  </span>
                </div>
              </div>
              <div>
                <FieldLabel>CTA label</FieldLabel>
                <ClInput
                  value={widget.ctaLabel ?? ""}
                  onChange={(e) => updateWidget(widget.id, { ctaLabel: e.target.value })}
                  placeholder="Optional — e.g. Reserve your seat"
                />
              </div>
              <div>
                <FieldLabel>CTA link</FieldLabel>
                <ClInput
                  value={widget.ctaHref ?? ""}
                  onChange={(e) => updateWidget(widget.id, { ctaHref: e.target.value })}
                  placeholder="/explore or https://…"
                />
                <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
                  Relative paths stay in-app; full https:// URLs open in a new tab.
                </p>
              </div>
              <div>
                <FieldLabel>Areas</FieldLabel>
                <div className="flex items-center gap-4 h-10">
                  {AREAS.map((area) => {
                    const checked = widget.areas.includes(area.value);
                    return (
                      <label
                        key={area.value}
                        className="inline-flex items-center gap-2 text-[14px] text-[var(--color-text-primary)] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            updateWidget(widget.id, {
                              areas: checked
                                ? widget.areas.filter((a) => a !== area.value)
                                : [...widget.areas, area.value],
                            })
                          }
                          className="w-4 h-4 accent-[var(--color-accent)] cursor-pointer"
                        />
                        {area.label}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <FieldLabel>Enabled</FieldLabel>
                <div className="flex items-center h-10">
                  <Toggle
                    checked={widget.enabled}
                    onChange={(next) => updateWidget(widget.id, { enabled: next })}
                    label={`Toggle ${widget.title}`}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <FieldLabel>Live preview</FieldLabel>
              <div className="max-w-[560px]">
                <CountdownWidget widget={widget} preview />
              </div>
            </div>
          </ClCard>
        );
      })}

      <ClConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete countdown widget?"
        message="This widget will be removed from every slot on the site."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
