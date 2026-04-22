import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ModernSidebar from "@/components/ModernSidebar";
import type { Student, EnrichedTutorRequest, User } from "@shared/schema";

type PublicTeacher = Pick<User, "id" | "name" | "email" | "teachingSubjects" | "yearsExperience">;

function RequestTutorDialog({
  open,
  onClose,
  students,
  teachers,
}: {
  open: boolean;
  onClose: () => void;
  students: Student[];
  teachers: PublicTeacher[];
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({ teacherId: null as number | null, message: "", studentId: null as number | null });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/tutor-requests", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutor-requests/parent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teachers/student"] });
      const approved = data?.status === "approved";
      toast({
        title: approved ? "Teacher assigned!" : "Request sent!",
        description: approved
          ? "Your child has been linked to the selected teacher."
          : "Your request has been sent. The teacher will review and approve it shortly.",
        type: "success",
      });
      setForm({ teacherId: null, message: "", studentId: null });
      onClose();
    },
    onError: () => toast({ title: "Couldn't send request — try again.", type: "error" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setForm({ teacherId: null, message: "", studentId: null }); onClose(); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Request a Tutor</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Which child needs a tutor?</label>
            <Select value={form.studentId?.toString() || ""} onValueChange={(val) => setForm({ ...form, studentId: parseInt(val) })}>
              <SelectTrigger data-testid="select-student-tutor-request">
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s: any) => (
                  <SelectItem key={s.id} value={s.id.toString()} textValue={`${s.name}${s.gradeLevel ? ` (Grade ${s.gradeLevel})` : ""}`}>
                    {s.name} {s.gradeLevel ? `(Grade ${s.gradeLevel})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Which teacher would you like?</label>
            <Select value={form.teacherId?.toString() || ""} onValueChange={(val) => setForm({ ...form, teacherId: parseInt(val) })}>
              <SelectTrigger data-testid="select-teacher-tutor-request">
                <SelectValue placeholder="Select a teacher" />
              </SelectTrigger>
              <SelectContent>
                {user?.roles?.includes("teacher") && user?.id && (
                  <SelectItem key="self" value={user.id.toString()} textValue="Myself (as teacher)">
                    <span className="font-medium">Myself (as teacher)</span>
                  </SelectItem>
                )}
                {teachers.filter((t: any) => t.id !== user?.id).map((t: any) => (
                  <SelectItem key={t.id} value={t.id.toString()} textValue={t.name}>
                    <span className="font-medium">{t.name}</span>
                    {(t.teachingSubjects?.length > 0 || t.yearsExperience) && (
                      <span className="text-xs text-muted-foreground ml-1.5">
                        {[t.teachingSubjects?.slice(0, 2).join(", "), t.yearsExperience && `${t.yearsExperience}y exp`].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Message (optional)</label>
            <Textarea
              placeholder="Any details about your child's needs, schedule, or subject..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={3}
              data-testid="input-tutor-request-message"
            />
          </div>
          <Button
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending || !form.studentId || !form.teacherId}
            className="w-full"
            data-testid="button-submit-tutor-request"
          >
            {mutation.isPending ? "Sending..." : "Send Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ParentTutorsPage() {
  const [requestTutorOpen, setRequestTutorOpen] = useState(false);

  const { data: students = [] } = useQuery<Student[]>({ queryKey: ["/api/students/parent"] });
  const { data: teachers = [] } = useQuery<PublicTeacher[]>({ queryKey: ["/api/teachers"] });
  const { data: tutorRequests = [] } = useQuery<EnrichedTutorRequest[]>({ queryKey: ["/api/tutor-requests/parent"] });

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <main className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" /> Find a Tutor
            </h1>
            <Button onClick={() => setRequestTutorOpen(true)} data-testid="button-request-tutor">
              Request Tutor
            </Button>
          </div>

          <div className="space-y-4">
            {tutorRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10 rounded-2xl border border-dashed border-border">
                No tutor requests yet. Click "Request Tutor" to get started.
              </p>
            ) : (
              tutorRequests.map((r: any) => (
                <div key={r.id} className="p-4 border rounded-lg" data-testid={`card-tutor-request-${r.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {r.studentName || "Your child"} → {r.teacherName || "Teacher"}
                      </p>
                      {r.studentGrade && (
                        <p className="text-xs text-muted-foreground">{r.studentGrade}</p>
                      )}
                      {r.message && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2" data-testid={`text-tutor-request-message-${r.id}`}>
                          "{r.message}"
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Requested: {new Date(r.requestDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "outline" : "secondary"}>
                      {r.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      <RequestTutorDialog
        open={requestTutorOpen}
        onClose={() => setRequestTutorOpen(false)}
        students={students}
        teachers={teachers}
      />
    </div>
  );
}
