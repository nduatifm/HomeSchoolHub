import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { GoogleLogin } from "@react-oauth/google";
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
import { ApiError } from "@/lib/queryClient";
import { Link } from "wouter";
import { AlertCircle, Mail, CheckCircle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, googleSignIn } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  const teamInviteToken = (() => {
    try { return new URLSearchParams(window.location.search).get("teamInvite") || null; } catch { return null; }
  })();
  const nextPath = (() => {
    try {
      const p = new URLSearchParams(window.location.search).get("next") || "/dashboard";
      return p.startsWith("/") ? p : "/dashboard";
    } catch { return "/dashboard"; }
  })();

  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [googleCredential, setGoogleCredential] = useState<string | null>(null);
  const [googleRole, setGoogleRole] = useState<"teacher" | "parent">("parent");

  // Inline alert states — shown below the form instead of fleeting toasts
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

  async function handleGoogleSuccess(credentialResponse: any) {
    const credential = credentialResponse.credential;
    setGoogleCredential(credential);
    clearAlerts();
    setIsLoading(true);
    try {
      await googleSignIn(credential);
      toast({ title: "Welcome back!", type: "success" });
      if (teamInviteToken) {
        setLocation(`/team-invite/${teamInviteToken}`);
      } else {
        const pending = localStorage.getItem("pendingTeamInvite");
        if (pending) { localStorage.removeItem("pendingTeamInvite"); setLocation(`/team-invite/${pending}`); }
        else setLocation(nextPath);
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      if (apiError.requiresRole) {
        setShowRoleDialog(true);
      } else {
        toast({ title: "Google Sign In failed — try again.", type: "error" });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleLoginComplete() {
    if (!googleCredential) return;
    setIsLoading(true);
    try {
      await googleSignIn(googleCredential, googleRole);
      toast({ title: "Welcome back!", type: "success" });
      setLocation(nextPath);
    } catch (error: any) {
      toast({ title: "Google Sign In failed — try again.", type: "error" });
    } finally {
      setIsLoading(false);
      setShowRoleDialog(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[420px] bg-primary flex-col justify-between p-10 shrink-0">
        <Logo variant="sidebar" className="text-white [&_span]:text-white" />
        <div>
          <blockquote className="text-white/90 text-lg font-medium leading-relaxed mb-4">
            "Education is the most powerful weapon which you can use to change the world."
          </blockquote>
          <p className="text-white/60 text-sm">— Nelson Mandela</p>
        </div>
        <p className="text-white/50 text-xs">© {new Date().getFullYear()} Lyra Preparatory</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Logo />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">Sign in</h1>
            <p className="text-sm text-muted-foreground">Enter your email and password to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearAlerts(); }}
                placeholder="you@example.com"
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

          {/* Inline: email not verified */}
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

          {/* Inline: account uses Google Sign-In */}
          {googleOnlyAlert && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3.5 flex items-start gap-2">
              <Mail className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800 leading-snug">
                <strong>This account uses Google Sign-In.</strong> Use the "Continue with Google" button below — there's no password on this account.
              </p>
            </div>
          )}

          {/* Google sign-in section */}
          {googleClientId ? (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">or continue with</span>
                </div>
              </div>
              <div className="flex justify-center" data-testid="google-login-container">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast({ title: "Google Sign In failed — try again.", type: "error" })}
                />
              </div>
            </>
          ) : (
            <p className="mt-5 text-center text-xs text-muted-foreground">
              Google Sign-In is not available in this environment.
            </p>
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

      {/* Role selection dialog — only shown for new Google accounts (teacher / parent) */}
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
