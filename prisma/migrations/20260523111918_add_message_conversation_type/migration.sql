-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "conversationType" TEXT NOT NULL DEFAULT 'student';

-- CreateIndex
CREATE INDEX "Message_conversationType_idx" ON "Message"("conversationType");
