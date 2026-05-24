import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, ApiError } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// ── Copy-to-clipboard helper ──────────────────────────────────────────────────

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
      className="inline-flex items-center gap-1.5 font-mono font-bold text-xs tracking-widest text-primary bg-primary/8 hover:bg-primary/15 px-2.5 py-1 rounded-lg transition-colors"
    >
      {code}
      {copied
        ? <Check className="h-3 w-3 text-green-600 shrink-0" />
        : <Copy className="h-3 w-3 opacity-40 shrink-0" />}
    </button>
  );
}

// ── Status chip ───────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full whitespace-nowrap">
        <CheckCircle2 className="h-3 w-3" /> Accepted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full whitespace-nowrap">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

// ── Copyable credential row ───────────────────────────────────────────────────

function CredentialRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/40 rounded-xl">
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground mb-0.5 uppercase tracking-wide font-medium">{label}</p>
        <p className={`text-sm font-semibold text-foreground select-all truncate ${mono ? "font-mono tracking-wide" : ""}`}>
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        title={`Copy ${label.toLowerCase()}`}
        className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ── Invite row ────────────────────────────────────────────────────────────────

function InviteRow({ invite, onRevoke, revoking }: { invite: any; onRevoke: () => void; revoking: boolean }) {
  const isPending = invite.status === "pending";
  const initial =
    (invite.studentName as string)?.[0]?.toUpperCase() ||
    (invite.email as string)?.[0]?.toUpperCase() ||
    "?";

  return (
    <div
      data-testid={`row-invite-${invite.id}`}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-colors ${
        isPending ? "border-border bg-card" : "border-border bg-muted/20"
      }`}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
        isPending ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
      }`}>
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {(invite.studentName as string) || (invite.email as string)}
        </p>
        {invite.studentName && (
          <p className="text-xs text-muted-foreground truncate">{invite.email}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {invite.code && <CopyCode code={invite.code} />}
        <StatusChip status={invite.status} />
        {isPending && (
          <button
            type="button"
            onClick={onRevoke}
            disabled={revoking}
            title="Revoke invite"
            data-testid={`button-revoke-invite-${invite.id}`}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ParentInvitesPage() {
  const [activePath, setActivePath] = useState<"invite" | "create">("invite");

  // Invite form
  const [inviteForm, setInviteForm] = useState({ email: "" });
  const [inviteEmailError, setInviteEmailError] = useState<string | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({ name: "", gradeLevel: "", username: "", password: "", confirmPassword: "" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [createResult, setCreateResult] = useState<{ username: string; password: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: invites = [] } = useQuery<StudentInvite[]>({ queryKey: ["/api/invites/student/parent"] });

  const inviteStudentMutation = useMutation({
    mutationFn: (data: typeof inviteForm) =>
      apiRequest("/api/invites/student", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites/student/parent"] });
      toast({ title: "Invite sent!", description: "They'll get an email with a sign-up link.", type: "success" });
      setInviteForm({ email: "" });
      setInviteEmailError(null);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 409) {
        setInviteEmailError(
          err.message === "pending_invite_exists"
            ? "Already sent. Check below, or revoke it to resend."
            : "Already has an account — they can log in directly.",
        );
      } else {
        toast({ title: "Couldn't send invite", description: "Something went wrong. Please try again.", type: "error" });
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

  const createDirectMutation = useMutation({
    mutationFn: (data: { name: string; gradeLevel: string; username: string; password: string }) =>
      apiRequest("/api/students/create-direct", { method: "POST", body: JSON.stringify(data) }) as Promise<{ student: any; username: string }>,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/students/parent"] });
      setCreateResult({ username: data.username, password: createForm.password });
      toast({ title: "Account created!", description: "Share these login details with your child." });
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
    if (!raw) { setUsernameAvailable(null); setIsCheckingUsername(false); return; }
    const valid = /^[a-z0-9][a-z0-9.]{1,18}[a-z0-9]$/i.test(raw);
    if (!valid) { setUsernameAvailable(null); return; }
    setIsCheckingUsername(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await apiRequest(`/api/students/check-username?username=${encodeURIComponent(raw.toLowerCase())}`) as { available: boolean };
        setUsernameAvailable(data.available);
        setUsernameError(data.available ? null : "That username is already taken.");
      } catch { setUsernameAvailable(null); }
      finally { setIsCheckingUsername(false); }
    }, 450);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [createForm.username]);

  async function handleSuggestUsername() {
    if (!createForm.name.trim()) { setUsernameError("Enter a name first."); return; }
    setIsSuggesting(true);
    setUsernameError(null);
    try {
      const data = await apiRequest(`/api/students/suggest-username?name=${encodeURIComponent(createForm.name.trim())}`) as { username: string };
      setCreateForm(f => ({ ...f, username: data.username }));
    } catch { setUsernameError("Couldn't generate a suggestion. Try typing one manually."); }
    finally { setIsSuggesting(false); }
  }

  function handleCreateSubmit() {
    setCreateError(null);
    setUsernameError(null);
    if (!createForm.name.trim() || !createForm.password) { setCreateError("Name and password are required."); return; }
    if (createForm.password.length < 6) { setCreateError("Password must be at least 6 characters."); return; }
    if (createForm.password !== createForm.confirmPassword) { setCreateError("Passwords do not match."); return; }
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
  }

  const pendingInvites = (invites as any[]).filter(i => i.status === "pending");
  const acceptedInvites = (invites as any[]).filter(i => i.status === "accepted");

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[228px]">
        <main className="px-4 sm:px-6 pt-20 md:pt-8 pb-16 max-w-xl mx-auto space-y-6">

          {/* ── Header ── */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Add a Child</h1>
          </div>

          {/* ── Path selector ── */}
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                key: "invite" as const,
                icon: <Mail className="h-4 w-4" />,
                title: "Send invite",
                sub: "Child signs up with the link",
              },
              {
                key: "create" as const,
                icon: <KeyRound className="h-4 w-4" />,
                title: "Create account",
                sub: "You set the login — best for young kids",
              },
            ].map(({ key, icon, title, sub }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActivePath(key)}
                className={`flex flex-col items-start gap-2.5 p-4 rounded-2xl border-2 text-left transition-all duration-150 active:scale-[0.98] ${
                  activePath === key
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/20"
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  activePath === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {icon}
                </div>
                <div>
                  <p className={`text-sm font-semibold leading-none ${activePath === key ? "text-primary" : "text-foreground"}`}>
                    {title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{sub}</p>
                </div>
              </button>
            ))}
          </div>

          {/* ── Invite by email ── */}
          {activePath === "invite" && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Child's email address
                  </label>
                  <Input
                    type="email"
                    placeholder="child@example.com"
                    value={inviteForm.email}
                    onChange={(e) => { setInviteForm({ email: e.target.value }); setInviteEmailError(null); }}
                    className={`h-10 ${inviteEmailError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    data-testid="input-invite-email"
                  />
                  {inviteEmailError && (
                    <p className="text-xs text-destructive flex items-start gap-1.5 leading-snug">
                      <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                      {inviteEmailError}
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => inviteStudentMutation.mutate(inviteForm)}
                  disabled={!inviteForm.email.trim() || inviteStudentMutation.isPending}
                  className="w-full h-10 gap-2"
                  data-testid="button-send-invite"
                >
                  {inviteStudentMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Sending…
                    </span>
                  ) : (
                    <><Send className="h-4 w-4" />Send Invite</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ── Create account ── */}
          {activePath === "create" && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {createResult ? (
                /* Success state */
                <div className="px-5 py-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Account created!</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Share with your child — the password won't appear again.
                  </p>
                  <div className="space-y-2">
                    <CredentialRow label="Username" value={createResult.username} mono />
                    <CredentialRow label="Password" value={createResult.password} mono />
                  </div>
                  <Button className="w-full h-10" variant="outline" onClick={resetCreateForm}>
                    Add another child
                  </Button>
                </div>
              ) : (
                /* Create form */
                <div className="px-5 py-5 space-y-4">
                  {/* Name + Grade */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="create-name">Name</Label>
                      <Input
                        id="create-name"
                        placeholder="First Last"
                        value={createForm.name}
                        onChange={(e) => { setCreateForm(f => ({ ...f, name: e.target.value })); setCreateError(null); }}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="create-grade">
                        Grade <span className="text-muted-foreground font-normal text-xs">optional</span>
                      </Label>
                      <Input
                        id="create-grade"
                        placeholder="e.g. 4th"
                        value={createForm.gradeLevel}
                        onChange={(e) => setCreateForm(f => ({ ...f, gradeLevel: e.target.value }))}
                        className="h-10"
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div className="space-y-1.5">
                    <Label htmlFor="create-username" className="flex items-center justify-between">
                      <span>Username <span className="text-muted-foreground font-normal text-xs">optional</span></span>
                      <button
                        type="button"
                        onClick={handleSuggestUsername}
                        disabled={isSuggesting}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium disabled:opacity-50 transition-colors"
                      >
                        {isSuggesting
                          ? <span className="h-3 w-3 rounded-full border-2 border-primary/40 border-t-primary animate-spin inline-block" />
                          : <Wand2 className="h-3 w-3" />}
                        Suggest
                      </button>
                    </Label>
                    <div className="relative">
                      <Input
                        id="create-username"
                        placeholder="Leave blank to auto-generate"
                        value={createForm.username}
                        onChange={(e) => { setCreateForm(f => ({ ...f, username: e.target.value })); setUsernameError(null); setUsernameAvailable(null); }}
                        className={`h-10 font-mono pr-9 ${usernameError ? "border-destructive" : usernameAvailable === true ? "border-green-500" : ""}`}
                      />
                      {createForm.username.trim() && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          {isCheckingUsername
                            ? <span className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin inline-block" />
                            : usernameAvailable === true
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            : usernameAvailable === false
                            ? <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                            : null}
                        </div>
                      )}
                    </div>
                    {usernameError ? (
                      <p className="text-xs text-destructive flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />{usernameError}
                      </p>
                    ) : usernameAvailable === true ? (
                      <p className="text-xs text-green-600 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />Username is available
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Letters, numbers and dots only.</p>
                    )}
                  </div>

                  {/* Passwords side by side */}
                  <div className="grid grid-cols-2 gap-3">
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
                      <Label htmlFor="create-pw2">Confirm</Label>
                      <Input
                        id="create-pw2"
                        type="password"
                        placeholder="Repeat password"
                        value={createForm.confirmPassword}
                        onChange={(e) => { setCreateForm(f => ({ ...f, confirmPassword: e.target.value })); setCreateError(null); }}
                        className="h-10"
                      />
                    </div>
                  </div>

                  {createError && (
                    <p className="text-xs text-destructive flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />{createError}
                    </p>
                  )}

                  <Button
                    onClick={handleCreateSubmit}
                    disabled={createDirectMutation.isPending}
                    className="w-full h-10 gap-2"
                  >
                    {createDirectMutation.isPending ? "Creating…" : "Create Account"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Sent invites list ── */}
          {(invites as any[]).length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Sent Invites</h2>
                <span className="text-xs text-muted-foreground">{(invites as any[]).length} total</span>
              </div>

              {pendingInvites.length > 0 && (
                <div className="space-y-2">
                  {pendingInvites.map((invite: any) => (
                    <InviteRow
                      key={invite.id}
                      invite={invite}
                      onRevoke={() => revokeInviteMutation.mutate(invite.id)}
                      revoking={revokeInviteMutation.isPending}
                    />
                  ))}
                </div>
              )}

              {acceptedInvites.length > 0 && (
                <div className="space-y-2">
                  {pendingInvites.length > 0 && (
                    <p className="text-xs font-medium text-muted-foreground pt-1">Accepted</p>
                  )}
                  {acceptedInvites.map((invite: any) => (
                    <InviteRow
                      key={invite.id}
                      invite={invite}
                      onRevoke={() => {}}
                      revoking={false}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Empty state ── */}
          {(invites as any[]).length === 0 && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No invites sent yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">Pick an option above to get started.</p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}