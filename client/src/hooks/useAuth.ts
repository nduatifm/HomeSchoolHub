import { useQuery } from "@tanstack/react-query";
import { User } from "@/types";
import { useFirebaseAuth } from "./useFirebaseAuth";
import { useState, useEffect } from "react";

export function useAuth() {
  const [initialized, setInitialized] = useState(false);
  const { user: firebaseAuthUser, loading: firebaseLoading } = useFirebaseAuth();
  
  // Try to fetch Firebase user data
  const { 
    data: firebaseServerUser, 
    isLoading: isFirebaseServerLoading,
    isError: isFirebaseError
  } = useQuery<User>({
    queryKey: ["/api/auth/firebase-user"],
    enabled: !!firebaseAuthUser && initialized,
    retry: 1,
  });

  // Also try to fetch email/password user data
  const { 
    data: emailServerUser, 
    isLoading: isEmailServerLoading,
    isError: isEmailError
  } = useQuery<User>({
    queryKey: ["/api/auth/email-user"],
    enabled: initialized && !firebaseAuthUser,
    retry: 1,
  });

  // Initialize after Firebase auth has loaded
  useEffect(() => {
    if (!firebaseLoading) {
      setInitialized(true);
    }
  }, [firebaseLoading]);

  const isLoading = firebaseLoading || 
    (initialized && !!firebaseAuthUser && isFirebaseServerLoading) ||
    (initialized && !firebaseAuthUser && isEmailServerLoading);
  
  const user = firebaseServerUser || emailServerUser;
  const isAuthenticated = !!user || (!!firebaseAuthUser && !isFirebaseError);
  
  return {
    user,
    isLoading,
    isAuthenticated,
    firebaseAuthUser
  };
}
