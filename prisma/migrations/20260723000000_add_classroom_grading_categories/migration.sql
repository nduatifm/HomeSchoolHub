-- Normalize classroom grading categories while retaining legacy policy/type columns.
CREATE TABLE "ClassroomGradingCategory" (
    "id" SERIAL NOT NULL,
    "classroomId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassroomGradingCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassroomGradingCategory_classroomId_key_key"
  ON "ClassroomGradingCategory"("classroomId", "key");
CREATE UNIQUE INDEX "ClassroomGradingCategory_classroomId_name_key"
  ON "ClassroomGradingCategory"("classroomId", "name");
CREATE INDEX "ClassroomGradingCategory_classroomId_displayOrder_idx"
  ON "ClassroomGradingCategory"("classroomId", "displayOrder");
ALTER TABLE "ClassroomGradingCategory"
  ADD CONSTRAINT "ClassroomGradingCategory_classroomId_fkey"
  FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassroomAssignment" ADD COLUMN "categoryId" INTEGER;
CREATE INDEX "ClassroomAssignment_categoryId_idx" ON "ClassroomAssignment"("categoryId");
ALTER TABLE "ClassroomAssignment"
  ADD CONSTRAINT "ClassroomAssignment_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "ClassroomGradingCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Every existing classroom receives the stable four-category baseline. The legacy
-- assignmentType remains untouched and is used only to establish this relation.
INSERT INTO "ClassroomGradingCategory" ("classroomId", "key", "name", "weight", "displayOrder")
SELECT c.id, v.key, v.name, 25, v.displayOrder
FROM "Classroom" c
CROSS JOIN (VALUES
  ('assignment', 'Assignments', 0),
  ('test',       'Tests',       1),
  ('quiz',       'Quizzes',     2),
  ('project',    'Projects',    3)
) AS v(key, name, displayOrder);

UPDATE "ClassroomAssignment" a
SET "categoryId" = gc.id
FROM "ClassroomGradingCategory" gc
WHERE gc."classroomId" = a."classroomId"
  AND gc."key" = CASE
    WHEN a."assignmentType" IN ('assignment', 'test', 'quiz', 'project')
      THEN a."assignmentType"
    ELSE 'assignment'
  END;