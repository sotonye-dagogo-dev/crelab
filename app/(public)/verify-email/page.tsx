"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createAuthClient } from "better-auth/client";
import { ClLogo, ClSpinner } from "@/components/ui";
import { MailCheck, RotateCcw } from "lucide-react";

const authClient = createAuthClient();

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const done = searchParams.get("done") === "1";
  const token = searchParams.get("token");
  // Fresh-signup handoff: the register page lands email/password signups here
  // with `?email=…&new=1&next=…` so the verify step is seen, not skipped.
  const isFreshSignup = searchParams.get("new") === "1";
  const nextRoute = searchParams.get("next");
  const safeNext =
    nextRoute && nextRoute.startsWith("/") && !nextRoute.startsWith("//") ? nextRoute : "/explore";

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [verifyingToken, setVerifyingToken] = useState(false);
  const welcomeFired = useRef(false);
  const [welcomeNotSent, setWelcomeNotSent] = useState(false);

  useEffect(() => {
    if (done && !welcomeFired.current) {
      welcomeFired.current = true;
      // Fire welcome email after successful verification (non-blocking).
      fetch("/api/verify-email/welcome", { method: "POST" })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json && json.sent === false) setWelcomeNotSent(true);
        })
        .catch(() => {});
    }
  }, [done]);

  const verifyToken = useCallback(async (verificationToken: string) => {
    setVerifyingToken(true);
    try {
      const res = await fetch("/api/verify-email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verificationToken }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        // The verify endpoint writes user.emailVerified directly in the DB,
        // bypassing the Better Auth session — pull a fresh session now so the
        // profile/banner stop showing a stale "unverified" after redirect.
        try {
          await authClient.getSession();
        } catch {
          // Session refresh is best-effort; the landing pages refetch on mount.
        }
        if (json.emailChange) {
          router.replace("/profile?emailChanged=1");
        } else {
          router.replace("/verify-email?done=1");
        }
      } else {
        // Invalid/expired token: fall through to the manual form with a hint.
        setMessage(
          json?.error
            ? `That link didn't work (${json.error}). Enter your email below to get a fresh one.`
            : "That link didn't work. Enter your email below to get a fresh one.",
        );
        setStatus("error");
      }
    } catch {
      // Ignore verification errors, let user use the manual form
    } finally {
      setVerifyingToken(false);
    }
  }, [router]);

  // If we have a token, verify the email automatically — even when `done=1`
  // is also present (older links carried both; verifying first prevents a
  // false success screen for a still-unverified address).
  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token, verifyToken]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSend = async () => {
    if (!email.trim()) {
      setStatus("error");
      setMessage("Please enter your email address.");
      return;
    }
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send verification email");
      if (json.sent === false) {
        const reasonText =
          typeof json.reason === "string" && json.reason.trim()
            ? json.reason
            : "We couldn't send the email right now.";
        setStatus("error");
        setMessage(`Verification email not sent. ${reasonText} Please try again later.`);
        return;
      }
      setStatus("sent");
      setMessage("We've sent a verification link. Check your inbox (and spam folder).");
      setCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  if (done && !token) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--color-accent-muted)] flex items-center justify-center mb-4">
          <MailCheck size={28} strokeWidth={1.5} className="text-[var(--color-accent)]" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] font-bold text-xl text-[var(--color-text-primary)]">
          Email verified
        </h1>
        <p className="text-[13px] text-[var(--color-text-secondary)] mt-2 leading-relaxed">
          Your email address is now confirmed. Welcome aboard — we&apos;ve sent you a
          welcome email to get you started.
        </p>
        {welcomeNotSent && (
          <p className="text-[12px] text-[var(--color-warning)] mt-2">
            The welcome email couldn&apos;t be sent right now (email sending isn&apos;t
            fully configured). You can still explore the platform.
          </p>
        )}
        <div className="flex items-center gap-2 mt-6">
          <button
            onClick={() => router.push("/explore")}
            className="h-11 px-5 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] text-[14px] font-semibold cursor-pointer border-none"
          >
            Explore creators
          </button>
          <Link
            href="/profile"
            className="inline-flex h-11 items-center justify-center px-5 rounded-[8px] border border-[var(--color-border-mid)] text-[var(--color-text-primary)] text-[14px] font-semibold no-underline"
          >
            Go to profile
          </Link>
        </div>
      </div>
    );
  }

  if (verifyingToken || (token && !done)) {
    return (
      <div className="flex flex-col items-center text-center py-8">
        <ClSpinner className="mb-4" />
        <p className="text-[14px] text-[var(--color-text-secondary)]">
          Verifying your email…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-center mb-5">
        <ClLogo variant="icon" showName iconWidth={28} iconHeight={28} />
      </div>
      <h1 className="font-[family-name:var(--font-display)] font-bold text-xl text-center text-[var(--color-text-primary)]">
        Verify your email
      </h1>
      {isFreshSignup ? (
        <p className="text-[13px] text-[var(--color-text-secondary)] text-center mt-2 leading-relaxed">
          Account created — we&apos;ve sent a verification link to{" "}
          <span className="text-[var(--color-text-primary)] font-semibold">{email || "your inbox"}</span>.
          Confirm it to unlock welcome perks and account recovery. You can also
          continue now and verify later.
        </p>
      ) : (
        <p className="text-[13px] text-[var(--color-text-secondary)] text-center mt-2 leading-relaxed">
          Enter the email address you signed up with and we&apos;ll send you a
          verification link. Verifying is optional but unlocks welcome perks and
          account recovery.
        </p>
      )}

      <div className="flex flex-col gap-3 mt-6">
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-xs text-[var(--color-text-secondary)] uppercase tracking-[0.06em]">
            Email
          </label>
          <input
            type="email"
            className="h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)]"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setStatus("idle");
            }}
            disabled={status === "sending"}
          />
        </div>

        {message && (
          <p
            className={`text-[12px] ${
              status === "error" ? "text-[var(--color-error)]" : "text-[var(--color-success)]"
            }`}
          >
            {message}
          </p>
        )}

        <button
          onClick={handleSend}
          disabled={status === "sending" || countdown > 0}
          className="relative h-12 px-6 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold text-[15px] w-full mt-1 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer border-none"
        >
          {status === "sending" && (
            <ClSpinner className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
          )}
          <span className={status === "sending" ? "invisible" : "inline-flex items-center justify-center gap-2"}>
            {countdown > 0 ? (
              <>
                <RotateCcw size={15} strokeWidth={2} />
                Resend in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
              </>
            ) : status === "sent" ? (
              "Resend verification email"
            ) : (
              "Send verification email"
            )}
          </span>
        </button>

        {status === "sent" && (
          <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
            Didn&apos;t get it? Double-check you typed the right address, wait for the
            countdown above, then hit <span className="text-[var(--color-accent)]">resend</span>.
          </div>
        )}

        {isFreshSignup && (
          <button
            onClick={() => router.push(safeNext)}
            className="h-11 px-5 rounded-[8px] border border-[var(--color-border-mid)] text-[var(--color-text-primary)] text-[14px] font-semibold w-full mt-1 cursor-pointer bg-transparent"
          >
            Continue without verifying →
          </button>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[rgba(10,10,10,0.85)] p-4">
      <div className="w-full max-w-[420px] max-h-[90vh] overflow-y-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
        <Suspense fallback={null}>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </div>
  );
}
