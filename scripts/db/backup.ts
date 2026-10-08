import "dotenv/config";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Backs up the database with pg_dump (custom format, restorable with pg_restore).
 *
 * Usage:
 *   npm run db:backup            # writes backups/crellab-<timestamp>.dump
 *   npm run db:backup -- out.dump  # custom filename
 *
 * Requires DATABASE_URL and a `pg_dump` binary on PATH (ships with
 * PostgreSQL; on Windows install via https://www.postgresql.org/download/).
 * Destructive scripts (seed rollback, db:reset) take a backup first — see
 * package.json `predb:seed:rollback` and `scripts/seed-rollback.ts --all`.
 */
function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set. Copy .env.example to .env first.");
    process.exit(1);
  }

  const dir = path.resolve(process.cwd(), "backups");
  mkdirSync(dir, { recursive: true });

  const fileArg = process.argv[2];
  const fileName = fileArg ?? `crellab-${timestamp()}.dump`;
  const outPath = path.isAbsolute(fileArg ?? "") ? fileName : path.join(dir, fileName);

  console.log(`💾 Backing up database → ${outPath}\n`);
  try {
    execFileSync(
      "pg_dump",
      ["--format=custom", "--no-owner", "--no-privileges", `--file=${outPath}`, connectionString],
      { stdio: "inherit" },
    );
  } catch (err) {
    console.error(
      "❌ pg_dump failed. Is PostgreSQL's pg_dump on your PATH?\n" +
      "   Windows: https://www.postgresql.org/download/ (add its bin/ to PATH)\n" +
      "   Supabase alternative: `supabase db dump -f <file>` (Supabase CLI).",
    );
    process.exit(1);
  }

  console.log(`\n✅ Backup complete: ${outPath}`);
  console.log("   Restore with: pg_restore --clean --if-exists -d $DATABASE_URL " + outPath);
  process.exit(0);
}

main();
