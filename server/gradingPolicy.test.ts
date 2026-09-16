import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultCategorySnapshot,
  resolveAssignmentCategoryAtDate,
  selectPolicyForDate,
  snapshotCategoryMatchesAssignment,
} from "./gradingPolicy.ts";

const policy = (id: number, effectiveFrom: string) => ({
  id,
  effectiveFrom,
  assignmentWeight: 25,
  testWeight: 25,
  quizWeight: 25,
  projectWeight: 25,
});

const category = (id: number, key: string) => ({
  id,
  key,
  name: key,
  weight: 25,
  displayOrder: 0,
  active: true,
});

test("returns null before the first policy and honors the UTC end-of-day boundary", () => {
  const policies = [policy(1, "2026-02-01T00:00:00.000Z")];
  assert.equal(selectPolicyForDate(policies, "2026-01-31"), null);
  assert.equal(selectPolicyForDate(policies, "2026-02-01")?.id, 1);
  assert.equal(
    selectPolicyForDate(
      [policy(2, "2026-02-01T23:59:59.999Z")],
      "2026-02-01",
    )?.id,
    2,
  );
});

test("selects the latest applicable policy across multiple changes", () => {
  const policies = [
    policy(1, "2026-01-01T00:00:00.000Z"),
    policy(2, "2026-02-01T00:00:00.000Z"),
    policy(3, "2026-03-01T00:00:00.000Z"),
  ];
  assert.equal(selectPolicyForDate(policies, "2026-02-28")?.id, 2);
  assert.equal(selectPolicyForDate(policies, "2026-03-01")?.id, 3);
});

test("history uses the prior row before effectiveTo and the next row at effectiveTo", () => {
  const history = [
    {
      id: 1,
      categoryId: 7,
      legacyType: "test",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveTo: "2026-06-01T00:00:00.000Z",
    },
    {
      id: 2,
      categoryId: 8,
      legacyType: "project",
      effectiveFrom: "2026-06-01T00:00:00.000Z",
      effectiveTo: null,
    },
  ];
  assert.deepEqual(
    resolveAssignmentCategoryAtDate(history, "2026-05-31", 8, "project"),
    { categoryId: 7, assignmentType: "test" },
  );
  assert.deepEqual(
    resolveAssignmentCategoryAtDate(history, "2026-06-01", 8, "project"),
    { categoryId: 8, assignmentType: "project" },
  );
});

test("legacy matching uses historical type after baseline and custom reassignments", () => {
  const testBeforeProject = resolveAssignmentCategoryAtDate(
    [
      {
        id: 1,
        categoryId: 2,
        legacyType: "test",
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-06-01",
      },
      {
        id: 2,
        categoryId: 3,
        legacyType: "project",
        effectiveFrom: "2026-06-01",
        effectiveTo: null,
      },
    ],
    "2026-05-31",
    3,
    "project",
  );
  assert.equal(
    snapshotCategoryMatchesAssignment(
      category(2, "test"),
      testBeforeProject.categoryId,
      testBeforeProject.assignmentType,
      true,
    ),
    true,
  );

  const customBeforeBaseline = resolveAssignmentCategoryAtDate(
    [
      {
        id: 3,
        categoryId: 99,
        legacyType: "assignment",
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-06-01",
      },
      {
        id: 4,
        categoryId: 1,
        legacyType: "assignment",
        effectiveFrom: "2026-06-01",
        effectiveTo: null,
      },
    ],
    "2026-05-31",
    1,
    "assignment",
  );
  assert.equal(
    snapshotCategoryMatchesAssignment(
      category(1, "assignment"),
      customBeforeBaseline.categoryId,
      customBeforeBaseline.assignmentType,
      true,
    ),
    true,
  );
});

test("version-2 matching uses historical category ID, not assignment type", () => {
  const historical = resolveAssignmentCategoryAtDate(
    [
      {
        id: 1,
        categoryId: 99,
        legacyType: "assignment",
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
      },
    ],
    "2026-06-01",
    1,
    "test",
  );
  assert.equal(
    snapshotCategoryMatchesAssignment(
      category(99, "custom"),
      historical.categoryId,
      historical.assignmentType,
      false,
    ),
    true,
  );
  assert.equal(
    snapshotCategoryMatchesAssignment(
      category(1, "assignment"),
      historical.categoryId,
      historical.assignmentType,
      false,
    ),
    false,
  );
});

test("default legacy snapshot weights total 100", () => {
  const defaults = defaultCategorySnapshot();
  assert.equal(defaults.length, 4);
  assert.equal(defaults.reduce((sum, item) => sum + item.weight, 0), 100);
});