import { useState, useRef, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  AlignLeft,
  AlignJustify,
  Circle,
  CheckSquare,
  ToggleLeft,
  X,
  Key,
} from "lucide-react";
import type { FormQuestion } from "@shared/schema";

type QType = FormQuestion["type"];

const TYPE_META: Record<QType, {
  label: string;
  icon: React.ReactNode;
  pill: string;
}> = {
  short: {
    label: "Short answer",
    icon: <AlignLeft className="h-3.5 w-3.5" />,
    pill: "bg-sky-100 text-sky-800",
  },
  paragraph: {
    label: "Paragraph",
    icon: <AlignJustify className="h-3.5 w-3.5" />,
    pill: "bg-violet-100 text-violet-800",
  },
  multiple_choice: {
    label: "Multiple choice",
    icon: <Circle className="h-3.5 w-3.5" />,
    pill: "bg-emerald-100 text-emerald-800",
  },
  checkbox: {
    label: "Checkboxes",
    icon: <CheckSquare className="h-3.5 w-3.5" />,
    pill: "bg-amber-100 text-amber-800",
  },
  true_false: {
    label: "True / False",
    icon: <ToggleLeft className="h-3.5 w-3.5" />,
    pill: "bg-pink-100 text-pink-800",
  },
};

const ALL_TYPES: QType[] = ["short", "paragraph", "multiple_choice", "checkbox", "true_false"];

interface Props {
  questions: FormQuestion[];
  onChange: (questions: FormQuestion[]) => void;
  answerKey?: Record<string, string | string[]>;
  onAnswerKeyChange?: (answerKey: Record<string, string | string[]>) => void;
  fullPage?: boolean;
}

