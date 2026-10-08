"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createAuthClient } from "better-auth/client";
import { usePlatformConfig } from "@/lib/config-context";
import { useToast } from "@/lib/toast";
import { MailWarning, X } from "lucide-react";

const authClient = createAuthClient();
const RESEND_COOLDOWN_SECONDS = 60;
const DISMISSED_KEY = "crellab-verify-banner-dismissed";

/**
 * Persistent (dismissible per tab session) nudge for signed-in users whose
 * email is still unverified. Verification stays optional — this banner only
 * informs and offers a one-tap resend. Hidden when
 * `emailVerification.bannerEnabled` is false or in mock mode.
 */
export function VerifyEmailBanner() {
  const config = usePlatformConfig();
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(DISMISSED_KEY)) return;
    if (process.env.NEXT_PUBLIC_MOCK_DATA === "true") return;
    let cancelled = false;
    authClient
      .getSession()
      .then((session) => {
        if (cancelled) return;
        const u = session?.data?.user as { emailVerified?: boolean; email?: string } | undefined;
        if (u && u.emailVerified === false && u.email) {
          setEmail(u.email);
          setVisible(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Missing block (pre-default configs) means enabled — matches DEFAULT_CONFIG.
  if (config.emailVerification?.bannerEnabled === false || !visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Non-persistent dismissal only.
    }
  };

  const resend = async () => {
    if (!email || sending || cooldown > 0) return;
    setSending(true);
    try {
      const res = await fetch("/api/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? "Couldn't send the verification email.");
      }
      if (json.sent === false) {
        toast(`Verification email not sent. ${json.reason ?? "Try again later."}`, "error");
        return;
      }
      toast("Verification email sent — check your inbox.", "success");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't send the verification email.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-[380px] z-40 rounded-[12px] border border-[var(--color-warning)]/40 bg-[var(--color-surface)] p-3 shadow-lg"
    >
      <div className="flex items-start gap-2">
        <MailWarning size={18} strokeWidth={2} className="text-[var(--color-warning)] shrink-0 mt-[1px]" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
            Verify your email
          </p>
          <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed mt-[2px]">
            Confirm {email} to unlock welcome perks and account recovery.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={resend}
              disabled={sending || cooldown > 0}
              className="h-8 px-3 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] text-[12px] font-semibold cursor-pointer border-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : sending ? "Sending…" : "Resend email"}
            </button>
            <Link
              href={`/verify-email?email=${encodeURIComponent(email)}`}
              className="inline-flex h-8 items-center px-3 rounded-[8px] border border-[var(--color-border-mid)] text-[var(--color-text-primary)] text-[12px] font-semibold no-underline"
            >
              Verify page
            </Link>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss verify-email reminder"
          className="p-1 rounded-[6px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer bg-transparent border-none"
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
