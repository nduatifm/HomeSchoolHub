import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, KeyRound, ArrowLeft, Users } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [isGoogleAccount, setIsGoogleAccount] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "Something went wrong — try again.", type: "error" });
        return;
      }
      if (data.isStudent) {
        setIsStudent(true);
      } else if (data.isGoogleAccount) {
        setIsGoogleAccount(true);
      } else {
        setSent(true);
      }
    } catch {
      toast({ title: "Network error — please try again.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-[420px] bg-primary flex-col justify-between p-10 shrink-0">
        <Logo variant="sidebar" className="text-white [&_span]:text-white" />
        <div>
          <div className="w-14 h-14 bg-white/15 rounded-xl flex items-center justify-center mb-4">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-3">Reset your password</h2>
          <p className="text-white/75 text-sm leading-relaxed">
            Enter your email address and we'll send you a link to reset your password.
            The link expires in 1 hour.
          </p>
        </div>
        <p className="text-white/50 text-xs">© {new Date().getFullYear()} Lyra Preparatory</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Logo />
          </div>

          {!sent && !isStudent && !isGoogleAccount && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground mb-1">Forgot your password?</h1>
                <p className="text-sm text-muted-foreground">
                  Enter the email linked to your account and we'll send a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    data-testid="input-email"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-send-reset">
                  {isLoading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            </>
          )}

          {sent && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-foreground mb-2">Check your inbox</h1>
              <p className="text-sm text-muted-foreground mb-1">
                If <strong>{email}</strong> is registered, a password reset link is on its way.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                The link expires in <strong>1 hour</strong>. Check your spam folder if you don't see it.
              </p>
              <Button variant="outline" onClick={() => { setSent(false); setEmail(""); }} className="w-full mb-3">
                Try a different email
              </Button>
            </div>
          )}

          {isStudent && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-foreground mb-2">Ask a parent to reset</h1>
              <p className="text-sm text-muted-foreground mb-4">
                Student accounts are managed by a parent or guardian. To reset your login credentials,
                ask your parent to go to their <strong>My Students</strong> page and use the
                "Reset login" option.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Once reset, you'll receive a temporary password from your parent and can then change it from your profile settings.
              </p>
              <Button variant="outline" onClick={() => setIsStudent(false)} className="w-full mb-3">
                Try a different email
              </Button>
            </div>
          )}

          {isGoogleAccount && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                  <KeyRound className="w-8 h-8 text-amber-600" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-foreground mb-2">Google account detected</h1>
              <p className="text-sm text-muted-foreground mb-6">
                This account uses Google Sign-In. There's no password to reset — just click
                "Continue with Google" on the login page to sign in.
              </p>
              <Button variant="outline" onClick={() => setIsGoogleAccount(false)} className="w-full mb-3">
                Try a different email
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
