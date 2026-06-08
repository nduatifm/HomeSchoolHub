import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

const PERSONAS = [
  {
    group: "Teachers",
    items: [
      { email: "demo.teacher@lyraprep.dev",  label: "Dr. Sarah Chen",    sub: "Math · Physics · SAT",    icon: "🎓", color: "bg-blue-600 hover:bg-blue-700" },
      { email: "demo.teacher2@lyraprep.dev", label: "Mr. Marcus Johnson", sub: "English · History",       icon: "🎓", color: "bg-blue-600 hover:bg-blue-700" },
      { email: "demo.teacher3@lyraprep.dev", label: "Ms. Aisha Patel",    sub: "Biology · Chemistry",     icon: "🎓", color: "bg-blue-600 hover:bg-blue-700" },
    ],
  },
  {
    group: "Parent",
    items: [
      { email: "demo.parent@lyraprep.dev",   label: "James Wilson",       sub: "3 children",              icon: "👨‍👧", color: "bg-amber-600 hover:bg-amber-700" },
    ],
  },
  {
    group: "Students",
    items: [
      { email: "demo.student@lyraprep.dev",  label: "Emily Wilson",       sub: "Grade 10 · Sarah Chen",   icon: "📚", color: "bg-purple-600 hover:bg-purple-700" },
      { email: "demo.student2@lyraprep.dev", label: "Liam Wilson",        sub: "Grade 7 · Marcus Johnson", icon: "📚", color: "bg-purple-600 hover:bg-purple-700" },
      { email: "demo.student3@lyraprep.dev", label: "Sophie Wilson",      sub: "Grade 12 · Aisha Patel",  icon: "📚", color: "bg-purple-600 hover:bg-purple-700" },
    ],
  },
];

const ALL_ITEMS = PERSONAS.flatMap(g => g.items);

export default function DevRoleSwitcher() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(
    localStorage.getItem("devPersonaEmail")
  );

  async function become(email: string) {
    if (loading) return;
    setLoading(email);
    try {
      // /api/dev/become now sets the httpOnly session cookie directly — no sessionId in response.
      await apiRequest("/api/dev/become", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      localStorage.setItem("devPersonaEmail", email);
      setCurrentEmail(email);
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

  const current = ALL_ITEMS.find(p => p.email === currentEmail);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">

      {open && (
        <div className="mb-1 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden w-64">
          {PERSONAS.map(group => (
            <div key={group.group}>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 bg-gray-950">
                {group.group}
              </div>
              {group.items.map(p => {
                const isActive = p.email === currentEmail;
                const isLoading = loading === p.email;
                return (
                  <button
                    key={p.email}
                    onClick={() => become(p.email)}
                    disabled={!!loading || isActive}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors
                      ${isActive
                        ? "bg-gray-800 opacity-50 cursor-default"
                        : "hover:bg-gray-800 cursor-pointer"
                      }
                    `}
                  >
                    <span className="text-base">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">{p.label}</div>
                      <div className="text-gray-500 text-[10px] truncate">{p.sub}</div>
                    </div>
                    {isLoading && (
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    )}
                    {isActive && (
                      <span className="text-green-400 text-[10px] font-medium flex-shrink-0">active</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        title="Dev persona switcher"
        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-xl border border-gray-700 transition-all"
      >
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
        <span className="text-gray-400">DEV</span>
        {current
          ? <span className="text-white">{current.icon} {current.label}</span>
          : <span className="text-gray-500">pick persona</span>
        }
        <span className="text-gray-500 ml-0.5">{open ? "▲" : "▼"}</span>
      </button>

    </div>
  );
}
