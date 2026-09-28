import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import cookieParser from "cookie-parser";
import prisma from "../db";
import { registerRoutes } from "../routes";
import { buildAssessmentReview, compatibleDraftAnswers } from "../../client/src/components/assessmentReviewModel";
import type { FormQuestion } from "../../shared/schema";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AssessmentReview from "../../client/src/components/AssessmentReview";

const runId = `review-${Date.now()}-${process.pid}`;
const userIds: number[] = [];
let server: ReturnType<ReturnType<typeof express>["listen"]>;
let baseUrl: string;

async function actor(role: "teacher" | "student" | "parent") {
  const user = await prisma.user.create({
    data: {
      name: `${runId}-${role}`,
      email: `${runId}-${role}-${userIds.length}@example.test`,
      role, roles: [role], teachingSubjects: [], interests: [],
    },
  });
  userIds.push(user.id);
  const id = `${runId}-${user.id}`;
  await prisma.authSession.create({
    data: { id, userId: user.id, expiresAt: new Date(Date.now() + 3600000) },
  });
  return { user, cookie: `lyra_session=${id}` };
}

async function get(path: string, cookie: string) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { cookie } });
  return { status: response.status, body: await response.json() };
}

async function patch(path: string, cookie: string, data: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(data),
  });
  return { status: response.status, body: await response.json() };
}

