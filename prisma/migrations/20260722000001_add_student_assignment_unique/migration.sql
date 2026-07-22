-- Remove any duplicate (assignmentId, studentId) pairs before adding the unique constraint.
-- Keeps the row with the lowest id for each pair.
DELETE FROM "StudentAssignment"
WHERE id NOT IN (
  SELECT MIN(id)
  FROM "StudentAssignment"
  GROUP BY "assignmentId", "studentId"
);

-- Add unique constraint on (assignmentId, studentId)
CREATE UNIQUE INDEX "StudentAssignment_assignmentId_studentId_key" ON "StudentAssignment"("assignmentId", "studentId");
