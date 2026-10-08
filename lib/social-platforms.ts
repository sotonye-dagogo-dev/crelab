/**
 * Shared social-platform catalogue for team member social links.
 *
 * Backward compatibility: links saved before the select-input change store a
 * free-typed `platform` string (e.g. "Twitter", "twitter", "X"). `normalize`
 * maps those legacy values onto the canonical option so old rows keep their
 * icon; anything unrecognised falls back to "other" with the raw label kept
 * as the custom text (nothing is lost).
 */

export type SocialPlatformKind =
  | "x"
  | "linkedin"
  | "github"
  | "dribbble"
  | "instagram"
  | "youtube"
  | "facebook"
  | "tiktok"
  | "website"
  | "other";

export interface SocialPlatformOption {
  value: SocialPlatformKind;
  label: string;
  /** Legacy / alternate spellings that map to this option (case-insensitive). */
  aliases: string[];
}

export const SOCIAL_PLATFORM_OPTIONS: SocialPlatformOption[] = [
  { value: "x", label: "X (Twitter)", aliases: ["x", "twitter", "tweet", "twt"] },
  { value: "linkedin", label: "LinkedIn", aliases: ["linkedin", "linked-in", "linked in"] },
  { value: "github", label: "GitHub", aliases: ["github", "git-hub", "git hub"] },
  { value: "dribbble", label: "Dribbble", aliases: ["dribbble", "dribble"] },
  { value: "instagram", label: "Instagram", aliases: ["instagram", "insta", "ig"] },
  { value: "youtube", label: "YouTube", aliases: ["youtube", "you-tube", "you tube", "yt"] },
  { value: "facebook", label: "Facebook", aliases: ["facebook", "face-book", "face book", "fb", "meta"] },
  { value: "tiktok", label: "TikTok", aliases: ["tiktok", "tik-tok", "tik tok"] },
  { value: "website", label: "Website", aliases: ["website", "web", "site", "blog", "portfolio", "homepage"] },
  { value: "other", label: "Other (type custom)", aliases: [] },
];

export interface NormalizedPlatform {
  kind: SocialPlatformKind;
  /** Canonical stored platform string for this kind (legacy values upgraded). */
  canonical: string;
  /** Raw label to show when kind === "other" (the original free-typed value). */
  customLabel: string;
}

const CANONICAL_LABEL: Record<SocialPlatformKind, string> = {
  x: "X",
  linkedin: "LinkedIn",
  github: "GitHub",
  dribbble: "Dribbble",
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  tiktok: "TikTok",
  website: "Website",
  other: "Other",
};

/** Map any stored (possibly legacy free-typed) platform string to a known kind. */
export function normalizeSocialPlatform(raw: string | null | undefined): NormalizedPlatform {
  const trimmed = (raw ?? "").trim();
  const lowered = trimmed.toLowerCase();
  for (const opt of SOCIAL_PLATFORM_OPTIONS) {
    if (opt.value === "other") continue;
    if (opt.aliases.includes(lowered)) {
      return { kind: opt.value, canonical: CANONICAL_LABEL[opt.value], customLabel: "" };
    }
  }
  if (!trimmed) return { kind: "other", canonical: "", customLabel: "" };
  // Unknown legacy value — keep it verbatim as the custom label.
  return { kind: "other", canonical: trimmed, customLabel: trimmed };
}

/** Stored platform string for a modal row (select value + optional custom text). */
export function toStoredPlatform(kind: SocialPlatformKind, customText: string): string {
  if (kind === "other") return customText.trim();
  return CANONICAL_LABEL[kind];
}

/** Short badge text for a stored platform string (used where icons can't render). */
export function shortPlatformLabel(raw: string): string {
  const { kind, customLabel } = normalizeSocialPlatform(raw);
  switch (kind) {
    case "x": return "X";
    case "linkedin": return "in";
    case "github": return "GH";
    case "dribbble": return "Dr";
    case "instagram": return "IG";
    case "youtube": return "YT";
    case "facebook": return "f";
    case "tiktok": return "TT";
    case "website": return "Web";
    default: return (customLabel || "Link").slice(0, 2);
  }
}
