import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  Trash2,
  Pencil,
  Paperclip,
  Link2,
  FileText,
  ChevronRight,
} from "lucide-react";
import type { ClassroomAssignment, ClassroomMaterial, ClassroomSubmission } from "@shared/schema";
import { classifyAssignment } from "@/lib/classroomNotifications";
import { getAttachmentKind } from "@/lib/classroomUtils";

export default function ClassworkCard({
  item,
  classroomId,
  classroomSlug,
  isTeacher,
  isArchived,
  assignments,
  mySubmissions,
  isUnseen,
  onSeen,
}: {
  item: ClassroomMaterial;
  classroomId: number;
  classroomSlug: string | number;
  isTeacher: boolean;
  isArchived: boolean;
  assignments: ClassroomAssignment[];
  mySubmissions?: ClassroomSubmission[];
  isUnseen?: boolean;
  onSeen?: () => void;
}) {
  const [, navigate] = useLocation();

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/classrooms/${classroomId}/materials/${item.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/classrooms", classroomId, "materials"],
      });
      toast({ title: "Classwork removed", type: "success" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const linkedFullAssignment = item.linkedAssignment
    ? assignments.find((a) => a.id === item.linkedAssignment!.id) ?? null
    : null;
  const classroomStatus = isArchived ? "archived" : "active";
  const urgency =
    linkedFullAssignment && mySubmissions
      ? classifyAssignment(linkedFullAssignment, mySubmissions, classroomStatus)
      : null;

  const dueSoonDays = (() => {
    if (urgency !== "due-soon" || !linkedFullAssignment?.dueDate) return 0;
    const due = new Date(linkedFullAssignment.dueDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.round((due.getTime() - today.getTime()) / 86400000);
  })();

  const materialHref = `/classrooms/${classroomSlug}/materials/${item.slug ?? item.id}`;
  const editHref = `${materialHref}/edit`;

  const urlKind = item.url ? getAttachmentKind(item.url) : null;

  return (
    <div
      className={`rounded-2xl border bg-card overflow-hidden transition-colors hover:border-primary/30 cursor-pointer ${
        isUnseen ? "border-primary/30" : "border-border"
      }`}
      onClick={() => { onSeen?.(); navigate(materialHref); }}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isUnseen && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
            <span className="font-semibold text-sm text-foreground">{item.title}</span>
            {urlKind === "pdf" && <FileText className="h-3 w-3 text-muted-foreground shrink-0" />}
            {urlKind === "link" && <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />}
            {item.linkedAssignment && <Link2 className="h-3 w-3 text-primary shrink-0" />}
            {urgency === "overdue" && (
              <Badge className="text-[11px] px-1.5 py-0 h-5 bg-red-100 text-red-700 hover:bg-red-100 border-0">
                Overdue
              </Badge>
            )}
            {urgency === "due-today" && (
              <Badge className="text-[11px] px-1.5 py-0 h-5 bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">
                Due Today
              </Badge>
            )}
            {urgency === "due-soon" && (
              <Badge className="text-[11px] px-1.5 py-0 h-5 bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-0">
                Due Soon (in {dueSoonDays} day{dueSoonDays !== 1 ? "s" : ""})
              </Badge>
            )}
            {urgency === "new" && (
              <Badge className="text-[11px] px-1.5 py-0 h-5 bg-green-100 text-green-700 hover:bg-green-100 border-0">
                New
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {new Date(item.uploadedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isTeacher && !isArchived && (
            <>
              <button
                type="button"
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                onClick={() => navigate(editHref)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
