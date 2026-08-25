"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClButton, ClCard, ClInput, ClBackButton } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { Calendar, Clock, Shield, User, ArrowLeft } from "lucide-react";
import type { IProvider, IServicePackage } from "@/types";
import Link from "next/link";
import { buildProviderSlug } from "@/lib/slug";

interface BookingClientProps {
  provider: IProvider;
  package: IServicePackage;
  currentUserId: string | null;
}

const tierLabels: Record<string, string> = {
  BASIC: "Basic",
  STANDARD: "Standard",
  PREMIUM: "Premium",
};

export function BookingClient({ provider, package: selectedPackage, currentUserId }: BookingClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [serviceDate, setServiceDate] = useState("");
  const [scopeNotes, setScopeNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const platformFeeRate = 0.05;
  const subtotal = selectedPackage.price;
  const fee = Math.round(subtotal * platformFeeRate);
  const total = subtotal + fee;

  const formatAmount = (kobo: number) => `₦${(kobo / 100).toLocaleString()}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUserId) {
      setShowAuthPrompt(true);
      return;
    }

    if (!serviceDate) {
      toast("Please select a service date", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: provider.id,
          packageId: selectedPackage.id,
          serviceDate,
          scopeNotes: scopeNotes.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error ?? "Failed to create booking");
      }

      toast("Booking requested successfully!", "success");
      router.push(`/bookings/${json.data.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create booking", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[600px] mx-auto px-4 py-8">
        <Link
        href={`/profile/${buildProviderSlug(provider.displayName, provider.id)}`}
        className="inline-flex items-center gap-2 text-[13px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] mb-6"
      >
        <ArrowLeft size={15} strokeWidth={2} />
        Back to Profile
      </Link>

        <div className="mb-6">
          <div className="flex items-center gap-3">
            {provider.avatarUrl ? (
              <img
                src={provider.avatarUrl}
                alt={provider.displayName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[var(--color-accent-muted)] flex items-center justify-center">
                <User size={20} color="var(--color-accent)" />
              </div>
            )}
            <div>
              <h1 className="font-[family-name:var(--font-display)] font-bold text-[22px] text-[var(--color-text-primary)]">
                Book {provider.displayName}
              </h1>
              <p className="text-[13px] text-[var(--color-text-secondary)]">
                {tierLabels[selectedPackage.tier] ?? selectedPackage.tier} — {selectedPackage.label}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <ClCard className="mb-6">
            <div className="p-5">
              <h2 className="font-[family-name:var(--font-display)] font-bold text-[16px] text-[var(--color-text-primary)] mb-4">
                Service Details
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[var(--color-accent)] mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <label className="text-[12px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-[0.06em]">
                      Service Date
                    </label>
                    <ClInput
                      type="date"
                      value={serviceDate}
                      onChange={(e) => setServiceDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      required
                      className="mt-1"
                      placeholder="Select date"
                    />
                    <p className="text-[12px] text-[var(--color-text-tertiary)] mt-1">
                      {selectedPackage.turnaroundDays} day turnaround from this date
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[var(--color-accent)] mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <label className="text-[12px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-[0.06em]">
                      Project Scope (Optional)
                    </label>
                    <textarea
                      value={scopeNotes}
                      onChange={(e) => setScopeNotes(e.target.value)}
                      rows={4}
                      className="mt-1 w-full h-auto px-3 py-2 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] resize-y"
                      placeholder="Describe what you need, any specific requirements, references, etc."
                    />
                  </div>
                </div>
              </div>
            </div>
          </ClCard>

          <ClCard className="mb-6">
            <div className="p-5">
              <h2 className="font-[family-name:var(--font-display)] font-bold text-[16px] text-[var(--color-text-primary)] mb-4">
                Price Summary
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-[var(--color-text-secondary)]">
                    {selectedPackage.label} ({tierLabels[selectedPackage.tier]})
                  </span>
                  <span className="font-semibold text-[14px] text-[var(--color-text-primary)]">
                    {formatAmount(subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[var(--color-accent)]" />
                    <span className="text-[14px] text-[var(--color-text-secondary)]">
                      Platform Fee ({(platformFeeRate * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <span className="font-medium text-[14px] text-[var(--color-text-primary)]">
                    {formatAmount(fee)}
                  </span>
                </div>

                <div className="border-t border-[var(--color-border)] pt-3 flex items-center justify-between">
                  <span className="font-[family-name:var(--font-display)] font-bold text-[16px] text-[var(--color-text-primary)]">
                    Total
                  </span>
                  <span className="font-[family-name:var(--font-display)] font-bold text-[20px] text-[var(--color-accent)]">
                    {formatAmount(total)}
                  </span>
                </div>
              </div>
            </div>
          </ClCard>

          {!currentUserId && (
            <div className="mb-6 p-4 rounded-[12px] bg-[var(--color-accent-muted)] border border-[var(--color-accent)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center shrink-0">
                  <User size={16} color="var(--color-text-inverse)" />
                </div>
                <div>
                  <p className="font-medium text-[14px] text-[var(--color-text-primary)]">
                    Sign in to book
                  </p>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    You need to be logged in to request a booking. Your details will be pre-filled.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <ClBackButton
              href={`/profile/${buildProviderSlug(provider.displayName, provider.id)}`}
              label="Back"
              className="flex-1"
            />
            <ClButton
              variant="primary"
              size="lg"
              className="flex-1"
              loading={isSubmitting}
              type="submit"
            >
              {currentUserId ? "Request Booking" : "Sign In to Book"}
            </ClButton>
          </div>
        </form>

        <div className="mt-8 text-center text-[12px] text-[var(--color-text-tertiary)]">
          <p>Protected by Crelab Escrow — funds released only when you&apos;re satisfied.</p>
        </div>
      </div>

      {showAuthPrompt && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-[var(--color-bg)/0.8] backdrop-blur-sm p-4"
          onClick={() => setShowAuthPrompt(false)}
        >
          <ClCard className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-accent-muted)] flex items-center justify-center">
                  <Shield size={32} color="var(--color-accent)" />
                </div>
                <h3 className="font-[family-name:var(--font-display)] font-bold text-[20px] text-[var(--color-text-primary)]">
                  Sign In Required
                </h3>
                <p className="mt-2 text-[14px] text-[var(--color-text-secondary)]">
                  You need to be logged in to book {provider.displayName}. Your booking details will be saved.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <ClButton
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    setShowAuthPrompt(false);
                    router.push(`/auth/signin?redirect=/booking?provider=${provider.id}&package=${selectedPackage.id}`);
                  }}
                >
                  Sign In / Sign Up
                </ClButton>
                <ClButton variant="ghost" size="lg" onClick={() => setShowAuthPrompt(false)}>
                  Cancel
                </ClButton>
              </div>
            </div>
          </ClCard>
        </div>
      )}
    </div>
  );
}