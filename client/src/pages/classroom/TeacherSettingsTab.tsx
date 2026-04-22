import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Scale } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { GradingPolicy } from "@shared/schema";

const TYPES = [
  { key: "assignmentWeight", label: "Assignments", color: "bg-blue-500" },
  { key: "testWeight", label: "Tests", color: "bg-orange-500" },
  { key: "quizWeight", label: "Quizzes", color: "bg-purple-500" },
  { key: "projectWeight", label: "Projects", color: "bg-teal-500" },
] as const;

type WeightKey = "assignmentWeight" | "testWeight" | "quizWeight" | "projectWeight";

export default function TeacherSettingsTab({ classroomId }: { classroomId: number }) {
  const { data: policy, isLoading } = useQuery<GradingPolicy | null>({
    queryKey: ["/api/classrooms", classroomId, "grading-policy"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/grading-policy`),
    enabled: classroomId > 0,
  });

  const [weights, setWeights] = useState<Record<WeightKey, string>>({
    assignmentWeight: "25",
    testWeight: "25",
    quizWeight: "25",
    projectWeight: "25",
  });

  useEffect(() => {
    if (!policy) return;
    setWeights({
      assignmentWeight: String(policy.assignmentWeight),
      testWeight: String(policy.testWeight),
      quizWeight: String(policy.quizWeight),
      projectWeight: String(policy.projectWeight),
    });
  }, [policy]);

  const total = TYPES.reduce((s, t) => s + (parseInt(weights[t.key], 10) || 0), 0);
  const isValid = total === 100 && TYPES.every((t) => {
    const n = parseInt(weights[t.key], 10);
    return Number.isInteger(n) && n >= 0 && n <= 100;
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/classrooms/${classroomId}/grading-policy`, {
        method: "POST",
        body: JSON.stringify({
          assignmentWeight: parseInt(weights.assignmentWeight, 10),
          testWeight: parseInt(weights.testWeight, 10),
          quizWeight: parseInt(weights.quizWeight, 10),
          projectWeight: parseInt(weights.projectWeight, 10),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "grading-policy"] });
      toast({ title: "Grading policy saved", type: "success" });
    },
    onError: (err: any) => toast({ title: err?.message ?? "Couldn't save — try again.", type: "error" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
            <Scale className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Grading Policy</p>
            <p className="text-xs text-muted-foreground">Set how each item type is weighted toward the overall grade</p>
          </div>
        </div>

        <div className="space-y-3">
          {TYPES.map((t) => (
            <div key={t.key} className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.color}`} />
              <Label className="w-28 text-sm font-medium shrink-0">{t.label}</Label>
              <div className="relative flex items-center flex-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={weights[t.key]}
                  onChange={(e) => setWeights((prev) => ({ ...prev, [t.key]: e.target.value }))}
                  className="h-8 text-sm pr-8 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="absolute right-3 text-xs text-muted-foreground pointer-events-none">%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Visual bar */}
        {isValid && (
          <div className="h-2 rounded-full overflow-hidden flex gap-px">
            {TYPES.map((t) => {
              const pct = parseInt(weights[t.key], 10);
              if (pct === 0) return null;
              return (
                <div
                  key={t.key}
                  className={`${t.color} transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${t.label}: ${pct}%`}
                />
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className={`text-sm font-medium tabular-nums ${total === 100 ? "text-green-600" : "text-destructive"}`}>
            Total: {total}%{total !== 100 && " (must equal 100%)"}
          </span>
          <Button
            size="sm"
            disabled={!isValid || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="h-8 px-5"
          >
            {saveMutation.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving…</> : "Save Policy"}
          </Button>
        </div>

        {policy && (
          <p className="text-xs text-muted-foreground">
            Active since{" "}
            <span className="font-medium">
              {new Date(policy.effectiveFrom).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {" "}— {policy.assignmentWeight}% Assignments · {policy.testWeight}% Tests · {policy.quizWeight}% Quizzes · {policy.projectWeight}% Projects
          </p>
        )}
      </div>
    </div>
  );
}
