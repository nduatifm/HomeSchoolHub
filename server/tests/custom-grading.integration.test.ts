import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFile } from "node:fs/promises";
import express from "express";
import cookieParser from "cookie-parser";
import prisma from "../db";
import { registerRoutes } from "../routes";
import { storage } from "../storage";
import {
  buildCategorySnapshotPayload,
  defaultCategorySnapshot,
} from "../gradingPolicy";

const runId = `grading-${Date.now()}-${process.pid}`;
const createdUserIds: number[] = [];
let baseUrl = "";
let server: ReturnType<ReturnType<typeof express>["listen"]>;

async function createUser(role: "teacher" | "student") {
  const user = await prisma.user.create({
    data: {
      name: `${runId}-${role}`,
      email: `${runId}-${role}-${createdUserIds.length}@example.test`,
      role,
      roles: [role],
      teachingSubjects: [],
      interests: [],
    },
  });
  createdUserIds.push(user.id);
  const session = await prisma.authSession.create({
    data: {
      id: `${runId}-session-${user.id}`,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return { user, cookie: `lyra_session=${session.id}` };
}

async function createStudent() {
  const auth = await createUser("student");
  const student = await prisma.student.create({
    data: {
      userId: auth.user.id,
      name: auth.user.name,
      gradeLevel: "Grade 8",
      badges: [],
    },
  });
  return { ...auth, student };
}

async function request(
  path: string,
  cookie: string,
  init: { method?: string; body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method ?? "GET",
    headers: {
      cookie,
      ...(init.body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function categories(classroomId: number) {
  return prisma.classroomGradingCategory.findMany({
    where: { classroomId },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });
}

before(async () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  registerRoutes(app);
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server.closeIdleConnections?.();
  server.closeAllConnections?.();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  await prisma.$disconnect();
});

test("migrated classrooms retain the latest saved legacy weights", async () => {
  const migration = await readFile(
    "prisma/migrations/20260915000000_preserve_custom_grading_weights/migration.sql",
    "utf8",
  );
  const rollback = new Error("ROLLBACK_MIGRATION_TEST");
  await assert.rejects(
    prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: `${runId}-migration-teacher`,
          email: `${runId}-migration-teacher@example.test`,
          role: "teacher",
          roles: ["teacher"],
          teachingSubjects: [],
          interests: [],
        },
      });
      const classroom = await tx.classroom.create({
        data: { name: `${runId}-migration`, subject: "Math", teacherId: user.id },
      });
      await tx.classroomGradingCategory.createMany({
        data: [
          { classroomId: classroom.id, key: "assignment", name: "Assignments", weight: 25, displayOrder: 0 },
          { classroomId: classroom.id, key: "test", name: "Tests", weight: 25, displayOrder: 1 },
          { classroomId: classroom.id, key: "quiz", name: "Quizzes", weight: 25, displayOrder: 2 },
          { classroomId: classroom.id, key: "project", name: "Projects", weight: 25, displayOrder: 3 },
        ],
      });
      await tx.gradingPolicy.createMany({
        data: [
          { classroomId: classroom.id, assignmentWeight: 40, testWeight: 30, quizWeight: 20, projectWeight: 10 },
          { classroomId: classroom.id, assignmentWeight: 10, testWeight: 20, quizWeight: 30, projectWeight: 40 },
        ],
      });

      await tx.$executeRawUnsafe(migration);
      const migrated = await tx.classroomGradingCategory.findMany({
        where: { classroomId: classroom.id },
        orderBy: { displayOrder: "asc" },
      });
      assert.deepEqual(
        Object.fromEntries(migrated.map((category) => [category.key, category.weight])),
        { assignment: 10, test: 20, quiz: 30, project: 40 },
      );
      throw rollback;
    }),
    (error) => error === rollback,
  );
});

test("new classrooms get defaults and only their owner can mutate categories", async () => {
  const owner = await createUser("teacher");
  const otherTeacher = await createUser("teacher");
  const classroom = await storage.createClassroom({
    name: `${runId}-defaults`,
    subject: "Science",
    teacherId: owner.user.id,
  });
  assert.deepEqual(
    (await categories(classroom.id)).map(({ key, weight }) => [key, weight]),
    [["assignment", 25], ["test", 25], ["quiz", 25], ["project", 25]],
  );

  const forbidden = await request(
    `/api/classrooms/${classroom.id}/grading-categories`,
    otherTeacher.cookie,
    { method: "POST", body: { name: "Labs", weight: 20 } },
  );
  assert.equal(forbidden.status, 403);

  const created = await request(
    `/api/classrooms/${classroom.id}/grading-categories`,
    owner.cookie,
    { method: "POST", body: { name: "Labs", key: `${runId}-labs`, weight: 20 } },
  );
  assert.equal(created.status, 201);
  assert.equal((await categories(classroom.id)).reduce((sum, item) => sum + item.weight, 0), 100);

  const updated = await request(
    `/api/classrooms/${classroom.id}/grading-categories/${created.body.id}`,
    owner.cookie,
    { method: "PATCH", body: { name: "Lab work" } },
  );
  assert.equal(updated.status, 200);
  assert.equal(updated.body.name, "Lab work");
});

test("assignment and draft category IDs round trip, including unchanged legacy full-payload edits", async () => {
  const teacher = await createUser("teacher");
  const classroom = await storage.createClassroom({
    name: `${runId}-roundtrip`,
    subject: "English",
    teacherId: teacher.user.id,
  });
  const custom = await prisma.classroomGradingCategory.create({
    data: { classroomId: classroom.id, key: `${runId}-essay`, name: "Essays", weight: 0, displayOrder: 4 },
  });

  const assignment = await storage.createClassroomAssignment({
    classroomId: classroom.id,
    title: "Personal essay",
    description: "Write an essay",
    dueDate: "2026-09-20",
    points: 100,
    assignmentType: "assignment",
    categoryId: custom.id,
  });
  assert.equal(assignment.categoryId, custom.id);
  assert.equal(assignment.assignmentType, "assignment");

  const edited = await request(
    `/api/classrooms/${classroom.id}/assignments/${assignment.id}`,
    teacher.cookie,
    {
      method: "PATCH",
      body: {
        title: "Revised personal essay",
        description: assignment.description,
        dueDate: assignment.dueDate,
        points: assignment.points,
        assignmentType: assignment.assignmentType,
      },
    },
  );
  assert.equal(edited.status, 200);
  assert.equal(edited.body.categoryId, custom.id);

  const draft = await request(
    `/api/classrooms/${classroom.id}/assignment-draft`,
    teacher.cookie,
    {
      method: "PUT",
      body: {
        title: "Draft essay",
        description: "Draft",
        dueDate: "2026-09-21",
        points: 50,
        assignmentType: "project",
        categoryId: custom.id,
      },
    },
  );
  assert.equal(draft.status, 200);
  assert.equal(draft.body.categoryId, custom.id);
  assert.equal(draft.body.assignmentType, "assignment");
  const loadedDraft = await request(
    `/api/classrooms/${classroom.id}/assignment-draft`,
    teacher.cookie,
  );
  assert.equal(loadedDraft.body.categoryId, custom.id);

  const otherClassroom = await storage.createClassroom({
    name: `${runId}-other-category`,
    subject: "English",
    teacherId: teacher.user.id,
  });
  const foreignCategory = (await categories(otherClassroom.id))[0];
  await assert.rejects(
    storage.updateClassroomAssignment(assignment.id, { categoryId: foreignCategory.id }),
    /Category does not belong to this classroom/,
  );
});

test("category deletion requires valid same-classroom reassignment and synchronizes legacy type", async () => {
  const teacher = await createUser("teacher");
  const classroom = await storage.createClassroom({
    name: `${runId}-delete`,
    subject: "History",
    teacherId: teacher.user.id,
  });
  const baseline = await categories(classroom.id);
  const assignmentCategory = baseline.find((item) => item.key === "assignment")!;
  const testCategory = baseline.find((item) => item.key === "test")!;
  await prisma.classroomGradingCategory.update({
    where: { id: assignmentCategory.id },
    data: { weight: 5 },
  });
  const custom = await prisma.classroomGradingCategory.create({
    data: { classroomId: classroom.id, key: `${runId}-oral`, name: "Oral exams", weight: 20, displayOrder: 4 },
  });
  const assignment = await storage.createClassroomAssignment({
    classroomId: classroom.id,
    title: "Oral exam",
    description: "Present",
    dueDate: "2026-09-20",
    points: 100,
    assignmentType: "assignment",
    categoryId: custom.id,
  });
  const otherClassroom = await storage.createClassroom({
    name: `${runId}-delete-other`,
    subject: "History",
    teacherId: teacher.user.id,
  });
  const foreignTarget = (await categories(otherClassroom.id))[0];

  const missing = await request(
    `/api/classrooms/${classroom.id}/grading-categories/${custom.id}`,
    teacher.cookie,
    { method: "DELETE" },
  );
  assert.equal(missing.status, 400);
  const crossClassroom = await request(
    `/api/classrooms/${classroom.id}/grading-categories/${custom.id}`,
    teacher.cookie,
    { method: "DELETE", body: { reassignCategoryId: foreignTarget.id } },
  );
  assert.equal(crossClassroom.status, 400);

  const removed = await request(
    `/api/classrooms/${classroom.id}/grading-categories/${custom.id}`,
    teacher.cookie,
    { method: "DELETE", body: { reassignCategoryId: testCategory.id } },
  );
  assert.equal(removed.status, 200);
  const reassigned = await prisma.classroomAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
  assert.equal(reassigned.categoryId, testCategory.id);
  assert.equal(reassigned.assignmentType, "test");
  assert.equal((await categories(classroom.id)).reduce((sum, item) => sum + item.weight, 0), 100);
});

test("dynamic category breakdown and semester reports honor custom categories instead of the legacy projection", async () => {
  const teacher = await createUser("teacher");
  const { student } = await createStudent();
  const dynamicClassroom = await storage.createClassroom({
    name: `${runId}-dynamic`,
    subject: "Math",
    teacherId: teacher.user.id,
  });
  const legacyClassroom = await storage.createClassroom({
    name: `${runId}-legacy`,
    subject: "Math",
    teacherId: teacher.user.id,
  });
  await prisma.classroomEnrollment.createMany({
    data: [
      { classroomId: dynamicClassroom.id, studentId: student.id },
      { classroomId: legacyClassroom.id, studentId: student.id },
    ],
  });

  const dynamicCategories = await categories(dynamicClassroom.id);
  const assignmentCategory = dynamicCategories.find((item) => item.key === "assignment")!;
  const testCategory = dynamicCategories.find((item) => item.key === "test")!;
  await prisma.classroomGradingCategory.updateMany({
    where: { classroomId: dynamicClassroom.id },
    data: { weight: 0, active: false },
  });
  await prisma.classroomGradingCategory.update({
    where: { id: assignmentCategory.id },
    data: { weight: 30, active: true },
  });
  await prisma.classroomGradingCategory.update({
    where: { id: testCategory.id },
    data: { weight: 50, active: true },
  });
  const custom = await prisma.classroomGradingCategory.create({
    data: { classroomId: dynamicClassroom.id, key: `${runId}-custom`, name: "Custom work", weight: 20, displayOrder: 4 },
  });
  const dynamicSnapshot = buildCategorySnapshotPayload(
    await categories(dynamicClassroom.id),
  );
  await prisma.gradingPolicy.createMany({
    data: [
      {
        classroomId: dynamicClassroom.id,
        assignmentWeight: 50,
        testWeight: 50,
        quizWeight: 0,
        projectWeight: 0,
        categorySnapshot: dynamicSnapshot,
      },
      {
        classroomId: legacyClassroom.id,
        assignmentWeight: 50,
        testWeight: 50,
        quizWeight: 0,
        projectWeight: 0,
        categorySnapshot: {
          version: 1,
          legacy: true,
          categories: defaultCategorySnapshot({
            assignment: 50,
            test: 50,
            quiz: 0,
            project: 0,
          }),
        },
      },
    ],
  });

  const specs = [
    { title: "Assignment", type: "assignment", categoryId: assignmentCategory.id, grade: 100 },
    { title: "Custom", type: "assignment", categoryId: custom.id, grade: 20 },
    { title: "Test", type: "test", categoryId: testCategory.id, grade: 60 },
  ];
  for (const spec of specs) {
    const dynamicAssignment = await prisma.classroomAssignment.create({
      data: {
        classroomId: dynamicClassroom.id,
        title: spec.title,
        description: spec.title,
        dueDate: "2026-09-10",
        points: 100,
        assignmentType: spec.type,
        categoryId: spec.categoryId,
      },
    });
    const legacyAssignment = await prisma.classroomAssignment.create({
      data: {
        classroomId: legacyClassroom.id,
        title: spec.title,
        description: spec.title,
        dueDate: "2026-09-10",
        points: 100,
        assignmentType: spec.type,
      },
    });
    await prisma.classroomSubmission.createMany({
      data: [
        { assignmentId: dynamicAssignment.id, studentId: student.id, status: "graded", grade: spec.grade },
        { assignmentId: legacyAssignment.id, studentId: student.id, status: "graded", grade: spec.grade },
      ],
    });
  }
  await prisma.classroomGradingCategory.deleteMany({ where: { classroomId: legacyClassroom.id } });

  const dynamicBreakdown = await request(
    `/api/classrooms/${dynamicClassroom.id}/grade-breakdown/${student.id}`,
    teacher.cookie,
  );
  const legacyBreakdown = await request(
    `/api/classrooms/${legacyClassroom.id}/grade-breakdown/${student.id}`,
    teacher.cookie,
  );
  assert.equal(dynamicBreakdown.status, 200);
  assert.equal(legacyBreakdown.status, 200);
  const customBreakdown = dynamicBreakdown.body.breakdown.find(
    (row: any) => row.type === custom.key,
  );
  assert.deepEqual(
    {
      assignmentCount: customBreakdown.assignmentCount,
      configuredWeight: customBreakdown.configuredWeight,
      average: customBreakdown.average,
    },
    { assignmentCount: 1, configuredWeight: 20, average: 20 },
  );
  assert.equal(dynamicBreakdown.body.overall, 64);
  assert.equal(legacyBreakdown.body.overall, 60);
  assert.notEqual(dynamicBreakdown.body.overall, legacyBreakdown.body.overall);

  const report = await request(
    `/api/semester-report/preview?studentId=${student.id}&from=2026-09-01&to=2026-09-30`,
    teacher.cookie,
  );
  assert.equal(report.status, 200);
  const reportGrades = Object.fromEntries(
    report.body.classrooms.map((row: any) => [row.id, row.weightedGrade]),
  );
  assert.equal(reportGrades[dynamicClassroom.id], 64);
  assert.equal(reportGrades[legacyClassroom.id], 60);
  assert.notEqual(reportGrades[dynamicClassroom.id], reportGrades[legacyClassroom.id]);
});
