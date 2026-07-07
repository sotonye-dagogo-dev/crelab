"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ClButton, ClInput, ClTextarea, ClSelect } from "@/components/ui";
import { ExploreVideoCard } from "@/components/shared/ExploreVideoCard";
import { DriveConnectSettings } from "@/components/profile/DriveConnectSettings";
import { usePlatformConfig } from "@/lib/config-context";
import { Check, X } from "lucide-react";
import type { IFieldSchemaField, IPortfolioItem } from "@/types";

const STORAGE_KEY = "crelab-onboarding-state";

interface PackageForm {
  label: string;
  price: string;
  deliverables: string;
  turnaroundDays: string;
}

interface OnboardingState {
  step: number;
  categorySlug: string;
  categoryFields: Record<string, string | string[]>;
  packages: PackageForm[];
  portfolioItems: IPortfolioItem[];
  driveFolderUrl: string;
  coverVideoUrl: string;
  avatarUrl: string;
}

const defaultPackages: PackageForm[] = [
  { label: "Starter Pack", price: "", deliverables: "", turnaroundDays: "3" },
  { label: "Pro Pack", price: "", deliverables: "", turnaroundDays: "5" },
  { label: "Premium Pack", price: "", deliverables: "", turnaroundDays: "7" },
];

const tierLabels = ["BASIC", "STANDARD", "PREMIUM"];

