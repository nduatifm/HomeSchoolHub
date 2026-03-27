import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Logo } from "@/components/Logo";
import { Link } from "wouter";
import { CheckCircle, GraduationCap } from "lucide-react";

export default function StudentSignup() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(false);
  const { signupStudent } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const urlToken = params.get("token");
    if (urlToken) {
      setToken(urlToken);
      setIsCheckingToken(true);
      apiRequest(`/api/invites/student/${urlToken}`)
        .then((data: any) => {
          setInviteInfo(data);
          toast({ title: "Invite verified!", description: `Welcome ${data.studentName}`, type: "success" });
        })
        .catch(() => {
          toast({ title: "Invalid or expired invite link", description: "Please ask your parent to resend the invite.", type: "error" });
        })
        .finally(() => setIsCheckingToken(false));
    }
  }, [search]);

  async function checkToken() {
    if (!token) return;
    setIsCheckingToken(true);
    try {
      const data = await apiRequest(`/api/invites/student/${token}`);
      setInviteInfo(data);
      toast({ title: "Invite found!", description: `Welcome ${data.studentName}`, type: "success" });
    } catch (error: any) {
      toast({ title: "Invalid invite", description: error.message, type: "error" });
      setInviteInfo(null);
    } finally {
      setIsCheckingToken(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", type: "error" });
      return;
    }
    setIsLoading(true);
    try {
      await signupStudent(token, password);
      toast({ title: "Welcome to the platform!", type: "success" });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({ title: "Signup failed", description: error.message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  }

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
            Your parent or guardian will have sent you an invite link. Click it to open this page with your invite pre-filled, then set your password.
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
            <p className="text-sm text-muted-foreground">Enter the invite code sent by your parent or guardian</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="token" className="text-sm font-medium text-foreground">Invite code</label>
              <div className="flex gap-2">
                <Input
                  id="token" type="text" value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter your invite code"
                  required
                  data-testid="input-token"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={checkToken}
                  disabled={!token || isCheckingToken}
                  data-testid="button-check-token"
                >
                  {isCheckingToken ? "Checking..." : "Verify"}
                </Button>
              </div>
            </div>

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

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">Create password</label>
                  <Input
                    id="password" type="password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters" required minLength={8}
                    data-testid="input-password"
                  />
                  <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirm password</label>
                  <Input
                    id="confirmPassword" type="password" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" required minLength={8}
                    data-testid="input-confirm-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-signup">
                  {isLoading ? "Creating account..." : "Create my account"}
                </Button>
              </>
            )}
          </form>

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
