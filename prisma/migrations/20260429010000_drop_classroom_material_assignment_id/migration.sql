-- Backfill: copy legacy assignmentId links into join table before dropping column
-- (Idempotent: ON CONFLICT DO NOTHING; no-op if column already dropped)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ClassroomMaterial' AND column_name = 'assignmentId'
  ) THEN
    INSERT INTO "ClassroomAssignmentMaterial" ("assignmentId", "materialId")
    SELECT "assignmentId", "id"
    FROM "ClassroomMaterial"
    WHERE "assignmentId" IS NOT NULL
    ON CONFLICT ("assignmentId", "materialId") DO NOTHING;
  END IF;
END $$;

-- DropIndex
DROP INDEX IF EXISTS "ClassroomMaterial_assignmentId_idx";

-- DropForeignKey
ALTER TABLE "ClassroomMaterial" DROP CONSTRAINT IF EXISTS "ClassroomMaterial_assignmentId_fkey";

-- AlterTable
ALTER TABLE "ClassroomMaterial" DROP COLUMN IF EXISTS "assignmentId";
