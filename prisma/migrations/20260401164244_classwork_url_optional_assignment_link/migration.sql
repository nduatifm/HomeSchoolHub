-- AlterTable
ALTER TABLE "ClassroomMaterial" ADD COLUMN     "assignmentId" INTEGER,
ALTER COLUMN "url" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ClassroomMaterial_assignmentId_idx" ON "ClassroomMaterial"("assignmentId");

-- AddForeignKey
ALTER TABLE "ClassroomMaterial" ADD CONSTRAINT "ClassroomMaterial_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassroomAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
