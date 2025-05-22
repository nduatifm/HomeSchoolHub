import { useQuery } from "@tanstack/react-query";
import { User } from "@/types";
import { useFirebaseAuth } from "./useFirebaseAuth";

export function useAuth() {
  // Try Replit Auth first
  const { 
    data: replitUser, 
    isLoading: isReplitLoading 
  } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Then try Firebase Auth
  const {
    data: firebaseUser,
    isLoading: isFirebaseLoading
  } = useQuery<User>({
    queryKey: ["/api/auth/firebase-user"],
    retry: false,
  });

  // Get Firebase state for Google login
  const { user: firebaseAuthUser } = useFirebaseAuth();

  // Combine the authentication states - use either auth method
  const user = replitUser || firebaseUser;
  const isLoading = isReplitLoading || isFirebaseLoading;

  return {
    user,
    isLoading,
    isAuthenticated: !!user || !!firebaseAuthUser,
    firebaseAuthUser
  };
}
