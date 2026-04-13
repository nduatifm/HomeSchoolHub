import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, X, ChevronUp, ChevronDown } from "lucide-react";
import type { FormQuestion } from "@shared/schema";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const TYPE_LABELS: Record<FormQuestion["type"], string> = {
  short: "Short answer",
  paragraph: "Paragraph",
  multiple_choice: "Multiple choice",
  checkbox: "Checkboxes",
};

interface FormBuilderProps {
  questions: FormQuestion[];
  onChange: (questions: FormQuestion[]) => void;
}

function QuestionEditor({
  question,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  question: FormQuestion;
  index: number;
  total: number;
  onChange: (q: FormQuestion) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const hasOptions = question.type === "multiple_choice" || question.type === "checkbox";

  function addOption() {
    onChange({ ...question, options: [...(question.options ?? []), ""] });
  }

  function removeOption(i: number) {
    const opts = [...(question.options ?? [])];
    opts.splice(i, 1);
    onChange({ ...question, options: opts });
  }

  function updateOption(i: number, value: string) {
    const opts = [...(question.options ?? [])];
    opts[i] = value;
    onChange({ ...question, options: opts });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5 mt-1.5 shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground w-5 shrink-0">Q{index + 1}</span>
            <Input
              value={question.label}
              onChange={(e) => onChange({ ...question, label: e.target.value })}
              placeholder="Question text…"
              className="flex-1 text-sm h-8"
            />
            <Select
              value={question.type}
              onValueChange={(v) => onChange({
                ...question,
                type: v as FormQuestion["type"],
                options: v === "multiple_choice" || v === "checkbox"
                  ? (question.options?.length ? question.options : [""])
                  : undefined,
              })}
            >
              <SelectTrigger className="w-40 h-8 text-xs shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as FormQuestion["type"][]).map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasOptions && (
            <div className="space-y-1.5 pl-7">
              {(question.options ?? []).map((opt, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/40 shrink-0" />
                  <Input
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="h-7 text-xs flex-1"
                  />
                  {(question.options?.length ?? 0) > 1 && (
                    <button type="button" onClick={() => removeOption(i)} className="text-muted-foreground hover:text-red-500 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addOption}
                className="text-xs text-primary hover:underline flex items-center gap-1 pl-4"
              >
                <Plus className="h-3 w-3" />Add option
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pl-7">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={question.required}
                onChange={(e) => onChange({ ...question, required: e.target.checked })}
                id={`req-${question.id}`}
                className="accent-primary w-3.5 h-3.5 cursor-pointer"
              />
              <Label htmlFor={`req-${question.id}`} className="text-xs text-muted-foreground cursor-pointer">Required</Label>
            </div>
            <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FormBuilder({ questions, onChange }: FormBuilderProps) {
  function addQuestion() {
    onChange([
      ...questions,
      { id: generateId(), type: "short", label: "", required: false },
    ]);
  }

  function updateQuestion(i: number, q: FormQuestion) {
    const next = [...questions];
    next[i] = q;
    onChange(next);
  }

  function removeQuestion(i: number) {
    const next = [...questions];
    next.splice(i, 1);
    onChange(next);
  }

  function moveQuestion(i: number, direction: "up" | "down") {
    const next = [...questions];
    const target = direction === "up" ? i - 1 : i + 1;
    if (target < 0 || target >= next.length) return;
    [next[i], next[target]] = [next[target], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-2.5">
      {questions.map((q, i) => (
        <QuestionEditor
          key={q.id}
          question={q}
          index={i}
          total={questions.length}
          onChange={(updated) => updateQuestion(i, updated)}
          onRemove={() => removeQuestion(i)}
          onMoveUp={() => moveQuestion(i, "up")}
          onMoveDown={() => moveQuestion(i, "down")}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addQuestion}
        className="w-full gap-1.5 border-dashed text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />Add Question
      </Button>
    </div>
  );
}
