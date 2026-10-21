import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { processedWebhookEvents } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { monnifyAdapter, nairaToKobo } from "@/lib/payments/monnify";
import { asPaymentProviderId } from "@/lib/payments/config";
import { shouldRecordChargeEvent } from "@/lib/payment-flow";
import { EscrowService } from "@/services/EscrowService";
import { WalletService } from "@/services/WalletService";
import { AuditService } from "@/services/AuditService";
import { DuplicateWebhookError } from "@/lib/errors";

/**
 * Monnify webhook.
 *
 * Signature: `monnify-signature` = SHA-512(clientSecret + raw body), hex.
 * Monnify's sandbox does not send the header, so unsigned requests are only
 * accepted when the platform has NO live Monnify secret configured (pure
 * sandbox). In production every request must be signed.
 *
 * Money safety mirrors the Paystack handler: the ledger transition is
 * idempotent and runs BEFORE the de-dupe row is written. Retryable holds ask
 * Monnify to retry (5xx); permanent refusals are recorded and acknowledged.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("monnify-signature");

  const anyConfigured =
    Boolean(process.env.MONNIFY_SECRET_KEY) || Boolean(process.env.MONNIFY_TEST_SECRET_KEY);
  if (!anyConfigured) {
    console.error("[monnify-webhook] no Monnify secret configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const sandboxOnly = !process.env.MONNIFY_SECRET_KEY;
  const isValid =
    monnifyAdapter.verifyWebhookSignature({ rawBody, signature }) ||
    (sandboxOnly && !signature);

  if (!isValid) {
    console.warn("[monnify-webhook] invalid signature");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: {
    eventType?: string;
    eventData?: Record<string, unknown>;
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = (event.eventData ?? {}) as Record<string, unknown>;
  const ref = typeof data.paymentReference === "string" ? data.paymentReference : "";
  const transactionReference =
    typeof data.transactionReference === "string" ? data.transactionReference : null;
  const metadata = (data.metaData ?? {}) as Record<string, unknown>;

  if (event.eventType !== "SUCCESSFUL_TRANSACTION") {
    // Disbursement/refund notifications do not move escrow or wallet credit
    // here (payouts are reconciled from the API response + audit log). Acknowledge
    // so Monnify stops retrying.
    void AuditService.log({
      userId: null,
      action: "payment.webhook.received",
      entity: "processed_webhook_events",
      entityId: ref || transactionReference || null,
      newValue: { provider: "MONNIFY", eventType: event.eventType ?? "unknown" },
    }).catch(() => {});
    return NextResponse.json({ success: true, status: "ignored" });
  }

  if (!ref) {
    return NextResponse.json({ error: "Missing payment reference" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(processedWebhookEvents)
    .where(eq(processedWebhookEvents.paystackRef, ref));
  if (existing) {
    return NextResponse.json({ success: true, status: "duplicate" });
  }

  const amountKobo = nairaToKobo(data.amountPaid);
  const provider = asPaymentProviderId(metadata.provider) ?? "MONNIFY";
  const testMode =
    metadata.testMode === true || metadata.testMode === "true"
      ? true
      : metadata.testMode === false || metadata.testMode === "false"
        ? false
        : sandboxOnly;

  try {
    if (metadata.purpose === "WALLET_TOPUP") {
      const userId = metadata.userId as string | undefined;
      if (!userId) {
        return NextResponse.json({ error: "Missing wallet owner" }, { status: 400 });
      }
      if (amountKobo <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }
      await new WalletService().topUpFromCard(userId, amountKobo, ref, {
        provider,
        testMode,
      });
    } else {
      const escrowService = new EscrowService();
      const attributed = await escrowService.resolveBookingForRef(
        ref,
        typeof metadata.bookingId === "string" ? metadata.bookingId : null,
      );
      if (!attributed) {
        // Unattributed charge — record for finance review rather than inventing
        // a booking hold. The audit entry makes the orphan discoverable.
        await db
          .insert(processedWebhookEvents)
          .values({
            id: crypto.randomUUID(),
            paystackRef: ref,
            eventType: "SUCCESSFUL_TRANSACTION",
          })
          .onConflictDoNothing();
        void AuditService.log({
          userId: null,
          action: "payment.webhook.unattributed",
          entity: "processed_webhook_events",
          entityId: ref,
          newValue: {
            provider,
            testMode,
            amountKobo,
            transactionReference,
          },
        }).catch(() => {});
        return NextResponse.json({ success: true, status: "unattributed" });
      }

      const outcome = await escrowService.onPaystackSuccess(ref, {
        bookingId: attributed.id,
        provider,
        testMode,
        providerReference: transactionReference,
      });

      if (!shouldRecordChargeEvent(outcome)) {
        console.warn(
          `[monnify-webhook] ref=${ref} not finalized (reason=${outcome.reason ?? "retry"}) — asking Monnify to retry`,
        );
        return NextResponse.json(
          { success: false, error: "Escrow hold not finalized — retry" },
          { status: 500 },
        );
      }
    }
  } catch (err) {
    if (err instanceof DuplicateWebhookError) {
      return NextResponse.json({ success: true, status: "duplicate" });
    }
    console.error(`[monnify-webhook] processing failed for ref=${ref}`, err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  await db
    .insert(processedWebhookEvents)
    .values({
      id: crypto.randomUUID(),
      paystackRef: ref,
      eventType: "SUCCESSFUL_TRANSACTION",
    })
    .onConflictDoNothing();

  return NextResponse.json({ success: true });
}
