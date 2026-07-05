import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@/lib/db";
import { phoneNumber } from "better-auth/plugins";
import * as schema from "@/drizzle/schema";

export const auth = betterAuth({
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
  plugins: [
    phoneNumber(),
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
  },
  advanced: {
    cookiePrefix: "crelab",
  },
});

export async function getSession() {
  return auth.api.getSession({ headers: new Headers() });
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