async function submit(classroomId: number, assignmentId: number, cookie: string, answers?: string, content = "", attachmentAction?: string, fileUrls?: string) {
  const form = new FormData();
  form.set("content", content);
  if (answers !== undefined) form.set("formAnswers", answers);
  if (attachmentAction !== undefined) form.set("attachmentAction", attachmentAction);
  if (fileUrls !== undefined) form.set("fileUrls", fileUrls);
  const response = await fetch(`${baseUrl}/api/classrooms/${classroomId}/assignments/${assignmentId}/submit`, {
    method: "POST", headers: { cookie }, body: form,
  });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  registerRoutes(app);
  await new Promise<void>((resolve) => { server = app.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  assert(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server.closeIdleConnections?.();
  server.closeAllConnections?.();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

const questions: FormQuestion[] = [
  { id: "short", label: "Explain briefly", type: "short", required: false, options: [] },
  { id: "long", label: "Explain fully", type: "paragraph", required: false, options: [] },
  { id: "choice", label: "Choose one", type: "multiple_choice", required: false, options: ["Alpha", "Beta"] },
  { id: "checks", label: "Choose several", type: "checkbox", required: false, options: ["One", "Two"] },
  { id: "boolean", label: "True or false?", type: "true_false", required: false, options: [] },
];

test("review preserves prompt/answer pairing and blocks other roles and classrooms", async () => {
  const teacher = await actor("teacher");
  const otherTeacher = await actor("teacher");
  const learner = await actor("student");
  const otherLearner = await actor("student");
  const parent = await actor("parent");
  const student = await prisma.student.create({ data: { userId: learner.user.id, name: "Learner", gradeLevel: "8", badges: [] } });
  const stranger = await prisma.student.create({ data: { userId: otherLearner.user.id, name: "Stranger", gradeLevel: "8", badges: [] } });
  const classroom = await prisma.classroom.create({ data: { name: "Review", subject: "Math", teacherId: teacher.user.id } });
  const otherClassroom = await prisma.classroom.create({ data: { name: "Other", subject: "Math", teacherId: otherTeacher.user.id } });
  await prisma.classroomEnrollment.create({ data: { classroomId: classroom.id, studentId: student.id } });
  await prisma.childTeamMember.create({ data: { childId: student.id, parentId: parent.user.id, status: "active", role: "owner" } });
  const assignment = await prisma.classroomAssignment.create({
    data: {
      classroomId: classroom.id, title: "Review quiz", description: "", dueDate: "2099-01-01",
      points: 100, formSchema: questions, answerKey: { choice: "Alpha" },
    },
  });
  const list = `/api/classrooms/${classroom.id}/assignments`;
  const detail = `${list}/slug/${assignment.id}`;
  assert.equal((await get(list, learner.cookie)).body[0].answerKey, undefined);
  assert.equal((await get(detail, parent.cookie)).body.answerKey, undefined);
  assert.deepEqual((await get(detail, teacher.cookie)).body.answerKey, { choice: "Alpha" });
  assert.equal((await get(list, otherLearner.cookie)).status, 403);
  assert.equal((await get(`${list}/${assignment.id}/submissions`, learner.cookie)).status, 403);
  assert.equal((await get(`${list}/${assignment.id}/submissions`, otherTeacher.cookie)).status, 403);
  assert.equal((await get(`/api/classrooms/${otherClassroom.id}/assignments/${assignment.id}/submissions`, otherTeacher.cookie)).status, 404);

  assert.equal((await submit(classroom.id, assignment.id, otherLearner.cookie, "{}")).status, 403);
  assert.equal((await submit(classroom.id, assignment.id, learner.cookie, "{bad")).status, 422);
  assert.equal((await submit(classroom.id, assignment.id, learner.cookie, '{"unknown":"X"}')).status, 422);
  assert.equal((await submit(classroom.id, assignment.id, learner.cookie, '{"checks":"One"}')).status, 422);
  const unanswered = await submit(classroom.id, assignment.id, learner.cookie);
  assert.equal(unanswered.status, 200);
  assert.deepEqual(unanswered.body.questionSnapshot, questions);
  assert.equal(unanswered.body.formAnswers, null);
  assert.equal(buildAssessmentReview(unanswered.body.questionSnapshot, questions, unanswered.body.formAnswers).items.length, 5);
  assert.equal((await submit(classroom.id, assignment.id, learner.cookie, "{}")).status, 409);
  assert.equal((await patch(`/api/classrooms/${classroom.id}/submissions/${unanswered.body.id}/return`, teacher.cookie, { returnNote: "Try again" })).status, 200);
  const answers = { short: "Brief", long: "Line 1\nLine 2", choice: "Beta", checks: ["One", "Two"], boolean: "False" };
  const response = await submit(classroom.id, assignment.id, learner.cookie, JSON.stringify(answers), "Extra text");
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.grade, null); // auto-score is private before teacher review
  assert.equal((await submit(classroom.id, assignment.id, learner.cookie, "{}")).status, 409);
  const breakdownBefore = await get(`/api/classrooms/${classroom.id}/grade-breakdown/${student.id}`, learner.cookie);
  assert.equal(breakdownBefore.status, 200);
  assert.doesNotMatch(JSON.stringify(breakdownBefore.body), /"average":[0-9]/);
  const submissionId = response.body.id;
  const teacherPath = `/api/classrooms/${classroom.id}/submissions/${submissionId}`;
  const review = await get(teacherPath, teacher.cookie);
  assert.equal(review.status, 200);
  assert.deepEqual(review.body.questionSnapshot, questions);
  assert.deepEqual(review.body.formAnswers, answers);
  assert.equal(review.body.content, "Extra text");
  assert.equal((await get(teacherPath, otherTeacher.cookie)).status, 403);
  assert.equal((await get(teacherPath, parent.cookie)).status, 403);
  assert.equal((await get(`/api/classrooms/${otherClassroom.id}/submissions/${submissionId}`, otherTeacher.cookie)).status, 404);
  assert.equal((await get(`/api/classrooms/${classroom.id}/my-submissions?studentId=${stranger.id}`, parent.cookie)).status, 403);
  assert.equal((await get(`/api/classrooms/${classroom.id}/my-submissions`, otherLearner.cookie)).status, 403);
  assert.equal((await patch(`${teacherPath}/return`, otherTeacher.cookie, { returnNote: "Revise" })).status, 403);
  assert.equal((await patch(`/api/classrooms/${otherClassroom.id}/submissions/${submissionId}/grade`, otherTeacher.cookie, { grade: 75 })).status, 404);

  const changed = [{ ...questions[2], label: "Edited prompt", options: ["Gamma"] }];
  await prisma.classroomAssignment.update({ where: { id: assignment.id }, data: { formSchema: changed } });
  const afterEdit = await get(teacherPath, teacher.cookie);
  const mapped = buildAssessmentReview(afterEdit.body.questionSnapshot, changed, afterEdit.body.formAnswers);
  assert.equal(mapped.items[2].question?.label, "Choose one");
  assert.deepEqual(mapped.items[2].question?.options, ["Alpha", "Beta"]);
  assert.equal(mapped.items[2].answer, "Beta");
  assert.equal(mapped.warning, null);

  assert.equal((await patch(`${teacherPath}/return`, teacher.cookie, { returnNote: "Please revise" })).status, 200);
  const partial = await submit(classroom.id, assignment.id, learner.cookie, JSON.stringify({ choice: "Gamma" }));
  assert.equal(partial.status, 200);
  assert.deepEqual(partial.body.questionSnapshot, changed);
  assert.equal(partial.body.formAnswers.choice, "Gamma");
  const studentRead = await get(`/api/classrooms/${classroom.id}/my-submissions`, learner.cookie);
  const parentRead = await get(`/api/classrooms/${classroom.id}/my-submissions?studentId=${student.id}`, parent.cookie);
  for (const result of [studentRead, parentRead]) {
    assert.equal(result.status, 200);
    assert.equal(result.body[0].grade, null);
    assert.deepEqual(result.body[0].questionSnapshot, changed);
    assert.deepEqual(result.body[0].formAnswers, { choice: "Gamma" });
  }
  assert.equal((await patch(`${teacherPath}/grade`, teacher.cookie, { grade: 75, feedback: "Reviewed" })).status, 200);
  assert.equal((await get(`/api/classrooms/${classroom.id}/my-submissions`, learner.cookie)).body[0].grade, 75);
  assert.equal((await submit(classroom.id, assignment.id, learner.cookie, "{}")).status, 409);
  const breakdownAfter = await get(`/api/classrooms/${classroom.id}/grade-breakdown/${student.id}`, learner.cookie);
  assert.match(JSON.stringify(breakdownAfter.body), /"average":75/);
});

test("legacy, missing, and malformed response shapes never shift answers to another question", () => {
  const legacy = buildAssessmentReview(null, questions, { choice: "Beta", deleted: "Old answer" });
  assert.equal(legacy.items[2].answer, "Beta");
  assert.equal(legacy.items[5].question, null);
  assert.equal(legacy.items[5].answer, "Old answer");
  assert.match(legacy.warning!, /Original questions were not saved/);
  assert.match(legacy.warning!, /no matching saved question/);
  const empty = buildAssessmentReview(questions, questions, null);
  assert.equal(empty.items.length, 5);
  assert.equal(empty.items[0].answer, undefined);
  assert.equal(empty.warning, null);
  const malformed = buildAssessmentReview(questions, questions, { short: { text: "unsupported" }, boolean: "True" });
  assert.equal(malformed.items[0].answer, undefined);
  assert.equal(malformed.items[4].answer, "True");
  assert.match(malformed.warning!, /unsupported format/);
  const missingSchema = buildAssessmentReview(null, null, { orphan: ["One", "Two"] });
  assert.equal(missingSchema.items.length, 1);
  assert.equal(missingSchema.items[0].question, null);
  assert.deepEqual(missingSchema.items[0].answer, ["One", "Two"]);
  const duplicateIds = buildAssessmentReview(null, [questions[0], { ...questions[0], label: "Different" }], { short: "Stored" });
  assert.equal(duplicateIds.items.length, 1);
  assert.equal(duplicateIds.items[0].question, null);
  assert.equal(duplicateIds.items[0].answer, "Stored");
});

test("review renders paired questions, partial responses and unavailable originals", () => {
  const rendered = renderToStaticMarkup(React.createElement(AssessmentReview, {
    submission: {
      status: "returned",
      questionSnapshot: questions,
      formAnswers: { choice: "Beta", checks: ["One", "Two"], boolean: "False" },
    },
    currentQuestions: [{ ...questions[2], label: "Changed after submission" }],
  }));
  assert.match(rendered, /Choose one/);
  assert.doesNotMatch(rendered, /Changed after submission/);
  assert.match(rendered, /Student response/);
  assert.match(rendered, /No response to this question/);
  assert.match(rendered, /One, Two/);
  assert.match(rendered, /True or false\?/);
  const orphan = renderToStaticMarkup(React.createElement(AssessmentReview, {
    submission: { status: "graded", questionSnapshot: null, formAnswers: { removed: "Retained" } },
    currentQuestions: [],
  }));
  assert.match(orphan, /Original question unavailable/);
  assert.match(orphan, /Retained/);
  assert.match(orphan, /Original questions were not saved/);
});

test("returned drafts discard answers to removed questions and obsolete choices", () => {
  const current = [{ ...questions[2], options: ["Gamma"] }, questions[3]];
  const stale = { short: "Old prompt", choice: "Beta", checks: ["One", "Removed"], unknown: "orphan" };
  assert.deepEqual(compatibleDraftAnswers(current, stale), { checks: ["One"] });
  assert.deepEqual(compatibleDraftAnswers(current, "invalid"), {});
});

test("returned work can keep, replace or remove attachments without changing answer snapshots or access rules", async () => {
  const teacher = await actor("teacher");
  const learner = await actor("student");
  const outsider = await actor("student");
  const student = await prisma.student.create({ data: { userId: learner.user.id, name: "Attachments learner", gradeLevel: "8", badges: [] } });
  const classroom = await prisma.classroom.create({ data: { name: "Attachment revisions", subject: "Math", teacherId: teacher.user.id } });
  await prisma.classroomEnrollment.create({ data: { classroomId: classroom.id, studentId: student.id } });
  const assignment = await prisma.classroomAssignment.create({
    data: { classroomId: classroom.id, title: "Revisions", description: "", dueDate: "2099-01-01", points: 10, formSchema: questions },
  });
  const oldFiles = JSON.stringify(["https://res.cloudinary.com/demo/old.pdf"]);
  const newFiles = JSON.stringify(["https://res.cloudinary.com/demo/new.pdf"]);
  const answers = JSON.stringify({ short: "Revised" });
  const initial = await submit(classroom.id, assignment.id, learner.cookie, answers, "Original", undefined, oldFiles);
  assert.equal(initial.status, 200, JSON.stringify(initial.body));
  const path = `/api/classrooms/${classroom.id}/submissions/${initial.body.id}`;
  assert.equal((await submit(classroom.id, assignment.id, learner.cookie, answers, "", "remove")).status, 400);
  assert.equal((await patch(`${path}/return`, teacher.cookie, { returnNote: "Try again" })).status, 200);
  assert.equal((await submit(classroom.id, assignment.id, outsider.cookie, answers, "", "remove")).status, 403);
  assert.equal((await submit(classroom.id, assignment.id, teacher.cookie, answers, "", "remove")).status, 403);
  assert.equal((await submit(classroom.id, assignment.id, learner.cookie, answers, "", "replace")).status, 400);
  assert.equal((await submit(classroom.id, assignment.id, learner.cookie, answers, "", "remove", newFiles)).status, 400);
  const kept = await submit(classroom.id, assignment.id, learner.cookie, answers, "Kept", "keep");
  assert.equal(kept.status, 200, JSON.stringify(kept.body));
  assert.equal(kept.body.fileUrl, oldFiles);
  assert.deepEqual(kept.body.questionSnapshot, questions);
  assert.deepEqual(kept.body.formAnswers, { short: "Revised" });
  assert.equal(kept.body.grade, null);

  assert.equal((await patch(`${path}/return`, teacher.cookie, { returnNote: "Replace" })).status, 200);
  const replaced = await submit(classroom.id, assignment.id, learner.cookie, answers, "Replaced", "replace", newFiles);
  assert.equal(replaced.status, 200, JSON.stringify(replaced.body));
  assert.equal(replaced.body.fileUrl, newFiles);
  assert.deepEqual(replaced.body.questionSnapshot, questions);
  assert.deepEqual(replaced.body.formAnswers, { short: "Revised" });

  assert.equal((await patch(`${path}/return`, teacher.cookie, { returnNote: "Remove" })).status, 200);
  const removed = await submit(classroom.id, assignment.id, learner.cookie, answers, "Removed", "remove");
  assert.equal(removed.status, 200, JSON.stringify(removed.body));
  assert.equal(removed.body.fileUrl, null);
  assert.deepEqual(removed.body.questionSnapshot, questions);
  assert.deepEqual(removed.body.formAnswers, { short: "Revised" });
  assert.equal(removed.body.grade, null);
  assert.equal((await get(path, teacher.cookie)).body.fileUrl, null);
});