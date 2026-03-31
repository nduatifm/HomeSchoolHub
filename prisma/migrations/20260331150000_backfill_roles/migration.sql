-- Backfill roles array from existing role column for all pre-existing users.
-- Safe to re-run: WHERE clause makes it idempotent for rows already seeded.
UPDATE "User"
SET roles = ARRAY[role]
WHERE role IS NOT NULL
  AND (roles IS NULL OR roles = '{}');

UPDATE "User"
SET roles = '{}'
WHERE role IS NULL
  AND (roles IS NULL);
