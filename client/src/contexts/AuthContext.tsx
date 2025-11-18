import { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  email: string;
  name: string;
  role: "teacher" | "parent" | "student" | null;
}

interface Student {
  id: number;
  userId: number;
  parentId: number;
  name: string;
  gradeLevel: string;
  badges: string[];
  points: number;
}

interface AuthContextType {
  user: User | null;
  student: Student | null;
  sessionId: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: string) => Promise<void>;
  signupStudent: (token: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(
    localStorage.getItem("sessionId")
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, [sessionId]);

  async function fetchCurrentUser() {
    try {
      const data = await apiRequest("/api/auth/me");
      setUser(data.user);
      setStudent(data.profile);
    } catch (error) {
      localStorage.removeItem("sessionId");
      setSessionId(null);
      setUser(null);
      setStudent(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("sessionId", data.sessionId);
    setSessionId(data.sessionId);
    setUser(data.user);
    setStudent(data.student || null);
  }

  async function signup(email: string, password: string, name: string, role: string) {
    const data = await apiRequest("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name, role }),
    });
    localStorage.setItem("sessionId", data.sessionId);
    setSessionId(data.sessionId);
    setUser(data.user);
  }

  async function signupStudent(token: string, password: string) {
    const data = await apiRequest("/api/auth/signup/student", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
    localStorage.setItem("sessionId", data.sessionId);
    setSessionId(data.sessionId);
    setUser(data.user);
    setStudent(data.student);
  }

  async function logout() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (error) {
      // Ignore error
    }
    localStorage.removeItem("sessionId");
    setSessionId(null);
    setUser(null);
    setStudent(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        student,
        sessionId,
        login,
        signup,
        signupStudent,
        logout,
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
