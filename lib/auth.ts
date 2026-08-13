import { betterAuth } from "better-auth";
import { headers } from "next/headers";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@/lib/db";
import { phoneNumber } from "better-auth/plugins";
import { dash } from "@better-auth/infra";
import * as schema from "@/drizzle/schema";

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
    if (!config.features?.emailNotifications) return;
    await EmailService.send(to, templateKey, vars, config);
  } catch (err) {
    // Email sending must never break the auth flow.
    console.error(`[auth] failed to send ${templateKey} email:`, err);
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
