import { useQuery } from "@tanstack/react-query";
import { User } from "@/types";
import { useFirebaseAuth } from "./useFirebaseAuth";
import { useState, useEffect } from "react";

export function useAuth() {
  const [initialized, setInitialized] = useState(false);
  const { user: firebaseAuthUser, loading: firebaseLoading } = useFirebaseAuth();
  
  // Only try to fetch user data if we have a Firebase user
  const { 
    data: serverUser, 
    isLoading: isServerLoading,
    isError
  } = useQuery<User>({
    queryKey: ["/api/auth/firebase-user"],
    enabled: !!firebaseAuthUser && initialized,
    retry: 1,
  });

  // Initialize after Firebase auth has loaded
  useEffect(() => {
    if (!firebaseLoading) {
      setInitialized(true);
    }
  }, [firebaseLoading]);

  const isLoading = firebaseLoading || (initialized && !!firebaseAuthUser && isServerLoading);
  const user = serverUser;
  
  return {
    user,
    isLoading,
    isAuthenticated: !!user || (!!firebaseAuthUser && !isError),
    firebaseAuthUser
  };
}
