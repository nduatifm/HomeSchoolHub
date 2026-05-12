-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "studentId" INTEGER;

-- CreateIndex
CREATE INDEX "Message_studentId_idx" ON "Message"("studentId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
