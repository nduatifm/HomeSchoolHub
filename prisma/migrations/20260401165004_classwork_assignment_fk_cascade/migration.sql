-- DropForeignKey
ALTER TABLE "ClassroomMaterial" DROP CONSTRAINT "ClassroomMaterial_assignmentId_fkey";

-- AddForeignKey
ALTER TABLE "ClassroomMaterial" ADD CONSTRAINT "ClassroomMaterial_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassroomAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