const initialState: OnboardingState = {
  step: 1,
  categorySlug: "",
  categoryFields: {},
  packages: defaultPackages,
  portfolioItems: [],
  driveFolderUrl: "",
  coverVideoUrl: "",
  avatarUrl: "",
};

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [state, setState] = useState<OnboardingState>(initialState);
  const [showDriveSettings, setShowDriveSettings] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const platformConfig = usePlatformConfig();

  const categories = platformConfig.categories.filter((c) => c.active);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as OnboardingState;
        setState(parsed);
      }
    } catch {}
  }, [isLoading, user, router]);

  const persist = useCallback((s: OnboardingState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {}
  }, []);

  const updateState = (updates: Partial<OnboardingState>) => {
    setState((prev) => {
      const next = { ...prev, ...updates };
      persist(next);
      return next;
    });
  };

  const selectedCategory = categories.find(
    (c) => c.slug === state.categorySlug,
  );

  const setField = (key: string, value: string | string[]) => {
    setState((prev) => {
      const next = {
        ...prev,
        categoryFields: { ...prev.categoryFields, [key]: value },
      };
      persist(next);
      return next;
    });
  };

  const updatePackage = (index: number, pkg: PackageForm) => {
    setState((prev) => {
      const next = {
        ...prev,
        packages: prev.packages.map((p, i) => (i === index ? pkg : p)),
      };
      persist(next);
      return next;
    });
  };

  const goToStep = (step: number) => {
    updateState({ step });
  };

  const handleCategorySelect = (slug: string) => {
    const cat = categories.find((c) => c.slug === slug);
    const initialFields: Record<string, string | string[]> = {};
    cat?.fieldSchema.forEach((f) => {
      if (f.type === "tags") initialFields[f.key] = [];
      else initialFields[f.key] = "";
    });
    setState((prev) => {
      const next = {
        ...prev,
        step: 2,
        categorySlug: slug,
        categoryFields: initialFields,
      };
      persist(next);
      return next;
    });
  };

  const validateStep2 = () => {
    if (!selectedCategory) return "Please select a category first";
    for (const field of selectedCategory.fieldSchema) {
      const val = state.categoryFields[field.key];
      if (field.required) {
        if (field.type === "tags" && (!val || (val as string[]).length === 0)) {
          return `${field.label} is required`;
        }
        if (!val || (typeof val === "string" && !val.trim())) {
          return `${field.label} is required`;
        }
      }
    }
    return null;
  };

  const validatePackages = () => {
    for (let i = 0; i < state.packages.length; i++) {
      const pkg = state.packages[i];
      if (!pkg.label.trim()) return `Package ${i + 1} label is required`;
      if (!pkg.price || parseInt(pkg.price) <= 0)
        return `Package ${i + 1} price must be greater than 0`;
      if (!pkg.turnaroundDays || parseInt(pkg.turnaroundDays) <= 0)
        return `Package ${i + 1} turnaround days is required`;
    }
    return null;
  };

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);

    try {
      const packages = state.packages.map((pkg, i) => ({
        tier: tierLabels[i] as "BASIC" | "STANDARD" | "PREMIUM",
        label: pkg.label,
        price: Math.round(parseFloat(pkg.price) * 100),
        deliverables: pkg.deliverables
          .split("\n")
          .map((d) => d.trim())
          .filter(Boolean),
        turnaroundDays: parseInt(pkg.turnaroundDays),
      }));

      const res = await fetch("/api/profile/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorySlug: state.categorySlug,
          categoryFields: state.categoryFields,
          packages,
          coverVideoUrl: state.coverVideoUrl || null,
          avatarUrl: state.avatarUrl || null,
          driveFolderUrl: state.driveFolderUrl || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to create profile");
      }

      localStorage.removeItem(STORAGE_KEY);
      router.push(`/profile/${json.data.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[680px] mx-auto px-4 py-12">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-3 h-3 bg-[var(--color-accent)] rotate-45 rounded-sm" />
          <span className="font-[family-name:var(--font-display)] font-extrabold text-[var(--color-text-primary)]">
            {platformConfig.name}
          </span>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold cursor-pointer ${
                  s < state.step
                    ? "bg-[var(--color-success)] text-[var(--color-text-inverse)]"
                    : s === state.step
                      ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
                      : "bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)]"
                }`}
                onClick={() => s < state.step && goToStep(s)}
              >
                {s < state.step ? (
                  <Check size={14} fill="currentColor" />
                ) : (
                  s
                )}
              </div>
              {s < 5 && (
                <div
                  className={`w-8 h-[2px] rounded-full ${
                    s < state.step
                      ? "bg-[var(--color-success)]"
                      : "bg-[var(--color-border)]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-center text-[var(--color-text-primary)] mb-1">
          Set Up Your Profile
        </h1>
        <p className="text-[14px] text-[var(--color-text-secondary)] text-center mb-8">
          {state.step === 1 && "Choose your category"}
          {state.step === 2 && "Tell us about yourself"}
          {state.step === 3 && "Set your service packages"}
          {state.step === 4 && "Upload your portfolio"}
          {state.step === 5 && "Review and publish"}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-[8px] bg-[rgba(248,113,113,0.1)] border border-[var(--color-error)]">
            <p className="text-[13px] text-[var(--color-error)]">{error}</p>
          </div>
        )}

        {/* Step 1: Category Selection */}
        {state.step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.slug}
                onClick={() => handleCategorySelect(cat.slug)}
                className={`p-6 rounded-[16px] border cursor-pointer transition-all ${
                  state.categorySlug === cat.slug
                    ? "border-2 border-[var(--color-accent)] bg-[var(--color-accent-muted)]"
                    : "border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-mid)]"
                }`}
              >
                <h3 className="font-[family-name:var(--font-display)] font-bold text-[16px] text-[var(--color-text-primary)]">
                  {cat.label}
                </h3>
                <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
                  {cat.description}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Category Fields */}
        {state.step === 2 && selectedCategory && (
          <div className="flex flex-col gap-4">
            {selectedCategory.fieldSchema.map((field) => (
              <FieldRenderer
                key={field.key}
                field={field}
                value={state.categoryFields[field.key]}
                onChange={(val) => setField(field.key, val)}
              />
            ))}
            <div className="flex gap-3 mt-4">
              <ClButton variant="ghost" onClick={() => goToStep(1)}>
                ← Back
              </ClButton>
              <ClButton
                variant="primary"
                onClick={() => {
                  const err = validateStep2();
                  if (err) {
                    setError(err);
                    return;
                  }
                  setError("");
                  goToStep(3);
                }}
              >
                Continue →
              </ClButton>
            </div>
          </div>
        )}

        {/* Step 3: Package Builder */}
        {state.step === 3 && (
          <div className="flex flex-col gap-6">
            {state.packages.map((pkg, i) => (
              <div
                key={i}
                className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
              >
                <h3 className="font-[family-name:var(--font-display)] font-bold text-[15px] text-[var(--color-text-primary)] mb-3">
                  {tierLabels[i]} Package
                </h3>
                <div className="flex flex-col gap-3">
                  <ClInput
                    placeholder="Package label (e.g. Starter Pack)"
                    value={pkg.label}
                    onChange={(e) =>
                      updatePackage(i, { ...pkg, label: e.target.value })
                    }
                  />
                  <ClInput
                    type="number"
                    placeholder="Price (₦)"
                    value={pkg.price}
                    onChange={(e) =>
                      updatePackage(i, { ...pkg, price: e.target.value })
                    }
                  />
                  <ClInput
                    type="number"
                    placeholder="Turnaround (days)"
                    value={pkg.turnaroundDays}
                    onChange={(e) =>
                      updatePackage(i, {
                        ...pkg,
                        turnaroundDays: e.target.value,
                      })
                    }
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] text-[var(--color-text-tertiary)]">
                      Deliverables (one per line)
                    </label>
                    <ClTextarea
                      placeholder="e.g. 1 edited video (60s)&#10;Behind-the-scenes photos&#10;Usage rights"
                      value={pkg.deliverables}
                      onChange={(e) =>
                        updatePackage(i, {
                          ...pkg,
                          deliverables: e.target.value,
                        })
                      }
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-3">
              <ClButton variant="ghost" onClick={() => goToStep(2)}>
                ← Back
              </ClButton>
              <ClButton
                variant="primary"
                onClick={() => {
                  const err = validatePackages();
                  if (err) {
                    setError(err);
                    return;
                  }
                  setError("");
                  goToStep(4);
                }}
              >
                Continue →
              </ClButton>
            </div>
          </div>
        )}

        {/* Step 4: Upload */}
        {state.step === 4 && (
          <div className="flex flex-col gap-6">
            <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h3 className="font-[family-name:var(--font-display)] font-bold text-[15px] text-[var(--color-text-primary)] mb-3">
                Cover Video
              </h3>
              <p className="text-[13px] text-[var(--color-text-secondary)] mb-3">
                Upload a short video that represents your work (this will appear at the top of your profile).
              </p>
              <ClInput
                placeholder="Cloudinary video URL"
                value={state.coverVideoUrl}
                onChange={(e) => updateState({ coverVideoUrl: e.target.value })}
              />
            </div>

            <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h3 className="font-[family-name:var(--font-display)] font-bold text-[15px] text-[var(--color-text-primary)] mb-3">
                Profile Photo
              </h3>
              <ClInput
                placeholder="Cloudinary image URL"
                value={state.avatarUrl}
                onChange={(e) => updateState({ avatarUrl: e.target.value })}
              />
            </div>

            <DriveConnectSettings
              currentUrl={state.driveFolderUrl || null}
              providerId="pending"
              onStateChange={(driveState) => {
                if (driveState === "SYNCED") {
                  setShowDriveSettings(true);
                }
              }}
            />

            <div className="flex gap-3">
              <ClButton variant="ghost" onClick={() => goToStep(3)}>
                ← Back
              </ClButton>
              <ClButton variant="primary" onClick={() => goToStep(5)}>
                Review Profile →
              </ClButton>
            </div>
          </div>
        )}

        {/* Step 5: Preview */}
        {state.step === 5 && (
          <div className="flex flex-col gap-6">
            <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h3 className="font-[family-name:var(--font-display)] font-bold text-[15px] text-[var(--color-text-primary)] mb-1">
                {selectedCategory?.label ?? "Provider"} Profile
              </h3>
              <p className="text-[13px] text-[var(--color-text-secondary)] mb-4">
                Here&apos;s a preview of your profile
              </p>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 p-3 rounded-[8px] bg-[var(--color-surface-raised)]">
                  <div className="w-12 h-12 rounded-[8px] bg-[var(--color-accent-muted)] flex items-center justify-center text-[var(--color-accent)] font-bold">
                    {user?.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="font-semibold text-[14px] text-[var(--color-text-primary)]">
                      {user?.name}
                    </p>
                    <p className="text-[12px] text-[var(--color-text-secondary)]">
                      {selectedCategory?.label}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {state.packages.map((pkg, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-[8px] bg-[var(--color-surface-raised)] text-center"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                        {tierLabels[i]}
                      </p>
                      <p className="font-bold text-[var(--color-text-primary)] mt-1">
                        ₦
                        {pkg.price
                          ? (parseFloat(pkg.price) * 100).toLocaleString()
                          : "0"}
                      </p>
                    </div>
                  ))}
                </div>

                {state.portfolioItems.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {state.portfolioItems.slice(0, 3).map((item) => (
                      <ExploreVideoCard
                        key={item.id}
                        item={item}
                        size="sm"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <ClButton variant="ghost" onClick={() => goToStep(4)}>
                ← Back
              </ClButton>
              <ClButton
                variant="primary"
                loading={submitting}
                onClick={handleSubmit}
              >
                Publish Profile
              </ClButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: IFieldSchemaField;
  value: string | string[] | undefined;
  onChange: (val: string | string[]) => void;
}) {
  const [tagInput, setTagInput] = useState("");

  switch (field.type) {
    case "text":
      return (
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-xs text-[var(--color-text-secondary)] uppercase tracking-[0.06em]">
            {field.label}
            {field.required && (
              <span className="text-[var(--color-error)] ml-0.5">*</span>
            )}
          </label>
          <ClTextarea
            placeholder={field.placeholder}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
          />
        </div>
      );

    case "number":
      return (
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-xs text-[var(--color-text-secondary)] uppercase tracking-[0.06em]">
            {field.label}
            {field.required && (
              <span className="text-[var(--color-error)] ml-0.5">*</span>
            )}
          </label>
          <ClInput
            type="number"
            placeholder={field.placeholder}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );

    case "select":
      return (
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-xs text-[var(--color-text-secondary)] uppercase tracking-[0.06em]">
            {field.label}
            {field.required && (
              <span className="text-[var(--color-error)] ml-0.5">*</span>
            )}
          </label>
          <ClSelect
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt.charAt(0) + opt.slice(1).toLowerCase()}
              </option>
            ))}
          </ClSelect>
        </div>
      );

    case "tags":
      const tags = (value as string[]) ?? [];
      return (
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-xs text-[var(--color-text-secondary)] uppercase tracking-[0.06em]">
            {field.label}
            {field.required && (
              <span className="text-[var(--color-error)] ml-0.5">*</span>
            )}
          </label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-[var(--color-accent-muted)] text-[var(--color-accent)] text-[12px]"
              >
                {tag}
                <button
                  type="button"
                  className="cursor-pointer hover:opacity-70"
                  onClick={() =>
                    onChange(tags.filter((_, j) => j !== i))
                  }
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <ClInput
              placeholder={field.placeholder}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagInput.trim()) {
                  e.preventDefault();
                  onChange([...tags, tagInput.trim()]);
                  setTagInput("");
                }
              }}
            />
            <ClButton
              variant="outlined"
              size="sm"
              type="button"
              onClick={() => {
                if (tagInput.trim()) {
                  onChange([...tags, tagInput.trim()]);
                  setTagInput("");
                }
              }}
            >
              Add
            </ClButton>
          </div>
        </div>
      );

    default:
      return null;
  }
}
