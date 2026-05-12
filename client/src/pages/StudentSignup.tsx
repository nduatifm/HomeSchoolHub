import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { Logo } from "@/components/Logo";
import { Link } from "wouter";
import { CheckCircle, GraduationCap, LogIn } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

export default function StudentSignup() {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteInfo, setInviteInfo] = useState<{ studentName: string; gradeLevel: string; email: string } | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const { signupStudent, signupStudentGoogle } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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
        // Student already has an account — show login banner instead of error
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
      const msg: string = error?.message ?? "";
      if (msg.toLowerCase().includes("already exists")) {
        toast({
          title: "This email already has an account",
          description: "Please log in instead.",
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

  const handleGoogleSuccess = useCallback(async (credentialResponse: any) => {
    if (!credentialResponse.credential) return;
    setIsLoading(true);
    try {
      await signupStudentGoogle(code.trim().toUpperCase(), credentialResponse.credential);
      toast({ title: "Welcome to the platform!", type: "success" });
      setLocation("/dashboard");
    } catch (error: any) {
      const msg: string = error?.message ?? "";
      if (msg.toLowerCase().includes("already exists")) {
        toast({
          title: "This email already has an account",
          description: "Please log in instead.",
          type: "error",
        });
        setAlreadyRegistered(true);
        setInviteInfo(null);
      } else {
        toast({ title: "Google signup failed — try again.", type: "error" });
      }
    } finally {
      setIsLoading(false);
    }
  }, [code, signupStudentGoogle, setLocation, toast]);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
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

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Logo />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">Join with invite code</h1>
            <p className="text-sm text-muted-foreground">Enter the 6-character code from your invite email</p>
          </div>

          {/* Step 1: enter code */}
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

            {/* Already registered banner */}
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

            {/* Step 2: show invite info + signup options */}
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

                {/* Option A: Google */}
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => toast({ title: "Google sign-in failed", type: "error" })}
                    text="signup_with"
                    width="320"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or create with a password</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Option B: Password */}
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
