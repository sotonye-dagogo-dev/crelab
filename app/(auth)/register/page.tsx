"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformConfig } from "@/lib/config-context";
import { captureConsent } from "@/lib/consent";
import { ConsentType } from "@/types";
import { useToast } from "@/lib/toast";
import { Check, Camera, Briefcase } from "lucide-react";
import { ClLogo, ClPasswordInput, ClSpinner } from "@/components/ui";
import {
  OAUTH_CALLBACK_URL,
  OAUTH_NEW_USER_CALLBACK_URL,
  OAUTH_ERROR_CALLBACK_URL,
  isOAuthCallbackDone,
  isNewOAuthUser,
  isOAuthError,
  resolvePostSignupRoute,
} from "@/lib/oauth";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function RegisterForm() {
  const platformConfig = usePlatformConfig();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading, signUp, signInWithGoogle } = useAuth();
  const { toast } = useToast();

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
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const oAuthReturn = isOAuthCallbackDone(searchParams);
  const oAuthNewUser = isNewOAuthUser(searchParams);

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

  const handleGoogleSignUp = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle({
        callbackURL: OAUTH_CALLBACK_URL,
        newUserCallbackURL: OAUTH_NEW_USER_CALLBACK_URL,
        errorCallbackURL: OAUTH_ERROR_CALLBACK_URL,
      });
    } catch {
      setError("Could not start Google sign-up. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (isOAuthError(searchParams)) {
      setError("Google sign-up was cancelled or failed. Please try again.");
      router.replace("/register");
      return;
    }
    if (!oAuthReturn) return;
    if (isLoading) return;
    if (!isAuthenticated) {
      setError("Google sign-in did not complete. Please try again.");
      router.replace("/register");
      return;
    }
    if (oAuthNewUser) {
      setError("");
      setStep(2);
    } else {
      router.replace(searchParams.get("returnTo") || "/explore");
    }
  }, [oAuthReturn, oAuthNewUser, isLoading, isAuthenticated, router, searchParams]);

  const handleSubmit = async () => {
    if (!consentTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy");
      return;
    }
    setError("");

    setSubmitting(true);
    try {
      let userId: string;

      if (oAuthReturn && oAuthNewUser) {
        if (!user?.id) {
          setError("Your session has expired. Please sign in again.");
          return;
        }
        userId = user.id;
        if (role === "PROVIDER") {
          const res = await fetch("/api/auth/role", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "PROVIDER" }),
          });
          if (!res.ok) {
            throw new Error("Failed to set account type");
          }
        }
        fetch("/api/email/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, name: user.name }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((json) => {
            if (json && json.sent === false) {
              toast(
                json.reason === "Email notifications disabled"
                  ? "Welcome email is turned off in settings."
                  : json.reason === "resend_not_configured"
                    ? "Welcome email could not be sent — email sending isn't configured yet."
                    : "Welcome email could not be sent. You can still continue.",
                "error",
              );
            }
          })
          .catch(() => {});
      } else {
        const newUser = await signUp(name, email, password);
        if (!newUser?.id) {
          throw new Error("Sign up failed");
        }
        userId = newUser.id;
        if (role === "PROVIDER") {
          const res = await fetch("/api/auth/role", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "PROVIDER" }),
          });
          if (!res.ok) {
            throw new Error("Failed to set account type");
          }
        }
      }

      await captureConsent(userId, ConsentType.TERMS, consentTerms);
      if (consentMarketing) {
        await captureConsent(userId, ConsentType.MARKETING, true);
      }
      if (consentAnalytics) {
        await captureConsent(userId, ConsentType.ANALYTICS, true);
      }

      router.replace(resolvePostSignupRoute(role, searchParams.get("returnTo")));
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[rgba(10,10,10,0.85)] p-4">
      <div className="w-full max-w-[420px] max-h-[90vh] overflow-y-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
        <div className="flex items-center justify-center mb-6">
          <ClLogo variant="icon" showName iconWidth={28} iconHeight={28} />
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

            <button
              onClick={handleGoogleSignUp}
              disabled={googleLoading}
              className="relative flex items-center justify-center gap-3 h-11 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[13px] font-semibold text-[var(--color-text-primary)] w-full mt-5 cursor-pointer hover:border-[var(--color-border-mid)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {googleLoading && (
                <ClSpinner className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
              )}
              <span className={googleLoading ? "invisible flex items-center gap-3" : "flex items-center gap-3"}>
                <GoogleIcon />
                Continue with Google
              </span>
            </button>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-[var(--color-border)]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                or sign up with email
              </span>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
            </div>

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
                <ClPasswordInput
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
                <ClPasswordInput
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

            {oAuthNewUser && user && (
              <div className="mt-4 p-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center gap-3">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--color-accent-muted)] flex items-center justify-center text-[var(--color-accent)] font-bold shrink-0">
                    {user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)] truncate">
                    {user.name}
                  </p>
                  <p className="text-[12px] text-[var(--color-text-secondary)] truncate">
                    {user.email} · via Google
                  </p>
                </div>
              </div>
            )}

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
                className={`relative h-12 px-6 rounded-[8px] font-semibold text-[15px] w-full mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ${
                  consentTerms
                    ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
                    : "bg-[var(--color-surface-raised)] text-[var(--color-text-tertiary)] cursor-not-allowed"
                } ${submitting ? "opacity-60 cursor-not-allowed" : ""}`}
                disabled={!consentTerms || submitting}
                onClick={handleSubmit}
              >
                {submitting && (
                  <ClSpinner className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                )}
                <span className={submitting ? "invisible" : ""}>
                  Create Account
                </span>
              </button>
            </div>

            {!oAuthNewUser && (
              <button
                className="mt-2 text-[14px] text-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] rounded-[4px]"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
            )}
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
