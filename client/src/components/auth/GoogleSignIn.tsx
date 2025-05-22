import { useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signInWithRedirect, GoogleAuthProvider } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useIsMobile";
import { FcGoogle } from "react-icons/fc";
import { useToast } from "@/hooks/use-toast";

interface GoogleSignInProps {
  onSuccess?: (user: any) => void;
  onError?: (error: any) => void;
}

export function GoogleSignIn({ onSuccess, onError }: GoogleSignInProps) {
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      // Use redirect for mobile devices, popup for desktop
      const signInMethod = isMobile ? signInWithRedirect : signInWithPopup;
      const result = await signInMethod(auth, googleProvider);
      
      // This gives you a Google Access Token. You can use it to access the Google API.
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      // The signed-in user info
      const user = result.user;
      
      // Now call our server to create/update user in our database
      const response = await fetch("/api/auth/firebase-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to authenticate with server");
      }

      // Check if this is a new user (if they don't have a role set)
      const userData = await response.json();
      
      // If it's a new user (no role set), redirect to onboarding flow
      if (!userData.role) {
        window.location.href = "/onboarding/role-selection";
        return;
      }

      if (onSuccess) {
        onSuccess(user);
      }
      
      toast({
        title: "Successfully signed in",
        description: `Welcome, ${user.displayName || user.email}!`,
      });
    } catch (error: any) {
      console.error("Google Sign In Error:", error);
      
      if (onError) {
        onError(error);
      }
      
      toast({
        title: "Sign In Failed",
        description: error.message || "Unable to sign in with Google",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="default"
      type="button"
      disabled={loading}
      onClick={handleGoogleSignIn}
      className="w-full py-6 text-base"
      size="lg"
    >
      {loading ? (
        <span className="h-5 w-5 animate-spin mr-2" />
      ) : (
        <FcGoogle className="mr-2 h-6 w-6" />
      )}
      Sign in with Google
    </Button>
  );
}