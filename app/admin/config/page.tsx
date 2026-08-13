"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClButton, ClCard, ClDataTable, type ClColumn } from "@/components/ui";
import { ConfigField } from "@/components/admin/ConfigField";
import { useToast } from "@/lib/toast";

interface ChangeLogEntry {
  id: string;
  entity: string;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
  userId: string | null;
}

const configFields = [
  { key: "name", label: "Platform Name", type: "text" as const, section: "Branding" },
  { key: "tagline", label: "Tagline", type: "text" as const, section: "Branding" },
  { key: "primaryColor", label: "Primary Colour", type: "color" as const, section: "Branding" },
  { key: "feeRate", label: "Platform Fee Rate", type: "number" as const, section: "Fees & Escrow", unit: "%" },
  { key: "escrowReleaseDays", label: "Escrow Release Days", type: "number" as const, section: "Fees & Escrow", unit: "days" },
  { key: "cancellationPolicy.fullRefundThresholdHours", label: "Client Cancel Threshold", type: "number" as const, section: "Fees & Escrow", unit: "hours" },
  { key: "features.guestBrowse", label: "Guest Browse", type: "toggle" as const, section: "Features" },
  { key: "features.googleDriveSync", label: "Google Drive Sync", type: "toggle" as const, section: "Features" },
  { key: "features.blogEnabled", label: "Blog", type: "toggle" as const, section: "Features" },
  { key: "features.emailNotifications", label: "Email Notifications", type: "toggle" as const, section: "Features" },
  { key: "dashboard.availabilityLookaheadDays", label: "Availability Calendar Days", type: "number" as const, section: "Features", unit: "days" },
  { key: "emailConfig.fromName", label: "Email From Name", type: "text" as const, section: "Email" },
  { key: "emailConfig.fromEmail", label: "Email From Address", type: "text" as const, section: "Email" },
  { key: "mediaUpload.enabled", label: "Media Uploads", type: "toggle" as const, section: "Media" },
  { key: "mediaUpload.cloudinaryEnabled", label: "Cloudinary Direct Uploads", type: "toggle" as const, section: "Media" },
  { key: "mediaUpload.maxFileSizeMb", label: "Max Upload Size", type: "number" as const, section: "Media", unit: "MB" },
  { key: "mediaUpload.cleanupEnabled", label: "Orphan Cleanup Job", type: "toggle" as const, section: "Media" },
  { key: "mediaUpload.cleanupOrphanAfterHours", label: "Delete Orphans After", type: "number" as const, section: "Media", unit: "hours" },
];

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc, part) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj as unknown);
}

function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

const changeLogColumns: ClColumn<ChangeLogEntry>[] = [
  {
    key: "key",
    header: "Key",
    cell: (entry) => (
      <span className="text-[12px] font-[family-name:var(--font-mono)] break-all">{entry.entity}</span>
    ),
  },
  {
    key: "old",
    header: "Old Value",
    cell: (entry) => (
      <span className="text-[12px] text-[var(--color-text-secondary)] break-words min-w-0">
        {formatChangeValue(entry.oldValue)}
      </span>
    ),
  },
  {
    key: "new",
    header: "New Value",
    cell: (entry) => (
      <span className="text-[12px] break-words min-w-0">{formatChangeValue(entry.newValue)}</span>
    ),
  },
  {
    key: "timestamp",
    header: "Timestamp",
    hideOnMobile: true,
    cell: (entry) => (
      <span className="text-[11px] font-[family-name:var(--font-mono)] text-[var(--color-text-tertiary)] whitespace-nowrap">
        {new Date(entry.createdAt).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    ),
  },
];

function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const parts = path.split(".");
  const result = { ...obj };
  let current = result;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== "object") {
      current[part] = {};
    }
    current[part] = { ...(current[part] as Record<string, unknown>) };
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
  return result;
}

export default function ConfigPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);

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
    if (data) {
      setConfig(data as Record<string, unknown>);
    }
  }, [data]);

  useEffect(() => {
    fetch("/api/admin/config?log=true")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setChangeLog(json.data ?? []);
      })
      .catch(() => {});
  }, []);

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to save");
      return json;
    },
    onSuccess: () => {
      toast("Config updated successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-config"] });
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const handleChange = useCallback(
    (key: string, value: unknown) => {
      setConfig((prev) => setNestedValue(prev, key, value));
    },
    [],
  );

  const handleSave = useCallback(() => {
    const promises: Promise<unknown>[] = [];
    for (const field of configFields) {
      const currentValue = getNestedValue(config as Record<string, unknown>, field.key);
      const originalValue = getNestedValue(
        data as Record<string, unknown>,
        field.key,
      );
      if (currentValue !== originalValue) {
        promises.push(
          saveMutation.mutateAsync({ key: field.key, value: currentValue }),
        );
      }
    }
    if (promises.length === 0) {
      toast("No changes to save", "info");
      return;
    }
    Promise.all(promises).then(() => {
      queryClient.invalidateQueries({ queryKey: ["admin-config"] });
    });
  }, [config, data, saveMutation, toast, queryClient]);

  const handleRevert = useCallback(() => {
    if (data) {
      setConfig(data as Record<string, unknown>);
      toast("Changes reverted", "info");
    }
  }, [data, toast]);

  const sections = ["Branding", "Fees & Escrow", "Features", "Email", "Media"] as const;

  if (isLoading) {
    return (
      <div className="text-[var(--color-text-secondary)] text-[14px]">
        Loading configuration...
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">
            Platform Configuration
          </h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Changes apply immediately across the entire platform.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ClButton variant="primary" size="default" onClick={handleSave} loading={saveMutation.isPending}>
            Save Changes
          </ClButton>
          <ClButton variant="ghost" size="default" onClick={handleRevert}>
            Revert
          </ClButton>
        </div>
      </div>

      {sections.map((section) => {
        const fields = configFields.filter((f) => f.section === section);
        return (
          <div key={section}>
            <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-2 py-3">
              {section}
            </div>
            <ClCard className="mb-6">
              {fields.map((field) => {
                const currentValue = getNestedValue(
                  config as Record<string, unknown>,
                  field.key,
                );
                const defaultValue = getNestedValue(
                  (data ?? {}) as Record<string, unknown>,
                  field.key,
                );
                return (
                  <ConfigField
                    key={field.key}
                    label={field.label}
                    fieldKey={field.key}
                    type={field.type}
                    value={currentValue}
                    defaultValue={defaultValue}
                    unit={"unit" in field ? (field as { unit?: string }).unit : undefined}
                    onChange={handleChange}
                  />
                );
              })}
            </ClCard>
          </div>
        );
      })}

      <div className="mt-8">
        <div className="text-[14px] font-semibold mb-4">Recent Changes</div>
        <ClDataTable
          columns={changeLogColumns}
          rows={changeLog}
          rowKey={(e) => e.id}
          pageSize={8}
          emptyState={
            <div className="text-[12px] text-[var(--color-text-tertiary)] text-center py-8">
              No changes recorded yet.
            </div>
          }
        />
      </div>
    </div>
  );
}
