import { formQuestionSchema, type FormQuestion } from "@shared/schema";

export type TeacherReviewStatus = "Correct" | "Incorrect / needs correction" | "Needs manual review" | "No response" | "Not submitted";
type QuestionEntry = { id: string; question: FormQuestion | null; label: string; options: string[] };
export type TeacherReviewItem = QuestionEntry & {
  answer: unknown;
  status: TeacherReviewStatus;
  reason: string | null;
  expected: string[] | null;
  eligible: boolean;
};

const record = (raw: unknown): raw is Record<string, unknown> =>
  raw !== null && typeof raw === "object" && !Array.isArray(raw);
const normalize = (value: string) => value.trim().toLowerCase();
const own = (raw: Record<string, unknown>, id: string) =>
  Object.prototype.hasOwnProperty.call(raw, id) ? raw[id] : undefined;

function entries(raw: unknown): QuestionEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((value) => {
    const parsed = formQuestionSchema.safeParse(value);
    return {
      id: record(value) && typeof value.id === "string" ? value.id : "",
      question: parsed.success ? parsed.data : null,
      label: record(value) && typeof value.label === "string" ? value.label : "Original question unavailable",
      options: record(value) && Array.isArray(value.options) ? value.options.filter((v): v is string => typeof v === "string") : [],
    };
  });
}

function counts(list: QuestionEntry[]) {
  const result = new Map<string, number>();
  for (const entry of list) result.set(entry.id, (result.get(entry.id) ?? 0) + 1);
  return result;
}

function choices(q: FormQuestion): string[] | null {
  return q.type === "true_false" ? ["True", "False"]
    : q.type === "checkbox" || q.type === "multiple_choice" ? q.options : null;
}

function sameQuestion(saved: FormQuestion, current: FormQuestion) {
  if (saved.label !== current.label || saved.type !== current.type) return false;
  const a = choices(saved), b = choices(current);
  // Order and defaulted required/options fields do not establish identity.
  return !a || (!!b && a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]));
}

function values(raw: unknown, q: FormQuestion, key: boolean): { values: string[]; malformed: boolean } {
  if (!key && raw == null) return { values: [], malformed: false };
  const list = typeof raw === "string" ? [raw] : Array.isArray(raw) ? raw : null;
  if (!list || !list.every((v): v is string => typeof v === "string") ||
      (q.type !== "checkbox" && list.length > 1))
    return { values: [], malformed: true };
  if (!list.length || list.every((v) => !v.trim()))
    return { values: [], malformed: key || list.length > 1 };
  const normalized = list.map(normalize);
  const options = choices(q)?.map(normalize);
  const malformed = normalized.some((v) => !v) ||
    new Set(normalized).size !== normalized.length ||
    !!(options && normalized.some((v) => !options.includes(v)));
  return { values: list, malformed };
}

export function displayTeacherAnswer(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw.every((v) => typeof v === "string")) return raw.join(", ");
  return JSON.stringify(raw) ?? "";
}

// Deliberately separate from family review parsing: malformed data must remain
// visible here, without changing the established student/parent presentation.
export function buildTeacherAssessmentReview(snapshot: unknown, currentQuestions: unknown, rawAnswers: unknown, answerKey: unknown, status: string) {
  const saved = entries(snapshot), current = entries(currentQuestions);
  const historical = Array.isArray(snapshot) && saved.length > 0;
  const savedCounts = counts(saved), currentCounts = counts(current);
  const answers = record(rawAnswers) ? rawAnswers : {};
  const malformedAnswers = rawAnswers != null && !record(rawAnswers);
  const key = record(answerKey) ? answerKey : {};
  const source = historical ? saved : current;
  const seen = new Set(source.map((q) => q.id));
  const reviewEntries = [...source];
  for (const id of Object.keys(answers)) {
    if (!seen.has(id)) reviewEntries.push({ id, question: null, label: "Original question unavailable", options: [] });
  }
  if (malformedAnswers && !reviewEntries.length)
    reviewEntries.push({ id: "", question: null, label: "Original question unavailable", options: [] });

  const items = reviewEntries.map<TeacherReviewItem>((entry) => {
    const answer = malformedAnswers ? rawAnswers : own(answers, entry.id);
    const base = { ...entry, answer, expected: null, eligible: false };
    if (status === "pending" || status === "not-submitted")
      return { ...base, status: "Not submitted", reason: null };
    const currentEntry = current.find((q) => q.id === entry.id);
    if (!historical || !entry.id.trim() || savedCounts.get(entry.id) !== 1 ||
        currentCounts.get(entry.id) !== 1 || !entry.question || !currentEntry?.question ||
        !sameQuestion(entry.question, currentEntry.question))
      return { ...base, status: "Needs manual review", reason: "Original question is unavailable, ambiguous, removed, or changed." };
    const q = entry.question;
    const actual = values(answer, q, false);
    if (malformedAnswers || actual.malformed)
      return { ...base, status: "Needs manual review", reason: "Saved response has an unsupported or ambiguous format." };
    const options = choices(q)?.map(normalize);
    if (options && (!options.length || options.some((v) => !v) || new Set(options).size !== options.length))
      return { ...base, status: "Needs manual review", reason: "Question choices are empty or ambiguous." };
    const expected = values(own(key, entry.id), q, true);
    const eligible = q.type !== "paragraph" && !expected.malformed;
    if (!actual.values.length)
      return { ...base, eligible, status: "No response", reason: null };
    if (!eligible)
      return { ...base, status: "Needs manual review", reason: q.type === "paragraph" ? "Written responses require teacher review." : "No usable current answer key." };
    const a = actual.values.map(normalize).sort(), b = expected.values.map(normalize).sort();
    const correct = a.length === b.length && a.every((v, i) => v === b[i]);
    return { ...base, eligible, expected: correct ? null : expected.values, status: correct ? "Correct" : "Incorrect / needs correction", reason: null };
  });
  const pending = status === "pending" || status === "not-submitted";
  const eligible = items.filter((i) => i.eligible).length;
  const correct = items.filter((i) => i.status === "Correct").length;
  return {
    items, pending, eligible, correct,
    accuracy: !pending && eligible ? Math.round(correct / eligible * 100) : null,
    manual: items.filter((i) => i.status === "Needs manual review").length,
    unanswered: items.filter((i) => i.status === "No response").length,
    warning: !historical ? "Original questions were not saved or are empty/invalid. Current question wording is unverified; responses require manual review." : null,
  };
}