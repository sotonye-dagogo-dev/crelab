import { requireAuth } from "@/lib/auth";
import { PaymentStatusClient } from "./PaymentStatusClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    reference?: string;
    /** Monnify appends `paymentReference` on redirect (Paystack uses `reference`). */
    paymentReference?: string;
    provider?: string;
    testMode?: string;
  }>;
}

export default async function PaymentStatusPage({ searchParams }: Props) {
  await requireAuth();
  const { reference, paymentReference, provider, testMode } = await searchParams;
  return (
    <PaymentStatusClient
      reference={reference ?? paymentReference ?? null}
      provider={provider ?? null}
      testMode={testMode === "1"}
    />
  );
}