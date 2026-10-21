import { NextResponse } from "next/server";
import { PaymentProviderUnavailableError } from "@/lib/payments/types";

export const PAYMENT_UNAVAILABLE_CODE = "PAYMENT_UNAVAILABLE";

export const DEFAULT_PAYMENT_UNAVAILABLE_MESSAGE =
  "Payments are temporarily unavailable. Please try again later or contact support.";

/**
 * True when a money path failed because no provider could be selected (all
 * disabled, missing credentials, or a blocked sandbox/live fallback). Routes
 * map this to 503 + a user-facing message instead of a generic 500.
 */
export function isPaymentProviderUnavailable(err: unknown): boolean {
  return err instanceof PaymentProviderUnavailableError;
}

export function paymentUnavailableResponse(message?: string) {
  return NextResponse.json(
    {
      success: false,
      code: PAYMENT_UNAVAILABLE_CODE,
      error: message?.trim() || DEFAULT_PAYMENT_UNAVAILABLE_MESSAGE,
    },
    { status: 503 },
  );
}
