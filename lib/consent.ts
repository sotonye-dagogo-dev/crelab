"use server";

import { db } from "@/lib/db";
import { consentRecords } from "@/drizzle/schema";
import { ConsentType } from "@/types";

export async function captureConsent(
  userId: string,
  type: ConsentType,
  granted: boolean,
) {
  await db.insert(consentRecords).values({
    id: crypto.randomUUID(),
    userId,
    type,
    granted,
  });
}
