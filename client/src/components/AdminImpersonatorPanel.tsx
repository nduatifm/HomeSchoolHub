import { useState, useRef, useEffect } from "react";
import { Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";

const PERSONAS = [
  {
    group: "Teachers",
    items: [
      { email: "demo.teacher@lyraprep.dev",  label: "Dr. Sarah Chen",    sub: "Math · Physics · SAT",     icon: "🎓" },
      { email: "demo.teacher2@lyraprep.dev", label: "Mr. Marcus Johnson", sub: "English · History",        icon: "🎓" },
      { email: "demo.teacher3@lyraprep.dev", label: "Ms. Aisha Patel",   sub: "Biology · Chemistry",      icon: "🎓" },
    ],
  },
  {
    group: "Parent",
    items: [
      { email: "demo.parent@lyraprep.dev",   label: "James Wilson",      sub: "Demo parent",              icon: "👨‍👧" },
    ],
  },
  {
    group: "Students",
    items: [
      { email: "demo.student@lyraprep.dev",  label: "Emily Wilson",      sub: "Grade 10",                 icon: "📚" },
      { email: "demo.student2@lyraprep.dev", label: "Liam Wilson",       sub: "Grade 7",                  icon: "📚" },
      { email: "demo.student3@lyraprep.dev", label: "Sophie Wilson",     sub: "Grade 12",                 icon: "📚" },
    ],
  },
];

interface SearchResult {
  id: number;
  email: string;
  name: string;
  role: string | null;
  isSuperAdmin?: boolean;
}

export default function AdminImpersonatorPanel() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isImpersonating = !!localStorage.getItem("adminSessionId");

  // Only visible for super admins who are NOT currently in an impersonated session
  if (!user?.isSuperAdmin || isImpersonating) return null;

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Debounced user search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiRequest(`/api/admin/users?search=${encodeURIComponent(search.trim())}`);
        setResults((data as SearchResult[]).slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [search]);

  async function becomeUser(emailOrId: string | number, displayName: string, displayRole: string) {
    if (loading) return;
    const key = String(emailOrId);
    setLoading(key);
    try {
      const body = typeof emailOrId === "number"
        ? { userId: emailOrId }
        : { email: emailOrId };
      const data = await apiRequest("/api/admin/become", {
        method: "POST",
        body: JSON.stringify(body),
      });
      // Store admin session so the banner can restore it
      localStorage.setItem("adminSessionId", localStorage.getItem("sessionId") ?? "");
      localStorage.setItem("adminUserName", user!.name ?? "Admin");
      localStorage.setItem("impersonatedUserName", displayName);
      localStorage.setItem("impersonatedUserRole", displayRole);
      // Switch to target session
      localStorage.setItem("sessionId", data.sessionId);
      queryClient.clear();
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("[admin-become]", err?.message);
      alert(err?.message ?? "Failed to switch session");
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  const isDevEnv = import.meta.env.DEV;

  return (
    <div
      ref={panelRef}
      className={`fixed right-4 z-[250] flex flex-col items-end gap-2 ${isDevEnv ? "bottom-20" : "bottom-4"}`}
    >
      {open && (
        <div className="mb-1 bg-gray-900 border border-amber-500/40 rounded-xl shadow-2xl overflow-hidden w-72">
          {/* Header */}
          <div className="px-3 py-2 bg-amber-600 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-semibold">Admin Impersonation</span>
          </div>

          {/* Demo personas */}
          {PERSONAS.map((group) => (
            <div key={group.group}>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 bg-gray-950">
                {group.group}
              </div>
              {group.items.map((p) => {
                const isLoading = loading === p.email;
                return (
                  <button
                    key={p.email}
                    onClick={() => becomeUser(p.email, p.label, group.group.toLowerCase().replace(/s$/, ""))}
                    disabled={!!loading}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-800 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <span className="text-base shrink-0">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">{p.label}</div>
                      <div className="text-gray-500 text-[10px] truncate">{p.sub}</div>
                    </div>
                    {isLoading && (
                      <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Real user search */}
          <div className="border-t border-gray-800 px-3 py-2 bg-gray-950">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">
              Search real users
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or email…"
              className="w-full bg-gray-800 text-white text-xs px-2.5 py-1.5 rounded border border-gray-700 focus:outline-none focus:border-amber-500 placeholder-gray-600"
            />
          </div>

          {(results.length > 0 || searching) && (
            <div className="border-t border-gray-800 max-h-48 overflow-y-auto">
              {searching && (
                <div className="px-3 py-2 text-xs text-gray-500">Searching…</div>
              )}
              {results.map((u) => {
                const isLoading = loading === String(u.id);
                const blocked = u.isSuperAdmin;
                return (
                  <button
                    key={u.id}
                    onClick={() => !blocked && becomeUser(u.id, u.name, u.role ?? "")}
                    disabled={!!loading || blocked}
                    title={blocked ? "Cannot impersonate super admins" : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                      blocked
                        ? "opacity-30 cursor-not-allowed"
                        : "hover:bg-gray-800 cursor-pointer disabled:opacity-50"
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                      <span className="text-[10px] text-gray-300 font-medium uppercase">
                        {u.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">{u.name}</div>
                      <div className="text-gray-500 text-[10px] truncate">{u.email}</div>
                    </div>
                    <span className={`text-[10px] shrink-0 capitalize ${
                      u.role === "teacher" ? "text-blue-400" :
                      u.role === "parent"  ? "text-purple-400" :
                      u.role === "student" ? "text-amber-400" : "text-gray-500"
                    }`}>
                      {u.isSuperAdmin ? "super admin" : u.role ?? "—"}
                    </span>
                    {isLoading && (
                      <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0 ml-1" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Admin impersonation panel"
        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-xl border border-amber-400/40 transition-all"
      >
        <Shield className="w-3.5 h-3.5 shrink-0" />
        <span>Admin</span>
        <span className="text-amber-200">{open ? "▲" : "▼"}</span>
      </button>
    </div>
  );
}
