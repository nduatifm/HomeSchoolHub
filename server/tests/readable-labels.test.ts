import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import prisma from "../db";
import { storage } from "../storage";
import {
  findSelectedLabel,
  SelectContent,
  SelectItem,
} from "../../client/src/components/ui/select";

const runId = `readable-labels-${Date.now()}-${process.pid}`;
let teacherId = 0;
let classroomId = 0;
let otherClassroomId = 0;
let assignmentId = 0;
let materialId = 0;

before(async () => {
  const teacher = await prisma.user.create({
    data: {
      name: `${runId} Teacher`,
      email: `${runId}@example.test`,
      role: "teacher",
      roles: ["teacher"],
      teachingSubjects: [],
      interests: [],
    },
  });
  teacherId = teacher.id;
  const classrooms = await Promise.all([
    prisma.classroom.create({
      data: {
        name: `${runId} Classroom`,
        subject: "English",
        description: null,
        teacherId,
      },
    }),
    prisma.classroom.create({
      data: {
        name: `${runId} Other classroom`,
        subject: "Math",
        description: null,
        teacherId,
      },
    }),
  ]);
  classroomId = classrooms[0].id;
  otherClassroomId = classrooms[1].id;
  const assignment = await prisma.classroomAssignment.create({
    data: {
      classroomId,
      title: "Readable assignment",
      description: "",
      dueDate: "2026-09-30",
      points: 25,
      assignmentType: "assignment",
      categoryId: null,
      slug: "readable-assignment",
    },
  });
  assignmentId = assignment.id;
  const material = await prisma.classroomMaterial.create({
    data: {
      classroomId,
      title: "Readable classwork",
      description: "",
      slug: "readable-classwork",
      attachments: [],
    },
  });
  materialId = material.id;
});

after(async () => {
  if (teacherId) {
    await prisma.user.delete({ where: { id: teacherId } });
  }
  await prisma.$disconnect();
});

test("controlled Select values resolve labels before the menu is opened", () => {
  const children = React.createElement(
    SelectContent,
    null,
    React.createElement(SelectItem, {
      value: "42",
      textValue: "Ada Student",
      children: React.createElement("span", null, "Ada Student"),
    }),
    React.createElement(SelectItem, { value: "84", children: "Ada Student" }),
  );

  assert.equal(findSelectedLabel(children, "42"), "Ada Student");
  assert.equal(findSelectedLabel(children, "84"), "Ada Student");
  assert.equal(findSelectedLabel(children, "999"), "");
  assert.equal(findSelectedLabel(null, "42"), "");
});

test("assignment and material responses preserve IDs and add readable relations", async () => {
  await storage.setAssignmentMaterials(assignmentId, [materialId]);

  const assignment = await storage.getClassroomAssignmentById(classroomId, assignmentId);
  assert(assignment);
  assert.equal(assignment.categoryId, null);
  assert.equal(assignment.category, null);
  assert.deepEqual(assignment.linkedMaterialIds, [materialId]);
  assert.deepEqual(assignment.linkedMaterials, [
    { id: materialId, title: "Readable classwork", slug: "readable-classwork" },
  ]);

  const [fromList] = await storage.getClassroomMaterials(classroomId);
  const fromId = await storage.getClassroomMaterialById(classroomId, materialId);
  const fromSlug = await storage.getClassroomMaterialBySlug(classroomId, "readable-classwork");
  assert(fromId);
  assert(fromSlug);
  assert.deepEqual(fromList, fromId);
  assert.deepEqual(fromSlug, fromId);
  assert.deepEqual(fromId.linkedAssignmentIds, [assignmentId]);
  assert.equal(fromId.linkedAssignments?.[0]?.title, "Readable assignment");
  assert.equal(fromId.linkedAssignments?.[0]?.category, null);
});

test("cross-classroom links are rejected without deleting valid links", async () => {
  const foreignMaterial = await prisma.classroomMaterial.create({
    data: {
      classroomId: otherClassroomId,
      title: "Foreign classwork",
      description: "",
      attachments: [],
    },
  });

  await assert.rejects(
    storage.setAssignmentMaterials(assignmentId, [foreignMaterial.id]),
    /same classroom/,
  );
  const assignment = await storage.getClassroomAssignmentById(classroomId, assignmentId);
  assert.deepEqual(assignment?.linkedMaterialIds, [materialId]);

  const foreignAssignment = await prisma.classroomAssignment.create({
    data: {
      classroomId: otherClassroomId,
      title: "Foreign assignment",
      description: "",
      dueDate: "2026-09-30",
      points: 10,
      assignmentType: "assignment",
    },
  });
  await prisma.classroomAssignmentMaterial.create({
    data: { assignmentId: foreignAssignment.id, materialId },
  });
  await prisma.classroomAssignmentMaterial.create({
    data: { assignmentId, materialId: foreignMaterial.id },
  });

  const safeAssignment = await storage.getClassroomAssignmentById(classroomId, assignmentId);
  const safeMaterial = await storage.getClassroomMaterialById(classroomId, materialId);
  assert.deepEqual(safeAssignment?.linkedMaterialIds, [materialId]);
  assert.deepEqual(safeMaterial?.linkedAssignmentIds, [assignmentId]);
});

test("session and submission records include compact display labels", async () => {
  const studentUser = await prisma.user.create({
    data: {
      name: `${runId} Student user`,
      email: `${runId}-student@example.test`,
      role: "student",
      roles: ["student"],
      teachingSubjects: [],
      interests: [],
    },
  });
  const student = await prisma.student.create({
    data: {
      userId: studentUser.id,
      name: "Readable Student",
      gradeLevel: "Grade 8",
      badges: [],
    },
  });
  await prisma.classroomEnrollment.create({ data: { classroomId, studentId: student.id } });
  const submission = await prisma.classroomSubmission.create({
    data: {
      assignmentId,
      studentId: student.id,
      status: "submitted",
    },
  });
  const session = await storage.createSession({
    teacher: { connect: { id: teacherId } },
    studentIds: [student.id],
    subject: "English",
    sessionDate: "2026-09-20",
    startTime: "10:00",
    endTime: "11:00",
    status: "scheduled",
  });

  const loadedSession = await storage.getSessionById(session.id);
  assert.equal(loadedSession?.teacherName, `${runId} Teacher`);

  const loadedSubmission = await storage.getClassroomSubmissionById(submission.id);
  assert.equal(loadedSubmission?.student?.name, "Readable Student");
  assert.equal(loadedSubmission?.assignmentSummary?.title, "Readable assignment");
  assert.equal(loadedSubmission?.assignmentSummary?.category, null);

  await prisma.user.delete({ where: { id: studentUser.id } });
});