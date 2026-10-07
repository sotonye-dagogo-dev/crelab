"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClBadge,
  ClButton,
  ClConfirmDialog,
  ClDataTable,
  ClEmptyState,
  ClModal,
  ClSelect,
  ClTextarea,
  ClErrorState,
  type ClColumn,
} from "@/components/ui";
import { ContentBlocksEditor } from "@/components/admin/ContentBlocksEditor";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { useToast } from "@/lib/toast";
import { webinarStatusLabel, webinarStatusVariant } from "@/lib/webinars";
import type { EmailTemplateBlock, IWebinar, WebinarStatus } from "@/types";
import { Edit3, Eye, Plus, Power, Trash2, Users } from "lucide-react";

const inputClass =
  "h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)]";
const labelClass =
  "block mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]";

const STATUSES: WebinarStatus[] = ["UPCOMING", "LIVE", "CANCELLED", "ENDED"];

interface WebinarDraft {
  id?: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  coverUrl: string;
  status: WebinarStatus;
  /** `datetime-local` value in the admin's timezone ("" = unset) */
  startsAt: string;
  endsAt: string;
  durationMinutes: string;
  locationNote: string;
  ctaLabel: string;
  ctaHref: string;
  recordingUrl: string;
  metaTitle: string;
  metaDescription: string;
  orderIndex: string;
  active: boolean;
  blocks: EmailTemplateBlock[];
}

