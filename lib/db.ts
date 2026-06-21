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

// Neon and most managed Postgres require SSL. Local dev and a self-hosted
// Postgres on a private Docker network do not — opt out via host or
// `?sslmode=disable` in the connection string.
const isLocal =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");
const sslDisabled = isLocal || /sslmode=disable/.test(connectionString);

function createClient() {
  return postgres(connectionString, {
    ssl: sslDisabled ? false : "require",
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => {},
  });
}

const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof createClient>;
};

export const sql = globalForDb.sql ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql;
}
