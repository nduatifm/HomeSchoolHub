import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, ApiError } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  UserPlus,
  Send,
  Trash2,
  CheckCircle2,
  Clock,
  Mail,
  Copy,
  Check,
  KeyRound,
  AlertCircle,
  Wand2,
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
  // Invite state
  const [inviteForm, setInviteForm] = useState({ email: "" });
  const [inviteEmailError, setInviteEmailError] = useState<string | null>(null);

  // Create account state
  const [createForm, setCreateForm] = useState({ name: "", gradeLevel: "", username: "", password: "", confirmPassword: "" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [createResult, setCreateResult] = useState<{ username: string; password: string } | null>(null);
  const [copiedCreateUsername, setCopiedCreateUsername] = useState(false);
  const [copiedCreatePw, setCopiedCreatePw] = useState(false);

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
      setInviteForm({ email: "" });
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

  const createDirectMutation = useMutation({
    mutationFn: (data: { name: string; gradeLevel: string; username: string; password: string }) =>
      apiRequest("/api/students/create-direct", { method: "POST", body: JSON.stringify(data) }) as Promise<{ student: any; username: string }>,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/students/parent"] });
      setCreateResult({ username: data.username, password: createForm.password });
      toast({ title: "Account created", description: "Share these login details with your child." });
    },
    onError: (err: any) => {
      if (err?.message === "username_taken") {
        setUsernameError("That username is already taken. Try a different one.");
      } else {
        setCreateError(err?.message ?? "Something went wrong. Please try again.");
      }
    },
  });

  useEffect(() => {
    const raw = createForm.username.trim();
    if (!raw) {
      setUsernameAvailable(null);
      setIsCheckingUsername(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }
    const valid = /^[a-z0-9][a-z0-9.]{1,18}[a-z0-9]$/i.test(raw);
    if (!valid) {
      setUsernameAvailable(null);
      return;
    }
    setIsCheckingUsername(true);
    setUsernameAvailable(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await apiRequest(`/api/students/check-username?username=${encodeURIComponent(raw.toLowerCase())}`) as { available: boolean };
        setUsernameAvailable(data.available);
        if (!data.available) setUsernameError("That username is already taken.");
        else setUsernameError(null);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 450);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [createForm.username]);

  const isInviteFormValid =
    inviteForm.email.trim() &&
    !inviteStudentMutation.isPending;

  const pendingInvites = invites.filter((i: any) => i.status === "pending");
  const acceptedInvites = invites.filter((i: any) => i.status === "accepted");

  async function handleSuggestUsername() {
    if (!createForm.name.trim()) {
      setUsernameError("Enter a name first so we can suggest a username.");
      return;
    }
    setIsSuggesting(true);
    setUsernameError(null);
    try {
      const data = await apiRequest(`/api/students/suggest-username?name=${encodeURIComponent(createForm.name.trim())}`) as { username: string };
      setCreateForm(f => ({ ...f, username: data.username }));
    } catch {
      setUsernameError("Couldn't generate a suggestion. Try typing one manually.");
    } finally {
      setIsSuggesting(false);
    }
  }

  function handleCreateSubmit() {
    setCreateError(null);
    setUsernameError(null);
    if (!createForm.name.trim() || !createForm.password) {
      setCreateError("Name and password are required.");
      return;
    }
    if (createForm.password.length < 6) {
      setCreateError("Password must be at least 6 characters.");
      return;
    }
    if (createForm.password !== createForm.confirmPassword) {
      setCreateError("Passwords do not match.");
      return;
    }
    if (createForm.username.trim()) {
      const u = createForm.username.trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9.]{1,18}[a-z0-9]$/.test(u)) {
        setUsernameError("3–20 characters, letters/numbers/dots only, cannot start or end with a dot.");
        return;
      }
    }
    createDirectMutation.mutate({
      name: createForm.name,
      gradeLevel: createForm.gradeLevel,
      username: createForm.username.trim().toLowerCase(),
      password: createForm.password,
    });
  }

  function resetCreateForm() {
    setCreateForm({ name: "", gradeLevel: "", username: "", password: "", confirmPassword: "" });
    setCreateError(null);
    setUsernameError(null);
    setCreateResult(null);
    setCopiedCreateUsername(false);
    setCopiedCreatePw(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <main className="px-4 sm:px-6 pt-20 md:pt-8 pb-16 max-w-2xl mx-auto space-y-8">

          {/* ── Page header ── */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Add a Child</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Send your child an invite link, or create a managed account for them directly.
            </p>
          </div>

          {/* ── Invite form ── */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Send an invite</p>
                <p className="text-xs text-muted-foreground">
                  They'll receive an email with a personal signup link.
                </p>
              </div>
            </div>

            <div className="px-6 py-5">
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
                    setInviteForm({ email: e.target.value });
                    setInviteEmailError(null);
                  }}
                  className={`h-10 ${inviteEmailError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  data-testid="input-invite-email"
                />
                {inviteEmailError && (
                  <p className="text-xs text-destructive leading-snug mt-1.5">{inviteEmailError}</p>
                )}
              </div>
            </div>

            <div className="px-6 pb-5">
              <Button
                onClick={() => inviteStudentMutation.mutate(inviteForm)}
                disabled={!isInviteFormValid}
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

          {/* ── Divider ── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground px-1">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* ── Create account directly ── */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <KeyRound className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Create an account directly</p>
                <p className="text-xs text-muted-foreground">
                  For younger children — you set the password, no email needed.
                </p>
              </div>
            </div>

            {createResult ? (
              <div className="px-6 py-5 space-y-3">
                <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2.5 bg-muted/30">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">Username</p>
                      <p className="text-sm font-medium text-foreground truncate select-all font-mono">{createResult.username}</p>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(createResult.username); setCopiedCreateUsername(true); setTimeout(() => setCopiedCreateUsername(false), 2000); }}
                      className="ml-3 p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                    >
                      {copiedCreateUsername ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 bg-muted/30">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">Password</p>
                      <p className="font-mono text-base font-bold text-foreground tracking-widest select-all">{createResult.password}</p>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(createResult.password); setCopiedCreatePw(true); setTimeout(() => setCopiedCreatePw(false), 2000); }}
                      className="ml-3 p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
                    >
                      {copiedCreatePw ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">These are shown once. Save them before closing.</p>
                <Button className="w-full h-10" onClick={resetCreateForm}>Done</Button>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="create-name">Child's name</Label>
                  <Input
                    id="create-name"
                    placeholder="Alex Johnson"
                    value={createForm.name}
                    onChange={(e) => { setCreateForm(f => ({ ...f, name: e.target.value })); setCreateError(null); }}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-username" className="flex items-center justify-between">
                    <span>
                      Username <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleSuggestUsername}
                      disabled={isSuggesting}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium disabled:opacity-50 transition-colors"
                    >
                      {isSuggesting ? (
                        <span className="h-3 w-3 rounded-full border-2 border-primary/40 border-t-primary animate-spin inline-block" />
                      ) : (
                        <Wand2 className="h-3 w-3" />
                      )}
                      Suggest
                    </button>
                  </Label>
                  <div className="relative">
                    <Input
                      id="create-username"
                      placeholder="e.g. alex.j — leave blank to auto-generate"
                      value={createForm.username}
                      onChange={(e) => { setCreateForm(f => ({ ...f, username: e.target.value })); setUsernameError(null); setUsernameAvailable(null); }}
                      className={`h-10 font-mono pr-8 ${usernameError ? "border-destructive focus-visible:ring-destructive" : usernameAvailable === true ? "border-green-500 focus-visible:ring-green-500" : ""}`}
                    />
                    {createForm.username.trim() && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        {isCheckingUsername ? (
                          <span className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin inline-block" />
                        ) : usernameAvailable === true ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        ) : usernameAvailable === false ? (
                          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  {usernameError ? (
                    <p className="text-xs text-destructive flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {usernameError}
                    </p>
                  ) : usernameAvailable === true ? (
                    <p className="text-xs text-green-600 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      Username is available
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Letters, numbers and dots only. Leave blank to auto-generate.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-pw">Password</Label>
                  <Input
                    id="create-pw"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={createForm.password}
                    onChange={(e) => { setCreateForm(f => ({ ...f, password: e.target.value })); setCreateError(null); }}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="create-pw2">Confirm password</Label>
                  <Input
                    id="create-pw2"
                    type="password"
                    placeholder="Repeat password"
                    value={createForm.confirmPassword}
                    onChange={(e) => { setCreateForm(f => ({ ...f, confirmPassword: e.target.value })); setCreateError(null); }}
                    className="h-10"
                  />
                </div>

                {createError && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {createError}
                  </p>
                )}

                <Button
                  onClick={handleCreateSubmit}
                  disabled={createDirectMutation.isPending}
                  className="w-full h-10 gap-2"
                >
                  {createDirectMutation.isPending ? "Creating…" : "Create account"}
                </Button>
              </div>
            )}
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

              {pendingInvites.length > 0 && (
                <div className="space-y-2">
                  {pendingInvites.map((invite: any) => (
                    <div
                      key={invite.id}
                      data-testid={`row-invite-${invite.id}`}
                      className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-border bg-card"
                    >
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-xs font-bold text-amber-700">
                        {(invite.studentName as string)?.[0]?.toUpperCase() || (invite.email as string)?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {(invite.studentName as string) || (invite.email as string)}
                        </p>
                        {(invite.studentName as string) && (
                          <p className="text-xs text-muted-foreground truncate">{invite.email}</p>
                        )}
                      </div>
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
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-xs font-bold text-green-700">
                        {(invite.studentName as string)?.[0]?.toUpperCase() || (invite.email as string)?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {(invite.studentName as string) || (invite.email as string)}
                        </p>
                        {(invite.studentName as string) && (
                          <p className="text-xs text-muted-foreground truncate">{invite.email}</p>
                        )}
                      </div>
                      <StatusChip status={invite.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
