"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { ClLogo, ClPasswordInput } from "@/components/ui";
import {
  OAUTH_NEW_USER_CALLBACK_URL,
  OAUTH_ERROR_CALLBACK_URL,
} from "@/lib/oauth";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();

  const [tab, setTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await signIn(email, password);
      router.push("/explore");
    } catch {
      setError("Invalid email or password");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const next = document.querySelector<HTMLInputElement>(
        `[data-otp="${index + 1}"]`,
      );
      next?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prev = document.querySelector<HTMLInputElement>(
        `[data-otp="${index - 1}"]`,
      );
      prev?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const data = e.clipboardData.getData("text");
    const digits = data.replace(/\D/g, "").split("").slice(0, 6);
    const newOtp = [...otp];
    digits.forEach((d, i) => {
      newOtp[i] = d;
    });
    setOtp(newOtp);
    const nextIdx = Math.min(digits.length, 5);
    const next = document.querySelector<HTMLInputElement>(
      `[data-otp="${nextIdx}"]`,
    );
    next?.focus();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[rgba(10,10,10,0.85)] p-4">
      <div className="w-full max-w-[420px] max-h-[90vh] overflow-y-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
        <div className="flex items-center justify-center mb-6">
          <ClLogo variant="icon" showName iconWidth={28} iconHeight={28} />
        </div>

        <h1 className="font-[family-name:var(--font-display)] font-bold text-xl text-center text-[var(--color-text-primary)]">
          Welcome back
        </h1>

        <button
          onClick={() =>
            signInWithGoogle({
              callbackURL: "/explore",
              newUserCallbackURL: OAUTH_NEW_USER_CALLBACK_URL,
              errorCallbackURL: OAUTH_ERROR_CALLBACK_URL,
            })
          }
          className="flex items-center justify-center gap-3 h-11 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[13px] font-semibold text-[var(--color-text-primary)] w-full mt-5 cursor-pointer hover:border-[var(--color-border-mid)] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-[var(--color-border)]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
            or continue with
          </span>
          <div className="flex-1 h-px bg-[var(--color-border)]" />
        </div>

        <div className="flex gap-2 mb-5">
          <button
            className={`flex-1 h-9 rounded-[8px] text-[13px] font-semibold cursor-pointer transition-colors ${
              tab === "email"
                ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
                : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
            onClick={() => setTab("email")}
          >
            Email
          </button>
          <button
            className={`flex-1 h-9 rounded-[8px] text-[13px] font-semibold cursor-pointer transition-colors ${
              tab === "phone"
                ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)]"
                : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
            onClick={() => setTab("phone")}
          >
            Phone
          </button>
        </div>

        {tab === "email" && (
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
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
              <div className="flex items-center justify-between">
                <label className="font-semibold text-xs text-[var(--color-text-secondary)] uppercase tracking-[0.06em]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[12px] text-[var(--color-accent)] no-underline hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <ClPasswordInput
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            {error && (
              <p className="text-[12px] text-[var(--color-error)]">{error}</p>
            )}
            <button
              type="submit"
              className="h-12 px-6 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold text-[15px] w-full mt-1"
            >
              Sign In →
            </button>
          </form>
        )}

        {tab === "phone" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-xs text-[var(--color-text-secondary)] uppercase tracking-[0.06em]">
                Phone Number
              </label>
              <div className="flex gap-2 items-end">
                <input
                  className="h-10 px-3 rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)]"
                  type="tel"
                  placeholder="+234 800 000 0000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <button className="h-10 px-4 rounded-[8px] bg-transparent text-[var(--color-accent)] border border-[var(--color-accent)] font-semibold text-[13px] shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]">
                  Send OTP
                </button>
              </div>
            </div>
            <div>
              <p className="text-[12px] text-[var(--color-text-tertiary)] mb-3">
                Enter the 6-digit code sent to your phone
              </p>
              <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    data-otp={i}
                    className="w-[44px] h-[52px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[8px] font-[family-name:var(--font-mono)] text-[22px] font-bold text-[var(--color-text-primary)] text-center outline-none focus:border-[var(--color-accent)]"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>
            </div>
            <button className="h-12 px-6 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold text-[15px] w-full mt-1">
              Sign In →
            </button>
          </div>
        )}

        <p className="text-[13px] text-[var(--color-text-secondary)] text-center mt-4">
          Don&apos;t have an account?{" "}
          <span
            className="text-[var(--color-accent)] cursor-pointer"
            onClick={() => router.push("/register")}
          >
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
}
