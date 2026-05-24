import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, ApiError } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UserPlus,
  Send,
  Trash2,
  CheckCircle2,
  Clock,
  Mail,
  User,
  GraduationCap,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ModernSidebar from "@/components/ModernSidebar";
import type { StudentInvite } from "@shared/schema";

// ── Copy-to-clipboard helper ─────────────────────────────────────────────────
function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy invite code"
      className="inline-flex items-center gap-1.5 font-mono font-bold text-sm tracking-widest text-primary bg-primary/8 hover:bg-primary/15 px-2.5 py-1 rounded-lg transition-colors"
    >
      {code}
      {copied
        ? <Check className="h-3 w-3 text-green-600 shrink-0" />
        : <Copy className="h-3 w-3 opacity-50 shrink-0" />}
    </button>
  );
}

// ── Status chip ───────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: string }) {
  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">
        <CheckCircle2 className="h-3 w-3" /> Accepted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ParentInvitesPage() {
  const [inviteForm, setInviteForm] = useState({ email: "", studentName: "", gradeLevel: "" });
  const [inviteEmailError, setInviteEmailError] = useState<string | null>(null);

  const { data: invites = [] } = useQuery<StudentInvite[]>({
    queryKey: ["/api/invites/student/parent"],
  });

  const inviteStudentMutation = useMutation({
    mutationFn: (data: typeof inviteForm) =>
      apiRequest("/api/invites/student", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites/student/parent"] });
      toast({
        title: "Invite sent!",
        description: "Your child will receive an email with a signup link.",
        type: "success",
      });
      setInviteForm({ email: "", studentName: "", gradeLevel: "" });
      setInviteEmailError(null);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 409) {
        if (err.message === "pending_invite_exists") {
          setInviteEmailError(
            "An invite was already sent to this email — check your list below or revoke and resend.",
          );
        } else {
          setInviteEmailError(
            "A student account already exists for this email — they can log in directly.",
          );
        }
      } else {
        toast({ title: "Couldn't send invite", description: "Something went wrong. Please try again.", type: "error" });
      }
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/invites/student/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites/student/parent"] });
      toast({ title: "Invite revoked", type: "success" });
    },
  });

  const isFormValid =
    inviteForm.email.trim() &&
    inviteForm.studentName.trim() &&
    !inviteStudentMutation.isPending;

  const pendingInvites = invites.filter((i: any) => i.status === "pending");
  const acceptedInvites = invites.filter((i: any) => i.status === "accepted");

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <main className="px-4 sm:px-6 pt-20 md:pt-8 pb-16 max-w-2xl mx-auto space-y-8">

          {/* ── Page header ── */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Invite Your Child</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Send your child an invite link to create their student account and join your classrooms.
            </p>
          </div>

          {/* ── Invite form ── */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* Form header */}
            <div className="px-6 pt-5 pb-4 border-b border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">New invite</p>
                <p className="text-xs text-muted-foreground">
                  They'll receive an email with a personal signup link.
                </p>
              </div>
            </div>

            {/* Fields */}
            <div className="px-6 py-5 space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Email address
                </label>
                <Input
                  type="email"
                  placeholder="child@example.com"
                  value={inviteForm.email}
                  onChange={(e) => {
                    setInviteForm({ ...inviteForm, email: e.target.value });
                    setInviteEmailError(null);
                  }}
                  className={`h-10 ${inviteEmailError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  data-testid="input-invite-email"
                />
                {inviteEmailError && (
                  <p className="text-xs text-destructive leading-snug">{inviteEmailError}</p>
                )}
              </div>

              {/* Name + Grade in a row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Student name
                  </label>
                  <Input
                    placeholder="First Last"
                    value={inviteForm.studentName}
                    onChange={(e) => setInviteForm({ ...inviteForm, studentName: e.target.value })}
                    className="h-10"
                    data-testid="input-invite-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                    Grade level
                  </label>
                  <Input
                    placeholder="e.g. 4th grade"
                    value={inviteForm.gradeLevel}
                    onChange={(e) => setInviteForm({ ...inviteForm, gradeLevel: e.target.value })}
                    className="h-10"
                    data-testid="input-invite-grade"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="px-6 pb-5">
              <Button
                onClick={() => inviteStudentMutation.mutate(inviteForm)}
                disabled={!isFormValid}
                className="w-full h-10 gap-2"
                data-testid="button-send-invite"
              >
                {inviteStudentMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Sending…
                  </span>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Invite
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* ── Sent invites ── */}
          {invites.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">
                Sent Invites
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {invites.length} total
                </span>
              </h2>

              {/* Pending */}
              {pendingInvites.length > 0 && (
                <div className="space-y-2">
                  {pendingInvites.map((invite: any) => (
                    <div
                      key={invite.id}
                      data-testid={`row-invite-${invite.id}`}
                      className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-border bg-card"
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-xs font-bold text-amber-700">
                        {(invite.studentName as string)?.[0]?.toUpperCase() ?? "?"}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{invite.studentName}</p>
                        <p className="text-xs text-muted-foreground truncate">{invite.email}</p>
                      </div>

                      {/* Code + status */}
                      <div className="flex items-center gap-2 shrink-0">
                        {invite.code && <CopyCode code={invite.code} />}
                        <StatusChip status={invite.status} />
                        <button
                          type="button"
                          onClick={() => revokeInviteMutation.mutate(invite.id)}
                          disabled={revokeInviteMutation.isPending}
                          title="Revoke invite"
                          data-testid={`button-revoke-invite-${invite.id}`}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Accepted */}
              {acceptedInvites.length > 0 && (
                <div className="space-y-2">
                  {acceptedInvites.length > 0 && pendingInvites.length > 0 && (
                    <p className="text-xs font-medium text-muted-foreground pt-1">Accepted</p>
                  )}
                  {acceptedInvites.map((invite: any) => (
                    <div
                      key={invite.id}
                      data-testid={`row-invite-${invite.id}`}
                      className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-border bg-muted/30"
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-xs font-bold text-green-700">
                        {(invite.studentName as string)?.[0]?.toUpperCase() ?? "?"}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{invite.studentName}</p>
                        <p className="text-xs text-muted-foreground truncate">{invite.email}</p>
                      </div>

                      <StatusChip status={invite.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Empty state ── */}
          {invites.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No invites sent yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fill in the form above to invite your child.
                </p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}