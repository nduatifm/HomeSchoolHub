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
import TeacherAssessmentReview from "../../client/src/components/TeacherAssessmentReview";
import { buildTeacherAssessmentReview } from "../../client/src/components/teacherAssessmentReviewModel";
import { reconcileAnswerKey, editQuestionOption } from "../../shared/answerKey";
import { storage } from "../storage";

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

test("option deletion and renaming purge stale keys without changing other question keys", () => {
  const original = { choice: "Alpha", checks: ["One", "Two"], short: "Brief", boolean: "True" };
  const deleted = editQuestionOption(questions, original, "choice", 0);
  assert.deepEqual(deleted.questions[2].options, ["Beta"]);
  assert.deepEqual(deleted.answerKey, { checks: ["One", "Two"], short: "Brief", boolean: "True" });
  assert.equal(editQuestionOption(questions, original, "choice", 1).answerKey.choice, "Alpha");
  assert.deepEqual(editQuestionOption(questions, original, "checks", 0).answerKey.checks, ["Two"]);
  assert.equal(editQuestionOption(questions, { checks: ["One"] }, "checks", 0).answerKey.checks, undefined);
  for (const empty of ["", "   "]) {
    assert.equal(editQuestionOption(questions, original, "choice", 0, empty).answerKey.choice, undefined);
  }
  assert.equal(editQuestionOption(questions, original, "choice", 0, "Gamma").answerKey.choice, "Gamma");
  assert.deepEqual(editQuestionOption(questions, original, "checks", 0, "Three").answerKey.checks, ["Three", "Two"]);
  for (const ambiguous of ["Beta", " beta "]) {
    assert.equal(editQuestionOption(questions, original, "choice", 0, ambiguous).answerKey.choice, undefined);
  }
  const duplicate = questions.map((q) => q.id === "choice" ? { ...q, options: ["Alpha", "Alpha", "Beta"] } : q);
  assert.equal(editQuestionOption(duplicate, original, "choice", 0).answerKey.choice, undefined);
  assert.deepEqual(reconcileAnswerKey(questions, { choice: ["Alpha"], checks: "One", short: "", boolean: "True" }),
    { choice: "Alpha", checks: ["One"], short: "", boolean: "True" });
  for (const value of [null, "", " ", [], ["Alpha", "Beta"], ["Missing"]]) {
    assert.equal(reconcileAnswerKey(questions, { choice: value }).choice, undefined);
  }
  assert.deepEqual(reconcileAnswerKey(questions, { checks: ["One", "Missing", "", "One", null], removed: "Old" }), { checks: ["One"] });
  assert.deepEqual(reconcileAnswerKey(duplicate, original).choice, undefined);
  assert.deepEqual(reconcileAnswerKey([], original), {});
  assert.deepEqual(original, { choice: "Alpha", checks: ["One", "Two"], short: "Brief", boolean: "True" });
});

test("edit drafts cannot copy or expose another classroom's assignment answer key", async () => {
  const owner = await actor("teacher");
  const other = await actor("teacher");
  const ownClass = await prisma.classroom.create({ data: { name: "Own classroom", subject: "Math", teacherId: owner.user.id } });
  const foreignClass = await prisma.classroom.create({ data: { name: "Foreign classroom", subject: "Math", teacherId: other.user.id } });
  const assignment = await prisma.classroomAssignment.create({ data: {
    classroomId: foreignClass.id, title: "Foreign assignment", description: "", dueDate: "2099-01-01", points: 100,
    formSchema: questions, answerKey: { choice: "Alpha" },
  } });
  const path = `/api/classrooms/${ownClass.id}/assignment-draft/${assignment.id}`;
  for (const data of [{ title: "Partial draft" }, { formSchema: questions }, { answerKey: { choice: "Beta" } }]) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "PUT", headers: { cookie: owner.cookie, "content-type": "application/json" }, body: JSON.stringify(data),
    });
    const body = await response.json();
    assert.equal(response.status, 404);
    assert.deepEqual(body, { error: "Assignment not found" });
  }
  assert.equal((await get(path, owner.cookie)).status, 404);
  assert.equal((await fetch(`${baseUrl}${path}`, { method: "DELETE", headers: { cookie: owner.cookie } })).status, 404);
  await assert.rejects(storage.upsertAssignmentDraft(owner.user.id, ownClass.id, assignment.id, { title: "Direct partial" }), /Assignment not found/);
  await assert.rejects(storage.upsertAssignmentDraft(owner.user.id, foreignClass.id, assignment.id, { title: "Wrong owner" }), /Assignment not found/);
  assert.equal(await prisma.assignmentDraft.count({ where: { assignmentId: assignment.id } }), 0);
  assert.deepEqual((await prisma.classroomAssignment.findUniqueOrThrow({ where: { id: assignment.id } })).answerKey, { choice: "Alpha" });
});

