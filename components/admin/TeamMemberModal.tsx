"use client";

import { useState, useCallback, useEffect } from "react";
import { ClDialog, ClButton, ClInput, ClTextarea, ClSelect } from "@/components/ui";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { X } from "lucide-react";
import type { ITeamMember } from "@/types";
import {
  SOCIAL_PLATFORM_OPTIONS,
  normalizeSocialPlatform,
  toStoredPlatform,
  type SocialPlatformKind,
} from "@/lib/social-platforms";

interface TeamMemberModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  member?: ITeamMember | null;
}

interface SocialLinkRow {
  kind: SocialPlatformKind;
  custom: string;
  url: string;
}

function toRow(link: { platform: string; url: string }): SocialLinkRow {
  const { kind, customLabel } = normalizeSocialPlatform(link.platform);
  return { kind, custom: kind === "other" ? customLabel : "", url: link.url ?? "" };
}

function emptyRows(member?: ITeamMember | null): SocialLinkRow[] {
  const links = member?.socialLinks as { platform: string; url: string }[] | undefined;
  if (links && links.length > 0) return links.map(toRow);
  return [{ kind: "x", custom: "", url: "" }];
}

export function TeamMemberModal({
  open,
  onClose,
  onSave,
  member,
}: TeamMemberModalProps) {
  const [name, setName] = useState(member?.name ?? "");
  const [role, setRole] = useState(member?.role ?? "");
  const [bio, setBio] = useState(member?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(member?.avatarUrl ?? "");
  const [orderIndex, setOrderIndex] = useState(member?.orderIndex ?? 0);
  const [active, setActive] = useState(member?.active ?? true);
  const [socialLinks, setSocialLinks] = useState<SocialLinkRow[]>(() => emptyRows(member));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!member;

  // Sync form when a different member is opened (modal stays mounted).
  useEffect(() => {
    if (!open) return;
    setName(member?.name ?? "");
    setRole(member?.role ?? "");
    setBio(member?.bio ?? "");
    setAvatarUrl(member?.avatarUrl ?? "");
    setOrderIndex(member?.orderIndex ?? 0);
    setActive(member?.active ?? true);
    setSocialLinks(emptyRows(member));
    setError("");
  }, [open, member]);

  const handleClose = useCallback(() => {
    setError("");
    onClose();
  }, [onClose]);

  const addSocial = useCallback(() => {
    setSocialLinks((prev) => [...prev, { kind: "x", custom: "", url: "" }]);
  }, []);

  const removeSocial = useCallback((index: number) => {
    setSocialLinks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateSocial = useCallback(
    (index: number, updates: Partial<SocialLinkRow>) => {
      setSocialLinks((prev) =>
        prev.map((s, i) => (i === index ? { ...s, ...updates } : s)),
      );
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!role.trim()) {
      setError("Role is required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const links = socialLinks
      .map((s) => ({ platform: toStoredPlatform(s.kind, s.custom), url: s.url.trim() }))
      .filter((s) => s.platform.trim() && s.url.trim());

    const payload: Partial<ITeamMember> = {
      name: name.trim(),
      role: role.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUrl.trim() || null,
      orderIndex,
      active,
      socialLinks: links,
    };

    try {
      const url = isEditing
        ? `/api/admin/team/${member!.id}`
        : "/api/admin/team";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to save team member");

      onSave();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }, [name, role, bio, avatarUrl, orderIndex, active, socialLinks, isEditing, member, onSave, handleClose]);

  return (
    <ClDialog open={open} onClose={handleClose}>
      <div className="font-[family-name:var(--font-display)] font-bold text-[18px] mb-5">
        {isEditing ? "Edit Team Member" : "Add Team Member"}
      </div>

      <div className="flex flex-col gap-1 mb-4">
        <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
          Name
        </label>
        <ClInput
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sotonye D."
        />
      </div>

      <div className="flex flex-col gap-1 mb-4">
        <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
          Role
        </label>
        <ClInput
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Founder & Product Lead"
        />
      </div>

      <div className="flex flex-col gap-1 mb-4">
        <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
          Bio
        </label>
        <ClTextarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Short bio about the team member..."
        />
      </div>

      <div className="mb-4">
        <ImageUploadField
          label="Avatar"
          value={avatarUrl ?? ""}
          onChange={setAvatarUrl}
          helper="Upload directly or paste an image URL."
          aspect="square"
        />
      </div>

      <div className="flex flex-col gap-1 mb-4">
        <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
          Order Index
        </label>
        <ClInput
          type="number"
          value={String(orderIndex)}
          onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)}
          placeholder="0"
        />
      </div>

      <div className="flex flex-col gap-1 mb-4">
        <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
          Active
        </label>
        <button
          onClick={() => setActive(!active)}
          className="inline-flex items-center cursor-pointer bg-transparent border-none p-0"
        >
          <span
            className={`w-9 h-5 rounded-[9999px] relative transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${active ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-mid)]"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${active ? "translate-x-4" : ""}`}
            />
          </span>
        </button>
      </div>

      <div className="mt-5">
        <div className="text-[13px] font-semibold text-[var(--color-text-secondary)] mb-2">
          Social Links
        </div>
        {socialLinks.map((link, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 py-2 border-b border-[var(--color-border)] last:border-b-0"
          >
            <div className="flex gap-2 items-center">
              <div className="w-[160px] flex-shrink-0">
              <ClSelect
                value={link.kind}
                onChange={(e) =>
                  updateSocial(index, { kind: e.target.value as SocialPlatformKind })
                }
                aria-label="Social platform"
              >
                {SOCIAL_PLATFORM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </ClSelect>
              </div>
              <input
                type="text"
                placeholder="URL"
                value={link.url}
                onChange={(e) => updateSocial(index, { url: e.target.value })}
                className="h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none flex-1 focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-tertiary)]"
              />
              <button
                onClick={() => removeSocial(index)}
                className="text-[var(--color-error)] cursor-pointer bg-transparent border-none p-1 flex-shrink-0 hover:opacity-70"
                aria-label="Remove social link"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            {link.kind === "other" && (
              <input
                type="text"
                placeholder="Type custom platform name (e.g. Behance)"
                value={link.custom}
                onChange={(e) => updateSocial(index, { custom: e.target.value })}
                className="h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-tertiary)]"
              />
            )}
          </div>
        ))}
        <button
          onClick={addSocial}
          className="text-[13px] font-semibold text-[var(--color-accent)] cursor-pointer mt-2 inline-block bg-transparent border-none p-0 hover:underline"
        >
          + Add Social Link
        </button>
      </div>

      {error && (
        <div className="mt-4 text-[12px] text-[var(--color-error)]">{error}</div>
      )}

      <div className="flex gap-3 justify-end mt-5">
        <ClButton variant="ghost" size="default" onClick={handleClose}>
          Cancel
        </ClButton>
        <ClButton
          variant="primary"
          size="default"
          onClick={handleSave}
          loading={isSubmitting}
        >
          {isEditing ? "Save Changes" : "Add Member"}
        </ClButton>
      </div>
    </ClDialog>
  );
}
