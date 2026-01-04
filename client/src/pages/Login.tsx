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
import { ApiError } from "@/lib/queryClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, googleSignIn } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  // Google Sign In state for role selection
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [googleCredential, setGoogleCredential] = useState<string | null>(null);
  const [googleRole, setGoogleRole] = useState<"teacher" | "parent">("parent");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast({ title: "Welcome back!", type: "success" });
      setLocation("/dashboard");
    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: "Login failed",
        description:
          error.message || "Please check your credentials and try again",
        type: "error",
        duration: 5000,
      });
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
          title: "Google Sign In failed",
          description: apiError.message,
          type: "error",
        });
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
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Google Sign In failed",
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
                data-testid="input-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Signing in..." : "Sign In"}
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
                data-testid="google-login-container"
              >
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    toast({
                      title: "Google Sign In failed",
                      description: "Please try again",
                      type: "error",
                    });
                  }}
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            variant="link"
            onClick={() => setLocation("/signup")}
            className="text-sm"
            data-testid="link-signup"
          >
            Don't have an account? Sign up
          </Button>
          <Button
            variant="link"
            onClick={() => setLocation("/student-signup")}
            className="text-sm"
            data-testid="link-student-signup"
          >
            Student? Join with invite code
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Select Your Role</DialogTitle>
            <DialogDescription>
              Please select your role to continue
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
              onClick={handleGoogleLoginComplete}
              className="w-full"
              disabled={isLoading}
              data-testid="button-complete-google-login"
            >
              {isLoading ? "Signing in..." : "Continue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
