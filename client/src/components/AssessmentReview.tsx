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
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Questions and responses</h2>
      {warning && !(submission.status === "pending" && !submission.formAnswers) &&
        <p role="note" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{warning}</p>}
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
              <li key={`${id}-${index}`} className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Question {index + 1}</p>
                    <p className="text-sm font-medium text-foreground whitespace-pre-wrap break-words">
                      {question?.label || (question ? "Untitled question" : "Original question unavailable")}
                    </p>
                    {options.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground" aria-label="Original choices">
                        {options.map((option, i) => <li key={i}>• {option || "(Empty choice)"}</li>)}
                      </ul>
                    )}
                  </div>
                  <div className="min-w-0 md:border-l md:border-border md:pl-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Student response</p>
                    {values.length ? (
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">{values.join(", ")}</p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">
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