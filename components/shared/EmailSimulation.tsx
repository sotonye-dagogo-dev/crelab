"use client";

import { useState } from "react";
import { ClDialog } from "@/components/ui";
import { X, Eye } from "lucide-react";

interface EmailPreviewProps {
  subject: string;
  html: string;
  to: string;
  onDismiss: () => void;
}

function EmailPreview({ subject, html, to, onDismiss }: EmailPreviewProps) {
  return (
    <ClDialog open onClose={onDismiss}>
      <div className="w-full max-w-[600px] rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Eye size={18} strokeWidth={1.5} className="text-[var(--color-accent)]" />
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[16px]">
              Email Simulation
            </h2>
          </div>
          <button
            onClick={onDismiss}
            className="flex items-center justify-center w-8 h-8 rounded-md bg-transparent border-none text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer"
            aria-label="Close"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[8px] p-3 mb-4">
          <div className="text-[12px] text-[var(--color-text-tertiary)] mb-1">
            <span className="font-semibold">To:</span> {to}
          </div>
          <div className="text-[12px] text-[var(--color-text-tertiary)]">
            <span className="font-semibold">Subject:</span> {subject}
          </div>
        </div>
        <div
          className="bg-white rounded-[8px] p-4 max-h-[400px] overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div className="mt-4 text-[11px] text-[var(--color-text-tertiary)] text-center">
          Email not sent — simulation mode. Set <code className="font-[family-name:var(--font-mono)] text-[var(--color-accent)]">RESEND_API_KEY</code> to enable live delivery.
        </div>
      </div>
    </ClDialog>
  );
}

export function useEmailSimulation() {
  const [preview, setPreview] = useState<{
    subject: string;
    html: string;
    to: string;
    onDismiss: () => void;
  } | null>(null);

  const show = (subject: string, html: string, to: string) => {
    setPreview({ subject, html, to, onDismiss: () => setPreview(null) });
  };

  const clear = () => setPreview(null);

  const EmailSimulationModal = preview ? (
    <EmailPreview
      subject={preview.subject}
      html={preview.html}
      to={preview.to}
      onDismiss={preview.onDismiss}
    />
  ) : null;

  return { show, clear, EmailSimulationModal };
}