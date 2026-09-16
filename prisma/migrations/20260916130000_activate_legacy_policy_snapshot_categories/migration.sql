-- Legacy policy weights are authoritative. The active flag in the original
-- backfill came from today's category rows, so normalize only legacy payloads
-- to make all four historical buckets participate in their saved weights.
-- jsonb_set preserves every other category property and the array order.
UPDATE "GradingPolicy" AS policy
SET "categorySnapshot" = jsonb_set(
  policy."categorySnapshot",
  '{categories}',
  (
    SELECT jsonb_agg(
      jsonb_set(category, '{active}', 'true'::jsonb, true)
      ORDER BY ordinal
    )
    FROM jsonb_array_elements(policy."categorySnapshot"->'categories')
      WITH ORDINALITY AS entries(category, ordinal)
  ),
  true
)
WHERE jsonb_typeof(policy."categorySnapshot") = 'object'
  AND policy."categorySnapshot"->>'legacy' = 'true'
  AND policy."categorySnapshot"->>'version' = '1'
  AND jsonb_typeof(policy."categorySnapshot"->'categories') = 'array';