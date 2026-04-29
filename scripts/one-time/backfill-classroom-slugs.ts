/**
 * One-time script: backfill missing classroom slugs
 *
 * Purpose:
 *   Classrooms created before the `slug` column was added may have a NULL or
 *   empty slug. This script generates a slug from each classroom's name and
 *   writes it back to the database.
 *
 * Run:
 *   npx tsx scripts/one-time/backfill-classroom-slugs.ts
 *
 * Status: NOT YET RUN
 */

import { PrismaClient } from "@prisma/client";
import { slugify } from "../../shared/slugify.js";

const prisma = new PrismaClient();

// Set to false only when you are ready to write changes to the database.
const DRY_RUN = true;

async function main() {
  console.log(`Starting classroom slug backfill (dry_run=${DRY_RUN}) …`);

  const classrooms = await prisma.classroom.findMany({
    where: { OR: [{ slug: null }, { slug: "" }] },
    select: { id: true, name: true },
  });

  console.log(`Found ${classrooms.length} classroom(s) with a null or empty slug.`);

  for (const classroom of classrooms) {
    const candidate = slugify(classroom.name, classroom.id);

    if (DRY_RUN) {
      console.log(`[dry-run] classroom id=${classroom.id} → slug="${candidate}"`);
      continue;
    }

    await prisma.classroom.update({
      where: { id: classroom.id },
      data: { slug: candidate },
    });

    console.log(`Updated classroom id=${classroom.id} → slug="${candidate}"`);
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
