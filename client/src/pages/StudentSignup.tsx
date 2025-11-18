import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function StudentSignup() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(false);
  const { signupStudent } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-teal-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Student Signup</CardTitle>
          <CardDescription>Join using your invite code from your parent</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="token" className="text-sm font-medium">Invite Code</label>
              <div className="flex space-x-2">
                <Input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter your invite code"
                  required
                  data-testid="input-token"
                />
                <Button
                  type="button"
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
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800">
                    <strong>Student Name:</strong> {inviteInfo.studentName}
                  </p>
                  <p className="text-sm text-green-800">
                    <strong>Grade Level:</strong> {inviteInfo.gradeLevel}
                  </p>
                  <p className="text-sm text-green-800">
                    <strong>Email:</strong> {inviteInfo.email}
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">Create Password</label>
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
                  <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    data-testid="input-confirm-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-signup">
                  {isLoading ? "Creating account..." : "Complete Signup"}
                </Button>
              </>
            )}
          </form>
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
    </div>
  );
}
