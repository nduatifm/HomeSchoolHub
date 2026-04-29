/**
 * One-time script: <short description>
 *
 * Purpose:
 *   <Explain what this script does and why it is needed.>
 *
 * Run:
 *   npx tsx scripts/one-time/<script-name>.ts
 *
 * Status: NOT YET RUN
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Set to true to log what would happen without writing anything to the DB.
const DRY_RUN = true;

async function main() {
  console.log(`Starting script (dry_run=${DRY_RUN}) …`);

  // TODO: replace with your query
  const rows = await prisma.$queryRaw<{ id: number }[]>`SELECT id FROM "User" LIMIT 5`;

  console.log(`Found ${rows.length} row(s) to process.`);

  for (const row of rows) {
    if (DRY_RUN) {
      console.log(`[dry-run] Would update row id=${row.id}`);
      continue;
    }

    // TODO: replace with your actual update
    // await prisma.someModel.update({ where: { id: row.id }, data: { ... } });
    console.log(`Updated row id=${row.id}`);
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
