import crypto from "crypto";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BASE = "https://api.paystack.co";

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${PAYSTACK_SECRET}`,
    "Content-Type": "application/json",
  };
}

export interface InitTransactionOptions {
  /** Optional metadata echoed back on verify + webhook — used to attribute
   * charge.success events (e.g. { purpose: "WALLET_TOPUP", userId }). Without
   * it the webhook cannot tell a wallet top-up apart from a booking payment. */
  metadata?: Record<string, unknown>;
  /** Where Paystack redirects the customer after payment. Omit to keep the
   * user on the hosted page until they click through. */
  callbackUrl?: string;
}

export async function initTransaction(
  amountKobo: number,
  email: string,
  ref: string,
  options: InitTransactionOptions = {},
): Promise<{
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}> {
  const payload: Record<string, unknown> = {
    amount: amountKobo,
    email,
    reference: ref,
  };
  if (options.metadata && Object.keys(options.metadata).length > 0) {
    payload.metadata = options.metadata;
  }
  if (options.callbackUrl) {
    payload.callback_url = options.callbackUrl;
  }

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Paystack init failed: ${res.status} ${body}`);
  }

  const json: PaystackInitResponse = await res.json();
  if (!json.status) {
    throw new Error(`Paystack init error: ${json.message}`);
  }

  return {
    authorizationUrl: json.data.authorization_url,
    accessCode: json.data.access_code,
    reference: json.data.reference,
  };
}

export type VerifiedTransactionStatus = "success" | "failed" | "abandoned" | "pending";

export interface VerifiedTransaction {
  status: VerifiedTransactionStatus;
  reference: string;
  amountKobo: number;
  customerEmail: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Queries Paystack for a transaction's final status. Used on the post-payment
 * callback page so the wallet reflects what actually happened instead of
 * assuming success — a 200 on the platform API never means money moved.
 */
export async function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Paystack verify failed: ${res.status} ${body}`);
  }

  const json = (await res.json()) as {
    status: boolean;
    data: {
      status: string;
      reference: string;
      amount: number;
      customer?: { email?: string } | null;
      metadata?: Record<string, unknown> | null;
    };
  };

  if (!json.status || !json.data) {
    throw new Error(`Paystack verify error: ${json.status ? json.status : "transaction not found"}`);
  }

  const rawStatus = json.data.status;
  const status: VerifiedTransactionStatus =
    rawStatus === "success"
      ? "success"
      : rawStatus === "failed"
        ? "failed"
        : rawStatus === "abandoned"
          ? "abandoned"
          : "pending";

  return {
    status,
    reference: json.data.reference,
    amountKobo: json.data.amount,
    customerEmail: json.data.customer?.email ?? null,
    metadata: json.data.metadata ?? {},
  };
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secretKey: string,
): boolean {
  const hash = crypto
    .createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

export async function subaccountSplit(
  paymentId: string,
): Promise<{
  subaccountCode: string;
  splitCode: string;
}> {
  const res = await fetch(`${PAYSTACK_BASE}/split`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      type: "flat",
      currency: "NGN",
      subaccounts: [{ subaccount: paymentId, share: 0 }],
      bearer_type: "subaccount",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Paystack split failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  return {
    subaccountCode: json.data.subaccount_code,
    splitCode: json.data.split_code,
  };
}

export async function initiateTransfer(
  amountKobo: number,
  recipientCode: string,
  reference: string,
): Promise<{ transferCode: string }> {
  const res = await fetch(`${PAYSTACK_BASE}/transfer`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      source: "balance",
      amount: amountKobo,
      recipient: recipientCode,
      reference,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Paystack transfer failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  if (!json.status) {
    throw new Error(`Paystack transfer error: ${json.message}`);
  }

  return { transferCode: json.data.transfer_code };
}

export async function createDedicatedVirtualAccount(
  customerEmail: string,
  customerName: string,
  phone?: string,
): Promise<{
  accountNumber: string;
  bankName: string;
}> {
  const res = await fetch(`${PAYSTACK_BASE}/dedicated_account`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      customer: {
        email: customerEmail,
        name: customerName,
        phone: phone ?? null,
      },
      preferred_bank: "wema-bank",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Paystack DVA creation failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  if (!json.status) {
    throw new Error(`Paystack DVA creation error: ${json.message}`);
  }

  return {
    accountNumber: json.data.dedicated_account.account_number,
    bankName: json.data.dedicated_account.bank.name,
  };
}

export async function getTransferRecipient(
  bankCode: string,
  accountNumber: string,
  name: string,
): Promise<{ recipientCode: string }> {
  const res = await fetch(`${PAYSTACK_BASE}/transferrecipient`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      type: "nuban",
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: "NGN",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Paystack recipient creation failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  if (!json.status) {
    throw new Error(`Paystack recipient creation error: ${json.message}`);
  }

  return { recipientCode: json.data.recipient_code };
}

export async function refund(paystackRef: string): Promise<void> {
  const res = await fetch(`${PAYSTACK_BASE}/refund`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      reference: paystackRef,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Paystack refund failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  if (!json.status) {
    throw new Error(`Paystack refund error: ${json.message}`);
  }
}
