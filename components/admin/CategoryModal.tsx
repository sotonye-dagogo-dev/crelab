"use client";

import { useState, useCallback } from "react";
import { ClDialog, ClButton, ClInput } from "@/components/ui";
import type { ICategoryConfig, IFieldSchemaField } from "@/types";

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  category?: ICategoryConfig | null;
}

const fieldTypes = ["text", "number", "select", "tags", "boolean"] as const;

interface FieldRow {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

export function CategoryModal({
  open,
  onClose,
  onSave,
  category,
}: CategoryModalProps) {
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [label, setLabel] = useState(category?.label ?? "");
  const [active, setActive] = useState(category?.active ?? true);
  const [fields, setFields] = useState<FieldRow[]>(
    category?.fieldSchema.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
    })) ?? [
      { key: "", label: "", type: "text", required: true },
    ],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!category;

  const handleClose = useCallback(() => {
    setSlug(category?.slug ?? "");
    setLabel(category?.label ?? "");
    setActive(category?.active ?? true);
    setFields(
      category?.fieldSchema.map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required,
      })) ?? [{ key: "", label: "", type: "text", required: true }],
    );
    setError("");
    onClose();
  }, [category, onClose]);

  const addField = useCallback(() => {
    setFields((prev) => [
      ...prev,
      { key: "", label: "", type: "text", required: true },
    ]);
  }, []);

  const removeField = useCallback((index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateField = useCallback(
    (index: number, updates: Partial<FieldRow>) => {
      setFields((prev) =>
        prev.map((f, i) => (i === index ? { ...f, ...updates } : f)),
      );
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!slug.trim()) {
      setError("Slug is required");
      return;
    }
    if (!label.trim()) {
      setError("Label is required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const fieldSchema: IFieldSchemaField[] = fields
      .filter((f) => f.key.trim())
      .map((f) => ({
        key: f.key.trim(),
        label: f.label.trim(),
        type: f.type as IFieldSchemaField["type"],
        required: f.required,
      }));

    const payload: Partial<ICategoryConfig> = {
      slug: slug.trim(),
      label: label.trim(),
      active,
      fieldSchema,
      description: category?.description ?? "",
      icon: category?.icon ?? "folder",
    };

    try {
      const url = isEditing
        ? `/api/admin/categories/${category!.slug}`
        : "/api/admin/categories";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to save category");

      onSave();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }, [slug, label, active, fields, isEditing, category, onSave, handleClose]);

  return (
    <ClDialog open={open} onClose={handleClose}>
      <div className="font-[family-name:var(--font-display)] font-bold text-[18px] mb-5">
        {isEditing ? "Edit Category" : "Add Category"}
      </div>

      <div className="flex flex-col gap-1 mb-4">
        <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
          Slug
        </label>
        <div className="flex items-center">
          <span className="bg-[var(--color-surface)] border border-[var(--color-border)] border-r-0 rounded-l-[8px] h-10 px-2 flex items-center text-[13px] text-[var(--color-text-tertiary)]">
            /
          </span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. photographer"
            className="h-10 px-3 rounded-r-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-tertiary)]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 mb-4">
        <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
          Label
        </label>
        <ClInput
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Photographer"
        />
      </div>

      <div className="flex flex-col gap-1 mb-4">
        <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
          Active
        </label>
        <button
          onClick={() => setActive(!active)}
          className={`inline-flex items-center cursor-pointer bg-transparent border-none p-0`}
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
          Fields
        </div>
        {fields.map((field, index) => (
          <div
            key={index}
            className="flex gap-2 items-center py-2 border-b border-[var(--color-border)] last:border-b-0"
          >
            <span className="text-[20px] text-[var(--color-text-tertiary)] cursor-grab leading-none flex-shrink-0">
              ⠿
            </span>
            <input
              type="text"
              placeholder="Key"
              value={field.key}
              onChange={(e) => updateField(index, { key: e.target.value })}
              className="h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-[120px] flex-shrink-0 focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-tertiary)]"
            />
            <input
              type="text"
              placeholder="Label"
              value={field.label}
              onChange={(e) => updateField(index, { label: e.target.value })}
              className="h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-[140px] focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-tertiary)]"
            />
            <select
              value={field.type}
              onChange={(e) => updateField(index, { type: e.target.value })}
              className="h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-[100px] flex-shrink-0 focus:border-[var(--color-accent)] appearance-none cursor-pointer"
            >
              {fieldTypes.map((ft) => (
                <option key={ft} value={ft}>
                  {ft}
                </option>
              ))}
            </select>
            <button
              onClick={() => setActive(!active)}
              className={`inline-flex items-center cursor-pointer bg-transparent border-none p-0 flex-shrink-0`}
            >
              <span
                className={`w-9 h-5 rounded-[9999px] relative transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${field.required ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-mid)]"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${field.required ? "translate-x-4" : ""}`}
                />
              </span>
            </button>
            <button
              onClick={() => removeField(index)}
              className="text-[var(--color-error)] text-[20px] leading-none cursor-pointer bg-transparent border-none p-0 flex-shrink-0 hover:opacity-70"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addField}
          className="text-[13px] font-semibold text-[var(--color-accent)] cursor-pointer mt-2 inline-block bg-transparent border-none p-0 hover:underline"
        >
          + Add Field
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
          {isEditing ? "Save Changes" : "Save Category"}
        </ClButton>
      </div>
    </ClDialog>
  );
}
