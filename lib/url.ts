export function appOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
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
  if (/^https?:\/\//i.test(pathOrUrl) || pathOrUrl.startsWith("//")) {
    return pathOrUrl;
  }
  if (pathOrUrl.startsWith("/")) {
    return `${appOrigin()}${pathOrUrl}`;
  }
  return `${appOrigin()}/${pathOrUrl}`;
}
