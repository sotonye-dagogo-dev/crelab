/**
 * Platform-name copy helpers (F9 platform-name compliance).
 *
 * `config.name` (config/platform.config.ts, served by PlatformConfigService) is
 * the single source of truth for the platform's display name. Display copy that
 * can read config at render time interpolates `config.name` directly. Copy that
 * lives in a module-scope constant (which cannot await config) carries
 * `PLATFORM_NAME_TOKEN` instead and is resolved with `fillPlatformName` at its
 * call site.
 *
 * Infrastructure identifiers (cookie names, e-mail domains, payment refs, storage
 * keys) are deliberately NOT copy: they stay literal and are allowlisted in
 * __tests__/platform-name-compliance.test.ts.
 */

export const PLATFORM_NAME_TOKEN = "{{name}}";

export function fillPlatformName(text: string, name: string): string {
  return text.split(PLATFORM_NAME_TOKEN).join(name);
}
