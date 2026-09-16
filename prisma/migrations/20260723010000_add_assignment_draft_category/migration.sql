ALTER TABLE "assignment_drafts" ADD COLUMN "categoryId" INTEGER;
CREATE INDEX "assignment_drafts_categoryId_idx" ON "assignment_drafts"("categoryId");
ALTER TABLE "assignment_drafts"
  ADD CONSTRAINT "assignment_drafts_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "ClassroomGradingCategory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;