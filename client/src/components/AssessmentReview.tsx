import React from "react";
import type { ClassroomSubmission, FormQuestion } from "@shared/schema";
import { buildAssessmentReview } from "./assessmentReviewModel";

type Props = {
  submission: Pick<ClassroomSubmission, "questionSnapshot" | "formAnswers" | "status">;
  currentQuestions: FormQuestion[] | null | undefined;
};

export default function AssessmentReview({ submission, currentQuestions }: Props) {
  const { items, warning } = buildAssessmentReview(
    submission.questionSnapshot, currentQuestions, submission.formAnswers,
  );
  if (!items.length && !submission.questionSnapshot && !currentQuestions?.length && !submission.formAnswers)
    return null;

  return (
    <section aria-label="Assessment questions and responses" className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Questions and responses</h2>
      {warning && !(submission.status === "pending" && !submission.formAnswers) &&
        <p role="note" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{warning}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviewable questions or answers were saved.</p>
      ) : (
        <ol className="space-y-3">
          {items.map(({ id, question, answer }, index) => {
            const values = typeof answer === "string" ? (answer.trim() ? [answer] : []) : answer?.filter((v) => v.trim()) ?? [];
            const options = question?.type === "checkbox" || question?.type === "multiple_choice" || question?.type === "true_false"
              ? question.type === "true_false" ? ["True", "False"] : question.options
              : [];
            return (
              <li key={`${id}-${index}`} className="assessment-review-card rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
                <div className="assessment-review-grid grid gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Question {index + 1}</p>
                    <p className="max-w-[70ch] text-base leading-relaxed font-medium text-foreground whitespace-pre-wrap break-words">
                      {question?.label || (question ? "Untitled question" : "Original question unavailable")}
                    </p>
                    {options.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm leading-relaxed text-muted-foreground" aria-label="Original choices">
                        {options.map((option, i) => <li key={i}>• {option || "(Empty choice)"}</li>)}
                      </ul>
                    )}
                  </div>
                  <div className="assessment-review-response min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Student response</p>
                    {values.length ? (
                      <p className="max-w-[70ch] text-base leading-relaxed text-foreground whitespace-pre-wrap break-words">{values.join(", ")}</p>
                    ) : (
                      <p className="text-base italic text-muted-foreground">
                        {submission.status === "pending" ? "Not submitted" : "No response to this question"}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}