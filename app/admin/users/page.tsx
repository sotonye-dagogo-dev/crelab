"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClBadge, ClEmptyState } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { Search, Trash2, ShieldCheck, ShieldOff } from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: "CLIENT" | "PROVIDER" | "ADMIN";
  image: string | null;
  createdAt: string;
}

const roleStyles: Record<string, string> = {
  ADMIN: "bg-[var(--color-accent-muted)] text-[var(--color-accent)]",
  PROVIDER: "bg-[#1F2937] text-[#9CA3AF]",
  CLIENT: "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]",
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.success) return json.data as AdminUser[];
      throw new Error(json.error ?? "Failed to load users");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { role?: string; emailVerified?: boolean } }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to update user");
      return json;
    },
    onSuccess: () => {
      toast("User updated", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to delete user");
      return json;
    },
    onSuccess: () => {
      toast("User deleted", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const handleDelete = (u: AdminUser) => {
    if (window.confirm(`Delete ${u.name} (${u.email})? This removes their account and all linked data.`)) {
      deleteMutation.mutate(u.id);
    }
  };

  const users = data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">
            Users
          </h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Manage platform accounts — change roles, mark emails verified, or remove accounts.
          </div>
        </div>
        <div className="w-[280px] shrink-0">
          <div className="relative">
            <Search size={15} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              className="h-10 pl-9 pr-3 w-full rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
              placeholder="Search name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-[var(--color-text-secondary)] text-[14px]">Loading users...</div>
      ) : users.length === 0 ? (
        <ClEmptyState title="No users found" message="Try a different search, or wait for new signups." />
      ) : (
        <div className="rounded-[12px] border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--color-surface)] text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Email status</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-surface-raised)] flex items-center justify-center text-[12px] font-semibold text-[var(--color-text-secondary)] flex-shrink-0 overflow-hidden">
                        {u.image ? (
                          <img src={u.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          u.name?.[0]?.toUpperCase() ?? "?"
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">{u.name}</div>
                        <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ClBadge variant={u.emailVerified ? "success" : "default"}>
                      {u.emailVerified ? "Verified" : "Unverified"}
                    </ClBadge>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className={`h-8 rounded-[6px] border border-[var(--color-border)] px-2 text-[12px] font-medium outline-none cursor-pointer ${roleStyles[u.role] ?? ""}`}
                      value={u.role}
                      onChange={(e) => updateMutation.mutate({ id: u.id, patch: { role: e.target.value } })}
                    >
                      <option value="CLIENT">CLIENT</option>
                      <option value="PROVIDER">PROVIDER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[var(--color-text-tertiary)]">
                    {new Date(u.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => updateMutation.mutate({ id: u.id, patch: { emailVerified: !u.emailVerified } })}
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-[8px] border border-[var(--color-border-mid)] text-[12px] font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer bg-transparent"
                        title={u.emailVerified ? "Mark as unverified" : "Mark as verified"}
                      >
                        {u.emailVerified ? <ShieldOff size={13} strokeWidth={2} /> : <ShieldCheck size={13} strokeWidth={2} />}
                        {u.emailVerified ? "Unverify" : "Verify"}
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] border border-[var(--color-border-mid)] text-[var(--color-error)] hover:opacity-80 cursor-pointer bg-transparent"
                        title="Delete user"
                      >
                        <Trash2 size={13} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
