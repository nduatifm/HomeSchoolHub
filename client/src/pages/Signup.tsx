import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { GoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"teacher" | "parent">("parent");
  const [isLoading, setIsLoading] = useState(false);
  const { signup, googleSignIn } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  // Google Sign In state
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [googleCredential, setGoogleCredential] = useState<string | null>(null);
  const [googleRole, setGoogleRole] = useState<"teacher" | "parent">("parent");

  // Resend verification state
  const [showResendDialog, setShowResendDialog] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [isResending, setIsResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await signup(email, password, name, role);
      toast({
        title: "Account created!",
        description:
          response.message ||
          "Please check your email to verify your account before logging in.",
        type: "success",
      });
      // Clear form
      setEmail("");
      setPassword("");
      setName("");
      // Redirect to login page after 2 seconds
      setTimeout(() => setLocation("/login"), 2000);
    } catch (error: any) {
      if (error.requiresVerification) {
        setUnverifiedEmail(error.email || email);
        setShowResendDialog(true);
      } else {
        toast({
          title: "Signup failed",
          description: error.message,
          type: "error",
        });
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
        description: "Please check your inbox and spam folder for the verification link.",
        type: "success",
      });
      setShowResendDialog(false);
    } catch (error: any) {
      toast({
        title: "Failed to resend",
        description: error.message,
        type: "error",
      });
    } finally {
      setIsResending(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse: any) {
    const credential = credentialResponse.credential;
    setGoogleCredential(credential);
    setIsLoading(true);

    try {
      // First, try to sign in without a role - if user exists with role, this will succeed
      await googleSignIn(credential);
      toast({ title: "Welcome back!", type: "success" });
      setLocation("/dashboard");
    } catch (error: unknown) {
      const apiError = error as ApiError;
      if (apiError.requiresRole) {
        setShowRoleDialog(true);
      } else {
        toast({
          title: "Google Sign Up failed",
          description: apiError.message,
          type: "error",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignupComplete() {
    if (!googleCredential) return;

    setIsLoading(true);
    try {
      await googleSignIn(googleCredential, googleRole);
      toast({ title: "Account created!", type: "success" });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Google Sign Up failed",
        description: error.message,
        type: "error",
      });
    } finally {
      setIsLoading(false);
      setShowRoleDialog(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <Logo className="mb-2" />
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                data-testid="input-name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                data-testid="input-password"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">
                I am a...
              </label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "teacher" | "parent")}
              >
                <SelectTrigger data-testid="select-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-signup"
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          {googleClientId && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div
                className="flex justify-center"
                data-testid="google-signup-container"
              >
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    toast({
                      title: "Google Sign Up failed",
                      description: "Please try again",
                      type: "error",
                    });
                  }}
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button
            variant="link"
            onClick={() => setLocation("/login")}
            className="text-sm w-full"
            data-testid="link-login"
          >
            Already have an account? Sign in
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Complete Your Signup</DialogTitle>
            <DialogDescription>
              Please select your role to finish creating your account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="google-role" className="text-sm font-medium">
                I am a...
              </label>
              <Select
                value={googleRole}
                onValueChange={(v) => setGoogleRole(v as "teacher" | "parent")}
              >
                <SelectTrigger data-testid="select-google-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGoogleSignupComplete}
              className="w-full"
              disabled={isLoading}
              data-testid="button-complete-google-signup"
            >
              {isLoading ? "Creating account..." : "Complete Signup"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showResendDialog} onOpenChange={setShowResendDialog}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-amber-100 rounded-full">
                <Mail className="w-8 h-8 text-amber-600" />
              </div>
            </div>
            <DialogTitle className="text-center">Account Not Verified</DialogTitle>
            <DialogDescription className="text-center">
              An account with <span className="font-medium text-foreground">{unverifiedEmail}</span> already exists but hasn't been verified yet. Would you like us to send a new verification email?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <Button
              onClick={handleResendVerification}
              className="w-full"
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowResendDialog(false)}
              className="w-full"
            >
              Cancel
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Already verified?{" "}
              <button
                type="button"
                onClick={() => {
                  setShowResendDialog(false);
                  setLocation("/login");
                }}
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
