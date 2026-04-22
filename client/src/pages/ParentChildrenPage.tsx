import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueries, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, MessageSquare, School } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ModernSidebar from "@/components/ModernSidebar";
import ModernCombobox from "@/components/ModernCombobox";
import type { Student, User, Classroom, ClassroomAssignment, ClassroomSubmission, Assignment, StudentAssignment } from "@shared/schema";

type PublicUser = Pick<User, "id" | "name" | "email" | "role" | "profilePicture">;
type AssignedTeacherRef = { id: number; name: string; email: string } | null;
type ChildStat = Student & { pct: number | null; completed: number; total: number; classroomCount: number };
type AssignmentWithStatus = Assignment & { studentAssignment: StudentAssignment | null };

export default function ParentChildrenPage() {
  const { user } = useAuth();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] || "there";

  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({ receiverId: 0, content: "" });

  const { data: students = [] } = useQuery<Student[]>({ queryKey: ["/api/students/parent"] });
  const { data: users = [] } = useQuery<PublicUser[]>({ queryKey: ["/api/users"] });

  const childTeacherQueries = useQueries({
    queries: students.map((child) => ({
      queryKey: ["/api/teachers/student", child.id],
      enabled: students.length > 0,
    })),
  });

  const childClassroomQueries = useQueries({
    queries: students.map((child) => ({
      queryKey: ["/api/classrooms/parent", child.id],
      queryFn: () => apiRequest(`/api/classrooms/parent/${child.id}`) as Promise<Classroom[]>,
      enabled: students.length > 0,
    })),
  });

  const childClassroomPairs = students.flatMap((child, ci) => {
    const childClassrooms = (childClassroomQueries[ci]?.data as Classroom[]) ?? [];
    return childClassrooms.map(c => ({ child, classroom: c }));
  });

  const childClassworkSubmissionQueries = useQueries({
    queries: childClassroomPairs.map(({ child, classroom }) => ({
      queryKey: ["/api/classrooms", classroom.id, "my-submissions", child.id],
      queryFn: () => apiRequest(`/api/classrooms/${classroom.id}/my-submissions?studentId=${child.id}`),
      enabled: childClassroomPairs.length > 0,
    })),
  });

  const childClassroomAssignmentQueries = useQueries({
    queries: childClassroomPairs.map(({ classroom }) => ({
      queryKey: ["/api/classrooms", classroom.id, "assignments"],
      queryFn: () => apiRequest(`/api/classrooms/${classroom.id}/assignments`),
      enabled: childClassroomPairs.length > 0,
    })),
  });

  const childLegacyAssignmentQueries = useQueries({
    queries: students.map((child) => ({
      queryKey: ["/api/assignments/student", child.id],
      queryFn: () => apiRequest(`/api/assignments/student/${child.id}`),
      enabled: students.length > 0,
    })),
  });

  const childStats: ChildStat[] = students.map((child, ci) => {
    let offset = 0;
    for (let j = 0; j < ci; j++) {
      offset += ((childClassroomQueries[j]?.data as Classroom[]) ?? []).length;
    }
    const childClassrooms = (childClassroomQueries[ci]?.data as Classroom[]) ?? [];
    const classroomCount = childClassrooms.length;

    const classworkCompleted = childClassrooms.reduce((sum, _, ki) => {
      const subs = (childClassworkSubmissionQueries[offset + ki]?.data as ClassroomSubmission[]) ?? [];
      return sum + subs.filter(s => s.status === "graded").length;
    }, 0);
    const classworkTotal = childClassrooms.reduce((sum, _, ki) => {
      const assigns = (childClassroomAssignmentQueries[offset + ki]?.data as ClassroomAssignment[]) ?? [];
      return sum + assigns.length;
    }, 0);

    const legacyAssignments = (childLegacyAssignmentQueries[ci]?.data as AssignmentWithStatus[]) ?? [];
    const legacyTotal = legacyAssignments.length;
    const legacyCompleted = legacyAssignments.filter(a => a.studentAssignment?.status === "graded").length;

    const total = classworkTotal + legacyTotal;
    const completed = classworkCompleted + legacyCompleted;
    const pct = total > 0 ? Math.round((completed / total) * 100) : null;
    return { ...child, pct, completed, total, classroomCount };
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/messages", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      toast({ title: "Message sent!", type: "success" });
      setMessageForm({ receiverId: 0, content: "" });
      setSendMessageOpen(false);
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <main className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto">
          <div className="mb-5">
            <h1 className="text-xl font-semibold text-foreground">{greeting}, {firstName} 👋</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>

          {childStats.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your Children</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {childStats.map((child, index) => {
                  const assignedTeacher = (childTeacherQueries[index]?.data ?? null) as AssignedTeacherRef;
                  return (
                    <div
                      key={child.id}
                      className="p-4 rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-primary">
                            {child.name?.charAt(0).toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground text-sm truncate">{child.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {child.gradeLevel ? `Grade ${child.gradeLevel}` : "Student"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3 py-2 border-y border-border/50">
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {assignedTeacher
                              ? <span className="text-foreground font-medium">{assignedTeacher.name}</span>
                              : <span className="italic">No teacher assigned yet</span>
                            }
                          </span>
                        </div>
                        {assignedTeacher && (
                          <button
                            onClick={() => {
                              setMessageForm({ receiverId: assignedTeacher.id, content: "" });
                              setSendMessageOpen(true);
                            }}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            Message
                          </button>
                        )}
                      </div>

                      {child.classroomCount > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <School className="w-3 h-3" />
                          <span>{child.classroomCount} {child.classroomCount === 1 ? "classroom" : "classrooms"}</span>
                        </div>
                      )}
                      {child.pct !== null ? (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{child.completed}/{child.total} assignments done</span>
                            <span className="font-medium text-foreground">{child.pct}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${child.pct}%` }} />
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No assignments yet</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">My Students</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Grade Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s: any) => (
                  <TableRow key={s.id} data-testid={`row-student-${s.id}`}>
                    <TableCell data-testid={`text-student-name-${s.id}`}>{s.name}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>{s.gradeLevel}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </main>
      </div>

      <Dialog open={sendMessageOpen} onOpenChange={(open) => {
        setSendMessageOpen(open);
        if (!open) setMessageForm({ receiverId: 0, content: "" });
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Message</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">To</label>
              <ModernCombobox
                users={users}
                selectedUserId={messageForm.receiverId}
                onSelect={(userId) => setMessageForm({ ...messageForm, receiverId: userId })}
                placeholder="Search users..."
                testId="select-receiver"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Type your message..."
                value={messageForm.content}
                onChange={(e) => setMessageForm({ ...messageForm, content: e.target.value })}
                rows={4}
                data-testid="input-message-content"
              />
            </div>
            <Button
              onClick={() => sendMessageMutation.mutate(messageForm)}
              disabled={sendMessageMutation.isPending || !messageForm.receiverId || !messageForm.content}
              className="w-full"
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
