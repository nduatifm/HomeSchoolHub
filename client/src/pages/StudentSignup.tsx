import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { Logo } from "@/components/Logo";
import { Link } from "wouter";
import { ToastAction } from "@/components/ui/toast";
import { CheckCircle, GraduationCap, LogIn } from "lucide-react";
import { handleStudentGoogleSignup, loadGoogleSignInAvailability } from "@/lib/googleSignIn";

export default function StudentSignup() {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteInfo, setInviteInfo] = useState<{ studentName: string; gradeLevel: string; email: string } | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const { signupStudent } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    loadGoogleSignInAvailability().then(setGoogleAvailable);
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const googleError = params.get("google_error");
      if (!googleError) return;
      window.history.replaceState({}, "", window.location.pathname);
      const messages: Record<string, string> = {
        invalid_invite: "Invalid or expired invite code. Please verify your code and try again.",
        expired_invite: "This invite has expired. Ask your parent for a new invite.",
        email_mismatch: "The Google account email must match the email on your invite.",
        email_not_verified: "Your Google account email is not verified.",
        email_already_registered: "This email already has an account. Please log in instead.",
        csrf: "Google Sign-In failed — security check failed. Please try again.",
        invalid_token: "Google Sign-In failed — could not verify your identity. Please try again.",
        no_credential: "Google Sign-In was cancelled. Please try again.",
        server_error: "Google Sign-In failed — server error. Please try again.",
      };
      const message = messages[googleError] ?? "Google signup failed — try again.";
      if (googleError === "email_already_registered") {
        toast({
          title: "This email already has an account",
          description: "Use your existing login credentials.",
          action: <ToastAction altText="Log in" onClick={() => setLocation("/login")}>Log in</ToastAction>,
          type: "error",
        });
        setAlreadyRegistered(true);
        setInviteInfo(null);
      } else {
        toast({ title: message, type: "error", duration: 6000 });
      }
    } catch { /* ignore */ }
  }, [setLocation, toast]);

  async function checkCode() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setIsCheckingCode(true);
    setAlreadyRegistered(false);
    setInviteInfo(null);
    try {
      const data = await apiRequest(`/api/invites/student/code/${trimmed}`);
      setInviteInfo(data);
      toast({ title: "Invite found!", description: `Welcome ${data.studentName}`, type: "success" });
    } catch (error: any) {
      if (error instanceof ApiError && error.status === 409) {
        setAlreadyRegistered(true);
      } else {
        toast({ title: "Invalid invite code", description: "Check the code and try again.", type: "error" });
      }
    } finally {
      setIsCheckingCode(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", type: "error" });
      return;
    }
    setIsLoading(true);
    try {
      await signupStudent(code.trim().toUpperCase(), password);
      toast({ title: "Welcome to the platform!", type: "success" });
      setLocation("/dashboard");
    } catch (error: any) {
      const isAlreadyRegistered = error instanceof ApiError && error.status === 409;
      if (isAlreadyRegistered) {
        toast({
          title: "This email already has an account",
          description: "Use your existing login credentials.",
          action: <ToastAction altText="Log in" onClick={() => setLocation("/login")}>Log in</ToastAction>,
          type: "error",
        });
        setAlreadyRegistered(true);
        setInviteInfo(null);
      } else {
        toast({ title: "Signup failed — try again.", type: "error" });
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleGoogleClick() {
    handleStudentGoogleSignup(code.trim().toUpperCase());
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-[420px] bg-primary flex-col justify-between p-10 shrink-0">
        <Logo variant="sidebar" className="text-white [&_span]:text-white" />
        <div>
          <div className="w-14 h-14 bg-white/15 rounded-xl flex items-center justify-center mb-4">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-3">Student sign-up</h2>
          <p className="text-white/75 text-sm leading-relaxed">
            Your parent or guardian will have sent you an email with a 6-character invite code. Enter it here to get started.
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
            <h1 className="text-2xl font-bold text-foreground mb-1">Join with invite code</h1>
            <p className="text-sm text-muted-foreground">Enter the 6-character code from your invite email</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="code" className="text-sm font-medium text-foreground">Invite code</label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setInviteInfo(null);
                    setAlreadyRegistered(false);
                  }}
                  placeholder="e.g. A3KW9F"
                  maxLength={6}
                  className="font-mono tracking-widest uppercase text-center text-lg"
                  data-testid="input-code"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={checkCode}
                  disabled={!code.trim() || isCheckingCode}
                  data-testid="button-check-code"
                >
                  {isCheckingCode ? "Checking..." : "Verify"}
                </Button>
              </div>
            </div>

            {alreadyRegistered && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-3">
                <LogIn className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-0.5">You already have an account</p>
                  <p className="text-sm text-blue-700">
                    This email is already registered.{" "}
                    <Link href="/login" className="font-medium underline hover:no-underline">
                      Log in here
                    </Link>
                    {" "}instead.
                  </p>
                </div>
              </div>
            )}

            {inviteInfo && (
              <>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-800">Invite verified</span>
                  </div>
                  <p className="text-sm text-green-800"><strong>Name:</strong> {inviteInfo.studentName}</p>
                  <p className="text-sm text-green-800"><strong>Grade:</strong> {inviteInfo.gradeLevel}</p>
                  <p className="text-sm text-green-800"><strong>Email:</strong> {inviteInfo.email}</p>
                </div>

                <p className="text-sm font-medium text-foreground text-center">Choose how to create your account</p>

                {googleAvailable && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                    onClick={handleGoogleClick}
                    disabled={isLoading}
                    data-testid="button-google-student-signup"
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
                )}

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or create with a password</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="text-sm font-medium text-foreground">Create password</label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                      data-testid="input-password"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirm password</label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      data-testid="input-confirm-password"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-signup">
                    {isLoading ? "Creating account..." : "Create my account"}
                  </Button>
                </form>
              </>
            )}
          </div>

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
    </div>
  );
}
