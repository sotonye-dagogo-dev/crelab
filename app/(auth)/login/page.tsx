"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

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
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-3 h-3 bg-[var(--color-accent)] rotate-45 rounded-sm shrink-0" />
          <span className="font-[family-name:var(--font-display)] font-extrabold text-[var(--color-text-primary)]">
            CreLab
          </span>
        </div>

        <h1 className="font-[family-name:var(--font-display)] font-bold text-xl text-center text-[var(--color-text-primary)]">
          Welcome back
        </h1>

        <div className="flex gap-2 mt-4 mb-5">
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
                <span className="text-[12px] text-[var(--color-accent)] cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <input
                  className="h-10 px-3 pr-[44px] rounded-[8px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[14px] text-[var(--color-text-primary)] outline-none w-full focus:border-[var(--color-accent)]"
                  type="password"
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
                <button className="h-10 px-4 rounded-[8px] bg-transparent text-[var(--color-accent)] border border-[var(--color-accent)] font-semibold text-[13px] shrink-0 cursor-pointer">
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
