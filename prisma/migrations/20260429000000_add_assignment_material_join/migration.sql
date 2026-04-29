-- CreateTable
CREATE TABLE IF NOT EXISTS "ClassroomAssignmentMaterial" (
    "assignmentId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,

    CONSTRAINT "ClassroomAssignmentMaterial_pkey" PRIMARY KEY ("assignmentId","materialId")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClassroomAssignmentMaterial_materialId_idx" ON "ClassroomAssignmentMaterial"("materialId");

-- AddForeignKey
ALTER TABLE "ClassroomAssignmentMaterial" ADD CONSTRAINT "ClassroomAssignmentMaterial_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassroomAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomAssignmentMaterial" ADD CONSTRAINT "ClassroomAssignmentMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "ClassroomMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: change assignmentId FK on ClassroomMaterial to SET NULL
ALTER TABLE "ClassroomMaterial" DROP CONSTRAINT IF EXISTS "ClassroomMaterial_assignmentId_fkey";
ALTER TABLE "ClassroomMaterial" ADD CONSTRAINT "ClassroomMaterial_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassroomAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
