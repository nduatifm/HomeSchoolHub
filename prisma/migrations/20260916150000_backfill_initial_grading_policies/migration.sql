-- Preserve the original classroom defaults as an effective-dated policy.
-- Existing policies created after classroom creation remain unchanged.
INSERT INTO "GradingPolicy" (
  "classroomId",
  "assignmentWeight",
  "testWeight",
  "quizWeight",
  "projectWeight",
  "effectiveFrom",
  "categorySnapshot"
)
SELECT
  classroom."id",
  25,
  25,
  25,
  25,
  classroom."createdAt",
  jsonb_build_object(
    'version', 1,
    'legacy', true,
    'categories', jsonb_build_array(
      jsonb_build_object(
        'id', COALESCE((
          SELECT category."id" FROM "ClassroomGradingCategory" AS category
          WHERE category."classroomId" = classroom."id"
            AND category."key" = 'assignment'
          ORDER BY category."id" LIMIT 1
        ), 0),
        'key', 'assignment',
        'name', COALESCE((
          SELECT category."name" FROM "ClassroomGradingCategory" AS category
          WHERE category."classroomId" = classroom."id"
            AND category."key" = 'assignment'
          ORDER BY category."id" LIMIT 1
        ), 'Assignments'),
        'weight', 25,
        'displayOrder', COALESCE((
          SELECT category."displayOrder" FROM "ClassroomGradingCategory" AS category
          WHERE category."classroomId" = classroom."id"
            AND category."key" = 'assignment'
          ORDER BY category."id" LIMIT 1
        ), 0),
        'active', true
      ),
      jsonb_build_object(
        'id', COALESCE((
          SELECT category."id" FROM "ClassroomGradingCategory" AS category
          WHERE category."classroomId" = classroom."id"
            AND category."key" = 'test'
          ORDER BY category."id" LIMIT 1
        ), 0),
        'key', 'test',
        'name', COALESCE((
          SELECT category."name" FROM "ClassroomGradingCategory" AS category
          WHERE category."classroomId" = classroom."id"
            AND category."key" = 'test'
          ORDER BY category."id" LIMIT 1
        ), 'Tests'),
        'weight', 25,
        'displayOrder', COALESCE((
          SELECT category."displayOrder" FROM "ClassroomGradingCategory" AS category
          WHERE category."classroomId" = classroom."id"
            AND category."key" = 'test'
          ORDER BY category."id" LIMIT 1
        ), 1),
        'active', true
      ),
      jsonb_build_object(
        'id', COALESCE((
          SELECT category."id" FROM "ClassroomGradingCategory" AS category
          WHERE category."classroomId" = classroom."id"
            AND category."key" = 'quiz'
          ORDER BY category."id" LIMIT 1
        ), 0),
        'key', 'quiz',
        'name', COALESCE((
          SELECT category."name" FROM "ClassroomGradingCategory" AS category
          WHERE category."classroomId" = classroom."id"
            AND category."key" = 'quiz'
          ORDER BY category."id" LIMIT 1
        ), 'Quizzes'),
        'weight', 25,
        'displayOrder', COALESCE((
          SELECT category."displayOrder" FROM "ClassroomGradingCategory" AS category
          WHERE category."classroomId" = classroom."id"
            AND category."key" = 'quiz'
          ORDER BY category."id" LIMIT 1
        ), 2),
        'active', true
      ),
      jsonb_build_object(
        'id', COALESCE((
          SELECT category."id" FROM "ClassroomGradingCategory" AS category
          WHERE category."classroomId" = classroom."id"
            AND category."key" = 'project'
          ORDER BY category."id" LIMIT 1
        ), 0),
        'key', 'project',
        'name', COALESCE((
          SELECT category."name" FROM "ClassroomGradingCategory" AS category
          WHERE category."classroomId" = classroom."id"
            AND category."key" = 'project'
          ORDER BY category."id" LIMIT 1
        ), 'Projects'),
        'weight', 25,
        'displayOrder', COALESCE((
          SELECT category."displayOrder" FROM "ClassroomGradingCategory" AS category
          WHERE category."classroomId" = classroom."id"
            AND category."key" = 'project'
          ORDER BY category."id" LIMIT 1
        ), 3),
        'active', true
      )
    )
  )
FROM "Classroom" AS classroom
WHERE NOT EXISTS (
  SELECT 1 FROM "GradingPolicy" AS exact_policy
  WHERE exact_policy."classroomId" = classroom."id"
    AND exact_policy."effectiveFrom" = classroom."createdAt"
)
AND NOT EXISTS (
  SELECT 1 FROM "GradingPolicy" AS policy
  WHERE policy."classroomId" = classroom."id"
    AND policy."effectiveFrom" <= classroom."createdAt"
);