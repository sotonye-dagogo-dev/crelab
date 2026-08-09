/**
 * Builds a public profile slug: `{name-slugified}--{first-8-chars-of-provider-id}`.
 * The id prefix is NOT the full id, so consumers must resolve with a prefix
 * match (see parseProviderSlug + the profile page lookup).
 */
export function buildProviderSlug(displayName: string, id: string): string {
  const namePart = displayName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `${namePart}--${id.slice(0, 8)}`;
}

export interface ParsedProviderSlug {
  name: string;
  idPrefix: string;
}

/**
 * Splits a provider slug on the LAST `--` so display names containing `--`
 * (e.g. "John--Doe") do not break parsing.
 */
export function parseProviderSlug(slug: string): ParsedProviderSlug | null {
  const sepIndex = slug.lastIndexOf("--");
  if (sepIndex === -1) return null;
  const idPrefix = slug.slice(sepIndex + 2);
  if (!idPrefix) return null;
  return { name: slug.slice(0, sepIndex), idPrefix };
}
