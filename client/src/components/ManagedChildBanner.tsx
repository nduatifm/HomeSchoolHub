import { Users, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ManagedChildBanner() {
  const { user, refreshUser } = useAuth();
  const impersonatedBy = user?.impersonatedBy;

  // Only show when a parent (not an admin) is viewing as their child
  if (!impersonatedBy || impersonatedBy.isAdmin || impersonatedBy.isSuperAdmin) return null;

  async function handleReturn() {
    try {
      await apiRequest("/api/parent/stop-impersonating", { method: "POST" });
    } catch {
      // Best-effort — refresh regardless
    }
    queryClient.clear();
    await refreshUser();
    window.location.href = "/dashboard";
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 bg-violet-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
      <Users className="w-3 h-3 shrink-0" />
      <span className="truncate max-w-[180px]">
        Viewing {user?.name || "child"}
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