test("choice key removals persist through partial API updates, draft saves, and reopening without changing submissions", async () => {
  const teacher = await actor("teacher");
  const learner = await actor("student");
  const student = await prisma.student.create({ data: { userId: learner.user.id, name: "Key learner", gradeLevel: "8", badges: [] } });
  const classroom = await prisma.classroom.create({ data: { name: "Key cleanup", subject: "Math", teacherId: teacher.user.id } });
  await prisma.classroomEnrollment.create({ data: { classroomId: classroom.id, studentId: student.id } });
  const list = `/api/classrooms/${classroom.id}/assignments`;
  const response = await fetch(`${baseUrl}${list}`, {
    method: "POST", headers: { cookie: teacher.cookie, "content-type": "application/json" },
    body: JSON.stringify({ title: "Keys", description: "", dueDate: "2099-01-01", points: 100, formSchema: questions, answerKey: { choice: "", checks: ["One", "Missing"], short: "Brief" } }),
  });
  const assignment = await response.json();
  assert.equal(response.status, 201, JSON.stringify(assignment));
  assert.deepEqual(assignment.answerKey, { checks: ["One"], short: "Brief" });
  const path = `${list}/${assignment.id}`;
  const detail = `${list}/slug/${assignment.id}`;
  const saved = await prisma.classroomSubmission.update({
    where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
    data: { status: "graded", grade: 75, questionSnapshot: questions, formAnswers: { choice: "Alpha" } },
  });
  assert.equal((await patch(path, teacher.cookie, { answerKey: { choice: ["Alpha"], checks: ["One", "Two"], short: "Brief" } })).status, 200);
  assert.equal((await patch(path, teacher.cookie, { title: "Renamed" })).status, 200);
  assert.deepEqual((await get(detail, teacher.cookie)).body.answerKey, { choice: "Alpha", checks: ["One", "Two"], short: "Brief" });
  const changed = questions.map((q) => q.id === "choice" ? { ...q, options: ["Beta"] } : q.id === "checks" ? { ...q, options: ["Two"] } : q);
  const schemaOnly = await patch(path, teacher.cookie, { formSchema: changed });
  assert.equal(schemaOnly.status, 200, JSON.stringify(schemaOnly.body));
  assert.deepEqual((await get(detail, teacher.cookie)).body.answerKey, { checks: ["Two"], short: "Brief" });
  const stale = await patch(path, teacher.cookie, { answerKey: { choice: "Alpha", checks: ["One"], short: "Brief" } });
  assert.equal(stale.status, 200);
  assert.deepEqual(stale.body.answerKey, { short: "Brief" });
  assert.equal((await patch(path, teacher.cookie, { answerKey: null })).status, 200);
  assert.deepEqual((await get(detail, teacher.cookie)).body.answerKey, {});
  assert.equal((await patch(path, teacher.cookie, { answerKey: { choice: "Beta" } })).status, 200);
  assert.equal((await patch(path, teacher.cookie, { answerKey: {} })).status, 200);
  assert.deepEqual((await get(detail, teacher.cookie)).body.answerKey, {});
  assert.equal((await patch(path, teacher.cookie, { answerKey: { choice: "Beta" } })).status, 200);
  const draftPath = `/api/classrooms/${classroom.id}/assignment-draft/${assignment.id}`;
  async function putDraft(data: unknown, target = draftPath) {
    const res = await fetch(`${baseUrl}${target}`, { method: "PUT", headers: { cookie: teacher.cookie, "content-type": "application/json" }, body: JSON.stringify(data) });
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    return body;
  }
  // A partial initial draft retains published choices and keys.
  await putDraft({ title: "Draft title" });
  assert.deepEqual((await get(draftPath, teacher.cookie)).body.answerKey, { choice: "Beta" });
  await putDraft({ formSchema: changed, answerKey: { choice: "Alpha", checks: ["Two", "One"] } });
  assert.deepEqual((await get(draftPath, teacher.cookie)).body.answerKey, { checks: ["Two"] });
  await putDraft({ answerKey: null });
  assert.deepEqual((await get(draftPath, teacher.cookie)).body.answerKey, {});
  await putDraft({ answerKey: { choice: "Beta" } });
  await putDraft({ formSchema: changed.filter((q) => q.id !== "choice") });
  assert.deepEqual((await get(draftPath, teacher.cookie)).body.answerKey, {});
  await putDraft({ formSchema: null });
  const clearedDraft = (await get(draftPath, teacher.cookie)).body;
  assert.equal(clearedDraft.formSchema, null);
  assert.deepEqual(clearedDraft.answerKey, {});
  assert.deepEqual(reconcileAnswerKey(clearedDraft.formSchema, clearedDraft.answerKey), {});
  const newDraft = `/api/classrooms/${classroom.id}/assignment-draft`;
  await putDraft({ formSchema: questions, answerKey: { choice: "", checks: ["One", "Missing"] } }, newDraft);
  assert.deepEqual((await get(newDraft, teacher.cookie)).body.answerKey, { checks: ["One"] });
  await putDraft({ formSchema: questions.map((q) => q.id === "checks" ? { ...q, options: ["Two"] } : q) }, newDraft);
  assert.deepEqual((await get(newDraft, teacher.cookie)).body.answerKey, {});
  assert.equal((await patch(path, teacher.cookie, { formSchema: null })).status, 200);
  const clearedAssignment = (await get(detail, teacher.cookie)).body;
  assert.equal(clearedAssignment.formSchema, null);
  assert.deepEqual(clearedAssignment.answerKey, {});
  assert.deepEqual(await prisma.classroomSubmission.findUniqueOrThrow({ where: { id: saved.id } }), saved);
  assert.equal((await get(detail, learner.cookie)).body.answerKey, undefined);
  const form = new FormData();
  form.set("title", "Multipart keys");
  form.set("description", "");
  form.set("dueDate", "2099-01-01");
  form.set("points", "100");
  form.set("formSchema", JSON.stringify(questions));
  form.set("answerKey", JSON.stringify({ choice: "Missing", checks: ["One", "Missing"] }));
  const multipart = await fetch(`${baseUrl}${list}/with-file`, { method: "POST", headers: { cookie: teacher.cookie }, body: form });
  const multipartAssignment = await multipart.json();
  assert.equal(multipart.status, 201, JSON.stringify(multipartAssignment));
  assert.deepEqual(multipartAssignment.answerKey, { checks: ["One"] });
});

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
  assert.deepEqual(review.body.assignment.answerKey, { choice: "Alpha" });
  const teacherCheck = buildTeacherAssessmentReview(review.body.questionSnapshot, review.body.assignment.formSchema, review.body.formAnswers, review.body.assignment.answerKey, review.body.status);
  assert.equal(teacherCheck.items[2].status, "Incorrect / needs correction");
  assert.deepEqual(teacherCheck.items[2].expected, ["Alpha"]);
  const beforeDisplay = await prisma.classroomSubmission.findUniqueOrThrow({ where: { id: review.body.id } });
  renderToStaticMarkup(React.createElement(TeacherAssessmentReview, { submission: review.body, currentQuestions: review.body.assignment.formSchema, answerKey: review.body.assignment.answerKey }));
  assert.deepEqual(await prisma.classroomSubmission.findUniqueOrThrow({ where: { id: review.body.id } }), beforeDisplay);
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
    assert.doesNotMatch(JSON.stringify(result.body), /"answerKey"|"correctness"|"accuracy"|"autoGrade"/);
  }
  assert.equal((await patch(`${teacherPath}/grade`, teacher.cookie, { grade: 75, feedback: "Reviewed" })).status, 200);
  assert.equal((await get(`/api/classrooms/${classroom.id}/my-submissions`, learner.cookie)).body[0].grade, 75);
  assert.equal((await submit(classroom.id, assignment.id, learner.cookie, "{}")).status, 409);
  const breakdownAfter = await get(`/api/classrooms/${classroom.id}/grade-breakdown/${student.id}`, learner.cookie);
  assert.match(JSON.stringify(breakdownAfter.body), /"average":75/);
});

