import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { ApiError, apiRequest } from "@/lib/queryClient";
import { handleGoogleSignIn, loadGoogleSignInAvailability } from "@/lib/googleSignIn";
import { Link } from "wouter";
import { AlertCircle, Mail, CheckCircle } from "lucide-react";
import parentChild1 from "../assets/parent_child_1.jpg";

const BotanicalPattern = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M100,400 C150,250 250,150 400,50" />
      <path d="M120,340 C90,320 80,280 110,260 C120,270 130,290 120,340" fill="currentColor" fillOpacity="0.15" />
      <path d="M150,260 C110,240 100,190 140,170 C155,185 165,210 150,260" fill="currentColor" fillOpacity="0.15" />
      <path d="M190,190 C150,160 140,110 180,90 C195,110 205,140 190,190" fill="currentColor" fillOpacity="0.15" />
      <path d="M240,130 C200,100 190,50 230,30 C245,50 255,80 240,130" fill="currentColor" fillOpacity="0.15" />
      <path d="M130,350 C160,370 200,360 210,320 C190,320 160,330 130,350" fill="currentColor" fillOpacity="0.15" />
      <path d="M165,270 C205,290 250,280 260,230 C235,235 200,245 165,270" fill="currentColor" fillOpacity="0.15" />
      <path d="M210,195 C250,210 295,190 300,140 C275,150 240,165 210,195" fill="currentColor" fillOpacity="0.15" />
      <path d="M0,350 C100,300 200,200 250,0" />
      <path d="M30,330 C10,300 -10,260 20,230 C35,250 45,280 30,330" fill="currentColor" fillOpacity="0.15" />
      <path d="M70,280 C40,240 20,190 60,160 C75,185 85,220 70,280" fill="currentColor" fillOpacity="0.15" />
      <path d="M40,335 C80,360 120,340 130,290 C105,295 70,310 40,335" fill="currentColor" fillOpacity="0.15" />
      <path d="M90,265 C135,285 180,260 185,200 C160,210 120,230 90,265" fill="currentColor" fillOpacity="0.15" />
    </g>
  </svg>
);

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const teamInviteToken = (() => {
    try { return new URLSearchParams(window.location.search).get("teamInvite") || null; } catch { return null; }
  })();
  const nextPath = (() => {
    try {
      const p = new URLSearchParams(window.location.search).get("next") || "/dashboard";
      return p.startsWith("/") ? p : "/dashboard";
    } catch { return "/dashboard"; }
  })();

  const [googleAvailable, setGoogleAvailable] = useState(false);

  useEffect(() => {
    loadGoogleSignInAvailability().then(setGoogleAvailable);
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const googleError = params.get("google_error");
      const googleRoleRequired = params.get("google_role_required");
      if (googleError) {
        const clean = window.location.pathname;
        window.history.replaceState({}, "", clean);
        const messages: Record<string, string> = {
          no_credential: "Google Sign-In failed — no credential received. Please try again.",
          invalid_token: "Google Sign-In failed — could not verify your identity. Please try again.",
          csrf: "Google Sign-In failed — security check failed. Please try again.",
          server_error: "Google Sign-In failed — server error. Please try again.",
          no_account: "No account found for that Google address. Please sign up first.",
        };
        toast({ title: messages[googleError] ?? "Google Sign-In failed. Please try again.", type: "error", duration: 6000 });
      }
      if (googleRoleRequired === "1") {
        window.history.replaceState({}, "", window.location.pathname);
        setShowRoleDialog(true);
      }
    } catch { /* ignore */ }
  }, [toast]);

  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [googleRole, setGoogleRole] = useState<"teacher" | "parent">("parent");

  const [verificationAlert, setVerificationAlert] = useState<{ email: string } | null>(null);
  const [googleOnlyAlert, setGoogleOnlyAlert] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  function clearAlerts() {
    setVerificationAlert(null);
    setGoogleOnlyAlert(false);
  }

  async function handleResendVerification() {
    if (!verificationAlert) return;
    setResendState("sending");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationAlert.email }),
      });
      if (res.ok) {
        setResendState("sent");
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: data.error || "Failed to resend — try again.", type: "error" });
        setResendState("idle");
      }
    } catch {
      toast({ title: "Network error — please try again.", type: "error" });
      setResendState("idle");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearAlerts();
    setIsLoading(true);
    try {
      await login(email, password);
      toast({ title: "Welcome back!", type: "success" });
      if (teamInviteToken) {
        setLocation(`/team-invite/${teamInviteToken}`);
      } else {
        const pending = localStorage.getItem("pendingTeamInvite");
        if (pending) { localStorage.removeItem("pendingTeamInvite"); setLocation(`/team-invite/${pending}`); }
        else setLocation(nextPath);
      }
    } catch (error: any) {
      setIsLoading(false);
      if (error.requiresVerification) {
        setVerificationAlert({ email });
        setResendState("idle");
      } else if (error.requiresGoogle) {
        setGoogleOnlyAlert(true);
      } else {
        toast({ title: "Login failed — check your credentials and try again.", type: "error", duration: 5000 });
      }
    }
  }

  function handleGoogleClick() {
    clearAlerts();
    handleGoogleSignIn({
      flow: "login",
      next: nextPath,
      teamInvite: teamInviteToken || undefined,
    });
  }

  async function handleGoogleLoginComplete() {
    setIsLoading(true);
    try {
      const data = await apiRequest("/api/auth/google/complete", {
        method: "POST",
        body: JSON.stringify({ role: googleRole }),
      });
      await refreshUser();
      toast({ title: "Welcome back!", type: "success" });
      setLocation(data.redirectTo || nextPath);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast({
        title: apiError.message || "Google Sign In failed — try again.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
      setShowRoleDialog(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── LEFT PANEL — photo + quote ── */}
      <div className="hidden lg:flex lg:w-[460px] shrink-0 relative overflow-hidden flex-col">

        {/* Background photo */}
        <img
          src={parentChild1}
          alt="Parent and child learning"
          className="absolute inset-0 w-full h-full object-cover object-top"
        />

        {/* Gradient overlays — top dark strip (logo) + bottom dark strip (quote) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/10 to-black/75 z-10" />

        {/* Botanical pattern over image */}
        <BotanicalPattern className="absolute inset-0 w-full h-full text-white z-20 opacity-[0.08]" />

        {/* Content */}
        <div className="relative z-30 flex flex-col justify-between h-full p-10">

          {/* Logo */}
          <Logo variant="sidebar" className="text-white [&_span]:text-white" />

          {/* Quote */}
          <div>
            <div className="text-white/40 text-7xl font-serif leading-none mb-2 select-none">"</div>
            <blockquote className="text-white text-xl font-semibold leading-relaxed mb-4 drop-shadow-sm">
              Education is the most powerful weapon which you can use to change the world.
            </blockquote>
            <p className="text-white/60 text-sm font-medium tracking-wide">— Nelson Mandela</p>
          </div>

          {/* Footer */}
          <p className="text-white/35 text-xs">© {new Date().getFullYear()} Lyra Preparatory</p>
        </div>
      </div>

      {/* ── RIGHT PANEL — form ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background relative overflow-hidden">

        {/* Subtle botanical hint on right panel */}
        <BotanicalPattern className="absolute -bottom-20 -right-20 w-[420px] h-[420px] text-primary opacity-[0.035] pointer-events-none" />

        <div className="w-full max-w-sm relative z-10">

          {/* Mobile logo (hidden on desktop since left panel has it) */}
          <div className="lg:hidden mb-8">
            <Logo />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Enter your email or username and password to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email or username
              </label>
              <Input
                id="email"
                type="text"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearAlerts(); }}
                placeholder="you@example.com or username"
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearAlerts(); }}
                placeholder="••••••••"
                required
                data-testid="input-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {verificationAlert && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3.5 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800 leading-snug">
                  <strong>Email not verified.</strong> Check your inbox for the verification link, then sign in.
                </p>
              </div>
              {resendState === "sent" ? (
                <div className="flex items-center gap-1.5 text-sm text-green-700 pl-6">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  Verification email sent — check your inbox.
                </div>
              ) : (
                <button
                  onClick={handleResendVerification}
                  disabled={resendState === "sending"}
                  className="pl-6 text-sm font-medium text-amber-700 hover:text-amber-900 hover:underline disabled:opacity-50"
                >
                  {resendState === "sending" ? "Sending…" : "Resend verification email"}
                </button>
              )}
            </div>
          )}

          {googleOnlyAlert && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3.5 flex items-start gap-2">
              <Mail className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800 leading-snug">
                <strong>This account uses Google Sign-In.</strong> Use the "Continue with Google" button below — there's no password on this account.
              </p>
            </div>
          )}

          {googleAvailable && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">or continue with</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                onClick={handleGoogleClick}
                disabled={isLoading}
                data-testid="button-google-signin"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Continue with Google</span>
              </Button>
            </>
          )}

          <div className="mt-6 space-y-2 text-center">
            <p className="text-sm text-muted-foreground">
              <Link href="/forgot-password" className="text-primary font-medium hover:underline" data-testid="link-forgot-password">
                Forgot your password?
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary font-medium hover:underline" data-testid="link-signup">
                Sign up
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Student?{" "}
              <Link href="/student-signup" className="text-primary font-medium hover:underline" data-testid="link-student-signup">
                Join with invite code
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── Role selection dialog (Google Sign-In) — untouched ── */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create your account</DialogTitle>
            <DialogDescription>
              We don't have an account for this Google address yet. Choose your role to sign up.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <strong>Are you a student?</strong> Student accounts can only be created by a parent. Ask your parent to set up your account, then sign in with email and password.
            </div>
            <div className="space-y-1.5">
              <label htmlFor="google-role" className="text-sm font-medium">I am a...</label>
              <Select value={googleRole} onValueChange={(v) => setGoogleRole(v as "teacher" | "parent")}>
                <SelectTrigger data-testid="select-google-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGoogleLoginComplete} className="w-full" disabled={isLoading} data-testid="button-complete-google-login">
              {isLoading ? "Signing in..." : "Continue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
