-- DropIndex
DROP INDEX IF EXISTS "ClassroomMaterial_assignmentId_idx";

-- DropForeignKey
ALTER TABLE "ClassroomMaterial" DROP CONSTRAINT IF EXISTS "ClassroomMaterial_assignmentId_fkey";

-- AlterTable
ALTER TABLE "ClassroomMaterial" DROP COLUMN IF EXISTS "assignmentId";
