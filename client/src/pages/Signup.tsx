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
import { handleGoogleSignIn, isGoogleSignInAvailable } from "@/lib/googleSignIn";
import { Mail, RefreshCw } from "lucide-react";
import { Link } from "wouter";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"teacher" | "parent" | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const { signup, refreshUser } = useAuth();
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

  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [googleRole, setGoogleRole] = useState<"teacher" | "parent" | "">("");

  const [showResendDialog, setShowResendDialog] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("google_role_required") === "1") {
        window.history.replaceState({}, "", window.location.pathname);
        setShowRoleDialog(true);
      }
    } catch { /* ignore */ }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) {
      toast({ title: "Please choose a role — parent or teacher — before continuing.", type: "warning" });
      return;
    }
    setIsLoading(true);
    try {
      const response = await signup(email, password, name, role as "teacher" | "parent");
      toast({
        title: "Account created!",
        description: response.message || "Please check your email to verify your account.",
        type: "success",
      });
      setEmail(""); setPassword(""); setName("");
      if (teamInviteToken) {
        localStorage.setItem("pendingTeamInvite", teamInviteToken);
        setTimeout(() => setLocation(`/login?teamInvite=${teamInviteToken}`), 2000);
      } else {
        setTimeout(() => setLocation("/login"), 2000);
      }
    } catch (error: any) {
      if (error.requiresVerification) {
        setUnverifiedEmail(error.email || email);
        setShowResendDialog(true);
      } else {
        toast({ title: "Signup failed — try again.", type: "error" });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendVerification() {
    setIsResending(true);
    try {
      await apiRequest("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      toast({
        title: "Verification email sent!",
        description: "Please check your inbox and spam folder.",
        type: "success",
      });
      setShowResendDialog(false);
    } catch (error: any) {
      toast({ title: "Couldn't resend verification — try again.", type: "error" });
    } finally {
      setIsResending(false);
    }
  }

  function handleGoogleClick() {
    handleGoogleSignIn({
      flow: "signup",
      next: nextPath,
      teamInvite: teamInviteToken || undefined,
    });
  }

  async function handleGoogleSignupComplete() {
    if (!googleRole) return;
    setIsLoading(true);
    try {
      const data = await apiRequest("/api/auth/google/complete", {
        method: "POST",
        body: JSON.stringify({ role: googleRole }),
      });
      await refreshUser();
      toast({ title: "Account created!", type: "success" });
      setLocation(data.redirectTo || nextPath);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast({
        title: apiError.message || "Google Sign Up failed — try again.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
      setShowRoleDialog(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-[420px] bg-primary flex-col justify-between p-10 shrink-0">
        <Logo variant="sidebar" className="text-white [&_span]:text-white" />
        <div>
          <h2 className="text-white text-2xl font-bold mb-3">
            Join a growing community of learners
          </h2>
          <p className="text-white/75 text-sm leading-relaxed">
            Thousands of students, teachers, and parents use Lyra Preparatory to
            make learning organized, clear, and effective.
          </p>
        </div>
        <p className="text-white/50 text-xs">© {new Date().getFullYear()} Lyra Preparatory</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Logo />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">Create an account</h1>
            <p className="text-sm text-muted-foreground">Fill in your details to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-foreground">Full name</label>
              <Input
                id="name" type="text" value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe" required
                data-testid="input-name"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">Email address</label>
              <Input
                id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
              <Input
                id="password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters" required minLength={6}
                data-testid="input-password"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="role" className="text-sm font-medium text-foreground">I am a...</label>
              <Select value={role} onValueChange={(v) => setRole(v as "teacher" | "parent")}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !role} data-testid="button-signup">
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          {isGoogleSignInAvailable() && (
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
                data-testid="button-google-signup"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline" data-testid="link-login">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete your signup</DialogTitle>
            <DialogDescription>Please select your role to finish creating your account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">I am a...</label>
              <Select value={googleRole} onValueChange={(v) => setGoogleRole(v as "teacher" | "parent")}>
                <SelectTrigger data-testid="select-google-role"><SelectValue placeholder="Select your role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGoogleSignupComplete} className="w-full" disabled={isLoading || !googleRole} data-testid="button-complete-google-signup">
              {isLoading ? "Creating account..." : "Complete signup"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showResendDialog} onOpenChange={setShowResendDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-amber-50 rounded-full border border-amber-200">
                <Mail className="w-7 h-7 text-amber-600" />
              </div>
            </div>
            <DialogTitle className="text-center">Account not verified</DialogTitle>
            <DialogDescription className="text-center">
              An account with <span className="font-medium text-foreground">{unverifiedEmail}</span> already exists but hasn't been verified yet. Would you like a new verification email?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Button onClick={handleResendVerification} className="w-full" disabled={isResending}>
              {isResending ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Sending...</>
              ) : (
                <><Mail className="w-4 h-4 mr-2" />Resend verification email</>
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowResendDialog(false)} className="w-full">
              Cancel
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Already verified?{" "}
              <button
                type="button"
                onClick={() => { setShowResendDialog(false); setLocation("/login"); }}
                className="text-primary hover:underline"
              >
                Go to login
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
