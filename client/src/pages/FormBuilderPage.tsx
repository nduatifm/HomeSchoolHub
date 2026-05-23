import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGoBack } from "@/hooks/useGoBack";
import FormBuilder from "@/components/FormBuilder";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, ClipboardList, Loader2 } from "lucide-react";
import type { FormQuestion } from "@shared/schema";

function getDraftKey(draftId: string) {
  return `lyra_form_draft_${draftId}`;
}

function getAnswerKeyDraftKey(draftId: string) {
  return `lyra_form_answerkey_${draftId}`;
}

function loadDraft(draftId: string): FormQuestion[] {
  try {
    const raw = localStorage.getItem(getDraftKey(draftId));
    if (!raw) return [];
    return JSON.parse(raw) as FormQuestion[];
  } catch {
    return [];
  }
}

function loadAnswerKey(draftId: string): Record<string, string | string[]> {
  try {
    const raw = localStorage.getItem(getAnswerKeyDraftKey(draftId));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string | string[]>;
  } catch {
    return {};
  }
}

function saveDraft(draftId: string, questions: FormQuestion[]) {
  localStorage.setItem(getDraftKey(draftId), JSON.stringify(questions));
}

function saveAnswerKey(draftId: string, answerKey: Record<string, string | string[]>) {
  localStorage.setItem(getAnswerKeyDraftKey(draftId), JSON.stringify(answerKey));
}

export default function FormBuilderPage() {
  const { isLoading } = useAuth();
  const goBack = useGoBack("/classrooms");

  const params = new URLSearchParams(window.location.search);
  const draftId = params.get("draft") ?? "";
  const label = params.get("label") ?? "";

  const [questions, setQuestions] = useState<FormQuestion[]>(() =>
    draftId ? loadDraft(draftId) : []
  );

  const [answerKey, setAnswerKey] = useState<Record<string, string | string[]>>(() =>
    draftId ? loadAnswerKey(draftId) : {}
  );

  useEffect(() => {
    if (!draftId) return;
    saveDraft(draftId, questions);
  }, [draftId, questions]);

  useEffect(() => {
    if (!draftId) return;
    saveAnswerKey(draftId, answerKey);
  }, [draftId, answerKey]);

  function handleClose() {
    if (window.opener) {
      window.close();
    } else {
      goBack();
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!draftId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">No form draft specified.</p>
      </div>
    );
  }

  const keyedCount = Object.keys(answerKey).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 sm:px-6 h-14 flex items-center justify-between gap-4 shrink-0">

        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            title="Close tab"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="w-px h-5 bg-border shrink-0" />
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <ClipboardList className="h-3.5 w-3.5 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              Form Builder
            </p>
            {label && (
              <p className="text-xs text-muted-foreground truncate">{label}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {questions.length === 0
              ? "No questions yet"
              : `${questions.length} question${questions.length === 1 ? "" : "s"}${keyedCount > 0 ? ` · ${keyedCount} keyed` : ""}`}
          </span>
          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleClose}
          >
            <Check className="h-3.5 w-3.5" />
            Done — close tab
          </Button>
        </div>
      </div>

      {/* ── Builder — fills remaining height ── */}
      <div style={{ height: "calc(100vh - 3.5rem)" }}>
        <FormBuilder
          questions={questions}
          onChange={setQuestions}
          answerKey={answerKey}
          onAnswerKeyChange={setAnswerKey}
          fullPage
        />
      </div>
    </div>
  );
}
