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

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    paid_at: string;
    channel: string;
  };
}

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${PAYSTACK_SECRET}`,
    "Content-Type": "application/json",
  };
}

export async function initTransaction(
  amountKobo: number,
  email: string,
  ref: string,
): Promise<{
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      amount: amountKobo,
      email,
      reference: ref,
    }),
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