const reviewKeys = { short: "Brief", long: "Essay", choice: "Alpha", checks: ["One", "Two"], boolean: "True" };
const teacherReview = (snapshot: unknown, current: unknown = questions, answers: unknown = {}, keys: unknown = reviewKeys, status = "submitted") =>
  buildTeacherAssessmentReview(snapshot, current, answers, keys, status);

test("teacher comparison normalizes supported answers, counts keyed blanks, and never grades paragraphs", () => {
  const result = teacherReview(questions, [...questions].reverse(), {
    short: "  bRiEf ", long: "Essay", choice: "Beta", checks: [" two ", "ONE"], boolean: null,
  });
  assert.deepEqual(result.items.map((i) => i.status), ["Correct", "Needs manual review", "Incorrect / needs correction", "Correct", "No response"]);
  assert.equal(result.eligible, 4);
  assert.equal(result.correct, 2);
  assert.equal(result.accuracy, 50);
  assert.equal(result.manual, 1);
  assert.equal(result.unanswered, 1);
  assert.deepEqual(result.items[2].expected, ["Alpha"]);
  const optionsReordered = questions.map((q) => ({ ...q, options: [...q.options].reverse() }));
  assert.equal(teacherReview(questions, optionsReordered, { choice: "Alpha" }).items[2].status, "Correct");
  const defaults = questions.map(({ required, options, ...q }) => q.type === "short" || q.type === "paragraph" || q.type === "true_false" ? q : { ...q, options });
  assert.equal(teacherReview(defaults, questions, { short: "Brief" }).items[0].status, "Correct");
});

