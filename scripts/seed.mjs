/**
 * Seed the editable starter categories and a sensible default income.
 * Idempotent: only seeds when there are no categories yet.
 * Plain ESM so it runs with bare `node` in production. Run with: npm run seed
 */
import postgres from "postgres";

// Targets are illustrative defaults (sum ≈ a $6,000/mo household). All editable.
const CATEGORIES = [
  // Essentials
  { name: "Housing/Rent", group: "essentials", target: 1800, kind: "spending" },
  { name: "Utilities", group: "essentials", target: 250, kind: "spending" },
  { name: "Groceries", group: "essentials", target: 700, kind: "spending" },
  { name: "Transportation", group: "essentials", target: 350, kind: "spending" },
  { name: "Insurance", group: "essentials", target: 300, kind: "spending" },
  // Lifestyle
  { name: "Dining out", group: "lifestyle", target: 400, kind: "spending" },
  { name: "Entertainment & subscriptions", group: "lifestyle", target: 150, kind: "spending" },
  { name: "Shopping", group: "lifestyle", target: 300, kind: "spending" },
  { name: "Travel", group: "lifestyle", target: 250, kind: "spending" },
  // Health & family
  { name: "Health/Medical", group: "health_family", target: 200, kind: "spending" },
  { name: "Childcare/Kids", group: "health_family", target: 400, kind: "spending" },
  { name: "Pets", group: "health_family", target: 80, kind: "spending" },
  { name: "Gifts & donations", group: "health_family", target: 120, kind: "spending" },
  // Financial
  { name: "Savings", group: "financial", target: 600, kind: "savings" },
  { name: "Investments", group: "financial", target: 500, kind: "savings" },
  { name: "Debt/Loan payments", group: "financial", target: 400, kind: "spending" },
];

const DEFAULT_INCOME = 6000;

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
    const existing = await sql`SELECT COUNT(*) AS count FROM categories`;
    if (Number(existing[0].count) > 0) {
      console.log("Categories already present — skipping seed.");
      return;
    }

    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO plan (id, monthly_income, currency)
        VALUES (1, ${DEFAULT_INCOME}, 'USD')
        ON CONFLICT (id) DO UPDATE SET monthly_income = EXCLUDED.monthly_income
      `;
      let order = 1;
      for (const c of CATEGORIES) {
        await tx`
          INSERT INTO categories (name, "group", target_amount, kind, sort_order)
          VALUES (${c.name}, ${c.group}, ${c.target}, ${c.kind}, ${order})
        `;
        order++;
      }
    });

    console.log(`Seeded ${CATEGORIES.length} categories and default income $${DEFAULT_INCOME}.`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
