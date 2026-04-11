import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Pencil,
  Paperclip,
  ArrowRight,
  Link2,
} from "lucide-react";
import type { ClassroomAssignment, ClassroomMaterial, ClassroomSubmission } from "@shared/schema";
import { classifyAssignment } from "@/lib/classroomNotifications";
import ClassworkDialog from "./ClassworkDialog";

export default function ClassworkCard({ item, classroomId, classroomSlug, isTeacher, isArchived, assignments, mySubmissions, isUnseen, onSeen }: {
  item: ClassroomMaterial; classroomId: number; classroomSlug: string | number;
  isTeacher: boolean; isArchived: boolean; assignments: ClassroomAssignment[]; mySubmissions?: ClassroomSubmission[];
  isUnseen?: boolean; onSeen?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [, navigate] = useLocation();

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/api/classrooms/${classroomId}/materials/${item.id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "materials"] }); toast({ title: "Classwork removed", type: "success" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const assignmentHref = item.linkedAssignment
    ? `/classrooms/${classroomSlug}/classwork/${item.linkedAssignment.slug ?? item.linkedAssignment.id}`
    : null;

  const linkedFullAssignment = item.linkedAssignment
    ? assignments.find((a) => a.id === item.linkedAssignment!.id) ?? null
    : null;
  const classroomStatus = isArchived ? "archived" : "active";
  const urgency = linkedFullAssignment && mySubmissions
    ? classifyAssignment(linkedFullAssignment, mySubmissions, classroomStatus)
    : null;

  const dueSoonDays = (() => {
    if (urgency !== "due-soon" || !linkedFullAssignment?.dueDate) return 0;
    const due = new Date(linkedFullAssignment.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.round((due.getTime() - today.getTime()) / 86400000);
  })();

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && isUnseen && onSeen) onSeen();
  };

  return (
    <div className={`rounded-2xl border bg-card overflow-hidden transition-colors ${isUnseen ? "border-primary/30" : "border-border"}`}>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button type="button" className="flex-1 min-w-0 text-left" onClick={handleToggle}>
          <div className="flex items-center gap-2 flex-wrap">
            {isUnseen && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
            <span className="font-semibold text-sm text-foreground">{item.title}</span>
            {item.url && <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />}
            {item.linkedAssignment && <Link2 className="h-3 w-3 text-primary shrink-0" />}
            {urgency === "overdue"   && <Badge className="text-[11px] px-1.5 py-0 h-5 bg-red-100 text-red-700 hover:bg-red-100 border-0">Overdue</Badge>}
            {urgency === "due-today" && <Badge className="text-[11px] px-1.5 py-0 h-5 bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">Due Today</Badge>}
            {urgency === "due-soon"  && <Badge className="text-[11px] px-1.5 py-0 h-5 bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-0">Due Soon (in {dueSoonDays} day{dueSoonDays !== 1 ? "s" : ""})</Badge>}
            {urgency === "new"       && <Badge className="text-[11px] px-1.5 py-0 h-5 bg-green-100 text-green-700 hover:bg-green-100 border-0">New</Badge>}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {new Date(item.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          {isTeacher && !isArchived && (
            <>
              <button type="button" className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <ClassworkDialog mode="edit" open={editOpen} onOpenChange={setEditOpen} initial={item}
                classroomId={classroomId} assignments={assignments} isArchived={isArchived} onSuccess={() => {}} />
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </>
          )}
          <button type="button" onClick={handleToggle} className="p-1">
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-3 bg-muted/20">
          {item.description && <p className="text-sm text-foreground/80 leading-relaxed">{item.description}</p>}
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
              <Paperclip className="h-3.5 w-3.5" />View attachment<ExternalLink className="h-3 w-3" />
            </a>
          )}
          {assignmentHref && (
            <button type="button" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              onClick={() => navigate(assignmentHref)}>
              <ArrowRight className="h-3.5 w-3.5" />Go to assignment: {item.linkedAssignment!.title}
            </button>
          )}
          {!item.description && !item.url && !assignmentHref && (
            <p className="text-sm text-muted-foreground italic">No additional details.</p>
          )}
        </div>
      )}
    </div>
  );
}
