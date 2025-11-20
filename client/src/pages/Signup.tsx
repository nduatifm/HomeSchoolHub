import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { GoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await signup(email, password, name, role);
      toast({ 
        title: "Account created!", 
        description: response.message || "Please check your email to verify your account before logging in.",
        type: "success" 
      });
      // Clear form
      setEmail("");
      setPassword("");
      setName("");
      // Redirect to login page after 2 seconds
      setTimeout(() => setLocation("/login"), 2000);
    } catch (error: any) {
      toast({ title: "Signup failed", description: error.message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  function handleGoogleSuccess(credentialResponse: any) {
    // Store credential and show role selection dialog
    setGoogleCredential(credentialResponse.credential);
    setShowRoleDialog(true);
  }

  async function handleGoogleSignupComplete() {
    if (!googleCredential) return;
    
    setIsLoading(true);
    try {
      await googleSignIn(googleCredential);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <Logo className="mb-2" />
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Sign up as a teacher or parent</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Full Name</label>
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
              <label htmlFor="email" className="text-sm font-medium">Email</label>
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
              <label htmlFor="password" className="text-sm font-medium">Password</label>
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
              <label htmlFor="role" className="text-sm font-medium">I am a...</label>
              <Select value={role} onValueChange={(v) => setRole(v as "teacher" | "parent")}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-signup">
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
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <div className="flex justify-center" data-testid="google-signup-container">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    toast({ title: "Google Sign Up failed", description: "Please try again", type: "error" });
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Your Signup</DialogTitle>
            <DialogDescription>
              Please select your role to finish creating your account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
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
    </div>
  );
}
