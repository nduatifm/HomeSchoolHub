import { useEffect, useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const verificationAttempted = useRef(false);

  // Resend state
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

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

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setIsResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "Could not resend — try again.", type: "error" });
      } else {
        setResendSent(true);
      }
    } catch {
      toast({ title: "Network error — please try again.", type: "error" });
    } finally {
      setIsResending(false);
    }
  }

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
            </div>

            {/* Resend section */}
            <div className="mt-8 pt-6 border-t border-border text-left">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Request a new verification email</p>
              </div>
              {resendSent ? (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800">
                    Sent! Check your inbox (and spam folder). The link expires in 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleResend} className="flex gap-2">
                  <Input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="h-9 text-sm"
                    data-testid="input-resend-email"
                  />
                  <Button type="submit" variant="outline" size="sm" disabled={isResending} className="shrink-0" data-testid="button-resend">
                    {isResending ? "Sending..." : "Resend"}
                  </Button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
