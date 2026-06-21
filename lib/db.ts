import postgres from "postgres";

/**
 * Single shared postgres.js connection.
 *
 * In development Next.js hot-reloads modules, which would otherwise open a new
 * pool on every change, so we cache the client on globalThis.
 */
const connectionString =
  process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";

if (!connectionString) {
  // Surface a clear message instead of a cryptic connection error later.
  console.warn(
    "[family-budget] DATABASE_URL is not set. Set it in .env.local or your host."
  );
}

// Neon and most managed Postgres require SSL; local dev usually does not.
const isLocal =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

function createClient() {
  return postgres(connectionString, {
    ssl: isLocal ? false : "require",
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
  });
}

const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof createClient>;
};

export const sql = globalForDb.sql ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql;
}
