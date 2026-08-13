import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Public endpoint that triggers Better Auth's (non-blocking) email-verification
 * email for an account. The callback URL routes the user back to
 * /verify-email?done=1 where the success state and welcome email are handled.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }

    await auth.api.sendVerificationEmail({
      body: { email, callbackURL: "/verify-email?done=1" },
      headers: req.headers,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.name === "APIError") {
      // Treat account-not-found / already-verified identically to success so we
      // don't leak which emails have accounts.
      return NextResponse.json({ success: true });
    }
    console.error("[POST /api/verify-email/send] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
