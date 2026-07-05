"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const COOKIE_CONSENT_KEY = "crelab-cookie-consent";

export function CookieConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consented = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consented) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1200] p-4">
      <div className="max-w-[1200px] mx-auto rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
        <p className="text-[14px] text-[var(--color-text-primary)] font-medium mb-1">
          Cookie Consent
        </p>
        <p className="text-[13px] text-[var(--color-text-secondary)] mb-4">
          We use essential cookies for authentication and platform functionality.
          Analytics cookies are used only with your consent. See our{" "}
          <Link href="/privacy" className="text-[var(--color-accent)] underline underline-offset-2">
            Privacy Policy
          </Link>{" "}
          for more information.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleAccept}
            className="h-10 px-5 rounded-[8px] bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-semibold text-[13px] cursor-pointer border-none transition-[background] duration-[150ms] hover:bg-[var(--color-accent-dim)]"
          >
            Accept All
          </button>
          <button
            onClick={handleDecline}
            className="h-10 px-5 rounded-[8px] bg-transparent text-[var(--color-text-secondary)] border border-[var(--color-border-mid)] font-semibold text-[13px] cursor-pointer transition-[border-color] duration-[150ms] hover:border-[var(--color-accent)]"
          >
            Essential Only
          </button>
        </div>
      </div>
    </div>
  );
}
