"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClButton, ClCard } from "@/components/ui";
import { useToast } from "@/lib/toast";
import type { IEmailConfig } from "@/types";

export default function AdminEmailTemplatesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [config, setConfig] = useState<IEmailConfig | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);

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
    if (data?.emailConfig) {
      setConfig(data.emailConfig as IEmailConfig);
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
      toast("Email template updated", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-config"] });
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const handleSelectTemplate = (key: string) => {
    const tpl = config?.templates?.[key];
    if (tpl) {
      setActiveTemplate(key);
      setEditSubject(tpl.subject);
      setEditBody(tpl.bodyHtml);
      setEditEnabled(tpl.enabled);
    }
  };

  const handleSaveTemplate = async () => {
    if (!activeTemplate || !config) return;

    const updatedTemplates = {
      ...config.templates,
      [activeTemplate]: {
        subject: editSubject,
        bodyHtml: editBody,
        enabled: editEnabled,
      },
    };

    await saveMutation.mutateAsync({
      key: "emailConfig.templates",
      value: updatedTemplates,
    });
  };

  if (isLoading) {
    return (
      <div className="text-[var(--color-text-secondary)] text-[14px]">
        Loading email templates...
      </div>
    );
  }

  const templates = config?.templates ?? {};
  const templateKeys = Object.keys(templates);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">
            Email Templates
          </h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Manage email templates used for transactional emails. Use <code className="font-[family-name:var(--font-mono)] text-[var(--color-accent)]">{`{{variable}}`}</code> syntax for dynamic values.
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-[220px] shrink-0 flex flex-col gap-1">
          {templateKeys.length === 0 && (
            <div className="text-[12px] text-[var(--color-text-tertiary)] py-4">
              No templates configured.
            </div>
          )}
          {templateKeys.map((key) => (
            <button
              key={key}
              onClick={() => handleSelectTemplate(key)}
              className={`
                text-left px-4 py-3 rounded-[8px] text-[13px] font-medium cursor-pointer border-none
                transition-colors duration-150
                ${activeTemplate === key
                  ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
                  : "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]"
                }
              `.trim()}
            >
              <div className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
                {templates[key]?.enabled ? "Active" : "Disabled"}
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1">
          {activeTemplate ? (
            <ClCard>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className="text-[13px] font-semibold text-[var(--color-text-primary)]">Enabled</label>
                    <button
                      onClick={() => setEditEnabled(!editEnabled)}
                      className={`inline-flex items-center w-9 h-5 rounded-[9999px] relative transition-colors cursor-pointer border-none ${
                        editEnabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-mid)]"
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${editEnabled ? "translate-x-4" : ""}`} />
                    </button>
                  </div>
                  <ClButton variant="primary" size="default" onClick={handleSaveTemplate} loading={saveMutation.isPending}>
                    Save Template
                  </ClButton>
                </div>

                <div>
                  <label className="block mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                    Subject
                  </label>
                  <input
                    className="h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)]"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                    HTML Body
                  </label>
                  <textarea
                    className="h-[400px] px-3 py-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[13px] font-[family-name:var(--font-mono)] text-[var(--color-text-primary)] outline-none w-full resize-y focus:border-[var(--color-accent)]"
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                  />
                </div>

                <div className="text-[11px] text-[var(--color-text-tertiary)] border-t border-[var(--color-border)] pt-3">
                  <span className="font-semibold">Available variables:</span>{" "}
                  <code className="font-[family-name:var(--font-mono)] text-[var(--color-accent)]">
                    {`{{name}}`}, {`{{userName}}`}, {`{{providerName}}`}, {`{{amount}}`}, {`{{bookingDate}}`}, {`{{exploreUrl}}`}, {`{{bookingUrl}}`}, {`{{logoUrl}}`}
                  </code>
                </div>
              </div>
            </ClCard>
          ) : (
            <div className="text-center py-16 text-[var(--color-text-tertiary)] text-[14px]">
              Select a template from the sidebar to edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}