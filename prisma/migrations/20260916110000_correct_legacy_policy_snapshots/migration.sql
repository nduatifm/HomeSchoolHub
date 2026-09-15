-- Correct the original backfill: preexisting policies represent the legacy
-- four buckets only. Do not carry custom categories or today's custom weights
-- into historical policy versions. The explicit marker lets runtime matching
-- use assignmentType for these rows.
UPDATE "GradingPolicy" AS policy
SET "categorySnapshot" = jsonb_build_object(
  'version', 1,
  'legacy', true,
  'categories', jsonb_build_array(
    jsonb_build_object(
      'id', COALESCE((
        SELECT category."id" FROM "ClassroomGradingCategory" AS category
        WHERE category."classroomId" = policy."classroomId"
          AND category."key" = 'assignment'
        ORDER BY category."id" LIMIT 1
      ), 0),
      'key', 'assignment',
      'name', COALESCE((
        SELECT category."name" FROM "ClassroomGradingCategory" AS category
        WHERE category."classroomId" = policy."classroomId"
          AND category."key" = 'assignment'
        ORDER BY category."id" LIMIT 1
      ), 'Assignments'),
      'weight', CASE WHEN policy."assignmentWeight" + policy."testWeight" +
        policy."quizWeight" + policy."projectWeight" = 100
        THEN policy."assignmentWeight" ELSE 25 END,
      'displayOrder', COALESCE((
        SELECT category."displayOrder" FROM "ClassroomGradingCategory" AS category
        WHERE category."classroomId" = policy."classroomId"
          AND category."key" = 'assignment'
        ORDER BY category."id" LIMIT 1
      ), 0),
      'active', COALESCE((
        SELECT category."active" FROM "ClassroomGradingCategory" AS category
        WHERE category."classroomId" = policy."classroomId"
          AND category."key" = 'assignment'
        ORDER BY category."id" LIMIT 1
      ), true)
    ),
    jsonb_build_object(
      'id', COALESCE((
        SELECT category."id" FROM "ClassroomGradingCategory" AS category
        WHERE category."classroomId" = policy."classroomId"
          AND category."key" = 'test'
        ORDER BY category."id" LIMIT 1
      ), 0),
      'key', 'test',
      'name', COALESCE((
        SELECT category."name" FROM "ClassroomGradingCategory" AS category
        WHERE category."classroomId" = policy."classroomId"
          AND category."key" = 'test'
        ORDER BY category."id" LIMIT 1
      ), 'Tests'),
      'weight', CASE WHEN policy."assignmentWeight" + policy."testWeight" +
        policy."quizWeight" + policy."projectWeight" = 100
        THEN policy."testWeight" ELSE 25 END,
      'displayOrder', COALESCE((
        SELECT category."displayOrder" FROM "ClassroomGradingCategory" AS category
        WHERE category."classroomId" = policy."classroomId"
          AND category."key" = 'test'
        ORDER BY category."id" LIMIT 1
      ), 1),
      'active', COALESCE((
        SELECT category."active" FROM "ClassroomGradingCategory" AS category
        WHERE category."classroomId" = policy."classroomId"
          AND category."key" = 'test'
        ORDER BY category."id" LIMIT 1
      ), true)
    ),
    jsonb_build_object(
      'id', COALESCE((
        SELECT category."id" FROM "ClassroomGradingCategory" AS category
        WHERE category."classroomId" = policy."classroomId"
          AND category."key" = 'quiz'
        ORDER BY category."id" LIMIT 1
      ), 0),
      'key', 'quiz',
      'name', COALESCE((
        SELECT category."name" FROM "ClassroomGradingCategory" AS category
        WHERE category."classroomId" = policy."classroomId"
          AND category."key" = 'quiz'
        ORDER BY category."id" LIMIT 1
      ), 'Quizzes'),
      'weight', CASE WHEN policy."assignmentWeight" + policy."testWeight" +
        policy."quizWeight" + policy."projectWeight" = 100
        THEN policy."quizWeight" ELSE 25 END,
      'displayOrder', COALESCE((
        SELECT category."displayOrder" FROM "ClassroomGradingCategory" AS category
        WHERE category."classroomId" = policy."classroomId"
          AND category."key" = 'quiz'
        ORDER BY category."id" LIMIT 1
      ), 2),
      'active', COALESCE((
        SELECT category."active" FROM "ClassroomGradingCategory" AS category
        WHERE category."classroomId" = policy."classroomId"
          AND category."key" = 'quiz'
        ORDER BY category."id" LIMIT 1
      ), true)
    ),
    jsonb_build_object(
      'id', COALESCE((
        SELECT category."id" FROM "ClassroomGradingCategory" AS category
        WHERE category."classroomId" = policy."classroomId"
          AND category."key" = 'project'
        ORDER BY category."id" LIMIT 1
      ), 0),
      'key', 'project',
      'name', COALESCE((
        SELECT category."name" FROM "ClassroomGradingCategory" AS category
        WHERE category."classroomId" = policy."classroomId"
          AND category."key" = 'project'
        ORDER BY category."id" LIMIT 1
      ), 'Projects'),
      'weight', CASE WHEN policy."assignmentWeight" + policy."testWeight" +
        policy."quizWeight" + policy."projectWeight" = 100
        THEN policy."projectWeight" ELSE 25 END,
      'displayOrder', COALESCE((
        SELECT category."displayOrder" FROM "ClassroomGradingCategory" AS category
        WHERE category."classroomId" = policy."classroomId"
          AND category."key" = 'project'
        ORDER BY category."id" LIMIT 1
      ), 3),
      'active', COALESCE((
        SELECT category."active" FROM "ClassroomGradingCategory" AS category
        WHERE category."classroomId" = policy."classroomId"
          AND category."key" = 'project'
        ORDER BY category."id" LIMIT 1
      ), true)
    )
  )
);