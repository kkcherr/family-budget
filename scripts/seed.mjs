/**
 * Seed the starter Plan: Fixed / Variable expenses (two sub-columns each) and
 * editable Savings buckets. Amounts and frequencies are left for you to fill in.
 * Idempotent: only seeds when there are no categories yet.
 * Plain ESM so it runs with bare `node` in production. Run with: npm run seed
 */
import postgres from "postgres";

// section, then two sub-columns of names. frequency defaults to 'monthly',
// target defaults to 0 — all editable in the Plan screen.
const FIXED = [
  // column 0
  ["Rent", "Council Tax", "Electricity", "Water & Heating", "Broadband & Mobile", "Car Leasing", "Childcare / School"],
  // column 1
  ["Russian school", "Swimming", "Sport", "Cleaning lady", "Dog's insurance", "Dog's vet care subscription", "Monthly subscriptions"],
];

const VARIABLE = [
  // column 0
  ["Groceries", "Transport", "Eating out & Restaurants", "Deliveries"],
  // column 1
  ["Clothes / Shopping", "Entertainment", "Gifts", "Miscellaneous"],
];

const SAVINGS_POTS = ["deposit Vanya", "deposit Katya", "ISA Vanya", "ISA Katya"];

function rows() {
  const out = [];
  const push = (section, cols) => {
    cols.forEach((names, col) => {
      names.forEach((name, i) => {
        out.push({ name, section, col, sort_order: i + 1 });
      });
    });
  };
  push("fixed", FIXED);
  push("variable", VARIABLE);
  return out;
}

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

    const items = rows();
    await sql.begin(async (tx) => {
      // Ensure the singleton plan row exists; leave income at 0 to be set in-app.
      await tx`
        INSERT INTO plan (id, monthly_income, currency)
        VALUES (1, 0, 'GBP')
        ON CONFLICT (id) DO NOTHING
      `;
      for (const r of items) {
        await tx`
          INSERT INTO categories (name, section, col, target_amount, frequency, sort_order)
          VALUES (${r.name}, ${r.section}, ${r.col}, 0, 'monthly', ${r.sort_order})
        `;
      }
      // Savings pots live on the Cash & Savings page (running balances).
      let order = 1;
      for (const name of SAVINGS_POTS) {
        await tx`
          INSERT INTO savings_pots (name, sort_order) VALUES (${name}, ${order})
        `;
        order++;
      }
    });

    console.log(`Seeded ${items.length} plan items + ${SAVINGS_POTS.length} savings pots.`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
