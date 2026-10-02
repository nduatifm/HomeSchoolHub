import React from "react";
import { CheckCircle2, XCircle, HelpCircle, MinusCircle, Clock } from "lucide-react";
import { buildTeacherAssessmentReview, displayTeacherAnswer, type TeacherReviewStatus } from "./teacherAssessmentReviewModel";

type Props = {
  submission: { questionSnapshot?: unknown; formAnswers?: unknown; status: string };
  currentQuestions: unknown;
  answerKey: unknown;
};

const indicators = {
  "Correct": { icon: CheckCircle2, color: "text-green-700" },
  "Incorrect / needs correction": { icon: XCircle, color: "text-red-700" },
  "Needs manual review": { icon: HelpCircle, color: "text-amber-800" },
  "No response": { icon: MinusCircle, color: "text-muted-foreground" },
  "Not submitted": { icon: Clock, color: "text-muted-foreground" },
} satisfies Record<TeacherReviewStatus, unknown>;

export default function TeacherAssessmentReview({ submission, currentQuestions, answerKey }: Props) {
  const review = buildTeacherAssessmentReview(submission.questionSnapshot, currentQuestions, submission.formAnswers, answerKey, submission.status);
  if (!review.items.length && !submission.questionSnapshot && !currentQuestions && !submission.formAnswers) return null;
  return (
    <section aria-label="Teacher assessment questions and responses" className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Questions and responses</h2>
      <div aria-label="Answer review summary" className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm space-y-1">
        {review.pending ? <p>Not submitted</p> : <>
          <p className="font-semibold">Compared with current answer key</p>
          <p>{review.accuracy === null ? "No automatically checkable questions" : `Accuracy: ${review.accuracy}% (${review.correct}/${review.eligible} automatically checkable questions)`}</p>
          <p>{review.manual} needing manual review · {review.unanswered} unanswered</p>
          <p className="text-muted-foreground">This comparison is not the final grade or a historical answer-key result. Saved grades are unchanged.</p>
        </>}
      </div>
      {review.warning && !review.pending && <p role="note" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{review.warning}</p>}
      <ol className="space-y-3">
        {review.items.map((item, index) => {
          const { icon: Icon, color } = indicators[item.status];
          const response = displayTeacherAnswer(item.answer);
          const options = item.question?.type === "true_false" ? ["True", "False"] : item.options;
          return (
            <li key={`${item.id}-${index}`} className="assessment-review-card rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
              <div className="assessment-review-grid grid gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Question {index + 1}</p>
                  <p className="max-w-[70ch] text-base leading-relaxed font-medium whitespace-pre-wrap break-words">{item.label || "Untitled question"}</p>
                  {options.length > 0 && <ul aria-label="Question choices" className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {options.map((option, i) => <li key={i}>• {option || "(Empty choice)"}</li>)}
                  </ul>}
                </div>
                <div className="assessment-review-response min-w-0 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student response{item.id ? ` · ${item.id}` : ""}</p>
                  <p className={`inline-flex items-center gap-1.5 text-sm font-semibold ${color}`}><Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{item.status}</p>
                  {!review.pending && response.trim() && <p className="max-w-[70ch] text-base leading-relaxed whitespace-pre-wrap break-words">{response}</p>}
                  {item.reason && <p className="text-sm text-muted-foreground">{item.reason}</p>}
                  {item.expected && <p className="text-sm text-green-700 whitespace-pre-wrap break-words">Expected answer (current key): <span className="font-medium">{item.expected.join(", ")}</span></p>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}