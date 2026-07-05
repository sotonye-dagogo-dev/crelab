import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paystack";
import { EscrowService } from "@/services/EscrowService";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error("[paystack-webhook] PAYSTACK_SECRET_KEY not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const isValid = verifyWebhookSignature(rawBody, signature, secretKey);
  if (!isValid) {
    console.warn(
      "[paystack-webhook] Invalid signature received",
      JSON.stringify({ signature }),
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: { event: string; data: { reference?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event === "charge.success" && event.data.reference) {
    const escrowService = new EscrowService();

    escrowService.onPaystackSuccess(event.data.reference).catch((err) => {
      console.error(
        `[paystack-webhook] Error processing charge.success for ref ${event.data.reference}:`,
        err,
      );
    });
  }

  return NextResponse.json({ success: true });
}
