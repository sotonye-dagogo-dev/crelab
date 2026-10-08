"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClButton, ClCard, ClConfirmDialog, ClDataTable, type ClColumn } from "@/components/ui";
import { TeamMemberModal } from "@/components/admin/TeamMemberModal";
import { useToast } from "@/lib/toast";
import { useUndoable } from "@/lib/use-undoable";
import { useBatchSelect, BatchToolbar } from "@/components/admin/BatchOperations";
import type { ITeamMember } from "@/types";

const TEAM_PAGE_DEFAULTS = {
  hiringEnabled: true,
  hiringTitle: "Want to be part of the team?",
  hiringSubtitle: "We are always looking for talented people who share our vision.",
  hiringCtaLabel: "View Open Positions",
  hiringCtaHref: "/about",
};

function TeamPageSettings() {
  const { toast } = useToast();
  const [values, setValues] = useState(TEAM_PAGE_DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.teamPage) {
          setValues({ ...TEAM_PAGE_DEFAULTS, ...json.data.teamPage });
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const set = (key: keyof typeof TEAM_PAGE_DEFAULTS, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(values)) {
        const res = await fetch("/api/admin/config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: `teamPage.${key}`, value }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? `Failed to save teamPage.${key}`);
      }
      toast("Team page settings saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[13px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)]";
  const labelClass =
    "block mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]";

  return (
    <ClCard className="p-5 sm:p-6">
      <h3 className="font-[family-name:var(--font-display)] font-bold text-[16px] tracking-[-0.01em]">
        Page settings
      </h3>
      <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5 mb-4">
        Controls the “join the team / open positions” block on the public /team page. The link
        accepts a relative path (e.g. /bug-report) or a full URL (https://…, mailto:…).
      </p>
      {!loaded ? (
        <div className="text-[13px] text-[var(--color-text-secondary)]">Loading settings…</div>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[var(--color-text-primary)]">
            <button
              role="switch"
              aria-checked={values.hiringEnabled}
              onClick={() => set("hiringEnabled", !values.hiringEnabled)}
              className={`inline-flex items-center w-9 h-5 rounded-[9999px] relative transition-colors cursor-pointer border-none ${
                values.hiringEnabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-mid)]"
              }`}
              aria-label="Toggle hiring block"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  values.hiringEnabled ? "translate-x-4" : ""
                }`}
              />
            </button>
            Show hiring block on the public team page
          </label>
          <div>
            <label className={labelClass}>Heading</label>
            <input
              className={inputClass}
              value={values.hiringTitle}
              onChange={(e) => set("hiringTitle", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Subheading</label>
            <input
              className={inputClass}
              value={values.hiringSubtitle}
              onChange={(e) => set("hiringSubtitle", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Button label</label>
              <input
                className={inputClass}
                value={values.hiringCtaLabel}
                onChange={(e) => set("hiringCtaLabel", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Button link</label>
              <input
                className={inputClass}
                value={values.hiringCtaHref}
                onChange={(e) => set("hiringCtaHref", e.target.value)}
                placeholder="https://… or mailto:… or /path"
              />
            </div>
          </div>
          <div>
            <ClButton variant="primary" size="default" onClick={handleSave} loading={saving}>
              Save settings
            </ClButton>
          </div>
        </div>
      )}
    </ClCard>
  );
}

export default function AdminTeamPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const undoable = useUndoable();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ITeamMember | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<ITeamMember | null>(null);
  const { selectedIds, toggleSelect, selectAll, invertSelect, clearSelection } = useBatchSelect<string>();

  const { data: members = [], isLoading } = useQuery<ITeamMember[]>({
    queryKey: ["admin-team"],
    queryFn: async () => {
      const res = await fetch("/api/admin/team");
      const json = await res.json();
      if (json.success) return json.data ?? [];
      throw new Error(json.error ?? "Failed to load team members");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/team/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to delete");
    },
    onSuccess: () => {
      toast("Team member deleted", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-team"] });
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/admin/team/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to toggle");
    },
    onSuccess: () => {
      toast("Member status updated", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-team"] });
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const restoreMember = async (member: ITeamMember) => {
    const res = await fetch("/api/admin/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: member.name,
        role: member.role,
        bio: member.bio,
        avatarUrl: member.avatarUrl,
        socialLinks: member.socialLinks,
        orderIndex: member.orderIndex,
        active: member.active,
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? "Failed to restore member");
    queryClient.invalidateQueries({ queryKey: ["admin-team"] });
  };

  const handleConfirmDelete = () => {
    if (!memberToDelete) return;
    const member = memberToDelete;
    setMemberToDelete(null);
    undoable({
      execute: async () => {
        await deleteMutation.mutateAsync(member.id);
      },
      undo: async () => {
        await restoreMember(member);
      },
      successMessage: "Team member deleted",
    });
  };

  const batchMutation = useMutation({
    mutationFn: async (body: { action: string; ids: string[] }) => {
      const res = await fetch("/api/admin/team/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Batch action failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-team"] });
    },
  });

  const handleAdd = () => {
    setEditingMember(null);
    setModalOpen(true);
  };

  const handleEdit = (member: ITeamMember) => {
    setEditingMember(member);
    setModalOpen(true);
  };

  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-team"] });
  };

  if (isLoading) {
    return (
      <div className="text-[var(--color-text-secondary)] text-[14px]">
        Loading team members...
      </div>
    );
  }

  const memberIds = members.map((m) => m.id);
  const allSelected = selectedIds.size === memberIds.length && memberIds.length > 0;

  const columns: ClColumn<ITeamMember>[] = [
    {
      key: "checkbox",
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => {
            if (allSelected) clearSelection();
            else selectAll(memberIds);
          }}
          className="cursor-pointer accent-[var(--color-accent)]"
          aria-label="Select all"
        />
      ),
      width: "w-[40px]",
      cell: (member) => (
        <input
          type="checkbox"
          checked={selectedIds.has(member.id)}
          onChange={() => toggleSelect(member.id)}
          className="cursor-pointer accent-[var(--color-accent)]"
          aria-label={`Select ${member.name}`}
        />
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (member) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[var(--color-surface-raised)] flex items-center justify-center text-[10px] font-bold text-[var(--color-text-tertiary)] flex-shrink-0">
            {member.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <span className="text-[12px]">{member.name}</span>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (member) => <span className="text-[12px] text-[var(--color-accent)]">{member.role}</span>,
    },
    {
      key: "bio",
      header: "Bio",
      hideOnMobile: true,
      cell: (member) => (
        <span className="text-[12px] text-[var(--color-text-secondary)] max-w-[200px] truncate block">
          {member.bio}
        </span>
      ),
    },
    {
      key: "order",
      header: "Order",
      hideOnMobile: true,
      cell: (member) => (
        <span className="text-[12px] font-[family-name:var(--font-mono)]">{member.orderIndex}</span>
      ),
    },
    {
      key: "active",
      header: "Active",
      cell: (member) => (
        <button
          onClick={() => toggleMutation.mutate({ id: member.id, active: member.active })}
          disabled={toggleMutation.isPending || deleteMutation.isPending}
          className={`inline-flex items-center w-9 h-5 rounded-[9999px] relative transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed ${
            member.active ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-mid)]"
          }`}
          aria-label={member.active ? "Deactivate member" : "Activate member"}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              member.active ? "translate-x-4" : ""
            }`}
          />
        </button>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (member) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(member)}
            className="text-[12px] text-[var(--color-accent)] cursor-pointer bg-transparent border-none p-0"
          >
            Edit
          </button>
          <button
            onClick={() => setMemberToDelete(member)}
            disabled={deleteMutation.isPending || toggleMutation.isPending}
            className="text-[12px] text-[var(--color-error)] cursor-pointer bg-transparent border-none p-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">
            Team Members
          </h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Manage team member profiles shown on the public /team page.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ClButton variant="accent-outlined" size="default" onClick={handleAdd}>
            + Add Member
          </ClButton>
        </div>
      </div>

      <BatchToolbar
        ids={memberIds}
        selectedIds={selectedIds}
        onSelectAll={() => selectAll(memberIds)}
        onInvert={() => invertSelect(memberIds)}
        onClear={clearSelection}
        actions={[
          {
            label: "Delete",
            variant: "outlined",
            confirmTitle: "Delete Members",
            confirmMessage: "Are you sure you want to delete the selected team members? This cannot be undone.",
            danger: true,
            execute: async (ids) => { await batchMutation.mutateAsync({ action: "delete", ids }); },
          },
          {
            label: "Toggle Active",
            variant: "outlined",
            confirmTitle: "Toggle Active Status",
            confirmMessage: "Toggle the active status of selected team members.",
            execute: async (ids) => { await batchMutation.mutateAsync({ action: "toggle", ids }); },
          },
        ]}
      />

      <ClDataTable
        columns={columns}
        rows={members}
        rowKey={(m) => m.id}
        pageSize={10}
        emptyState={
          <div className="text-[12px] text-[var(--color-text-tertiary)] text-center py-8">
            No team members found. Add your first member to get started.
          </div>
        }
      />

      <div className="mt-6">
        <TeamPageSettings />
      </div>

      <TeamMemberModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        member={editingMember}
      />

      <ClConfirmDialog
        open={memberToDelete !== null}
        title="Delete team member"
        message={`Delete "${memberToDelete?.name}" from the public team page? This action is reversible from the undo prompt.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setMemberToDelete(null)}
      />
    </div>
  );
}
