-- AlterTable
ALTER TABLE "User" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_slug_key" ON "User"("slug");

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Assignment_slug_key" ON "Assignment"("slug");

-- AlterTable
ALTER TABLE "Material" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Material_slug_key" ON "Material"("slug");

-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Classroom_slug_key" ON "Classroom"("slug");
CREATE INDEX IF NOT EXISTS "Classroom_slug_idx" ON "Classroom"("slug");

-- AlterTable
ALTER TABLE "ClassroomAssignment" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "ClassroomAssignment_classroomId_slug_key" ON "ClassroomAssignment"("classroomId", "slug");

-- AlterTable
ALTER TABLE "ClassroomMaterial" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "ClassroomMaterial_classroomId_slug_key" ON "ClassroomMaterial"("classroomId", "slug");
