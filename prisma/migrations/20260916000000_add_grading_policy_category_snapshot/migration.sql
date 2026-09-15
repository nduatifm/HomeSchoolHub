ALTER TABLE "GradingPolicy" ADD COLUMN "categorySnapshot" JSONB;

-- A policy predating normalized categories cannot recover custom category
-- history. It can, however, retain the category identities currently known to
-- the classroom and its own legacy weights for the four baseline keys.
UPDATE "GradingPolicy" AS policy
SET "categorySnapshot" = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', category."id",
        'key', category."key",
        'name', category."name",
        'weight', CASE category."key"
          WHEN 'assignment' THEN policy."assignmentWeight"
          WHEN 'test' THEN policy."testWeight"
          WHEN 'quiz' THEN policy."quizWeight"
          WHEN 'project' THEN policy."projectWeight"
          ELSE category."weight"
        END,
        'displayOrder', category."displayOrder",
        'active', category."active"
      )
      ORDER BY category."displayOrder", category."id"
    )
    FROM "ClassroomGradingCategory" AS category
    WHERE category."classroomId" = policy."classroomId"
  ),
  jsonb_build_array(
    jsonb_build_object('id', 0, 'key', 'assignment', 'name', 'Assignments',
      'weight', policy."assignmentWeight", 'displayOrder', 0, 'active', true),
    jsonb_build_object('id', 0, 'key', 'test', 'name', 'Tests',
      'weight', policy."testWeight", 'displayOrder', 1, 'active', true),
    jsonb_build_object('id', 0, 'key', 'quiz', 'name', 'Quizzes',
      'weight', policy."quizWeight", 'displayOrder', 2, 'active', true),
    jsonb_build_object('id', 0, 'key', 'project', 'name', 'Projects',
      'weight', policy."projectWeight", 'displayOrder', 3, 'active', true)
  )
);