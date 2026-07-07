"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformConfig } from "@/lib/config-context";
import { captureConsent } from "@/lib/consent";
import { ConsentType } from "@/types";
import { Check, Camera, Briefcase } from "lucide-react";

function RegisterForm() {
  const platformConfig = usePlatformConfig();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp } = useAuth();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("PROVIDER");
  const [consentTerms, setConsentTerms] = useState(true);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [consentAnalytics, setConsentAnalytics] = useState(false);
  const [error, setError] = useState("");

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!consentTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy");
      return;
    }
    setError("");

    try {
      const user = await signUp(name, email, password);
      if (user?.id) {
        await captureConsent(user.id, ConsentType.TERMS, consentTerms);
        if (consentMarketing) {
          await captureConsent(user.id, ConsentType.MARKETING, true);
        }
        if (consentAnalytics) {
          await captureConsent(user.id, ConsentType.ANALYTICS, true);
        }
      }
      router.push(
        role === "PROVIDER" ? "/profile/setup" : searchParams.get("returnTo") || "/explore",
      );
    } catch {
      setError("Registration failed. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[rgba(10,10,10,0.85)] p-4">
      <div className="w-full max-w-[420px] max-h-[90vh] overflow-y-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-3 h-3 bg-[var(--color-accent)] rotate-45 rounded-sm shrink-0" />
          <span className="font-[family-name:var(--font-display)] font-extrabold text-[var(--color-text-primary)]">
            {platformConfig.name}
          </span>
        </div>

        {step === 1 && (
          <>
            <div className="flex items-center justify-center gap-[6px] mb-5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
              <span className="w-2 h-2 rounded-full bg-[var(--color-border)]" />
            </div>
            <h1 className="font-[family-name:var(--font-display)] font-bold text-xl text-center text-[var(--color-text-primary)]">
              Create your account
            </h1>
            <form onSubmit={handleStep1Submit} className="flex flex-col gap-3 mt-4">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-xs text-[var(--color-text-secondary)] uppercase tracking-[0.06em]">
                  Full Name
                </label>
                <input
                  className="h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)]"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-xs text-[var(--color-text-secondary)] uppercase tracking-[0.06em]">
                  Email
                </label>
                <input
                  className="h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)]"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-xs text-[var(--color-text-secondary)] uppercase tracking-[0.06em]">
                  Password
                </label>
                <input
                  className="h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)]"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-xs text-[var(--color-text-secondary)] uppercase tracking-[0.06em]">
                  Confirm Password
                </label>
                <input
                  className="h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)]"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-[12px] text-[var(--color-error)]">{error}</p>
              )}
              <button
                type="submit"
                className="h-12 px-6 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold text-[15px] w-full mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
              >
                Continue →
              </button>
            </form>
            <p className="text-[13px] text-[var(--color-text-secondary)] text-center mt-4">
              Already have an account?{" "}
              <span
                className="text-[var(--color-accent)] cursor-pointer"
                onClick={() => router.push("/login")}
              >
                Sign in
              </span>
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center justify-center gap-[6px] mb-5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-success)] flex items-center justify-center">
                <Check size={8} strokeWidth={3} color="var(--color-text-inverse)" />
              </span>
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
            </div>
            <h1 className="font-[family-name:var(--font-display)] font-bold text-xl text-center text-[var(--color-text-primary)]">
              Almost there
            </h1>

            <div className="mt-4">
              <p className="font-semibold text-xs text-[var(--color-text-secondary)] uppercase tracking-[0.06em] mb-3">
                I&apos;m joining as...
              </p>
              <div className="flex gap-2">
                <div
                  className={`flex-1 p-5 rounded-[12px] cursor-pointer flex flex-col gap-3 border ${
                    role === "PROVIDER"
                      ? "border-2 border-[var(--color-accent)] bg-[var(--color-accent-muted)]"
                      : "border border-[var(--color-border)] bg-[var(--color-surface-raised)]"
                  }`}
                  onClick={() => setRole("PROVIDER")}
                >
                  <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface)] flex items-center justify-center shrink-0">
                    <Camera size={24} strokeWidth={1.8} color="var(--color-accent)" />
                  </div>
                  <span className="font-[family-name:var(--font-display)] font-bold text-[15px] text-[var(--color-text-primary)]">
                    A Creator
                  </span>
                  <span className="text-[13px] text-[var(--color-text-secondary)]">
                    Showcase your work and get hired by brands
                  </span>
                </div>
                <div
                  className={`flex-1 p-5 rounded-[12px] cursor-pointer flex flex-col gap-3 border ${
                    role === "CLIENT"
                      ? "border-2 border-[var(--color-accent)] bg-[var(--color-accent-muted)]"
                      : "border border-[var(--color-border)] bg-[var(--color-surface-raised)]"
                  }`}
                  onClick={() => setRole("CLIENT")}
                >
                  <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface)] flex items-center justify-center shrink-0">
                    <Briefcase size={24} strokeWidth={1.8} color="var(--color-accent)" />
                  </div>
                  <span className="font-[family-name:var(--font-display)] font-bold text-[15px] text-[var(--color-text-primary)]">
                    A Brand / Client
                  </span>
                  <span className="text-[13px] text-[var(--color-text-secondary)]">
                    Find the perfect creator for your next project
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-[var(--color-border)] pt-5">
              <p className="font-semibold text-xs text-[var(--color-text-secondary)] uppercase tracking-[0.06em] mb-3">
                Before you start
              </p>
              <div className="flex flex-col gap-3">
                <label
                  className={`flex items-start gap-2 cursor-pointer text-[14px] text-[var(--color-text-primary)] ${
                    consentTerms ? "" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={consentTerms}
                    onChange={(e) => setConsentTerms(e.target.checked)}
                  />
                  <span
                    className={`w-[18px] h-[18px] min-w-[18px] border rounded-[4px] flex items-center justify-center shrink-0 mt-[1px] ${
                      consentTerms
                        ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-raised)]"
                    }`}
                  >
                    {consentTerms && (
                      <Check size={12} strokeWidth={3} color="var(--color-text-inverse)" />
                    )}
                  </span>
                  <span className="flex flex-col gap-[2px]">
                    <span className="font-semibold text-[13px] text-[var(--color-text-primary)]">
                      Terms of Service &amp; Privacy Policy
                    </span>
                    <span className="text-[12px] text-[var(--color-text-secondary)]">
                      I&apos;ve read and agree to {platformConfig.name}&apos;s Terms and Privacy Policy, including data handling under NDPR 2023.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer text-[14px] text-[var(--color-text-primary)]">
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={consentMarketing}
                    onChange={(e) => setConsentMarketing(e.target.checked)}
                  />
                  <span
                    className={`w-[18px] h-[18px] min-w-[18px] border rounded-[4px] flex items-center justify-center shrink-0 mt-[1px] ${
                      consentMarketing
                        ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-raised)]"
                    }`}
                  >
                    {consentMarketing && (
                      <Check size={12} strokeWidth={3} color="var(--color-text-inverse)" />
                    )}
                  </span>
                  <span className="flex flex-col gap-[2px]">
                    <span className="font-semibold text-[13px] text-[var(--color-text-primary)]">
                      Marketing emails
                    </span>
                    <span className="text-[12px] text-[var(--color-text-secondary)]">
                      Receive tips, updates, and offers from {platformConfig.name}. Unsubscribe any time.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer text-[14px] text-[var(--color-text-primary)]">
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={consentAnalytics}
                    onChange={(e) => setConsentAnalytics(e.target.checked)}
                  />
                  <span
                    className={`w-[18px] h-[18px] min-w-[18px] border rounded-[4px] flex items-center justify-center shrink-0 mt-[1px] ${
                      consentAnalytics
                        ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-raised)]"
                    }`}
                  >
                    {consentAnalytics && (
                      <Check size={12} strokeWidth={3} color="var(--color-text-inverse)" />
                    )}
                  </span>
                  <span className="flex flex-col gap-[2px]">
                    <span className="font-semibold text-[13px] text-[var(--color-text-primary)]">
                      Analytics
                    </span>
                    <span className="text-[12px] text-[var(--color-text-secondary)]">
                      Help us improve {platformConfig.name} with anonymous usage data.
                    </span>
                  </span>
                </label>
              </div>

              {error && (
                <p className="text-[12px] text-[var(--color-error)] mt-2">{error}</p>
              )}

              <button
                className={`h-12 px-6 rounded-[8px] font-semibold text-[15px] w-full mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ${
                  consentTerms
                    ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
                    : "bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)] cursor-not-allowed"
                }`}
                disabled={!consentTerms}
                onClick={handleSubmit}
              >
                Create Account
              </button>
            </div>

            <button
              className="mt-2 text-[14px] text-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] rounded-[4px]"
              onClick={() => setStep(1)}
            >
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
