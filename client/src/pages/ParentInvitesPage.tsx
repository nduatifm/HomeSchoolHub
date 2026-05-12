import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, ApiError } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ModernSidebar from "@/components/ModernSidebar";
import type { StudentInvite } from "@shared/schema";

export default function ParentInvitesPage() {
  const [inviteForm, setInviteForm] = useState({ email: "", studentName: "", gradeLevel: "" });
  const [inviteEmailError, setInviteEmailError] = useState<string | null>(null);

  const { data: invites = [] } = useQuery<StudentInvite[]>({ queryKey: ["/api/invites/student/parent"] });

  const inviteStudentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/invites/student", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites/student/parent"] });
      toast({ title: "Invite sent!", description: "Your child will receive an email with a direct signup link.", type: "success" });
      setInviteForm({ email: "", studentName: "", gradeLevel: "" });
      setInviteEmailError(null);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 409) {
        setInviteEmailError("A student account already exists for this email — they can log in directly from the login page.");
      } else {
        toast({ title: "Could not send invite", description: "Something went wrong. Please try again.", type: "error" });
      }
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/invites/student/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites/student/parent"] });
      toast({ title: "Invite revoked", type: "success" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <main className="p-4 sm:p-5 pt-18 md:pt-5 max-w-4xl mx-auto">
          <h1 className="text-xl font-semibold text-foreground mb-5 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Invite Student
          </h1>

          <div className="rounded-2xl border border-border p-5 mb-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Send an invite</h2>
            <div className="space-y-1">
              <Input
                placeholder="Student Email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => {
                  setInviteForm({ ...inviteForm, email: e.target.value });
                  setInviteEmailError(null);
                }}
                className={inviteEmailError ? "border-destructive focus-visible:ring-destructive" : ""}
                data-testid="input-invite-email"
              />
              {inviteEmailError && (
                <p className="text-xs text-destructive leading-snug">{inviteEmailError}</p>
              )}
            </div>
            <Input
              placeholder="Student Name"
              value={inviteForm.studentName}
              onChange={(e) => setInviteForm({ ...inviteForm, studentName: e.target.value })}
              data-testid="input-invite-name"
            />
            <Input
              placeholder="Grade Level"
              value={inviteForm.gradeLevel}
              onChange={(e) => setInviteForm({ ...inviteForm, gradeLevel: e.target.value })}
              data-testid="input-invite-grade"
            />
            <Button
              onClick={() => inviteStudentMutation.mutate(inviteForm)}
              disabled={inviteStudentMutation.isPending}
              className="w-full"
              data-testid="button-send-invite"
            >
              {inviteStudentMutation.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Sent Invites</h2>
            <div className="rounded-2xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Invite Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((i: any) => (
                    <TableRow key={i.id} data-testid={`row-invite-${i.id}`}>
                      <TableCell>{i.studentName}</TableCell>
                      <TableCell>{i.email}</TableCell>
                      <TableCell>
                        {i.code
                          ? <span className="font-mono font-semibold text-sm tracking-widest text-primary">{i.code}</span>
                          : <span className="text-muted-foreground text-xs italic">—</span>
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={i.status === "accepted" ? "default" : i.status === "pending" ? "outline" : "secondary"}>
                          {i.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {i.status === "pending" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive h-7 px-2"
                            onClick={() => revokeInviteMutation.mutate(i.id)}
                            disabled={revokeInviteMutation.isPending}
                            data-testid={`button-revoke-invite-${i.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
