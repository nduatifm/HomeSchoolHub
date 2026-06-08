import { createContext, useContext, useState, useEffect } from "react";
import { apiRequest, ApiError } from "@/lib/queryClient";

interface User {
  id: number;
  email: string | null;
  name: string;
  role: "teacher" | "parent" | "student" | null;
  roles?: string[];
  profilePicture?: string | null;
  isEmailVerified?: boolean;
  googleId?: string | null;
  bio?: string | null;
  teachingSubjects?: string[];
  yearsExperience?: number | null;
  qualifications?: string | null;
  specialization?: string | null;
  phone?: string | null;
  preferredContact?: string | null;
  interests?: string[];
  favoriteSubject?: string | null;
  learningGoals?: string | null;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}

interface Student {
  id: number;
  userId: number;
  name: string;
  gradeLevel: string;
  badges: string[];
  points: number;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  student: Student | null;
  sessionId: string | null; // Always null — sessions are now httpOnly cookies
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: string) => Promise<any>;
  signupStudent: (code: string, password: string) => Promise<void>;
  signupStudentGoogle: (code: string, credential: string) => Promise<void>;
  googleSignIn: (idToken: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    function handleExpired() {
      // Clear any impersonation token from localStorage so the banner hides
      localStorage.removeItem("sessionId");
      setUser(null);
      setStudent(null);
    }
    window.addEventListener("lyra:auth:expired", handleExpired);
    return () => window.removeEventListener("lyra:auth:expired", handleExpired);
  }, []);

  async function fetchCurrentUser() {
    try {
      const data = await apiRequest("/api/auth/me");
      setUser(data.user);
      setStudent(data.profile);
    } catch (error) {
      // Fix 1: only clear auth state for definitive auth failures (session
      // expired or user deleted). Transient errors like 500s or network
      // failures must NOT log the user out — doing so creates a race
      // condition where a brief server hiccup after a successful login
      // immediately destroys the freshly-created session.
      const isDefinitiveAuthFailure =
        error instanceof ApiError &&
        (error.status === 401 || error.status === 404);
      if (isDefinitiveAuthFailure) {
        localStorage.removeItem("sessionId");
        setUser(null);
        setStudent(null);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    // Session is delivered via httpOnly cookie — no localStorage storage needed
    setUser(data.user);
    setStudent(data.student || null);
  }

  async function signup(email: string, password: string, name: string, role: string) {
    // Signup does NOT create a session - user must verify email first
    const data = await apiRequest("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name, role }),
    });
    // Return the response message to show to the user
    return data;
  }

  async function signupStudent(code: string, password: string) {
    const data = await apiRequest("/api/auth/signup/student", {
      method: "POST",
      body: JSON.stringify({ code, password }),
    });
    setUser(data.user);
    setStudent(data.student);
  }

  async function signupStudentGoogle(code: string, credential: string) {
    const data = await apiRequest("/api/auth/signup/student/google", {
      method: "POST",
      body: JSON.stringify({ code, credential }),
    });
    setUser(data.user);
    setStudent(data.student);
  }

  async function googleSignIn(idToken: string, role?: string) {
    const data = await apiRequest("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential: idToken, role }),
    });
    setUser(data.user);
    setStudent(data.student || null);
  }

  async function logout() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (error) {
      // Ignore error — cookie is cleared server-side regardless
    }
    // Clear any impersonation token and stale state
    localStorage.removeItem("sessionId");
    localStorage.removeItem("adminSessionId");
    localStorage.removeItem("adminUserName");
    localStorage.removeItem("impersonatedUserName");
    localStorage.removeItem("impersonatedUserRole");
    localStorage.removeItem("parentSessionId");
    localStorage.removeItem("parentUserName");
    localStorage.removeItem("parentChildName");
    setUser(null);
    setStudent(null);
  }

  async function refreshUser() {
    await fetchCurrentUser();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        student,
        sessionId: null,
        login,
        signup,
        signupStudent,
        signupStudentGoogle,
        googleSignIn,
        logout,
        refreshUser,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
