import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { PLATFORM_NAME_TOKEN, fillPlatformName } from "@/lib/platform-copy";

/**
 * F9 platform-name compliance run.
 *
 * Walks the display-copy directories and fails on any hardcoded instance of
 * `Crelab` / `CreLab` / `Crellab` (matched case-insensitively, so lowercase and
 * uppercase infrastructure identifiers are caught too) that is not explicitly
 * allowlisted below. `config.name` (config/platform.config.ts) is the single
 * source of truth; module-scope copy carries `{{name}}` and is resolved with
 * fillPlatformName at its call site.
 *
 * The allowlist is deliberately explicit so infrastructure identifiers are
 * reviewed rather than silently exempt. Nothing outside this list may carry a
 * platform-name literal.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SCAN_DIRS = ["app", "components", "lib", "services", "hooks", "types", "config"];

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "coverage", ".turbo"]);

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".mdx",
  ".css",
  ".scss",
  ".html",
  ".txt",
]);

/** Case-insensitive `Crelab|CreLab|Crellab`. */
const PLATFORM_NAME_PATTERN = /crellab|crelab/i;

interface AllowlistEntry {
  /** Repo-relative path with forward slashes. */
  file: string;
  /** A matching line passes only if it contains at least one of these substrings. */
  allowed: string[];
  reason: string;
}

const ALLOWLIST: AllowlistEntry[] = [
  {
    file: "config/platform.config.ts",
    allowed: ['name: "Crellab"', 'fromName: "Crellab"', 'fromEmail: "mail@crellab.com"'],
    reason: "Source of truth for the platform name plus the default e-mail sender identity",
  },
  {
    file: "app/robots.ts",
    allowed: ["https://crelab.ng"],
    reason: "Origin fallback when NEXT_PUBLIC_APP_URL is unset",
  },
  {
    file: "app/sitemap.ts",
    allowed: ["https://crelab.ng"],
    reason: "Origin fallback when NEXT_PUBLIC_APP_URL is unset",
  },
  {
    file: "lib/email-blocks.ts",
    allowed: ["https://crelab.example"],
    reason: "Origin fallback when VERCEL_URL is unset",
  },
  {
    file: "app/(auth)/profile/setup/page.tsx",
    allowed: ["crelab-onboarding-state"],
    reason: "Onboarding STORAGE_KEY persisted in localStorage",
  },
  {
    file: "app/api/account/delete/route.ts",
    allowed: ["@anonymous.crelab"],
    reason: "Anonymous-mail domain assigned to deleted accounts",
  },
  {
    file: "lib/auth.ts",
    allowed: ['cookiePrefix: "crelab"'],
    reason: "better-auth cookiePrefix",
  },
  {
    file: "lib/referral-cookie.ts",
    allowed: ["crelab_ref"],
    reason: "Referral cookie name (REFERRAL_COOKIE)",
  },
  {
    file: "components/shared/ReferralCapture.tsx",
    allowed: ["crelab_ref"],
    reason: "Doc comment referencing the referral cookie name",
  },
  {
    file: "app/api/referrals/claim/route.ts",
    allowed: ["crelab_ref"],
    reason: "Doc comment referencing the referral cookie name",
  },
  {
    file: "lib/sanitize-error.ts",
    allowed: ["crelab-error-context"],
    reason: "localStorage key for the error-context payload",
  },
  {
    file: "components/error/GlobalErrorCatcher.tsx",
    allowed: ["crelab-error-context"],
    reason: "Doc comment referencing the error-context storage key",
  },
  {
    file: "lib/error-log-buffer.ts",
    allowed: ["__crelabErrorLogBuffer"],
    reason: "In-memory error log buffer store key",
  },
  {
    file: "services/EmailService.ts",
    allowed: ['DEFAULT_FROM_EMAIL = "mail@crellab.com"'],
    reason: "Default Resend sender address (overridable via env/admin config)",
  },
  {
    file: "services/EscrowService.ts",
    allowed: ["CRELAB-${booking.id}", "payment@crelab.app"],
    reason: "Paystack payment reference prefix and fallback client e-mail",
  },
  {
    file: "services/PaymentService.ts",
    allowed: ["CRELAB-PAY-"],
    reason: "Paystack payment reference prefix",
  },
  {
    file: "services/MockDataService.ts",
    allowed: ["demo@crelab.test"],
    reason: "Demo account e-mail for mock data",
  },
  {
    file: "hooks/useAuth.ts",
    allowed: ["demo@crelab.test"],
    reason: "Demo account e-mail for mock auth",
  },
];

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      walk(path.join(dir, entry.name), out);
    } else if (entry.isFile()) {
      if (!TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      out.push(path.join(dir, entry.name));
    }
  }
}

function collectFiles(): string[] {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    const abs = path.join(ROOT, dir);
    if (fs.existsSync(abs)) walk(abs, files);
  }
  return files;
}

describe("platform-name compliance", () => {
  it("fills the platform-name token", () => {
    expect(PLATFORM_NAME_TOKEN).toBe("{{name}}");
    expect(fillPlatformName(`About ${PLATFORM_NAME_TOKEN}`, "Crellab")).toBe("About Crellab");
    expect(fillPlatformName(`{{name}}'s wallet, {{name}} fees`, "Crellab")).toBe(
      "Crellab's wallet, Crellab fees",
    );
    expect(fillPlatformName("no token here", "Crellab")).toBe("no token here");
  });

  it("keeps every allowlist entry accurate (file exists, snippet still present)", () => {
    const problems: string[] = [];
    for (const entry of ALLOWLIST) {
      const abs = path.join(ROOT, entry.file);
      if (!fs.existsSync(abs)) {
        problems.push(`missing file: ${entry.file}`);
        continue;
      }
      const content = fs.readFileSync(abs, "utf8");
      for (const snippet of entry.allowed) {
        if (!content.includes(snippet)) {
          problems.push(`snippet not found in ${entry.file}: ${snippet}`);
        }
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("finds no hardcoded platform name outside the allowlist", () => {
    const violations: string[] = [];

    for (const file of collectFiles()) {
      const rel = path.relative(ROOT, file).split(path.sep).join("/");
      const content = fs.readFileSync(file, "utf8");
      if (content.includes(String.fromCharCode(0))) continue;

      const entry = ALLOWLIST.find((e) => e.file === rel);
      const allowed = entry?.allowed ?? [];

      content.split(/\r?\n/).forEach((line, index) => {
        if (!PLATFORM_NAME_PATTERN.test(line)) return;
        if (allowed.some((snippet) => line.includes(snippet))) return;
        violations.push(`${rel}:${index + 1}: ${line.trim()}`);
      });
    }

    const message = [
      "Hardcoded platform-name instances found outside the allowlist.",
      "Display copy must resolve from config.name (or carry the {{name}} token).",
      ...violations,
    ].join("\n");

    expect(violations, message).toEqual([]);
  });
});
