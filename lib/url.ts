export function appOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return normalizeOrigin(explicit);
  if (process.env.VERCEL_URL) return normalizeOrigin(`https://${process.env.VERCEL_URL}`);
  return "http://localhost:3000";
}

/**
 * Strips trailing slashes (and any path/query/hash noise) so concatenations
 * like `${origin}/primary-logo.png` never produce `//` double-slashes — those
 * break image/OG resolution in several email clients and social scrapers.
 */
function normalizeOrigin(input: string): string {
  const trimmed = input.trim();
  const clean = trimmed.replace(/[/?#]+$/, "");
  return clean.replace(/\/\/$/, "/");
}

/**
 * Resolves a config-driven path (e.g. `/primary-logo.png`) into an absolute URL
 * including the app origin. Already-absolute URLs (http/https, protocol-relative
 * `//`) are returned unchanged. Used so links/images embedded in transactional
 * emails, sitemaps, and Open Graph meta tags carry a full origin — relative
 * paths do not resolve inside email clients or social scrapers.
 */
export function resolveAbsoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return pathOrUrl;
  const value = pathOrUrl.trim();
  if (/^https?:\/\//i.test(value) || value.startsWith("//")) {
    return value;
  }
  if (value.startsWith("/")) {
    return `${appOrigin()}${value}`;
  }
  return `${appOrigin()}/${value}`;
}
