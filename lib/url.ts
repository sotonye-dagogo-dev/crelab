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

/**
 * Resolves a URL the same way `resolveAbsoluteUrl` does, but leaves `{{variable}}`
 * template tokens intact so they can be substituted later (sample-vars previews,
 * real sends). Used for image `src` / button `href` values that go through the
 * visual block builder and render in different contexts.
 */
export function resolveUrlForRender(value: string): string {
  if (!value) return value;
  if (/\{\{\w+\}\}/.test(value)) return value;
  return resolveAbsoluteUrl(value);
}

/**
 * Detects a URL that is relative to the current origin (leading `/`, or a bare
 * path). Absolute URLs (`http(s)://`), protocol-relative (`//`), scheme'd values
 * (`data:`, `mailto:`, `tel:`), fragment anchors and template tokens are left alone.
 */
function isRelativeUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("//")) return false;
  if (url.startsWith("#")) return false;
  if (url.includes("{{")) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return false;
  return url.startsWith("/") || !url.includes(":");
}

/**
 * Rewrites relative `src` / `href` attributes in a rendered HTML blob to absolute
 * URLs. Run AFTER `{{variable}}` substitution (tokens are skipped, so unresolved
 * tokens never get mangled). This is what lets an image added as `/primary-logo.png`
 * in the visual builder actually render in email clients and the admin preview —
 * neither can resolve a bare relative path.
 */
export function resolveRelativeUrlsInHtml(html: string): string {
  return html
    .replace(/(<img\b[^>]*\bsrc=")([^"]*)(")/gi, (match, pre, url) => {
      return isRelativeUrl(url) ? `${pre}${resolveAbsoluteUrl(url)}"` : match;
    })
    .replace(/(<a\b[^>]*\bhref=")([^"]*)(")/gi, (match, pre, url) => {
      return isRelativeUrl(url) ? `${pre}${resolveAbsoluteUrl(url)}"` : match;
    });
}
