import { createContext, useContext, useState, useEffect } from "react";
import { apiRequest, ApiError } from "@/lib/queryClient";

interface ImpersonatedBy {
  id: number;
  name: string;
  role: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

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
  emailNotifications?: boolean;
  impersonatedBy?: ImpersonatedBy | null;
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
      const isDefinitiveAuthFailure =
        error instanceof ApiError &&
        (error.status === 401 || error.status === 404);
      if (isDefinitiveAuthFailure) {
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
    setUser(data.user);
    setStudent(data.student || null);
  }

  async function signup(email: string, password: string, name: string, role: string) {
    const data = await apiRequest("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name, role }),
    });
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
