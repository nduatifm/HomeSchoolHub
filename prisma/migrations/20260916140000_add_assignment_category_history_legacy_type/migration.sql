ALTER TABLE "AssignmentCategoryHistory"
  ADD COLUMN "legacyType" TEXT;

-- Keep malformed legacy assignment types in the compatibility bucket. This
-- also records the exact type effective when each initial history row was
-- created, before any category is later renamed or removed.
UPDATE "AssignmentCategoryHistory" AS history
SET "legacyType" = CASE
  WHEN assignment."assignmentType" IN ('assignment', 'test', 'quiz', 'project')
    THEN assignment."assignmentType"
  ELSE 'assignment'
END
FROM "ClassroomAssignment" AS assignment
WHERE assignment."id" = history."assignmentId";

ALTER TABLE "AssignmentCategoryHistory"
  ALTER COLUMN "legacyType" SET NOT NULL;

ALTER TABLE "AssignmentCategoryHistory"
  ADD CONSTRAINT "AssignmentCategoryHistory_legacyType_check"
  CHECK ("legacyType" IN ('assignment', 'test', 'quiz', 'project'));