function emptyDraft(): WebinarDraft {
  return {
    title: "",
    slug: "",
    subtitle: "",
    description: "",
    coverUrl: "",
    status: "UPCOMING",
    startsAt: "",
    endsAt: "",
    durationMinutes: "",
    locationNote: "",
    ctaLabel: "",
    ctaHref: "",
    recordingUrl: "",
    metaTitle: "",
    metaDescription: "",
    orderIndex: "0",
    active: true,
    blocks: [],
  };
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDraft(webinar: IWebinar): WebinarDraft {
  return {
    id: webinar.id,
    title: webinar.title,
    slug: webinar.slug,
    subtitle: webinar.subtitle ?? "",
    description: webinar.description ?? "",
    coverUrl: webinar.coverUrl ?? "",
    status: webinar.status,
    startsAt: toLocalInput(webinar.startsAt),
    endsAt: toLocalInput(webinar.endsAt),
    durationMinutes: webinar.durationMinutes != null ? String(webinar.durationMinutes) : "",
    locationNote: webinar.locationNote ?? "",
    ctaLabel: webinar.ctaLabel ?? "",
    ctaHref: webinar.ctaHref ?? "",
    recordingUrl: webinar.recordingUrl ?? "",
    metaTitle: webinar.metaTitle ?? "",
    metaDescription: webinar.metaDescription ?? "",
    orderIndex: String(webinar.orderIndex ?? 0),
    active: webinar.active,
    blocks: Array.isArray(webinar.contentBlocks) ? webinar.contentBlocks : [],
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function payloadFrom(draft: WebinarDraft) {
  const duration = Number(draft.durationMinutes);
  return {
    title: draft.title.trim(),
    slug: draft.slug.trim(),
    subtitle: draft.subtitle.trim() || null,
    description: draft.description.trim() || null,
    coverUrl: draft.coverUrl.trim() || null,
    status: draft.status,
    startsAt: fromLocalInput(draft.startsAt),
    endsAt: fromLocalInput(draft.endsAt),
    durationMinutes: draft.durationMinutes && Number.isFinite(duration) && duration > 0 ? Math.floor(duration) : null,
    locationNote: draft.locationNote.trim() || null,
    ctaLabel: draft.ctaLabel.trim() || null,
    ctaHref: draft.ctaHref.trim() || null,
    recordingUrl: draft.recordingUrl.trim() || null,
    metaTitle: draft.metaTitle.trim() || null,
    metaDescription: draft.metaDescription.trim() || null,
    orderIndex: Number.isFinite(Number(draft.orderIndex)) ? Math.max(0, Math.floor(Number(draft.orderIndex))) : 0,
    active: draft.active,
    contentBlocks: draft.blocks,
  };
}

export default function AdminWebinarsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<WebinarDraft>(emptyDraft());
  const [webinarToDelete, setWebinarToDelete] = useState<IWebinar | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: webinars = [], isLoading, isError, refetch } = useQuery<IWebinar[]>({
    queryKey: ["admin-webinars"],
    queryFn: async () => {
      const res = await fetch("/api/admin/webinars");
      const json = await res.json();
      if (json.success) return json.data ?? [];
      throw new Error(json.error ?? "Failed to load webinars");
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-webinars"] });

  const saveMutation = useMutation({
    mutationFn: async (d: WebinarDraft) => {
      const res = await fetch(d.id ? `/api/admin/webinars/${d.id}` : "/api/admin/webinars", {
        method: d.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFrom(d)),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(typeof json.error === "string" ? json.error : "Failed to save webinar");
      }
      return json.data as IWebinar;
    },
    onSuccess: () => {
      toast("Webinar saved", "success");
      setEditorOpen(false);
      setDraft(emptyDraft());
      invalidate();
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const toggleActive = useMutation({
    mutationFn: async (webinar: IWebinar) => {
      const res = await fetch(`/api/admin/webinars/${webinar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !webinar.active }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(typeof json.error === "string" ? json.error : "Failed to update webinar");
      }
      return json.data as IWebinar;
    },
    onSuccess: (updated) => {
      toast(updated.active ? "Webinar is active" : "Webinar hidden", "success");
      invalidate();
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const deleteWebinar = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/webinars/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to delete webinar");
      toast("Webinar deleted", "info");
      setWebinarToDelete(null);
      invalidate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  const columns: ClColumn<IWebinar>[] = [
    {
      key: "title",
      header: "Webinar",
      cell: (w) => (
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-[var(--color-text-primary)] truncate max-w-[260px]">
            {w.title}
          </div>
          <div className="text-[11px] text-[var(--color-text-tertiary)] truncate max-w-[260px]">
            /webinars/{w.slug}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (w) => (
        <ClBadge variant={webinarStatusVariant(w.status)}>{webinarStatusLabel(w.status)}</ClBadge>
      ),
    },
    {
      key: "startsAt",
      header: "Starts",
      hideOnMobile: true,
      cell: (w) => (
        <span className="text-[12px] text-[var(--color-text-secondary)]">
          {w.startsAt ? new Date(w.startsAt).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "registrations",
      header: "Registrations",
      cell: (w) => (
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-text-primary)]">
          <Users size={13} strokeWidth={1.8} className="text-[var(--color-text-tertiary)]" />
          {w.registrationCount ?? 0}
        </span>
      ),
    },
    {
      key: "active",
      header: "Visibility",
      cell: (w) =>
        w.active ? (
          <ClBadge variant="success">Active</ClBadge>
        ) : (
          <ClBadge variant="default">Hidden</ClBadge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (w) => (
        <div className="flex items-center gap-1">
          <a
            href="/webinars"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-7 h-7 rounded-[6px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]"
            aria-label="View public page"
          >
            <Eye size={14} strokeWidth={1.8} />
          </a>
          <button
            onClick={() => {
              setDraft(toDraft(w));
              setEditorOpen(true);
            }}
            className="inline-flex items-center justify-center w-7 h-7 rounded-[6px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-raised)] cursor-pointer border-none"
            aria-label="Edit webinar"
          >
            <Edit3 size={14} strokeWidth={1.8} />
          </button>
          <button
            onClick={() => toggleActive.mutate(w)}
            disabled={toggleActive.isPending}
            className="inline-flex items-center justify-center w-7 h-7 rounded-[6px] text-[var(--color-text-tertiary)] hover:text-[var(--color-success)] hover:bg-[var(--color-surface-raised)] cursor-pointer border-none disabled:opacity-50"
            aria-label={w.active ? "Hide webinar" : "Activate webinar"}
            title={w.active ? "Hide from the public page" : "Publish to the public page"}
          >
            <Power size={14} strokeWidth={1.8} />
          </button>
          <button
            onClick={() => setWebinarToDelete(w)}
            className="inline-flex items-center justify-center w-7 h-7 rounded-[6px] text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-surface-raised)] cursor-pointer border-none"
            aria-label="Delete webinar"
          >
            <Trash2 size={14} strokeWidth={1.8} />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <div className="text-[var(--color-text-secondary)] text-[14px]">Loading webinars...</div>;
  }

  if (isError) {
    return (
      <ClErrorState
        title="Webinars failed to load"
        message="There was a problem loading the webinars. Try again — if it keeps happening, check the server logs."
        action={{ label: "Try again", onClick: () => refetch() }}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">
            Webinars
          </h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Schedule sessions, manage registration and publish recordings or materials to the
            public webinars page.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/webinars"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-[8px] border border-[var(--color-border-mid)] text-[13px] font-semibold text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
          >
            <Eye size={15} strokeWidth={1.8} />
            Public page
          </Link>
          <ClButton
            variant="primary"
            size="default"
            onClick={() => {
              setDraft(emptyDraft());
              setEditorOpen(true);
            }}
          >
            <Plus size={15} strokeWidth={2} /> New Webinar
          </ClButton>
        </div>
      </div>

      <ClDataTable
        columns={columns}
        rows={webinars}
        rowKey={(w) => w.id}
        pageSize={10}
        emptyState={
          <ClEmptyState
            title="No webinars yet"
            message="Create your first session to start taking registrations on the public page."
            className="py-10"
          />
        }
      />

      {editorOpen && (
        <ClModal
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          size="lg"
          title={draft.id ? "Edit Webinar" : "New Webinar"}
          description="Sessions appear on /webinars while they are active and not cancelled."
          footer={
            <>
              <div className="flex items-center gap-2 mr-auto">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                  className="w-4 h-4 rounded accent-[var(--color-accent)] cursor-pointer"
                />
                <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">
                  Visible on the public page
                </span>
              </div>
              <ClButton
                variant="ghost"
                size="default"
                onClick={() => setEditorOpen(false)}
                disabled={saveMutation.isPending}
              >
                Cancel
              </ClButton>
              <ClButton
                variant="primary"
                size="default"
                loading={saveMutation.isPending}
                disabled={!draft.title.trim() || !draft.slug.trim()}
                onClick={() => saveMutation.mutate(draft)}
              >
                {draft.id ? "Save Changes" : "Create Webinar"}
              </ClButton>
            </>
          }
        >
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Pricing Your Creative Work"
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      title: e.target.value,
                      slug: draft.slug || slugify(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Slug</label>
                <input
                  className={inputClass}
                  placeholder="pricing-your-creative-work"
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Subtitle</label>
                <input
                  className={inputClass}
                  placeholder="Short line under the title on the card"
                  value={draft.subtitle}
                  onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Description</label>
                <ClTextarea
                  rows={3}
                  placeholder="What the session covers and who it is for."
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <ClSelect
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value as WebinarStatus })}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {webinarStatusLabel(status)}
                    </option>
                  ))}
                </ClSelect>
              </div>
              <div>
                <label className={labelClass}>Order index</label>
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  value={draft.orderIndex}
                  onChange={(e) => setDraft({ ...draft, orderIndex: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Starts at</label>
                <input
                  className={inputClass}
                  type="datetime-local"
                  value={draft.startsAt}
                  onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Ends at</label>
                <input
                  className={inputClass}
                  type="datetime-local"
                  value={draft.endsAt}
                  onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Duration (minutes)</label>
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  max={1440}
                  placeholder="60"
                  value={draft.durationMinutes}
                  onChange={(e) => setDraft({ ...draft, durationMinutes: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Location note</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Zoom — link sent by email"
                  value={draft.locationNote}
                  onChange={(e) => setDraft({ ...draft, locationNote: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>CTA label</label>
                <input
                  className={inputClass}
                  placeholder="Reserve my seat"
                  value={draft.ctaLabel}
                  onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>CTA link</label>
                <input
                  className={inputClass}
                  placeholder="/webinars or https://…"
                  value={draft.ctaHref}
                  onChange={(e) => setDraft({ ...draft, ctaHref: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Recording URL (past sessions)</label>
                <input
                  className={inputClass}
                  placeholder="https://youtube.com/watch?v=…"
                  value={draft.recordingUrl}
                  onChange={(e) => setDraft({ ...draft, recordingUrl: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <ImageUploadField
                  label="Cover image"
                  value={draft.coverUrl}
                  onChange={(url) => setDraft({ ...draft, coverUrl: url })}
                  helper="Shown at the top of the webinar card. Upload or paste a link."
                />
              </div>
              <div>
                <label className={labelClass}>Meta title</label>
                <input
                  className={inputClass}
                  placeholder="Defaults to the webinar title"
                  value={draft.metaTitle}
                  onChange={(e) => setDraft({ ...draft, metaTitle: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Meta description</label>
                <input
                  className={inputClass}
                  placeholder="Short summary for search results."
                  value={draft.metaDescription}
                  onChange={(e) => setDraft({ ...draft, metaDescription: e.target.value })}
                />
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
              <div className="mb-3">
                <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                  Session materials
                </div>
                <div className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
                  Shown on the card for past sessions — agenda, links, takeaways. Recording links
                  go in the field above.
                </div>
              </div>
              <ContentBlocksEditor
                blocks={draft.blocks}
                onChange={(blocks) => setDraft({ ...draft, blocks })}
              />
            </div>
          </div>
        </ClModal>
      )}

      <ClConfirmDialog
        open={webinarToDelete !== null}
        title="Delete webinar"
        message={`Permanently delete "${webinarToDelete?.title}" and its registrations? This cannot be undone.`}
        confirmLabel="Delete webinar"
        loading={deleting}
        onConfirm={() => webinarToDelete && deleteWebinar(webinarToDelete.id)}
        onCancel={() => setWebinarToDelete(null)}
      />
    </div>
  );
}
