import type { FormQuestion } from "./schema";

export type AnswerKey = Record<string, string | string[]>;
const normalized = (value: string) => value.trim().toLowerCase();

// Choice keys refer to option text, not option IDs. Only retain a selection
// when it identifies exactly one nonblank option; never guess among duplicates.
export function reconcileAnswerKey(questions: unknown, raw: unknown): AnswerKey {
  if (!Array.isArray(questions) || !raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: AnswerKey = {};
  for (const q of questions) {
    if (!q || typeof q.id !== "string" || !q.id.trim() ||
        questions.filter((entry) => entry?.id === q.id).length !== 1) continue;
    const value = Object.prototype.hasOwnProperty.call(raw, q.id) ? (raw as Record<string, unknown>)[q.id] : undefined;
    if (q.type !== "multiple_choice" && q.type !== "checkbox") {
      if (typeof value === "string" || (Array.isArray(value) && value.every((v) => typeof v === "string")))
        Object.defineProperty(result, q.id, { value, enumerable: true, writable: true, configurable: true });
      continue;
    }
    const options: string[] = Array.isArray(q.options) ? q.options.filter((v: unknown): v is string => typeof v === "string") : [];
    const values = typeof value === "string" ? [value] : Array.isArray(value) ? value : [];
    if (q.type === "multiple_choice" && values.length !== 1) continue;
    const selected = values.filter((v): v is string => typeof v === "string" && !!v.trim() &&
      options.includes(v) && options.filter((opt) => normalized(opt) === normalized(v)).length === 1);
    const unique = Array.from(new Set(selected));
    if (unique.length) Object.defineProperty(result, q.id, {
      value: q.type === "multiple_choice" ? unique[0] : unique,
      enumerable: true, writable: true, configurable: true,
    });
  }
  return result;
}

export function editQuestionOption(questions: FormQuestion[], raw: AnswerKey, id: string, index: number, replacement?: string) {
  const q = questions.find((entry) => entry.id === id);
  if (!q || index < 0 || index >= q.options.length) return { questions, answerKey: reconcileAnswerKey(questions, raw) };
  const old = q.options[index];
  const options = replacement === undefined ? q.options.filter((_, i) => i !== index)
    : q.options.map((value, i) => i === index ? replacement : value);
  const updated = questions.map((entry) => entry.id === id ? { ...entry, options } : entry);
  const key = { ...raw };
  const current = key[id];
  const values = typeof current === "string" ? [current] : Array.isArray(current) ? current : [];
  const canRename = replacement !== undefined && !!replacement.trim() &&
    q.options.filter((opt) => normalized(opt) === normalized(old)).length === 1 &&
    options.filter((opt) => normalized(opt) === normalized(replacement)).length === 1;
  const next = values.flatMap((value) => value === old ? canRename ? [replacement!] : [] : [value]);
  if (q.type === "multiple_choice") {
    if (next.length === 1) key[id] = next[0]; else delete key[id];
  } else if (q.type === "checkbox") {
    if (next.length) key[id] = next; else delete key[id];
  }
  return { questions: updated, answerKey: reconcileAnswerKey(updated, key) };
}