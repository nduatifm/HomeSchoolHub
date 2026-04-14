import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FormQuestion } from "@shared/schema";

interface FormResponseProps {
  questions: FormQuestion[];
  answers: Record<string, string | string[]>;
  onChange: (answers: Record<string, string | string[]>) => void;
  disabled?: boolean;
  stepByStep?: boolean;
}

export default function FormResponse({ questions, answers, onChange, disabled, stepByStep }: FormResponseProps) {
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);

  function setAnswer(id: string, value: string | string[]) {
    onChange({ ...answers, [id]: value });
    setStepError(null);
  }

  function toggleCheckbox(id: string, option: string) {
    const current = (answers[id] as string[]) ?? [];
    const next = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option];
    setAnswer(id, next);
  }

  function isCurrentAnswered(q: FormQuestion) {
    if (!q.required) return true;
    const answer = answers[q.id];
    if (q.type === "checkbox") return Array.isArray(answer) && answer.length > 0;
    return typeof answer === "string" && answer.trim().length > 0;
  }

  function handleNext() {
    const current = questions[step];
    if (!isCurrentAnswered(current)) {
      setStepError("This question is required.");
      return;
    }
    setStepError(null);
    setStep((s) => Math.min(s + 1, questions.length - 1));
  }

  function handleBack() {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function renderQuestion(q: FormQuestion, i: number) {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">
          {i + 1}. {q.label}
          {q.required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>

        {q.type === "short" && (
          <Input
            value={(answers[q.id] as string) ?? ""}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            placeholder="Your answer…"
            disabled={disabled}
            className="text-sm"
          />
        )}

        {q.type === "paragraph" && (
          <Textarea
            value={(answers[q.id] as string) ?? ""}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            placeholder="Your answer…"
            rows={4}
            disabled={disabled}
            className="text-sm resize-none"
          />
        )}

        {q.type === "multiple_choice" && (
          <div className="space-y-2">
            {(q.options ?? []).map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  value={opt}
                  checked={(answers[q.id] as string) === opt}
                  onChange={() => setAnswer(q.id, opt)}
                  disabled={disabled}
                  className="accent-primary"
                />
                <span className="text-sm text-foreground group-hover:text-primary transition-colors">{opt}</span>
              </label>
            ))}
          </div>
        )}

        {q.type === "checkbox" && (
          <div className="space-y-2">
            {(q.options ?? []).map((opt) => {
              const checked = ((answers[q.id] as string[]) ?? []).includes(opt);
              return (
                <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => !disabled && toggleCheckbox(q.id, opt)}
                    disabled={disabled}
                    className="accent-primary w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">{opt}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (stepByStep && !disabled && questions.length > 0) {
    const current = questions[step];
    const isLast = step === questions.length - 1;
    const answeredCount = questions.filter((q) => {
      const a = answers[q.id];
      if (q.type === "checkbox") return Array.isArray(a) && a.length > 0;
      return typeof a === "string" && a.trim().length > 0;
    }).length;

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Question {step + 1} of {questions.length}
          </span>
          <span className="text-xs text-muted-foreground">{answeredCount}/{questions.length} answered</span>
        </div>

        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / questions.length) * 100}%` }}
          />
        </div>

        <div className="min-h-[120px]">
          {renderQuestion(current, step)}
        </div>

        {stepError && (
          <p className="text-xs text-red-500">{stepError}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={step === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />Back
          </Button>

          {!isLast ? (
            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="gap-1"
            >
              Next<ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-1.5">
              {isCurrentAnswered(current) ? (
                <span className="text-xs font-medium text-primary">All questions reached</span>
              ) : (
                <Button type="button" size="sm" variant="ghost" onClick={() => setStepError("This question is required.")} className="gap-1 text-muted-foreground" disabled>
                  Next<ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={q.id}>
          {renderQuestion(q, i)}
        </div>
      ))}
    </div>
  );
}
