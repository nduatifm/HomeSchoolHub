import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormQuestion } from "@shared/schema";

interface FormResponseProps {
  questions: FormQuestion[];
  answers: Record<string, string | string[]>;
  onChange: (answers: Record<string, string | string[]>) => void;
  disabled?: boolean;
}

export default function FormResponse({ questions, answers, onChange, disabled }: FormResponseProps) {
  function setAnswer(id: string, value: string | string[]) {
    onChange({ ...answers, [id]: value });
  }

  function toggleCheckbox(id: string, option: string) {
    const current = (answers[id] as string[]) ?? [];
    const next = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option];
    setAnswer(id, next);
  }

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={q.id} className="space-y-1.5">
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
              rows={3}
              disabled={disabled}
              className="text-sm resize-none"
            />
          )}

          {q.type === "multiple_choice" && (
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
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
      ))}
    </div>
  );
}
