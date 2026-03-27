import { useEffect, useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const verificationAttempted = useRef(false);

  useEffect(() => {
    if (verificationAttempted.current) return;
    verificationAttempted.current = true;

    const verifyEmail = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (!token) {
          setStatus("error");
          setMessage("Invalid verification link — no token provided.");
          return;
        }

        const response = await fetch(`/api/auth/verify-email/${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");
          setTimeout(() => setLocation("/login"), 3000);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed.");
        }
      } catch (error) {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    };

    verifyEmail();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="mb-8">
        <Logo />
      </div>

      <div className="w-full max-w-md bg-white rounded-xl border border-border shadow-sm p-8 text-center">
        {status === "loading" && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Verifying your email</h1>
            <p className="text-sm text-muted-foreground">Please wait a moment...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Email verified!</h1>
            <p className="text-sm text-muted-foreground mb-2">{message}</p>
            <p className="text-xs text-muted-foreground mb-6">Redirecting you to login in 3 seconds...</p>
            <Link href="/login">
              <Button data-testid="button-go-to-login" className="w-full">Go to login</Button>
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Verification failed</h1>
            <p className="text-sm text-muted-foreground mb-6">{message}</p>
            <div className="space-y-3">
              <Link href="/login">
                <Button data-testid="button-back-to-login" className="w-full">Back to login</Button>
              </Link>
              <Link href="/signup">
                <Button data-testid="button-sign-up-again" variant="outline" className="w-full">Sign up again</Button>
              </Link>
            </div>
          </>
        )}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Having trouble?{" "}
        <Link href="/signup" className="text-primary hover:underline">
          Request a new verification email
        </Link>
      </p>
    </div>
  );
}
