import { Users, X } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function ManagedChildBanner() {
  const parentSessionId = localStorage.getItem("parentSessionId");
  const childName = localStorage.getItem("parentChildName") ?? "child";

  if (!parentSessionId) return null;

  function handleReturn() {
    const orig = localStorage.getItem("parentSessionId")!;
    localStorage.setItem("sessionId", orig);
    localStorage.removeItem("parentSessionId");
    localStorage.removeItem("parentUserName");
    localStorage.removeItem("parentChildName");
    queryClient.clear();
    window.location.href = "/dashboard";
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 bg-violet-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
      <Users className="w-3 h-3 shrink-0" />
      <span className="truncate max-w-[180px]">
        Viewing {childName}
      </span>
      <button
        onClick={handleReturn}
        className="flex items-center gap-1 bg-white/25 hover:bg-white/40 px-2 py-0.5 rounded-full transition-colors shrink-0"
      >
        <X className="w-3 h-3" />
        Return
      </button>
    </div>
  );
}
