CREATE TABLE "AssignmentCategoryHistory" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    CONSTRAINT "AssignmentCategoryHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssignmentCategoryHistory_assignmentId_effectiveFrom_idx"
  ON "AssignmentCategoryHistory"("assignmentId", "effectiveFrom");
CREATE INDEX "AssignmentCategoryHistory_assignmentId_effectiveTo_idx"
  ON "AssignmentCategoryHistory"("assignmentId", "effectiveTo");
ALTER TABLE "AssignmentCategoryHistory"
  ADD CONSTRAINT "AssignmentCategoryHistory_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "ClassroomAssignment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- The first row represents the assignment's category at creation. categoryId
-- intentionally has no FK: category rows may be deleted while this history is
-- retained for historical report calculations.
INSERT INTO "AssignmentCategoryHistory" ("assignmentId", "categoryId", "effectiveFrom")
SELECT "id", "categoryId", "createdAt"
FROM "ClassroomAssignment";