test("teacher historical identity handles missing, empty, malformed, duplicate and unsupported snapshots locally", () => {
  for (const snapshot of [null, undefined, [], {}, "unknown"]) {
    const result = teacherReview(snapshot, questions, { choice: "Alpha", removed: "Old" });
    assert.equal(result.eligible, 0);
    assert.equal(result.accuracy, null);
    assert.ok(result.items.every((i) => i.status === "Needs manual review"));
    assert.match(result.warning!, /unverified/);
    assert.equal(result.items.at(-1)?.answer, "Old");
  }
  for (const bad of [
    { ...questions[1], type: "unsupported" },
    { ...questions[1], id: "" },
    { ...questions[1], id: "  " },
    { ...questions[1], options: 42 },
    null,
  ]) {
    const result = teacherReview([questions[0], bad], questions, { short: "Brief", long: { text: "Retained" } });
    assert.equal(result.items[0].status, "Correct");
    assert.equal(result.items[1].status, "Needs manual review");
    assert.deepEqual(result.items.at(-1)?.answer, { text: "Retained" });
  }
  for (const [snapshot, current] of [
    [[questions[0], questions[0]], questions],
    [questions, [...questions, questions[0]]],
    [questions, questions.slice(1)],
    [questions, questions.map((q) => q.id === "short" ? { ...q, label: "Edited" } : q)],
    [questions, questions.map((q) => q.id === "short" ? { ...q, type: "paragraph" } : q)],
    [questions, questions.map((q) => q.id === "choice" ? { ...q, options: ["New"] } : q)],
  ] as [unknown, unknown][]) {
    const result = teacherReview(snapshot, current, { short: "Brief", choice: "Alpha" });
    const changedId = Array.isArray(current) && current.some((q) => q.id === "choice" && q.options[0] === "New") ? "choice" : "short";
    assert.equal(result.items.find((i) => i.id === changedId)?.status, "Needs manual review");
  }
  assert.equal(teacherReview(questions, questions, { short: "Brief" }, { ...reviewKeys, short: "Changed key" }).items[0].status, "Incorrect / needs correction");
});

