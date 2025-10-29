import { useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signInWithRedirect, GoogleAuthProvider, signOut as firebaseSignOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useIsMobile";
import { FcGoogle } from "react-icons/fc";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GoogleSignInProps {
  onSuccess?: (user: any) => void;
  onError?: (error: any) => void;
}

export function GoogleSignIn({ onSuccess, onError }: GoogleSignInProps) {
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [showExistingUserDialog, setShowExistingUserDialog] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<any>(null);

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
      
      // Get Firebase ID token for server authentication
      const idToken = await user.getIdToken();
      
      // Now call our server to create/update user in our database
      const response = await fetch("/api/auth/firebase-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}` // Add auth header
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }),
        credentials: 'include' // Important! Include cookies in the request
      });
      
      if (!response.ok) {
        throw new Error("Failed to authenticate with server");
      }

      // Check if this is a new user (if they don't have a role set)
      const userData = await response.json();
      
      // If user already exists, show confirmation modal
      if (userData.isExistingUser) {
        setPendingUserData({ userData, firebaseUser: user });
        setShowExistingUserDialog(true);
        setLoading(false);
        return;
      }
      
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

  const handleContinueLogin = () => {
    setShowExistingUserDialog(false);
    
    if (pendingUserData) {
      const { userData, firebaseUser } = pendingUserData;
      
      // If it's a new user (no role set), redirect to onboarding flow
      if (!userData.role) {
        window.location.href = "/onboarding/role-selection";
        return;
      }

      if (onSuccess) {
        onSuccess(firebaseUser);
      }
      
      toast({
        title: "Successfully signed in",
        description: `Welcome back, ${firebaseUser.displayName || firebaseUser.email}!`,
      });
      
      setPendingUserData(null);
    }
  };

  const handleCancelLogin = async () => {
    setShowExistingUserDialog(false);
    
    try {
      // Sign out from Firebase
      await firebaseSignOut(auth);
      
      // Also sign out from server if there's a session
      await fetch("/api/auth/firebase-logout", {
        method: "POST",
        credentials: 'include'
      });
      
      toast({
        title: "Sign in cancelled",
        description: "You were not logged in.",
      });
    } catch (error) {
      console.error("Error cancelling login:", error);
    }
    
    setPendingUserData(null);
  };

  return (
    <>
      <Button
        variant="default"
        type="button"
        disabled={loading}
        onClick={handleGoogleSignIn}
        className="w-full py-6 text-base"
        size="lg"
        data-testid="button-google-signin"
      >
        {loading ? (
          <span className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <FcGoogle className="mr-2 h-6 w-6" />
        )}
        Sign in with Google
      </Button>

      <AlertDialog open={showExistingUserDialog} onOpenChange={setShowExistingUserDialog}>
        <AlertDialogContent data-testid="dialog-existing-user">
          <AlertDialogHeader>
            <AlertDialogTitle>Account Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              An account with this email already exists. Would you like to continue and sign in?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleCancelLogin}
              data-testid="button-cancel-login"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleContinueLogin}
              data-testid="button-continue-login"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}