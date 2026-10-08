import type { Metadata } from "next";
import { PlatformConfigService } from "@/services/PlatformConfigService";
import { DEFAULT_CONFIG } from "@/config/platform.config";
import { requireAuth } from "@/lib/auth";
import { ReferralService } from "@/services/ReferralService";
import { ReferralsClient } from "./ReferralsClient";
import type { IPlatformConfig, IReferralSummary } from "@/types";

export const dynamic = "force-dynamic";

async function getConfig(): Promise<IPlatformConfig> {
  try {
    return await PlatformConfigService.getCached();
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await getConfig();
  const referral = config.referral ?? DEFAULT_CONFIG.referral;
  return {
    title: referral?.heroTitle || "Referrals",
    description: referral?.heroSubtitle || undefined,
  };
}

/**
 * Authenticated referrals hub. Flag off (`features.referralsEnabled` or
 * `referral.enabled`) → renders nothing. Unauthenticated visitors get the
 * client, which surfaces the sign-in path via the API's 401.
 */
export default async function ReferralsPage() {
  const config = await getConfig();
  if (config.features?.referralsEnabled === false || config.referral?.enabled === false) {
    return null;
  }

  let summary: IReferralSummary | null = null;
  try {
    const session = await requireAuth();
    summary = await ReferralService.getSummary(session.user.id);
  } catch {
    // Not signed in (or DB hiccup) — the client falls back to GET /api/referrals/me.
    summary = null;
  }

  return <ReferralsClient initialSummary={summary} />;
}
