"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClButton } from "@/components/ui";
import { TeamMemberModal } from "@/components/admin/TeamMemberModal";
import { useToast } from "@/lib/toast";
import type { ITeamMember } from "@/types";

export default function AdminTeamPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ITeamMember | null>(null);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
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

      <div className="bg-[var(--color-surface)] rounded-[12px] overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--color-surface-raised)]">
              <th className="px-[14px] py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                Name
              </th>
              <th className="px-[14px] py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                Role
              </th>
              <th className="px-[14px] py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                Bio
              </th>
              <th className="px-[14px] py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                Order
              </th>
              <th className="px-[14px] py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                Active
              </th>
              <th className="px-[14px] py-[10px] text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td colSpan={6} className="px-[14px] py-[10px] text-[12px] text-[var(--color-text-tertiary)] text-center">
                  No team members found. Add your first member to get started.
                </td>
              </tr>
            )}
            {members.map((member) => (
              <tr
                key={member.id}
                className="border-b border-[var(--color-border)] last:border-b-0 even:bg-[var(--color-surface-raised)]"
              >
                <td className="px-[14px] py-[10px] text-[12px]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[var(--color-surface-raised)] flex items-center justify-center text-[10px] font-bold text-[var(--color-text-tertiary)] flex-shrink-0">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    {member.name}
                  </div>
                </td>
                <td className="px-[14px] py-[10px] text-[12px] text-[var(--color-accent)]">
                  {member.role}
                </td>
                <td className="px-[14px] py-[10px] text-[12px] text-[var(--color-text-secondary)] max-w-[200px] truncate">
                  {member.bio}
                </td>
                <td className="px-[14px] py-[10px] text-[12px] font-[family-name:var(--font-mono)]">
                  {member.orderIndex}
                </td>
                <td className="px-[14px] py-[10px]">
                  <button
                    onClick={() =>
                      toggleMutation.mutate({ id: member.id, active: member.active })
                    }
                    className={`inline-flex items-center w-9 h-5 rounded-[9999px] relative transition-colors cursor-pointer border-none ${
                      member.active
                        ? "bg-[var(--color-accent)]"
                        : "bg-[var(--color-border-mid)]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        member.active ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                </td>
                <td className="px-[14px] py-[10px]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(member)}
                      className="text-[12px] text-[var(--color-accent)] cursor-pointer bg-transparent border-none p-0"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this team member?")) {
                          deleteMutation.mutate(member.id);
                        }
                      }}
                      className="text-[12px] text-[var(--color-error)] cursor-pointer bg-transparent border-none p-0"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TeamMemberModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        member={editingMember}
      />
    </div>
  );
}
