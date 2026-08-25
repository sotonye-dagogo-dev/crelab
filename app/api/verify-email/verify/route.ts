import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verification, user } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 },
      );
    }

    const now = new Date();
    
    // Try to find the token as a simple string (email verification) or JSON (email change)
    let verificationRecord = await db
      .select()
      .from(verification)
      .where(eq(verification.value, token))
      .limit(1)
      .then((rows) => rows[0]);

    // If not found, try parsing as JSON for email change
    if (!verificationRecord) {
      try {
        const parsed = JSON.parse(token);
        if (parsed.token) {
          verificationRecord = await db
            .select()
            .from(verification)
            .where(eq(verification.value, JSON.stringify({ token: parsed.token, newEmail: parsed.newEmail })))
            .limit(1)
            .then((rows) => rows[0]);
        }
      } catch {
        // Not JSON, ignore
      }
    }

    if (!verificationRecord) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired verification token" },
        { status: 400 },
      );
    }

    if (new Date(verificationRecord.expiresAt) < now) {
      await db.delete(verification).where(eq(verification.value, verificationRecord.value));
      return NextResponse.json(
        { success: false, error: "Verification token has expired" },
        { status: 400 },
      );
    }

    let email = verificationRecord.identifier;
    let isEmailChange = false;
    let newEmail = null;

    try {
      const parsed = JSON.parse(verificationRecord.value);
      if (parsed.newEmail) {
        isEmailChange = true;
        newEmail = parsed.newEmail;
        // For email change, the identifier is the old email
        email = verificationRecord.identifier;
      }
    } catch {
      // Simple token, not email change
    }

    if (isEmailChange && newEmail) {
      // Update user's email to the new email
      await db
        .update(user)
        .set({ email: newEmail, emailVerified: true })
        .where(eq(user.email, email));
    } else {
      // Mark user email as verified
      await db
        .update(user)
        .set({ emailVerified: true })
        .where(eq(user.email, email));
    }

    // Delete the used token
    await db.delete(verification).where(eq(verification.value, verificationRecord.value));

    return NextResponse.json({ success: true, emailChange: isEmailChange });
  } catch (err) {
    console.error("[POST /api/verify-email/verify] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}