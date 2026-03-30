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
import { ApiError, apiRequest } from "@/lib/queryClient";
import { Mail, RefreshCw } from "lucide-react";
import { Link } from "wouter";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"teacher" | "parent" | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const { signup, googleSignIn } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [googleCredential, setGoogleCredential] = useState<string | null>(null);
  const [googleRole, setGoogleRole] = useState<"teacher" | "parent" | "">("");

  const [showResendDialog, setShowResendDialog] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [isResending, setIsResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) {
      toast({ title: "Please select a role", description: "Choose whether you are a parent or a teacher.", type: "error" });
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
      setTimeout(() => setLocation("/login"), 2000);
    } catch (error: any) {
      if (error.requiresVerification) {
        setUnverifiedEmail(error.email || email);
        setShowResendDialog(true);
      } else {
        toast({ title: "Signup failed", description: error.message, type: "error" });
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
      toast({ title: "Failed to resend", description: error.message, type: "error" });
    } finally {
      setIsResending(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse: any) {
    const credential = credentialResponse.credential;
    setGoogleCredential(credential);
    setIsLoading(true);
    try {
      await googleSignIn(credential);
      toast({ title: "Welcome back!", type: "success" });
      setLocation("/dashboard");
    } catch (error: unknown) {
      const apiError = error as ApiError;
      if (apiError.requiresRole) {
        setShowRoleDialog(true);
      } else {
        toast({ title: "Google Sign Up failed", description: apiError.message, type: "error" });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignupComplete() {
    if (!googleCredential || !googleRole) return;
    setIsLoading(true);
    try {
      await googleSignIn(googleCredential, googleRole as "teacher" | "parent");
      toast({ title: "Account created!", type: "success" });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({ title: "Google Sign Up failed", description: error.message, type: "error" });
    } finally {
      setIsLoading(false);
      setShowRoleDialog(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
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

      {/* Right panel - form */}
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

          {googleClientId && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">or continue with</span>
                </div>
              </div>
              <div className="flex justify-center" data-testid="google-signup-container">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast({ title: "Google Sign Up failed", description: "Please try again", type: "error" })}
                />
              </div>
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

      {/* Google role dialog */}
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

      {/* Resend verification dialog */}
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
