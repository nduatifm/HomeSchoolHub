import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import FormBuilder from "@/components/FormBuilder";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, ClipboardList, Loader2 } from "lucide-react";
import type { FormQuestion } from "@shared/schema";

function getDraftKey(draftId: string) {
  return `lyra_form_draft_${draftId}`;
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

function saveDraft(draftId: string, questions: FormQuestion[]) {
  localStorage.setItem(getDraftKey(draftId), JSON.stringify(questions));
}

export default function FormBuilderPage() {
  const { user, isLoading } = useAuth();

  const params = new URLSearchParams(window.location.search);
  const draftId = params.get("draft") ?? "";
  const label = params.get("label") ?? "";

  const [questions, setQuestions] = useState<FormQuestion[]>(() =>
    draftId ? loadDraft(draftId) : []
  );

  useEffect(() => {
    if (!draftId) return;
    saveDraft(draftId, questions);
  }, [draftId, questions]);

  function handleClose() {
    if (window.opener) {
      window.close();
    } else {
      window.history.back();
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  if (!draftId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">No form draft specified.</p>
      </div>
    );
  }

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
              : `${questions.length} question${questions.length === 1 ? "" : "s"}`}
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
        <FormBuilder questions={questions} onChange={setQuestions} fullPage />
      </div>
    </div>
  );
}
