-- Preserve each classroom's latest saved legacy policy when normalizing its
-- baseline categories. Classrooms without a saved policy retain 25% each.
UPDATE "ClassroomGradingCategory" AS category
SET "weight" = CASE category."key"
  WHEN 'assignment' THEN policy."assignmentWeight"
  WHEN 'test' THEN policy."testWeight"
  WHEN 'quiz' THEN policy."quizWeight"
  WHEN 'project' THEN policy."projectWeight"
  ELSE category."weight"
END
FROM "GradingPolicy" AS policy
WHERE category."classroomId" = policy."classroomId"
  AND category."key" IN ('assignment', 'test', 'quiz', 'project')
  AND policy."id" = (
    SELECT MAX(latest."id")
    FROM "GradingPolicy" AS latest
    WHERE latest."classroomId" = category."classroomId"
  );