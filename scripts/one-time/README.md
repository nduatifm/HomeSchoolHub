# One-Time Database Scripts

This directory holds scripts for one-time data operations such as backfills,
data migrations, and cleanup jobs. These scripts are intentionally **separate
from server startup** so they never run automatically on every restart.

## When to add a script here

- Backfilling a new column for existing rows
- Migrating data from one shape to another after a schema change
- One-off cleanup of stale or invalid records

Never embed this kind of logic in `server/routes.ts` or `server/index.ts`.

## How to run a script

### Preflight checklist

Before running any script against a real database, go through this list:

1. **Confirm the target environment.** Check that `DATABASE_URL` in your
   `.env` points to the intended database (dev vs. production).
2. **Run in dry-run mode first.** Every script ships with `DRY_RUN = true`.
   Execute it once and review the log output to confirm the rows that will
   be touched look correct.
3. **Flip `DRY_RUN` to `false` and re-run.** Only do this after you are
   satisfied the dry run output is correct.
4. **Verify the results.** Spot-check a few rows in the database to confirm
   the changes are as expected.

### Command

```bash
npx tsx scripts/one-time/<script-name>.ts
```

Run from the project root. The script connects directly to the database
configured in your `.env` file (`DATABASE_URL`).

### Example

```bash
npx tsx scripts/one-time/backfill-classroom-slugs.ts
```

## After running

Once the script has been successfully applied to production:

1. Keep the file in this directory as a historical record.
2. Add a note at the top of the file with the date it was run and who ran it.
3. Do **not** delete the file — it serves as an audit trail.

## Writing a new script

Copy `_template.ts` and fill in the logic. The template includes:

- A Prisma client import
- A `main()` function wrapped in try/catch
- Proper `$disconnect()` cleanup
- A dry-run flag you can flip before committing
