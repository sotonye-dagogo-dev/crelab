import { betterAuth } from "better-auth";
import { headers } from "next/headers";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@/lib/db";
import { phoneNumber } from "better-auth/plugins";
import { dash } from "@better-auth/infra";
import * as schema from "@/drizzle/schema";
import type { EmailSendResult } from "@/services/EmailService";

/**
 * Holds the outcome of the most recent transactional email send, so API routes
 * that trigger Better Auth callbacks (which intentionally never fail the auth
 * flow) can surface the *real* send result to the caller — e.g. when Resend
 * rejects the request even though the auth API returned 200. Keyed by
 * template + recipient so concurrent flows don't read a stale result.
 */
const lastSendResults = new Map<string, EmailSendResult>();

export function getLastEmailSendResult(templateKey: string, to: string): EmailSendResult | undefined {
  return lastSendResults.get(`${templateKey}:${to.toLowerCase()}`);
}

export function clearLastEmailSendResult(templateKey: string, to: string) {
  lastSendResults.delete(`${templateKey}:${to.toLowerCase()}`);
}

async function sendTransactionalEmail(
  templateKey: string,
  to: string,
  vars: Record<string, string>,
) {
  try {
    const [{ EmailService }, { PlatformConfigService }] = await Promise.all([
      import("@/services/EmailService"),
      import("@/services/PlatformConfigService"),
    ]);
    const config = await PlatformConfigService.get();
    if (!config.features?.emailNotifications) {
      console.warn(`[auth] email "${templateKey}" to ${to} skipped: notifications disabled`);
      lastSendResults.set(`${templateKey}:${to.toLowerCase()}`, {
        sent: false,
        reason: "notifications_disabled",
      });
      return;
    }
    const result = await EmailService.send(to, templateKey, vars, config);
    lastSendResults.set(`${templateKey}:${to.toLowerCase()}`, result);
    if (!result.sent) {
      // Email sending must never break the auth flow, but the failure must be
      // visible in logs so it isn't silently swallowed.
      console.warn(
        `[auth] email "${templateKey}" to ${to} NOT sent: ${result.reason ?? "unknown"}` +
          (result.error ? ` — ${result.error}` : ""),
      );
    }
  } catch (err) {
    // Email sending must never break the auth flow.
    console.error(`[auth] failed to send ${templateKey} email:`, err);
    lastSendResults.set(`${templateKey}:${to.toLowerCase()}`, {
      sent: false,
      reason: "network_error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "dev-secret-do-not-use-in-production",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
    usePlural: false,
  }),
  emailAndPassword: {
    enabled: true,
    // Wired password-reset email: fired when a user requests a reset link via
    // the /forgot-password flow. Non-blocking — auth never fails on a mail error.
    sendResetPassword: async ({ user, url }) => {
      await sendTransactionalEmail("passwordReset", user.email, {
        userName: user.name,
        resetUrl: url,
      });
    },
  },
  emailVerification: {
    // Non-blocking verification: we trigger it manually after signup so we can
    // control the callback URL (lands on /verify-email?done=1 where the welcome
    // email is fired after success). Google-signed-up users are verified at
    // creation and never hit these callbacks.
    sendOnSignUp: false,
    sendOnSignIn: false,
    autoSignInAfterVerification: true,
    expiresIn: 3600,
    sendVerificationEmail: async ({ user, url }) => {
      await sendTransactionalEmail("verifyEmail", user.email, {
        userName: user.name,
        verifyUrl: url,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    phoneNumber(),
    dash({
      apiKey: process.env.BETTER_AUTH_API_KEY,
    }),
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "CLIENT",
        input: false,
      },
    },
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: false,
      sendChangeEmailConfirmation: async ({ user, url }) => {
        await sendTransactionalEmail("verifyEmail", user.email, {
          userName: user.name,
          verifyUrl: url,
        });
      },
    },
  },
  advanced: {
    cookiePrefix: "crelab",
  },
});

export async function getSession() {
  const h = await headers();
  return auth.api.getSession({ headers: h });
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function requireRole(...roles: string[]) {
  const session = await requireAuth();
  const userRole = session.user.role as string | undefined;
  if (!userRole || !roles.includes(userRole)) throw new Error("Forbidden");
  return session;
}
