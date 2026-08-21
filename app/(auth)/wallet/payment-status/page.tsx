import { requireAuth } from "@/lib/auth";
import { PaymentStatusClient } from "./PaymentStatusClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ reference?: string }>;
}

export default async function PaymentStatusPage({ searchParams }: Props) {
  await requireAuth();
  const { reference } = await searchParams;
  return <PaymentStatusClient reference={reference ?? null} />;
}