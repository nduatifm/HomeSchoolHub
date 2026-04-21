import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import type { FormQuestion } from "@shared/schema";

interface FormResponseProps {
  questions: FormQuestion[];
  answers: Record<string, string | string[]>;
  onChange: (answers: Record<string, string | string[]>) => void;
  disabled?: boolean;
  stepByStep?: boolean;
  answerKey?: Record<string, string | string[]>;
  hideNeedsReview?: boolean;
}

function checkCorrect(q: FormQuestion, answer: string | string[] | undefined, key: string | string[]): boolean | null {
  if (answer === undefined) return null;
  if (q.type === "checkbox") {
    const expected = (Array.isArray(key) ? key : [key]).map((v) => v.trim().toLowerCase()).sort();
    const actual = (Array.isArray(answer) ? answer : [answer]).map((v) => v.trim().toLowerCase()).sort();
    return expected.length === actual.length && expected.every((v, i) => v === actual[i]);
  }
  const expected = (typeof key === "string" ? key : key[0] ?? "").trim().toLowerCase();
  const actual = (typeof answer === "string" ? answer : (Array.isArray(answer) ? answer[0] : "") ?? "").trim().toLowerCase();
  if (!expected) return null;
  return expected === actual;
}

export default function FormResponse({ questions, answers, onChange, disabled, stepByStep, answerKey, hideNeedsReview }: FormResponseProps) {
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

  function renderCorrectnessBadge(q: FormQuestion) {
    if (!disabled || !answerKey) return null;
    const hasKey = answerKey[q.id] !== undefined;
    if (!hasKey) {
      if (!hideNeedsReview) {
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full ml-1.5">
            <HelpCircle className="h-3 w-3" />Needs review
          </span>
        );
      }
      return null;
    }
    const result = checkCorrect(q, answers[q.id], answerKey[q.id]);
    if (result === null) return null;
    return result ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full ml-1.5">
        <CheckCircle2 className="h-3 w-3" />Correct
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full ml-1.5">
        <XCircle className="h-3 w-3" />Incorrect
      </span>
    );
  }

  function renderCorrectAnswerHint(q: FormQuestion) {
    if (!disabled || !answerKey || answerKey[q.id] === undefined) return null;
    const result = checkCorrect(q, answers[q.id], answerKey[q.id]);
    if (result !== false) return null;
    const keyDisplay = Array.isArray(answerKey[q.id]) ? (answerKey[q.id] as string[]).join(", ") : answerKey[q.id];
    return (
      <p className="text-[11px] text-green-700 mt-1 flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3 shrink-0" />
        Correct answer: <span className="font-medium">{keyDisplay}</span>
      </p>
    );
  }

  function renderQuestion(q: FormQuestion, i: number) {
    const hasKey = !!(answerKey && answerKey[q.id] !== undefined);
    const result = hasKey ? checkCorrect(q, answers[q.id], answerKey![q.id]) : null;

    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">
          {i + 1}. {q.label}
          {q.required && <span className="text-red-500 ml-0.5">*</span>}
          {renderCorrectnessBadge(q)}
        </Label>

        {q.type === "short" && (
          <div>
            <Input
              value={(answers[q.id] as string) ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              placeholder="Your answer…"
              disabled={disabled}
              className={`text-sm ${disabled && hasKey ? (result === true ? "border-green-300 bg-green-50/40" : result === false ? "border-red-300 bg-red-50/40" : "") : ""}`}
            />
            {renderCorrectAnswerHint(q)}
          </div>
        )}

        {q.type === "paragraph" && (
          <div>
            <Textarea
              value={(answers[q.id] as string) ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              placeholder="Your answer…"
              rows={4}
              disabled={disabled}
              className="text-sm resize-none"
            />
          </div>
        )}

        {q.type === "multiple_choice" && (
          <div className="space-y-2">
            {(q.options ?? []).map((opt) => {
              const isSelected = (answers[q.id] as string) === opt;
              const isKeyCorrect = disabled && hasKey && answerKey![q.id] === opt;
              const isKeyWrong = disabled && hasKey && isSelected && answerKey![q.id] !== opt;
              return (
                <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={opt}
                    checked={isSelected}
                    onChange={() => setAnswer(q.id, opt)}
                    disabled={disabled}
                    className="accent-primary"
                  />
                  <span className={`text-sm transition-colors ${
                    isKeyCorrect
                      ? "text-green-700 font-medium"
                      : isKeyWrong
                        ? "text-red-600 line-through"
                        : "text-foreground group-hover:text-primary"
                  }`}>
                    {opt}
                    {isKeyCorrect && <CheckCircle2 className="h-3.5 w-3.5 inline ml-1 text-green-600" />}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {q.type === "checkbox" && (
          <div className="space-y-2">
            {(q.options ?? []).map((opt) => {
              const checked = ((answers[q.id] as string[]) ?? []).includes(opt);
              const keyArr = hasKey
                ? (Array.isArray(answerKey![q.id]) ? answerKey![q.id] as string[] : [answerKey![q.id] as string])
                : [];
              const isKeyCorrect = disabled && hasKey && keyArr.includes(opt);
              const isKeyWrong = disabled && hasKey && checked && !isKeyCorrect;
              return (
                <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => !disabled && toggleCheckbox(q.id, opt)}
                    disabled={disabled}
                    className="accent-primary w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className={`text-sm transition-colors ${
                    isKeyCorrect
                      ? "text-green-700 font-medium"
                      : isKeyWrong
                        ? "text-red-600 line-through"
                        : "text-foreground group-hover:text-primary"
                  }`}>
                    {opt}
                    {isKeyCorrect && <CheckCircle2 className="h-3.5 w-3.5 inline ml-1 text-green-600" />}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {q.type === "true_false" && (
          <div className="flex gap-3">
            {["True", "False"].map((opt) => {
              const selected = (answers[q.id] as string) === opt;
              const isKeyCorrect = disabled && hasKey && answerKey![q.id] === opt;
              const isKeyWrong = disabled && hasKey && selected && answerKey![q.id] !== opt;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && setAnswer(q.id, opt)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    isKeyCorrect && selected
                      ? "border-green-400 bg-green-50 text-green-700"
                      : isKeyWrong
                        ? "border-red-300 bg-red-50 text-red-600"
                        : isKeyCorrect
                          ? "border-green-200 bg-green-50/50 text-green-600"
                          : selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selected ? "border-primary" : "border-border"
                  }`}>
                    {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  {opt}
                  {isKeyCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                </button>
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
