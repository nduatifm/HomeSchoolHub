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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, MessageSquare, School, Users, Shield, Eye, MoreVertical, UserPlus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ModernSidebar from "@/components/ModernSidebar";
import ModernCombobox from "@/components/ModernCombobox";
import type { Student, User, Classroom, ClassroomAssignment, ClassroomSubmission, Assignment, StudentAssignment } from "@shared/schema";

type PublicUser = Pick<User, "id" | "name" | "email" | "role" | "profilePicture">;
type AssignedTeacherRef = { id: number; name: string; email: string } | null;
type ChildStat = Student & { pct: number | null; completed: number; total: number; classroomCount: number };
type AssignmentWithStatus = Assignment & { studentAssignment: StudentAssignment | null };
type TeamMember = {
  id: number;
  childId: number;
  parentId: number;
  role: "owner" | "member";
  status: "active" | "pending";
  inviteEmail: string | null;
  parentName: string | null;
  parentEmail: string | null;
};

export default function ParentChildrenPage() {
  const { user } = useAuth();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] || "there";

  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({ receiverId: 0, content: "" });

  // Team management state
  const [teamPanelChildId, setTeamPanelChildId] = useState<number | null>(null);
  const [inviteDialogChildId, setInviteDialogChildId] = useState<number | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "member">("member");

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

  // Team queries — only fetched when the panel for that child is open
  const childTeamQueries = useQueries({
    queries: students.map((child) => ({
      queryKey: ["/api/children", child.id, "team"],
      queryFn: () => apiRequest(`/api/children/${child.id}/team`) as Promise<TeamMember[]>,
      enabled: teamPanelChildId === child.id,
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

  const inviteMutation = useMutation({
    mutationFn: ({ childId, email, role }: { childId: number; email: string; role: string }) =>
      apiRequest(`/api/children/${childId}/team/invite`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/children", vars.childId, "team"] });
      toast({ title: "Invitation sent!", description: `An invite has been sent to ${vars.email}.` });
      setInviteDialogChildId(null);
      setInviteEmail("");
      setInviteRole("member");
    },
    onError: (err: any) => {
      toast({ title: "Could not send invite", description: err?.message ?? "Something went wrong.", variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ childId, memberId }: { childId: number; memberId: number }) =>
      apiRequest(`/api/children/${childId}/team/${memberId}`, { method: "DELETE" }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/children", vars.childId, "team"] });
      toast({ title: "Member removed" });
    },
    onError: (err: any) => {
      toast({ title: "Could not remove member", description: err?.message ?? "Something went wrong.", variant: "destructive" });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ childId, memberId, role }: { childId: number; memberId: number; role: string }) =>
      apiRequest(`/api/children/${childId}/team/${memberId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/children", vars.childId, "team"] });
      toast({ title: "Role updated" });
    },
    onError: (err: any) => {
      toast({ title: "Could not update role", description: err?.message ?? "Something went wrong.", variant: "destructive" });
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
                  const teamIndex = students.findIndex(s => s.id === child.id);
                  const teamData = (childTeamQueries[teamIndex]?.data as TeamMember[]) ?? [];
                  const isTeamPanelOpen = teamPanelChildId === child.id;

                  // Determine if the current user is an owner for this child
                  const myMembership = teamData.find(m => m.parentId === user?.id && m.status === "active");
                  const iAmOwner = myMembership?.role === "owner";

                  return (
                    <div
                      key={child.id}
                      className="rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all overflow-hidden"
                    >
                      <div className="p-4">
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

                        {/* Family team toggle */}
                        <button
                          className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                          onClick={() => setTeamPanelChildId(isTeamPanelOpen ? null : child.id)}
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Family team</span>
                          <span className="ml-auto text-muted-foreground/60">{isTeamPanelOpen ? "▲" : "▼"}</span>
                        </button>
                      </div>

                      {/* Team panel */}
                      {isTeamPanelOpen && (
                        <div className="border-t border-border bg-muted/20 px-4 pt-3 pb-4 space-y-2">
                          {childTeamQueries[teamIndex]?.isLoading ? (
                            <p className="text-xs text-muted-foreground">Loading team…</p>
                          ) : teamData.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No team members yet.</p>
                          ) : (
                            teamData.map((member) => {
                              const isSelf = member.parentId === user?.id;
                              const RoleIcon = member.role === "owner" ? Shield : Eye;
                              return (
                                <div key={member.id} className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-[10px] font-bold text-primary">
                                      {(member.parentName ?? member.inviteEmail ?? "?").charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground truncate">
                                      {member.parentName ?? member.inviteEmail ?? "Unknown"}
                                      {isSelf && <span className="ml-1 text-muted-foreground font-normal">(you)</span>}
                                    </p>
                                  </div>
                                  <Badge
                                    variant={member.status === "pending" ? "secondary" : member.role === "owner" ? "default" : "secondary"}
                                    className="flex items-center gap-0.5 text-[10px] px-1.5 py-0 h-5"
                                  >
                                    {member.status === "pending" ? (
                                      "Pending"
                                    ) : (
                                      <>
                                        <RoleIcon className="w-2.5 h-2.5" />
                                        {member.role === "owner" ? "Owner" : "Member"}
                                      </>
                                    )}
                                  </Badge>
                                  {(iAmOwner || isSelf) && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className="p-0.5 rounded hover:bg-muted transition-colors">
                                          <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="text-sm">
                                        {iAmOwner && !isSelf && (
                                          <>
                                            {member.role !== "owner" && (
                                              <DropdownMenuItem
                                                onClick={() => changeRoleMutation.mutate({ childId: child.id, memberId: member.id, role: "owner" })}
                                              >
                                                <Shield className="w-3.5 h-3.5 mr-2" /> Make owner
                                              </DropdownMenuItem>
                                            )}
                                            {member.role !== "member" && (
                                              <DropdownMenuItem
                                                onClick={() => changeRoleMutation.mutate({ childId: child.id, memberId: member.id, role: "member" })}
                                              >
                                                <Eye className="w-3.5 h-3.5 mr-2" /> Make member
                                              </DropdownMenuItem>
                                            )}
                                          </>
                                        )}
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive"
                                          onClick={() => removeMemberMutation.mutate({ childId: child.id, memberId: member.id })}
                                        >
                                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                                          {isSelf ? "Leave team" : "Remove"}
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              );
                            })
                          )}

                          {iAmOwner && (
                            <button
                              onClick={() => {
                                setInviteDialogChildId(child.id);
                                setInviteEmail("");
                                setInviteRole("member");
                              }}
                              className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:underline"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Invite co-parent
                            </button>
                          )}
                        </div>
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

      {/* Send message dialog */}
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

      {/* Invite co-parent dialog */}
      <Dialog open={inviteDialogChildId !== null} onOpenChange={(open) => { if (!open) setInviteDialogChildId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a co-parent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send an invitation email to another parent or guardian so they can view and manage{" "}
              <strong>{students.find(s => s.id === inviteDialogChildId)?.name ?? "your child"}</strong>'s account.
            </p>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="coparent@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "owner" | "member")}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Owner — can invite others and manage the account</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Member — view-only access to progress and reports</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setInviteDialogChildId(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={inviteMutation.isPending || !inviteEmail.trim()}
                onClick={() => {
                  if (inviteDialogChildId !== null) {
                    inviteMutation.mutate({ childId: inviteDialogChildId, email: inviteEmail.trim(), role: inviteRole });
                  }
                }}
              >
                {inviteMutation.isPending ? "Sending…" : "Send invite"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