test("teacher eligibility distinguishes absent answers from invalid keys and corrupted answers", () => {
  for (const value of [undefined, null, "", "  ", [], [" "]]) {
    const result = teacherReview(questions, questions, { short: value });
    assert.equal(result.items[0].status, "No response");
    assert.equal(result.items[0].eligible, true);
  }
  for (const value of [42, true, {}, ["Brief", "Extra"], [null]]) {
    const item = teacherReview(questions, questions, { short: value }).items[0];
    assert.equal(item.status, "Needs manual review");
    assert.equal(item.eligible, false);
    assert.deepEqual(item.answer, value);
  }
  for (const key of [undefined, null, "", " ", [], ["Brief", "Extra"], 42, {}]) {
    const item = teacherReview(questions, questions, { short: "Brief" }, { short: key }).items[0];
    assert.equal(item.status, "Needs manual review");
    assert.equal(item.expected, null);
  }
  for (const answers of [[], "bad", 42]) {
    assert.ok(teacherReview(questions, questions, answers).items.every((i) => i.status === "Needs manual review"));
    assert.equal(teacherReview(null, null, answers).items.length, 1);
  }
  for (const value of [["One", "one"], ["One", "Removed"], ["", "One"], ["", ""]]) {
    assert.equal(teacherReview(questions, questions, { checks: value }).items[3].status, "Needs manual review");
    assert.equal(teacherReview(questions, questions, { checks: ["One"] }, { checks: value }).items[3].status, "Needs manual review");
  }
  assert.equal(teacherReview(questions, questions, { checks: "One", short: ["Brief"] }, { checks: ["One"], short: ["Brief"] }).items[3].status, "Correct");
  assert.equal(teacherReview(questions, questions, { short: ["Brief"] }, { short: ["Brief"] }).items[0].status, "Correct");
  assert.equal(teacherReview(questions, questions, { choice: "Removed" }).items[2].status, "Needs manual review");
  assert.equal(teacherReview(questions, questions, { choice: "Alpha" }, { choice: "Removed" }).items[2].status, "Needs manual review");
  for (const options of [["Alpha", " alpha "], ["Alpha", "Alpha"], ["Alpha", ""]]) {
    const ambiguous = [{ ...questions[2], options }];
    assert.equal(teacherReview(ambiguous, ambiguous, { choice: "Alpha" }).items[0].status, "Needs manual review");
  }
});

test("teacher lifecycle and rendering use the retained or replacement submission without mutating it", () => {
  for (const status of ["submitted", "late", "graded", "returned"]) {
    const submission = { status, questionSnapshot: questions, formAnswers: { short: "Brief", choice: "Beta", long: "Essay" }, grade: 75, returnNote: "Old", feedback: "Old" };
    const original = structuredClone(submission);
    const markup = renderToStaticMarkup(React.createElement(TeacherAssessmentReview, { submission, currentQuestions: questions, answerKey: reviewKeys }));
    assert.match(markup, /Compared with current answer key/);
    assert.match(markup, /Incorrect \/ needs correction/);
    assert.match(markup, /Expected answer \(current key\)/);
    assert.match(markup, /Needs manual review/);
    assert.match(markup, /aria-hidden="true"/);
    assert.match(markup, /not the final grade/);
    assert.deepEqual(submission, original);
    const replaced = teacherReview(questions, questions, { choice: "Alpha" }, reviewKeys, status);
    assert.equal(replaced.items[0].status, "No response");
    assert.equal(replaced.items[2].status, "Correct");
  }
  for (const status of ["pending", "not-submitted"]) {
    const result = teacherReview(questions, questions, { choice: "Beta" }, reviewKeys, status);
    assert.equal(result.accuracy, null);
    assert.ok(result.items.every((i) => i.status === "Not submitted"));
    const markup = renderToStaticMarkup(React.createElement(TeacherAssessmentReview, {
      submission: { status, questionSnapshot: questions, formAnswers: { choice: "Beta" } }, currentQuestions: questions, answerKey: reviewKeys,
    }));
    assert.match(markup, /Not submitted/);
    assert.doesNotMatch(markup, /Accuracy:|Compared with|Expected answer/);
  }
  const noKey = renderToStaticMarkup(React.createElement(TeacherAssessmentReview, {
    submission: { status: "graded", questionSnapshot: questions, formAnswers: { short: "Brief" } }, currentQuestions: questions, answerKey: null,
  }));
  assert.match(noKey, /No automatically checkable questions/);
  assert.doesNotMatch(noKey, /Accuracy:/);
  const family = renderToStaticMarkup(React.createElement(AssessmentReview, {
    submission: { status: "graded", questionSnapshot: questions, formAnswers: { choice: "Beta" } }, currentQuestions: questions,
  }));
  assert.doesNotMatch(family, /current answer key|Expected answer|Incorrect|Accuracy|Needs manual review/);
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