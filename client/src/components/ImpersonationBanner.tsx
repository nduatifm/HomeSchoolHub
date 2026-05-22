import { Shield, X } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function ImpersonationBanner() {
  const adminSessionId = localStorage.getItem("adminSessionId");
  const impersonatedName = localStorage.getItem("impersonatedUserName") ?? "";
  const impersonatedRole = localStorage.getItem("impersonatedUserRole") ?? "";

  if (!adminSessionId) return null;

  function handleReturn() {
    const orig = localStorage.getItem("adminSessionId")!;
    localStorage.setItem("sessionId", orig);
    localStorage.removeItem("adminSessionId");
    localStorage.removeItem("adminUserName");
    localStorage.removeItem("impersonatedUserName");
    localStorage.removeItem("impersonatedUserRole");
    queryClient.clear();
    window.location.href = "/dashboard";
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 bg-amber-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
      <Shield className="w-3 h-3 shrink-0" />
      <span className="truncate max-w-[180px]">
        {impersonatedName || "user"}
        {impersonatedRole && (
          <span className="ml-1 text-amber-100 capitalize">({impersonatedRole})</span>
        )}
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
