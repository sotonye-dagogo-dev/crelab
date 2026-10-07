import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";

/**
 * One-time baseline for databases built before journal-driven migrations
 * existed (tables created via `drizzle-kit push` or the legacy hand-applied
 * SQL files). Records journal entries as applied in
 * `drizzle.__drizzle_migrations` WITHOUT running their SQL, so a later
 * `npm run db:migrate` only applies genuinely new migrations.
 *
 * Usage:
 *   npm run db:baseline -- --until 0002_breezy_tinkerer
 *
 * Requires DATABASE_URL. Uses the same table/hash scheme as drizzle-orm's own
 * migrator (sha256 of the file, created_at = journal `when`), so `db:migrate`
 * recognises the rows. Backs up first via `npm run db:backup` unless
 * --no-backup is passed.
 */
async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--until");
  const untilTag = args[0];
  if (!untilTag) {
    console.error("❌ Pass --until <migration-tag>, e.g. npm run db:baseline -- --until 0002_breezy_tinkerer");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set. Copy .env.example to .env first.");
    process.exit(1);
  }

  const journal = JSON.parse(readFileSync("./drizzle/migrations/meta/_journal.json", "utf8")) as {
    entries: { tag: string; when: number }[];
  };
  const targets = journal.entries.filter((e) => e.tag <= untilTag);
  if (targets.length === 0 || !journal.entries.some((e) => e.tag === untilTag)) {
    console.error(`❌ No journal entries up to "${untilTag}". Check meta/_journal.json.`);
    process.exit(1);
  }

  const client = postgres(connectionString, { max: 1 });
  try {
    await client`CREATE SCHEMA IF NOT EXISTS drizzle`;
    await client`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `;

    for (const entry of targets) {
      const sql = readFileSync(`./drizzle/migrations/${entry.tag}.sql`, "utf8");
      const hash = createHash("sha256").update(sql).digest("hex");
      const existing = await client`SELECT id FROM drizzle.__drizzle_migrations WHERE hash = ${hash}`;
      if (existing.length === 0) {
        await client`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, ${entry.when})`;
        console.log(`   ✔ marked applied: ${entry.tag}`);
      } else {
        console.log(`   = already marked: ${entry.tag}`);
      }
    }
    console.log("\n✅ Baseline recorded. Run `npm run db:migrate` to apply newer migrations.");
  } finally {
    await client.end();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Baseline failed:", err);
  process.exit(1);
});
