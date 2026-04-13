import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronLeft, Paperclip, ClipboardList } from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";
import { toast } from "@/hooks/use-toast";
import type { Classroom, FormQuestion } from "@shared/schema";
import FormBuilder from "@/components/FormBuilder";

export default function NewAssignmentPage() {
  const [, params] = useRoute("/classrooms/:slug/assignments/new");
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const classroomSlug = params?.slug ?? "";

  const [form, setForm] = useState({ title: "", description: "", dueDate: "", points: "100" });
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>([]);
  const [showFormBuilder, setShowFormBuilder] = useState(false);

  const { data: classroom, isLoading: classroomLoading } = useQuery<Classroom>({
    queryKey: ["/api/classrooms", classroomSlug],
    queryFn: () => apiRequest(`/api/classrooms/${classroomSlug}`),
    enabled: !!classroomSlug,
  });

  const classroomId = classroom?.id ?? 0;

  const createMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("dueDate", form.dueDate);
      fd.append("points", form.points);
      if (attachedFile) fd.append("file", attachedFile);
      if (showFormBuilder && formQuestions.length > 0) {
        fd.append("formSchema", JSON.stringify(formQuestions));
      }
      const token = localStorage.getItem("sessionId");
      return fetch(`/api/classrooms/${classroomId}/assignments/with-file`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to create assignment");
        return data;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments"] });
      toast({ title: "Assignment created", type: "success" });
      navigate(`/classrooms/${classroomSlug}`);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const canSave = !!form.title.trim() && !!form.dueDate && !createMutation.isPending;

  const backUrl = `/classrooms/${classroomSlug}`;

  if (classroomLoading) {
    return (
      <div className="flex min-h-screen">
        <ModernSidebar />
        <div className="flex-1 md:ml-[228px] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="flex min-h-screen">
        <ModernSidebar />
        <div className="flex-1 md:ml-[228px] flex flex-col items-center justify-center gap-3">
          <p className="text-gray-500 text-sm">Classroom not found.</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (user?.role !== "teacher") {
    navigate(backUrl);
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ModernSidebar />
      <div className="flex-1 md:ml-[228px] overflow-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-20 pb-12 md:pt-8 space-y-6">
          {/* Breadcrumb */}
          <div>
            <button
              onClick={() => navigate(backUrl)}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />Back to {classroom.name}
            </button>
          </div>

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Assignment</h1>
            <p className="text-sm text-gray-500 mt-0.5">{classroom.name} · {classroom.subject}</p>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm font-medium">Title <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Chapter 5 Reading Response"
                className="text-sm"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm font-medium">
                Instructions <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What should students do for this assignment?"
                rows={4}
                className="text-sm resize-none"
              />
            </div>

            {/* Due Date + Points */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dueDate" className="text-sm font-medium">Due Date <span className="text-red-500">*</span></Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="points" className="text-sm font-medium">Points</Label>
                <Input
                  id="points"
                  type="number"
                  min={1}
                  value={form.points}
                  onChange={(e) => setForm({ ...form, points: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Attachment */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Attachment <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-lg px-3 py-2.5 text-sm text-gray-500 hover:border-primary/50 hover:text-primary transition-colors">
                <Paperclip className="h-4 w-4 shrink-0" />
                {attachedFile ? attachedFile.name : "Choose a file to attach…"}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={(e) => setAttachedFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {attachedFile && (
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Remove file
                </button>
              )}
            </div>

            {/* Form Builder */}
            <div className="border-t border-border pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Form Questions <span className="text-gray-400 font-normal">(optional)</span>
                  </span>
                </div>
                <Button
                  type="button"
                  variant={showFormBuilder ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={() => {
                    if (!showFormBuilder && formQuestions.length === 0) {
                      setFormQuestions([{ id: Math.random().toString(36).slice(2, 10), type: "short", label: "", required: false }]);
                    }
                    setShowFormBuilder(!showFormBuilder);
                  }}
                >
                  {showFormBuilder ? "Remove Form" : "Add Form"}
                </Button>
              </div>
              {showFormBuilder && (
                <FormBuilder questions={formQuestions} onChange={setFormQuestions} />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(backUrl)}>
              Cancel
            </Button>
            <Button disabled={!canSave} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Assignment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