export default function FormBuilder({ questions, onChange, answerKey = {}, onAnswerKeyChange, fullPage = false }: Props) {
  const [activeId, setActiveId] = useState<string | null>(
    questions[0]?.id ?? null,
  );
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeQuestion = questions.find((q) => q.id === activeId) ?? null;
  const activeIndex = questions.findIndex((q) => q.id === activeId);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowTypeMenu(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function autoGrow(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    autoGrow(promptRef.current);
  }, [activeId]);

  function updateQuestion(id: string, patch: Partial<FormQuestion>) {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function addQuestion(type: QType) {
    const newQ: FormQuestion = {
      id: crypto.randomUUID(),
      type,
      label: "",
      required: false,
      options: type === "multiple_choice" || type === "checkbox"
        ? ["Option 1", "Option 2"]
        : [],
    };
    const updated = [...questions, newQ];
    onChange(updated);
    setActiveId(newQ.id);
    setShowTypeMenu(false);
    setTimeout(() => promptRef.current?.focus(), 0);
  }

  function deleteQuestion(id: string) {
    const idx = questions.findIndex((q) => q.id === id);
    const updated = questions.filter((q) => q.id !== id);
    onChange(updated);
    const next = updated[Math.max(0, idx - 1)];
    setActiveId(next?.id ?? null);
    if (onAnswerKeyChange) {
      const { [id]: _removed, ...remaining } = answerKey;
      onAnswerKeyChange(remaining);
    }
  }

  function addOption(qId: string) {
    const q = questions.find((q) => q.id === qId);
    if (!q) return;
    updateQuestion(qId, { options: [...(q.options ?? []), ""] });
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>(".option-input");
      inputs[inputs.length - 1]?.focus();
    }, 0);
  }

  function removeOption(qId: string, optIndex: number) {
    const q = questions.find((q) => q.id === qId);
    if (!q || (q.options ?? []).length <= 1) return;
    const opts = (q.options ?? []).filter((_, i) => i !== optIndex);
    updateQuestion(qId, { options: opts });
  }

  function changeType(qId: string, type: QType) {
    const q = questions.find((q) => q.id === qId);
    if (!q) return;
    const needsOptions = type === "multiple_choice" || type === "checkbox";
    const hadOptions = q.type === "multiple_choice" || q.type === "checkbox";
    updateQuestion(qId, {
      type,
      options: needsOptions
        ? hadOptions && q.options?.length
          ? q.options
          : ["Option 1", "Option 2"]
        : [],
    });
    if (onAnswerKeyChange) {
      const { [qId]: _removed, ...remaining } = answerKey;
      onAnswerKeyChange(remaining);
    }
  }

  function setAnswerKey(qId: string, value: string | string[] | null) {
    if (!onAnswerKeyChange) return;
    if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      const { [qId]: _removed, ...remaining } = answerKey;
      onAnswerKeyChange(remaining);
    } else {
      onAnswerKeyChange({ ...answerKey, [qId]: value });
    }
  }

  function toggleCheckboxAnswer(qId: string, option: string) {
    const current = (answerKey[qId] as string[] | undefined) ?? [];
    const next = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option];
    setAnswerKey(qId, next);
  }

  function renderAnswerKeySection(q: FormQuestion) {
    if (!onAnswerKeyChange) return null;

    if (q.type === "paragraph") {
      return (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Key className="h-3 w-3" />Answer Key
          </p>
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
            Paragraph answers are not auto-graded. Teacher must review manually.
          </p>
        </div>
      );
    }

    if (q.type === "short") {
      const current = (answerKey[q.id] as string | undefined) ?? "";
      return (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Key className="h-3 w-3" />Answer Key
          </p>
          <Input
            value={current}
            onChange={(e) => setAnswerKey(q.id, e.target.value)}
            placeholder="Exact answer…"
            className="h-7 text-xs"
          />
          <p className="text-[10px] text-muted-foreground/60">Case-insensitive exact match</p>
        </div>
      );
    }

    if (q.type === "true_false") {
      const current = answerKey[q.id] as string | undefined;
      return (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Key className="h-3 w-3" />Answer Key
          </p>
          <div className="flex gap-2">
            {["True", "False"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setAnswerKey(q.id, current === opt ? null : opt)}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  current === opt
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (q.type === "multiple_choice") {
      const current = answerKey[q.id] as string | undefined;
      const options = q.options ?? [];
      if (options.length === 0) return null;
      return (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Key className="h-3 w-3" />Answer Key
          </p>
          <div className="space-y-1">
            {options.map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name={`ak-${q.id}`}
                  checked={current === opt}
                  onChange={() => setAnswerKey(q.id, current === opt ? null : opt)}
                  className="accent-primary w-3 h-3"
                />
                <span className="text-xs text-foreground truncate">{opt || <span className="text-muted-foreground/50 italic">Empty option</span>}</span>
              </label>
            ))}
          </div>
          {current && (
            <button type="button" onClick={() => setAnswerKey(q.id, null)} className="text-[10px] text-red-500 hover:underline">
              Clear
            </button>
          )}
        </div>
      );
    }

    if (q.type === "checkbox") {
      const current = (answerKey[q.id] as string[] | undefined) ?? [];
      const options = q.options ?? [];
      if (options.length === 0) return null;
      return (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Key className="h-3 w-3" />Answer Key
          </p>
          <div className="space-y-1">
            {options.map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={current.includes(opt)}
                  onChange={() => toggleCheckboxAnswer(q.id, opt)}
                  className="accent-primary w-3 h-3"
                />
                <span className="text-xs text-foreground truncate">{opt || <span className="text-muted-foreground/50 italic">Empty option</span>}</span>
              </label>
            ))}
          </div>
          {current.length > 0 && (
            <button type="button" onClick={() => setAnswerKey(q.id, null)} className="text-[10px] text-red-500 hover:underline">
              Clear
            </button>
          )}
        </div>
      );
    }

    return null;
  }

  return (
    <div className="flex bg-card" style={fullPage ? { height: "100%" } : { height: "520px" }}>

      {/* ── Left panel — question list ── */}
      <div className="w-52 shrink-0 flex flex-col border-r border-border bg-muted/30">
        <div className="px-3 py-3 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Questions
          </p>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {questions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6 px-2">
              No questions yet. Add one below.
            </p>
          )}
          {questions.map((q, i) => {
            const meta = TYPE_META[q.type];
            const isActive = q.id === activeId;
            const hasKey = answerKey[q.id] !== undefined;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setActiveId(q.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all duration-100 ${
                  isActive
                    ? "bg-background border border-border border-l-[3px] border-l-primary rounded-l-none"
                    : "hover:bg-background/70 border border-transparent"
                }`}
              >
                <span className="text-[10px] font-semibold text-muted-foreground w-4 shrink-0 tabular-nums">
                  {i + 1}
                </span>
                <span className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center ${meta.pill}`}>
                  {meta.icon}
                </span>
                <span className={`text-xs truncate flex-1 ${
                  q.label ? "text-foreground" : "text-muted-foreground/60 italic"
                }`}>
                  {q.label || "Untitled"}
                </span>
                {hasKey && (
                  <span className="shrink-0 w-3 h-3 rounded-full bg-emerald-500" title="Has answer key" />
                )}
              </button>
            );
          })}
        </div>

        <div className="p-2 border-t border-border relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowTypeMenu((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-sky-400 text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 hover:border-sky-600 active:scale-[0.98] transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Add question
          </button>

          {showTypeMenu && (
            <div className="absolute bottom-full left-2 right-2 mb-1 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-20">
              {ALL_TYPES.map((t) => {
                const m = TYPE_META[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addQuestion(t)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${m.pill}`}>
                      {m.icon}
                    </span>
                    {m.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Center panel — question editor ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeQuestion ? (
          <>
            <div className="flex-1 overflow-y-auto px-10 py-10">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-xs font-medium text-muted-foreground">
                  Question {activeIndex + 1}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_META[activeQuestion.type].pill}`}>
                  {TYPE_META[activeQuestion.type].label}
                </span>
                {activeQuestion.required && (
                  <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                    Required
                  </span>
                )}
                {answerKey[activeQuestion.id] !== undefined && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <Key className="h-2.5 w-2.5" />Keyed
                  </span>
                )}
              </div>

              <textarea
                ref={promptRef}
                value={activeQuestion.label}
                onChange={(e) => {
                  updateQuestion(activeQuestion.id, { label: e.target.value });
                  autoGrow(e.target);
                }}
                placeholder="Write your question here…"
                rows={1}
                className="w-full text-xl font-semibold text-foreground placeholder:text-muted-foreground/30 bg-transparent border-none outline-none resize-none leading-snug mb-8 overflow-hidden"
                style={{ minHeight: "2rem" }}
              />

              {activeQuestion.type === "short" && (
                <div className="border-b-2 border-border pb-2">
                  <span className="text-sm text-muted-foreground/50">Short answer text</span>
                </div>
              )}

              {activeQuestion.type === "paragraph" && (
                <div className="border border-border rounded-xl px-4 py-3 bg-muted/20">
                  <span className="text-sm text-muted-foreground/50">Long answer text…</span>
                </div>
              )}

              {activeQuestion.type === "true_false" && (
                <div className="flex gap-3">
                  {["True", "False"].map((opt) => (
                    <div
                      key={opt}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-muted/20 text-sm font-medium text-muted-foreground"
                    >
                      <div className="w-4 h-4 rounded-full border-2 border-border" />
                      {opt}
                    </div>
                  ))}
                </div>
              )}

              {(activeQuestion.type === "multiple_choice" || activeQuestion.type === "checkbox") && (
                <div className="space-y-2">
                  {(activeQuestion.options ?? []).map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-3 group/opt">
                      <div className={`w-4 h-4 shrink-0 border-2 border-border ${
                        activeQuestion.type === "checkbox" ? "rounded" : "rounded-full"
                      }`} />
                      <input
                        className="option-input flex-1 text-sm text-foreground bg-transparent border-none outline-none border-b border-border pb-1 placeholder:text-muted-foreground/40"
                        value={opt}
                        placeholder={`Option ${oi + 1}`}
                        onChange={(e) => {
                          const opts = [...(activeQuestion.options ?? [])];
                          opts[oi] = e.target.value;
                          updateQuestion(activeQuestion.id, { options: opts });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(activeQuestion.id, oi)}
                        className="opacity-0 group-hover/opt:opacity-100 transition-opacity h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(activeQuestion.id)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-2 ml-7"
                  >
                    <Plus className="h-3 w-3" /> Add option
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-border px-10 py-3 flex items-center justify-between bg-muted/10">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px] bg-background">Tab</kbd>
                <span>next field</span>
                <span className="mx-2">·</span>
                <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px] bg-background">↵</kbd>
                <span>new option</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {activeIndex + 1} / {questions.length}
              </span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-border flex items-center justify-center">
              <Plus className="h-5 w-5 opacity-40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">No questions yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Use "Add question" on the left to start building your form
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel — question settings ── */}
      <div className="w-52 shrink-0 flex flex-col border-l border-border bg-muted/30">
        <div className="px-3 py-3 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Settings
          </p>
        </div>

        {activeQuestion ? (
          <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5">

            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Required
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">
                  {activeQuestion.required ? "Yes" : "No"}
                </span>
                <Switch
                  checked={activeQuestion.required}
                  onCheckedChange={(v) =>
                    updateQuestion(activeQuestion.id, { required: v })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Question type
              </p>
              <div className="grid grid-cols-1 gap-1">
                {ALL_TYPES.map((t) => {
                  const m = TYPE_META[t];
                  const isActive = activeQuestion.type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => changeType(activeQuestion.id, t)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                        isActive
                          ? `${m.pill} border border-current/20`
                          : "text-muted-foreground hover:bg-background hover:text-foreground border border-transparent"
                      }`}
                    >
                      <span className="shrink-0">{m.icon}</span>
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {onAnswerKeyChange && (
              <div className="border-t border-border pt-4">
                {renderAnswerKeySection(activeQuestion)}
              </div>
            )}

            <div className="border-t border-border pt-4">
              <button
                type="button"
                onClick={() => deleteQuestion(activeQuestion.id)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete question
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-4">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Select a question to configure its settings
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
