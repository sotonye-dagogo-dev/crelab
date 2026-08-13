"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClButton, ClCard } from "@/components/ui";
import { EmailTemplateBlocksEditor } from "@/components/admin/EmailTemplateBlocksEditor";
import { useToast } from "@/lib/toast";
import { blocksToHtml, substituteSampleVars, previewVarsFor } from "@/lib/email-blocks";
import { Plus } from "lucide-react";
import type { IEmailConfig, EmailTemplateBlock } from "@/types";

type EditorTab = "visual" | "html" | "preview";

const inputClass =
  "h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)]";

function defaultBlocksFor(key: string): EmailTemplateBlock[] {
  return [
    { type: "heading", text: "Update from {{name}}" },
    { type: "paragraph", text: "Hi {{userName}}," },
    { type: "paragraph", text: `This is a {{${key}}} email from {{name}}.` },
    {
      type: "button",
      text: "View on the platform",
      url: "{{exploreUrl}}",
    },
  ];
}

const tabButton = (active: boolean) =>
  `h-9 px-4 rounded-[8px] text-[13px] font-semibold cursor-pointer border-none transition-colors duration-150 ${
    active
      ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
      : "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]"
  }`.trim();

export default function AdminEmailTemplatesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [config, setConfig] = useState<IEmailConfig | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);
  const [htmlBody, setHtmlBody] = useState("");
  const [blocks, setBlocks] = useState<EmailTemplateBlock[] | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>("visual");
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [sendDialog, setSendDialog] = useState<"test" | "marketing" | null>(null);
  const [testTo, setTestTo] = useState("");

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

  const sendMutation = useMutation({
    mutationFn: async (payload: { templateKey: string; to?: string; segment?: "marketing" }) => {
      const res = await fetch("/api/admin/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to send");
      return json;
    },
    onSuccess: (result) => {
      setSendDialog(null);
      setTestTo("");
      if (result.message) toast(result.message, "success");
      else if (result.sent) toast("Test email sent successfully", "success");
      else toast("Resend is not configured — email logged to console instead.", "info");
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  const handleSelectTemplate = (key: string) => {
    const tpl = config?.templates?.[key];
    if (tpl) {
      setActiveTemplate(key);
      setEditName(tpl.name ?? "");
      setEditSubject(tpl.subject);
      setHtmlBody(tpl.bodyHtml);
      setBlocks(tpl.blocks ? [...tpl.blocks] : null);
      setEditEnabled(tpl.enabled);
      setEditorTab(tpl.blocks?.length ? "visual" : "preview");
    }
  };

  const handleStartVisualEditing = () => {
    if (!activeTemplate) return;
    if (
      htmlBody &&
      !window.confirm("Starting visual editing replaces the current HTML body with blocks. Continue?")
    ) {
      return;
    }
    const next = defaultBlocksFor(activeTemplate);
    setBlocks(next);
    setHtmlBody(blocksToHtml(next));
    setEditorTab("visual");
  };

  const handleBlocksChange = (next: EmailTemplateBlock[]) => {
    setBlocks(next);
    setHtmlBody(blocksToHtml(next));
  };

  const handleSaveTemplate = async () => {
    if (!activeTemplate || !config) return;

    const updatedTemplates = {
      ...config.templates,
      [activeTemplate]: {
        name: editName.trim() || undefined,
        subject: editSubject,
        bodyHtml: htmlBody,
        enabled: editEnabled,
        ...(blocks ? { blocks } : {}),
      },
    };

    await saveMutation.mutateAsync({
      key: "emailConfig.templates",
      value: updatedTemplates,
    });
  };

  const handleCreateTemplate = async () => {
    const key = newKey.trim();
    if (!key || !newSubject.trim()) {
      toast("Template key and subject are required", "error");
      return;
    }
    const nextBlocks = defaultBlocksFor(key);
    const updatedTemplates = {
      ...(config?.templates ?? {}),
      [key]: {
        name: key.replace(/([A-Z])/g, " $1").trim(),
        subject: newSubject.trim(),
        bodyHtml: blocksToHtml(nextBlocks),
        enabled: false,
        blocks: nextBlocks,
      },
    };

    await saveMutation.mutateAsync({ key: "emailConfig.templates", value: updatedTemplates });
    setShowNewTemplate(false);
    setNewKey("");
    setNewSubject("");
    handleSelectTemplate(key);
  };

  // Preview with sample vars built from the *configured* platform name/logo so the
  // preview captures the actual logo (resolved absolute via the URL util) rather
  // than the code defaults.
  const previewSrcDoc = `<!doctype html><html><body style="margin:0;background:#0A0A0A;padding:24px;">${substituteSampleVars(htmlBody, previewVarsFor(data as { name?: string; logoPath?: string } | undefined))}</body></html>`;

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-[-0.01em]">
            Email Templates
          </h2>
          <div className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            Manage transactional email templates. Build visually (no HTML needed), edit raw HTML, or preview with sample data. Use{" "}
            <code className="font-[family-name:var(--font-mono)] text-[var(--color-accent)]">{`{{variable}}`}</code> syntax for dynamic values.
          </div>
        </div>
        <ClButton variant="primary" size="default" onClick={() => setShowNewTemplate(true)}>
          <Plus size={15} strokeWidth={2} /> New Template
        </ClButton>
      </div>

      {showNewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-[16px] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-xl">
            <h3 className="font-[family-name:var(--font-display)] font-bold text-[18px] mb-4">
              New Email Template
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                  Template key
                </label>
                <input className={inputClass} placeholder="e.g. bookingReminder" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
              </div>
              <div>
                <label className="block mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                  Subject
                </label>
                <input className={inputClass} placeholder="e.g. Your booking is coming up" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <ClButton variant="ghost" size="default" onClick={() => setShowNewTemplate(false)}>
                Cancel
              </ClButton>
              <ClButton variant="primary" size="default" onClick={handleCreateTemplate} loading={saveMutation.isPending}>
                Create Template
              </ClButton>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex lg:flex-col gap-1 lg:w-[220px] lg:shrink-0 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
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
                whitespace-nowrap lg:whitespace-normal
                transition-colors duration-150
                ${activeTemplate === key
                  ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
                  : "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]"
                }
              `.trim()}
            >
              <div className="capitalize">
                {templates[key]?.name?.trim() || key.replace(/([A-Z])/g, " $1").trim()}
              </div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
                {templates[key]?.enabled ? "Active" : "Disabled"}
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          {activeTemplate ? (
            <ClCard>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
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
                  <div className="flex flex-wrap items-center gap-2">
                    <ClButton variant="outlined" size="default" onClick={() => setSendDialog("test")} loading={sendMutation.isPending && sendDialog === "test"}>
                      Send Test
                    </ClButton>
                    <ClButton variant="outlined" size="default" onClick={() => setSendDialog("marketing")} loading={sendMutation.isPending && sendDialog === "marketing"}>
                      Send to Subscribers
                    </ClButton>
                    <ClButton variant="primary" size="default" onClick={handleSaveTemplate} loading={saveMutation.isPending}>
                      Save Template
                    </ClButton>
                  </div>
                </div>

                {sendDialog && (
                  <div className="rounded-[12px] border border-[var(--color-border-mid)] p-4">
                    {sendDialog === "test" ? (
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="block mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                            Recipient email
                          </label>
                          <input className={inputClass} type="email" placeholder="you@example.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
                        </div>
                        <ClButton
                          variant="primary"
                          size="default"
                          loading={sendMutation.isPending}
                          onClick={() =>
                            sendMutation.mutate({ templateKey: activeTemplate, to: testTo || "you@example.com" })
                          }
                        >
                          Send test
                        </ClButton>
                        <ClButton variant="ghost" size="default" onClick={() => setSendDialog(null)}>
                          Cancel
                        </ClButton>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[13px] text-[var(--color-text-secondary)]">
                          Send <span className="font-semibold text-[var(--color-text-primary)]">{activeTemplate.replace(/([A-Z])/g, " $1").trim()}</span> to every user who opted into marketing emails during signup.
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <ClButton
                            variant="primary"
                            size="default"
                            loading={sendMutation.isPending}
                            onClick={() => sendMutation.mutate({ templateKey: activeTemplate, segment: "marketing" })}
                          >
                            Broadcast
                          </ClButton>
                          <ClButton variant="ghost" size="default" onClick={() => setSendDialog(null)}>
                            Cancel
                          </ClButton>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                    Template name
                  </label>
                  <input
                    className={inputClass}
                    placeholder="e.g. Welcome"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                    Subject
                  </label>
                  <input
                    className={inputClass}
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-1 border-b border-[var(--color-border)] pb-3">
                  <button className={tabButton(editorTab === "visual")} onClick={() => setEditorTab("visual")}>
                    Visual
                  </button>
                  <button className={tabButton(editorTab === "html")} onClick={() => setEditorTab("html")}>
                    HTML
                  </button>
                  <button className={tabButton(editorTab === "preview")} onClick={() => setEditorTab("preview")}>
                    Preview
                  </button>
                </div>

                {editorTab === "visual" && (
                  blocks ? (
                    <EmailTemplateBlocksEditor blocks={blocks} onChange={handleBlocksChange} />
                  ) : (
                    <div className="rounded-[8px] border border-dashed border-[var(--color-border-mid)] p-8 text-center">
                      <div className="text-[13px] text-[var(--color-text-secondary)] mb-3">
                        This template is written in raw HTML. Switch to visual blocks — no HTML knowledge needed.
                      </div>
                      <ClButton variant="primary" size="default" onClick={handleStartVisualEditing}>
                        Start visual editing
                      </ClButton>
                    </div>
                  )
                )}

                {editorTab === "html" && (
                  <div>
                    <textarea
                      className="h-[320px] px-3 py-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[13px] font-[family-name:var(--font-mono)] text-[var(--color-text-primary)] outline-none w-full resize-y focus:border-[var(--color-accent)]"
                      value={htmlBody}
                      onChange={(e) => {
                        setHtmlBody(e.target.value);
                        setBlocks(null);
                      }}
                    />
                  </div>
                )}

                {editorTab === "preview" && (
                  <div className="rounded-[8px] border border-[var(--color-border)] bg-[#0A0A0A] p-0 overflow-hidden">
                    <iframe title="Email preview" className="w-full h-[360px] border-none bg-[#0A0A0A]" srcDoc={previewSrcDoc} sandbox="" />
                  </div>
                )}

                <div className="text-[11px] text-[var(--color-text-tertiary)] border-t border-[var(--color-border)] pt-3">
                  <span className="font-semibold">Available variables:</span>{" "}
                  <code className="font-[family-name:var(--font-mono)] text-[var(--color-accent)]">
                    {`{{name}}`}, {`{{userName}}`}, {`{{providerName}}`}, {`{{amount}}`}, {`{{bookingDate}}`}, {`{{exploreUrl}}`}, {`{{bookingUrl}}`}, {`{{verifyUrl}}`}, {`{{logoUrl}}`}
                  </code>
                </div>
              </div>
            </ClCard>
          ) : (
            <div className="text-center py-16 text-[var(--color-text-tertiary)] text-[14px]">
              Select a template from the sidebar to edit, or create a new one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
