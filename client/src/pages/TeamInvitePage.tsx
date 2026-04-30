import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Eye, CheckCircle, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "wouter";

type InviteInfo = {
  childId: number;
  childName: string | null;
  childGradeLevel: string | null;
  inviterName: string | null;
  role: "owner" | "member";
  inviteEmail: string | null;
  expiresAt: string | null;
};

export default function TeamInvitePage() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [accepted, setAccepted] = useState(false);

  const {
    data: invite,
    isLoading: inviteLoading,
    error: inviteError,
  } = useQuery<InviteInfo>({
    queryKey: ["/api/team-invite", token],
    queryFn: () => apiRequest(`/api/team-invite/${token}`),
    enabled: !!token,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => apiRequest(`/api/team-invite/${token}/accept`, { method: "POST" }),
    onSuccess: () => {
      setAccepted(true);
      toast({ title: "Invitation accepted!", description: "You now have access to this child's account." });
    },
    onError: (err: any) => {
      toast({ title: "Could not accept invitation", description: err?.message ?? "Something went wrong.", variant: "destructive" });
    },
  });

  // Auto-accept when:
  // 1. User is logged in (just returned from login/signup via ?next= redirect)
  // 2. Invite is loaded and valid
  // 3. No email mismatch
  // 4. Haven't already accepted and mutation isn't running
  useEffect(() => {
    if (!user || !invite || accepted || acceptMutation.isPending || acceptMutation.isError) return;
    const emailMismatch =
      !!invite.inviteEmail &&
      user.email.toLowerCase() !== invite.inviteEmail.toLowerCase();
    if (!emailMismatch) {
      acceptMutation.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, invite]);

  useEffect(() => {
    if (accepted) {
      const t = setTimeout(() => navigate("/children"), 2000);
      return () => clearTimeout(t);
    }
  }, [accepted, navigate]);

  const isLoading = authLoading || inviteLoading;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Error states — show even to unauthenticated users
  if (inviteError) {
    const msg = (inviteError as any)?.message ?? "";
    const isExpired = msg.toLowerCase().includes("expired");
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {isExpired ? "Invitation expired" : "Invitation not found"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {isExpired
                ? "This invitation link has expired. Ask the owner to send a new one."
                : "This invitation link is invalid or has already been used."}
            </p>
            {user ? (
              <Button variant="outline" onClick={() => navigate("/children")}>Go to my children</Button>
            ) : (
              <Button variant="outline" asChild><Link href="/login">Sign in</Link></Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Accepted state
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">You're in!</h2>
            <p className="text-sm text-muted-foreground">Redirecting you to your children…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invite) return null;

  const roleLabel = invite.role === "owner" ? "Owner" : "Member";
  const RoleIcon = invite.role === "owner" ? Shield : Eye;
  const returnTo = encodeURIComponent(`/team-invite/${token}`);

  const emailMismatch =
    !!user &&
    !!invite.inviteEmail &&
    user.email.toLowerCase() !== invite.inviteEmail.toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-xl">Family team invitation</CardTitle>
          <CardDescription>
            {invite.inviterName ?? "Someone"} has invited you to help manage{" "}
            <strong>{invite.childName ?? "a student"}</strong>'s Lyra Preparatory account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-2">
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Student</span>
              <span className="font-medium text-foreground">
                {invite.childName ?? "—"}
                {invite.childGradeLevel ? ` · ${invite.childGradeLevel}` : ""}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Invited by</span>
              <span className="font-medium text-foreground">{invite.inviterName ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your role</span>
              <Badge
                variant={invite.role === "owner" ? "default" : "secondary"}
                className="flex items-center gap-1"
              >
                <RoleIcon className="w-3 h-3" />
                {roleLabel}
              </Badge>
            </div>
            {invite.inviteEmail && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sent to</span>
                <span className="font-medium text-foreground">{invite.inviteEmail}</span>
              </div>
            )}
            {invite.expiresAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Expires</span>
                <span className="text-foreground">
                  {new Date(invite.expiresAt).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>

          {invite.role === "owner" ? (
            <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3">
              <strong>Owner access</strong> lets you view progress, send messages, manage tutors, and invite other co-parents.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-md p-3">
              <strong>Member access</strong> lets you view {invite.childName ?? "the student"}'s progress, classrooms, and reports in read-only mode.
            </p>
          )}

          {emailMismatch && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
              This invitation was sent to <strong>{invite.inviteEmail}</strong>, but you are signed in as{" "}
              <strong>{user?.email}</strong>. Please sign in with the correct account to accept.
            </p>
          )}

          {/* Not logged in: show login/signup buttons */}
          {!user ? (
            <div className="space-y-2">
              <p className="text-sm text-center text-muted-foreground">
                Sign in or create an account to accept this invitation.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" asChild>
                  <Link href={`/login?next=${returnTo}`}>Sign in</Link>
                </Button>
                <Button className="flex-1" asChild>
                  <Link href={`/signup?next=${returnTo}`}>Create account</Link>
                </Button>
              </div>
            </div>
          ) : (
            /* Logged in: show accept/decline buttons */
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/children")}>
                Decline
              </Button>
              <Button
                className="flex-1"
                disabled={acceptMutation.isPending || emailMismatch}
                onClick={() => acceptMutation.mutate()}
              >
                {acceptMutation.isPending ? "Accepting…" : "Accept invitation"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
