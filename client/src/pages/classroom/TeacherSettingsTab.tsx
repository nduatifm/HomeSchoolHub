import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Scale, ChevronUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { ClassroomGradingCategory, GradingPolicy } from "@shared/schema";

const COLORS = ["bg-blue-500", "bg-orange-500", "bg-purple-500", "bg-teal-500", "bg-pink-500", "bg-indigo-500"];
type DraftCategory = ClassroomGradingCategory & { weightText: string };

export default function TeacherSettingsTab({ classroomId }: { classroomId: number }) {
  const { data: policy, isLoading } = useQuery<GradingPolicy | null>({
    queryKey: ["/api/classrooms", classroomId, "grading-policy"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/grading-policy`),
    enabled: classroomId > 0,
  });
  const { data: fetchedCategories = [], isLoading: categoriesLoading } = useQuery<ClassroomGradingCategory[]>({
    queryKey: ["/api/classrooms", classroomId, "grading-categories"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/grading-categories`),
    enabled: classroomId > 0,
  });
  const [categories, setCategories] = useState<DraftCategory[]>([]);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [replacementId, setReplacementId] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const persistedCategories = useMemo(
    () => (fetchedCategories.length ? fetchedCategories : (policy?.categories ?? []))
      .filter((category) => category.active),
    [fetchedCategories, policy],
  );

  useEffect(() => {
    setCategories(persistedCategories.map((c) => ({ ...c, weightText: String(c.weight) })));
  }, [persistedCategories]);

  const isDirty = categories.length !== persistedCategories.length ||
    categories.some((category, index) => {
      const saved = persistedCategories[index];
      return !saved ||
        category.id !== saved.id ||
        category.name !== saved.name ||
        category.weightText !== String(saved.weight) ||
        index !== saved.displayOrder;
    });

  const total = useMemo(
    () => categories.reduce((sum, category) => sum + (parseInt(category.weightText, 10) || 0), 0),
    [categories],
  );
  const isValid = categories.length > 0 && total === 100 && categories.every((c) => {
    const weight = Number(c.weightText);
    return c.name.trim().length > 0 && Number.isInteger(weight) && weight >= 0 && weight <= 100;
  }) && new Set(categories.map((c) => c.name.trim().toLocaleLowerCase())).size === categories.length;
  const categoryToDelete = categories.find((c) => c.id === confirmId);

  const refreshCategories = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId] });
    queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "grading-categories"] });
    queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "grading-policy"] });
    queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments"] });
  };
  const saveMutation = useMutation({
    mutationFn: () => apiRequest(`/api/classrooms/${classroomId}/grading-policy`, {
      method: "POST",
      body: JSON.stringify({
        categories: categories.map((category, index) => ({
          id: category.id,
          name: category.name.trim(),
          weight: Number(category.weightText),
          displayOrder: index,
        })),
      }),
    }),
    onSuccess: () => {
      refreshCategories();
      toast({ title: "Grading policy saved", type: "success" });
    },
    onError: (err: any) => toast({ title: err?.message ?? "Couldn't save grading policy.", type: "error" }),
  });
  const addMutation = useMutation({
    mutationFn: () => {
      const names = new Set(categories.map((category) => category.name.trim().toLocaleLowerCase()));
      let suffix = 1;
      let name = "New category";
      while (names.has(name.toLocaleLowerCase())) {
        suffix += 1;
        name = `New category ${suffix}`;
      }
      return apiRequest(`/api/classrooms/${classroomId}/grading-categories`, {
      method: "POST",
        body: JSON.stringify({ name, weight: 10, displayOrder: categories.length }),
      });
    },
    onSuccess: () => {
      refreshCategories();
      toast({ title: "Category added", type: "success" });
    },
    onError: (err: any) => toast({ title: err?.message ?? "Couldn't add category.", type: "error" }),
  });

  async function removeCategory() {
    if (!categoryToDelete) return;
    setReassigning(true);
    try {
      await apiRequest(`/api/classrooms/${classroomId}/grading-categories/${categoryToDelete.id}`, {
        method: "DELETE",
        body: replacementId ? JSON.stringify({ reassignCategoryId: Number(replacementId) }) : JSON.stringify({}),
      });
      setConfirmId(null);
      setReplacementId("");
      setDeleteError("");
      refreshCategories();
      toast({ title: "Category removed", type: "success" });
    } catch (err: any) {
      setDeleteError(err?.message ?? "Couldn't remove category.");
      setConfirmId(categoryToDelete.id);
      setReplacementId("");
    } finally {
      setReassigning(false);
    }
  }

  function updateCategory(id: number, patch: Partial<DraftCategory>) {
    setCategories((current) => current.map((category) => category.id === id ? { ...category, ...patch } : category));
  }
  function moveCategory(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= categories.length) return;
    setCategories((current) => {
      const copy = [...current];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  }

  if (isLoading || categoriesLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0"><Scale className="h-4 w-4 text-violet-600" /></div>
          <div>
            <p className="text-sm font-semibold text-foreground">Grading Policy</p>
            <p className="text-xs text-muted-foreground">Name and weight the categories used for this classroom.</p>
          </div>
        </div>

        <div className="space-y-3">
          {categories.map((category, index) => (
            <div key={category.id} className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${COLORS[index % COLORS.length]}`} />
                <Input
                  aria-label={`Category ${index + 1} name`}
                  value={category.name}
                  onChange={(e) => updateCategory(category.id, { name: e.target.value })}
                  className="h-8 text-sm flex-1"
                  maxLength={100}
                />
                <div className="relative w-24 shrink-0">
                  <Input
                    aria-label={`${category.name} weight`}
                    type="number"
                    min={0}
                    max={100}
                    value={category.weightText}
                    onChange={(e) => updateCategory(category.id, { weightText: e.target.value })}
                    className="h-8 text-sm pr-8 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-3 top-1.5 text-xs text-muted-foreground pointer-events-none">%</span>
                </div>
                <div className="flex items-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => moveCategory(index, -1)} aria-label="Move category up"><ChevronUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === categories.length - 1} onClick={() => moveCategory(index, 1)} aria-label="Move category down"><ChevronDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={categories.length <= 1 || isDirty} onClick={() => setConfirmId(category.id)} aria-label={`Remove ${category.name}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              {category.name.trim().length === 0 && <p className="text-xs text-destructive">Category name is required.</p>}
            </div>
          ))}
        </div>

        {deleteError && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-2">
            <p className="text-xs text-amber-800">{deleteError}</p>
            {categoryToDelete && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-amber-900">Replacement category</Label>
                <Select value={replacementId} onValueChange={setReplacementId}>
                  <SelectTrigger className="h-8 text-sm bg-background"><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {categories.filter((c) => c.id !== categoryToDelete.id).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-8" disabled={!replacementId || reassigning} onClick={removeCategory}>{reassigning ? "Removing…" : "Reassign and remove"}</Button>
              </div>
            )}
          </div>
        )}

        {categories.length > 0 && total === 100 && (
          <div className="h-2 rounded-full overflow-hidden flex gap-px">
            {categories.map((category, index) => {
              const weight = Number(category.weightText);
              return weight > 0 ? <div key={category.id} className={`${COLORS[index % COLORS.length]} transition-all`} style={{ width: `${weight}%` }} title={`${category.name}: ${weight}%`} /> : null;
            })}
          </div>
        )}
        {isDirty && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Save your category edits before adding or removing a category.
          </p>
        )}
        <div className="flex items-center justify-between pt-1 gap-3">
          <span className={`text-sm font-medium tabular-nums ${total === 100 && isValid ? "text-green-600" : "text-destructive"}`}>
            Total: {total}%{total !== 100 && " (must equal 100%)"}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={isDirty || addMutation.isPending} onClick={() => addMutation.mutate()} className="h-8"><Plus className="h-3.5 w-3.5 mr-1" />Add category</Button>
            <Button size="sm" disabled={!isValid || saveMutation.isPending} onClick={() => saveMutation.mutate()} className="h-8 px-5">
              {saveMutation.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving…</> : "Save Policy"}
            </Button>
          </div>
        </div>
        {!isValid && categories.length > 0 && total === 100 && <p className="text-xs text-destructive">Category names must be unique and all weights must be whole numbers from 0 to 100.</p>}
        {policy?.effectiveFrom && <p className="text-xs text-muted-foreground">Active since <span className="font-medium">{new Date(policy.effectiveFrom).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span></p>}
      </div>
      <ConfirmDialog
        open={confirmId !== null && !deleteError && !isDirty}
        title={`Remove ${categoryToDelete?.name ?? "category"}?`}
        description="Assignments in this category may need to be reassigned before it can be removed."
        confirmLabel="Remove category"
        onConfirm={removeCategory}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}