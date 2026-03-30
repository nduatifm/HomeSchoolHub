import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Logo } from "@/components/Logo";
import { Link } from "wouter";
import { CheckCircle, GraduationCap } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

export default function StudentSignup() {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteInfo, setInviteInfo] = useState<{ studentName: string; gradeLevel: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const { signupStudent, signupStudentGoogle } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  async function checkCode() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setIsCheckingCode(true);
    try {
      const data = await apiRequest(`/api/invites/student/code/${trimmed}`);
      setInviteInfo(data);
      toast({ title: "Invite found!", description: `Welcome ${data.studentName}`, type: "success" });
    } catch (error: any) {
      toast({ title: "Invalid invite code", description: "Check the code and try again.", type: "error" });
      setInviteInfo(null);
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
      toast({ title: "Signup failed", description: error.message, type: "error" });
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
      toast({ title: "Google signup failed", description: error.message, type: "error" });
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
