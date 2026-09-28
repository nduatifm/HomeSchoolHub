import { formQuestionSchema, type FormQuestion } from "@shared/schema";

export type ReviewAnswer = string | string[];
export type ReviewItem = {
  id: string;
  question: FormQuestion | null;
  answer: ReviewAnswer | undefined;
};

// Drafts can outlive question edits. Keep only answers that still belong to the
// active form, so a returned student's next submission cannot mislabel old work.
export function compatibleDraftAnswers(questions: FormQuestion[] | null | undefined, raw: unknown): Record<string, ReviewAnswer> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const source = raw as Record<string, unknown>;
  const compatible: Record<string, ReviewAnswer> = {};
  for (const q of questions ?? []) {
    const value = source[q.id];
    if (q.type === "checkbox") {
      if (Array.isArray(value)) compatible[q.id] = value.filter((v): v is string => typeof v === "string" && q.options.includes(v));
    } else if (typeof value === "string" &&
      (q.type !== "multiple_choice" || q.options.includes(value)) &&
      (q.type !== "true_false" || value === "True" || value === "False")) {
      compatible[q.id] = value;
    }
  }
  return compatible;
}

export function buildAssessmentReview(
  snapshot: unknown,
  currentQuestions: unknown,
  rawAnswers: unknown,
): { items: ReviewItem[]; historical: boolean; warning: string | null } {
  const saved = formQuestionSchema.array().safeParse(snapshot);
  const current = formQuestionSchema.array().safeParse(currentQuestions);
  const historical = saved.success && new Set(saved.data.map((q) => q.id)).size === saved.data.length;
  const validCurrent = current.success && new Set(current.data.map((q) => q.id)).size === current.data.length;
  const questions = historical ? saved.data : validCurrent ? current.data : [];
  const answers: Record<string, ReviewAnswer> = {};
  let malformed = false;
  if (rawAnswers && typeof rawAnswers === "object" && !Array.isArray(rawAnswers)) {
    for (const [id, value] of Object.entries(rawAnswers)) {
      if (typeof value === "string" || (Array.isArray(value) && value.every((v) => typeof v === "string")))
        answers[id] = value;
      else malformed = true;
    }
  } else if (rawAnswers != null) malformed = true;

  const seen = new Set<string>();
  const items: ReviewItem[] = questions.map((question) => {
    seen.add(question.id);
    return { id: question.id, question, answer: answers[question.id] };
  });
  for (const [id, answer] of Object.entries(answers)) {
    if (!seen.has(id)) items.push({ id, question: null, answer });
  }
  const warnings: string[] = [];
  if (!historical)
    warnings.push("Original questions were not saved with this submission. Current question wording may differ from what the student saw.");
  if (items.some((item) => !item.question))
    warnings.push("Some answers have no matching saved question. They are shown separately rather than assigned to another prompt.");
  if (malformed) warnings.push("Some saved answers have an unsupported format and cannot be displayed.");
  return { items, historical, warning: warnings.length ? warnings.join(" ") : null };
}