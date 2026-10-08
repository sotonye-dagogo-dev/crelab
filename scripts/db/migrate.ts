import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Applies all pending journal-backed migrations in ./drizzle/migrations.
 *
 * Usage: npm run db:migrate
 *
 * Requires DATABASE_URL. The close-out migration (0003) is idempotent, so this
 * is safe to run even if some objects were previously created by the legacy
 * hand-applied SQL files.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set. Copy .env.example to .env first.");
    process.exit(1);
  }

  console.log("🔄 Applying pending migrations...\n");
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder: "./drizzle/migrations" });
    console.log("\n✅ Migrations applied. Database is up to date.");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
  process.exit(0);
}

main();
