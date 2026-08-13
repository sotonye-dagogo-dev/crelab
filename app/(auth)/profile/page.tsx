"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthClient } from "better-auth/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/lib/toast";
import { ClButton, ClCard, ClInput, ClBadge, ClBackButton } from "@/components/ui";
import { Loader2, Mail, UserRound, ShieldCheck, ShieldAlert, ArrowRight } from "lucide-react";

const authClient = createAuthClient();

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [nameSaving, setNameSaving] = useState(false);

  const [verifySending, setVerifySending] = useState(false);
  const [verifySent, setVerifySent] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailChangeSent, setEmailChangeSent] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[var(--color-text-secondary)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[15px] text-[var(--color-text-secondary)] mb-4">You need to sign in to view your profile.</div>
          <ClButton variant="primary" onClick={() => router.push("/login")}>Sign in</ClButton>
        </div>
      </div>
    );
  }

  const handleSaveName = async () => {
    setNameSaving(true);
    try {
      const res = await authClient.updateUser({ name });
      if (res.error) throw new Error(res.error.message ?? "Failed to update name");
      toast("Name updated", "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update name", "error");
    } finally {
      setNameSaving(false);
    }
  };

  const handleSendVerification = async () => {
    setVerifySending(true);
    try {
      const res = await authClient.sendVerificationEmail({
        email: user.email,
        callbackURL: "/verify-email?done=1",
      });
      if (res.error) throw new Error(res.error.message ?? "Failed to send verification email");
      setVerifySent(true);
      toast("Verification email sent", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to send verification email", "error");
    } finally {
      setVerifySending(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      toast("Enter your new email address", "error");
      return;
    }
    setEmailSaving(true);
    try {
      const res = await authClient.changeEmail({
        newEmail: newEmail.trim(),
        callbackURL: "/profile?emailChanged=1",
      });
      if (res.error) throw new Error(res.error.message ?? "Failed to change email");
      setEmailChangeSent(true);
      setNewEmail("");
      toast("Confirmation sent to your new email address", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to change email", "error");
    } finally {
      setEmailSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[720px] mx-auto px-4 py-8">
        <ClBackButton href="/dashboard" label="Back to dashboard" className="mb-6" />

        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center text-[22px] font-bold text-[var(--color-text-secondary)] overflow-hidden">
            {user.image ? (
              <img src={user.image} alt="" className="w-full h-full object-cover" />
            ) : (
              user.name?.[0]?.toUpperCase() ?? "?"
            )}
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-display)] font-bold text-[24px] tracking-[-0.01em] text-[var(--color-text-primary)]">
              {user.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[13px] text-[var(--color-text-secondary)]">{user.email}</span>
              {user.emailVerified ? (
                <ClBadge variant="success"><ShieldCheck size={11} strokeWidth={2} /> Verified</ClBadge>
              ) : (
                <ClBadge variant="warning"><ShieldAlert size={11} strokeWidth={2} /> Unverified</ClBadge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <ClCard>
            <div className="flex items-center gap-2 mb-4">
              <UserRound size={15} strokeWidth={2} className="text-[var(--color-accent)]" />
              <h2 className="font-[family-name:var(--font-display)] font-bold text-[17px]">Account details</h2>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                  Display name
                </label>
                <div className="flex items-center gap-3">
                  <ClInput className="flex-1" value={name} onChange={(e) => setName(e.target.value)} />
                  <ClButton variant="primary" size="default" onClick={handleSaveName} loading={nameSaving}>
                    Save name
                  </ClButton>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-2 border-t border-[var(--color-border)]">
                <ClButton variant="outlined" size="default" onClick={() => router.push("/profile/media")}>
                  Manage media
                </ClButton>
                <ClButton variant="outlined" size="default" onClick={() => router.push("/profile/setup")}>
                  Set up profile <ArrowRight size={14} strokeWidth={2} />
                </ClButton>
              </div>
            </div>
          </ClCard>

          <ClCard>
            <div className="flex items-center gap-2 mb-4">
              <Mail size={15} strokeWidth={2} className="text-[var(--color-accent)]" />
              <h2 className="font-[family-name:var(--font-display)] font-bold text-[17px]">Email verification</h2>
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mb-4">
              {user.emailVerified
                ? "Your email is verified. You'll receive an email confirmation if you change it."
                : "Your email isn't verified yet. Verify it to secure your account and receive booking notifications."}
            </div>
            {!user.emailVerified && (
              verifySent ? (
                <div className="text-[13px] text-[var(--color-accent)] font-medium">
                  Verification email sent — check your inbox (and spam folder).
                </div>
              ) : (
                <ClButton variant="primary" size="default" onClick={handleSendVerification} loading={verifySending}>
                  Send verification email
                </ClButton>
              )
            )}
          </ClCard>

          <ClCard>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={15} strokeWidth={2} className="text-[var(--color-accent)]" />
              <h2 className="font-[family-name:var(--font-display)] font-bold text-[17px]">Change email address</h2>
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mb-4">
              We&apos;ll send a confirmation link to the new address. Your email won&apos;t change until you confirm it there.
            </div>
            {emailChangeSent ? (
              <div className="text-[13px] text-[var(--color-accent)] font-medium">
                Confirmation sent — check your new inbox to complete the change.
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <ClInput
                  type="email"
                  className="flex-1"
                  placeholder="new@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <ClButton variant="primary" size="default" onClick={handleChangeEmail} loading={emailSaving}>
                  Change email
                </ClButton>
              </div>
            )}
          </ClCard>
        </div>
      </div>
    </div>
  );
}
