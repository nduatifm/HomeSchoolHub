import { useEffect, useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [resendingEmail, setResendingEmail] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const verificationAttempted = useRef(false);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (verificationAttempted.current) {
      return;
    }
    verificationAttempted.current = true;

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    verifyEmail(token);
  }, []);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(result.message || 'Email verified successfully!');
      } else {
        setStatus('error');
        setMessage(result.message || 'Verification failed');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage('An error occurred during verification');
    }
  };

  const handleResendVerification = async () => {
    if (!userEmail) {
      toast({
        title: "Email required",
        description: "Please enter your email address to resend verification",
        variant: "destructive",
      });
      return;
    }

    try {
      setResendingEmail(true);
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail }),
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Email sent",
          description: result.message,
        });
      } else {
        toast({
          title: "Failed to send email",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to resend verification email",
        variant: "destructive",
      });
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <Loader2 className="h-16 w-16 text-primary animate-spin" data-testid="loader-verifying" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-16 w-16 text-green-500" data-testid="icon-success" />
            )}
            {status === 'error' && (
              <XCircle className="h-16 w-16 text-red-500" data-testid="icon-error" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Verifying Email'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription className="mt-2" data-testid="text-message">
            {status === 'loading' && 'Please wait while we verify your email address...'}
            {status === 'success' && message}
            {status === 'error' && message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && (
            <Button 
              className="w-full" 
              onClick={() => setLocation('/login')}
              data-testid="button-go-to-login"
            >
              Go to Login
            </Button>
          )}
          
          {status === 'error' && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Your verification link may have expired. Enter your email to receive a new verification link.
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md"
                  data-testid="input-resend-email"
                />
                <Button 
                  onClick={handleResendVerification}
                  disabled={resendingEmail}
                  data-testid="button-resend-verification"
                >
                  {resendingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full" data-testid="link-back-to-login">
                  Back to Login
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
