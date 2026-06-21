/**
 * Apply SQL migrations from /migrations in filename order.
 * Plain ESM so it runs with bare `node` (no extra toolchain) in production.
 * Run with: npm run migrate
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

async function main() {
  const connectionString =
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const isLocal =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1");
  const sslDisabled = isLocal || /sslmode=disable/.test(connectionString);

  const sql = postgres(connectionString, {
    ssl: sslDisabled ? false : "require",
    max: 1,
    onnotice: () => {},
  });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    const dir = path.join(process.cwd(), "migrations");
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      const done = await sql`SELECT 1 FROM _migrations WHERE name = ${file}`;
      if (done.length > 0) {
        console.log(`• skip ${file} (already applied)`);
        continue;
      }
      const content = await readFile(path.join(dir, file), "utf8");
      console.log(`▸ applying ${file} ...`);
      await sql.unsafe(content);
      await sql`INSERT INTO _migrations (name) VALUES (${file})`;
      console.log(`  ✓ ${file}`);
    }
    console.log("Migrations complete.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
