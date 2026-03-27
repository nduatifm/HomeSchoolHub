import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

const ROLES = [
  { key: "teacher", label: "Teacher", icon: "🎓", color: "bg-blue-600 hover:bg-blue-700" },
  { key: "parent",  label: "Parent",  icon: "👨‍👧", color: "bg-amber-600 hover:bg-amber-700" },
  { key: "student", label: "Student", icon: "📚", color: "bg-purple-600 hover:bg-purple-700" },
] as const;

export default function DevRoleSwitcher() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function become(role: "teacher" | "parent" | "student") {
    if (loading) return;
    setLoading(role);
    try {
      const data = await apiRequest("/api/dev/become", {
        method: "POST",
        body: JSON.stringify({ role }),
      });
      localStorage.setItem("sessionId", data.sessionId);
      queryClient.clear();
      navigate("/dashboard");
      window.location.reload();
    } catch (err) {
      console.error("DevRoleSwitcher error:", err);
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  const current = ROLES.find(r => r.key === user?.role);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">

      {open && (
        <div className="flex flex-col gap-1.5 items-end">
          {ROLES.map(r => {
            const isActive = user?.role === r.key;
            return (
              <button
                key={r.key}
                onClick={() => become(r.key)}
                disabled={!!loading || isActive}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-medium
                  shadow-lg transition-all
                  ${isActive ? "opacity-40 cursor-default bg-gray-500" : r.color}
                  ${loading === r.key ? "opacity-60" : ""}
                `}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
                {loading === r.key && (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isActive && <span className="text-xs opacity-80">(current)</span>}
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        title="Dev role switcher"
        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-xl border border-gray-700 transition-all"
      >
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span>DEV</span>
        {current && <span className="opacity-70">{current.icon} {current.label}</span>}
        <span className="ml-1">{open ? "▲" : "▼"}</span>
      </button>

    </div>
  );
}
