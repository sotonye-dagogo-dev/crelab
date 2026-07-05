"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function AuthGate({
  providerName,
  pendingAction,
  children,
}: {
  providerName?: string;
  pendingAction?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setIsOpen(true);
    }
  }, [isLoading, isAuthenticated]);

  const handleSignUp = () => {
    if (pendingAction) {
      sessionStorage.setItem("pendingAction", pendingAction);
    }
    router.push("/register");
  };

  const handleSignIn = () => {
    if (pendingAction) {
      sessionStorage.setItem("pendingAction", pendingAction);
    }
    router.push("/login");
  };

  if (isLoading || !isOpen) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(10,10,10,0.85)] backdrop-blur-[4px] p-4">
      <div className="w-full max-w-[420px] max-h-[90vh] overflow-y-auto rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-3 h-3 bg-[var(--color-accent)] rotate-45 rounded-sm shrink-0" />
          <span className="font-[family-name:var(--font-display)] font-extrabold text-[var(--color-text-primary)]">
            CreLab
          </span>
        </div>

        <h1 className="font-[family-name:var(--font-display)] font-bold text-xl text-center text-[var(--color-text-primary)] max-w-[300px] mx-auto">
          To book {providerName || "a creator"}, create a free CreLab account
        </h1>

        <p className="text-[14px] text-[var(--color-text-secondary)] text-center max-w-[300px] mx-auto mt-2">
          Join thousands of brands and creators on Nigeria&apos;s creative marketplace.
        </p>

        <div className="flex flex-col gap-2 mt-5">
          <button
            onClick={handleSignUp}
            className="h-12 px-6 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold text-[15px] w-full flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 7l-10 7L2 7" />
            </svg>
            Sign up with Email
          </button>
          <button
            onClick={handleSignUp}
            className="h-12 px-6 rounded-[8px] bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border-mid)] font-semibold text-[15px] w-full flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Sign up with Phone
          </button>
        </div>

        <div className="flex items-center gap-3 my-5">
          <span className="flex-1 h-[1px] bg-[var(--color-border)]" />
          <span className="text-[12px] text-[var(--color-text-tertiary)] whitespace-nowrap">or</span>
          <span className="flex-1 h-[1px] bg-[var(--color-border)]" />
        </div>

        <p className="text-[13px] text-[var(--color-text-secondary)] text-center">
          Already have an account?{" "}
          <span
            className="text-[var(--color-accent)] cursor-pointer"
            onClick={handleSignIn}
          >
            Sign in →
          </span>
        </p>

        <p className="text-[11px] text-[var(--color-text-tertiary)] text-center mt-4 leading-[1.5]">
          By continuing, you agree to CreLab&apos;s <a href="#" className="underline underline-offset-2 hover:text-[var(--color-text-secondary)]">Terms of Service</a> and <a href="#" className="underline underline-offset-2 hover:text-[var(--color-text-secondary)]">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
