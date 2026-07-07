"use client";

import { useState } from "react";
import Link from "next/link";
import { usePlatformConfig } from "@/lib/config-context";
import { Send } from "lucide-react";

export default function ForgotPasswordPage() {
  const platformConfig = usePlatformConfig();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    try {
      const res = await fetch("/api/auth/forget-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to send reset email");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[rgba(10,10,10,0.85)] p-4">
        <div className="w-full max-w-[420px] rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-3 h-3 bg-[var(--color-accent)] rotate-45 rounded-sm shrink-0" />
            <span className="font-[family-name:var(--font-display)] font-extrabold text-[var(--color-text-primary)]">
              {platformConfig.name}
            </span>
          </div>

          <div className="w-12 h-12 rounded-full bg-[var(--color-success)] bg-opacity-20 flex items-center justify-center mx-auto mb-4">
            <Send size={24} strokeWidth={2.5} color="var(--color-success)" />
          </div>

          <h1 className="font-[family-name:var(--font-display)] font-bold text-xl text-[var(--color-text-primary)] mb-2">
            Check your inbox
          </h1>
          <p className="text-[14px] text-[var(--color-text-secondary)] mb-6">
            If an account exists for <strong className="text-[var(--color-text-primary)]">{email}</strong>, we&apos;ve sent a password reset link.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-12 px-6 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold text-[15px] w-full no-underline"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[rgba(10,10,10,0.85)] p-4">
      <div className="w-full max-w-[420px] rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-3 h-3 bg-[var(--color-accent)] rotate-45 rounded-sm shrink-0" />
          <span className="font-[family-name:var(--font-display)] font-extrabold text-[var(--color-text-primary)]">
            {platformConfig.name}
          </span>
        </div>

        <h1 className="font-[family-name:var(--font-display)] font-bold text-xl text-center text-[var(--color-text-primary)]">
          Reset your password
        </h1>
        <p className="text-[13px] text-[var(--color-text-secondary)] text-center mt-2 mb-6">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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

          {error && (
            <p className="text-[12px] text-[var(--color-error)]">{error}</p>
          )}

          <button
            type="submit"
            className="h-12 px-6 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold text-[15px] w-full mt-1"
          >
            Send Reset Link →
          </button>
        </form>

        <p className="text-[13px] text-[var(--color-text-secondary)] text-center mt-4">
          Remember your password?{" "}
          <Link
            href="/login"
            className="text-[var(--color-accent)] no-underline hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
