import { useEffect } from "react";
import { Shield, X } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

const BANNER_HEIGHT = 40;

export function getIsImpersonating(): boolean {
  return !!localStorage.getItem("adminSessionId");
}

export default function ImpersonationBanner() {
  const adminSessionId = localStorage.getItem("adminSessionId");
  const adminUserName = localStorage.getItem("adminUserName") ?? "Admin";
  const impersonatedName = localStorage.getItem("impersonatedUserName") ?? "";
  const impersonatedRole = localStorage.getItem("impersonatedUserRole") ?? "";

  const isImpersonating = !!adminSessionId;

  useEffect(() => {
    if (isImpersonating) {
      document.documentElement.style.paddingTop = `${BANNER_HEIGHT}px`;
    }
    return () => {
      document.documentElement.style.paddingTop = "";
    };
  }, [isImpersonating]);

  if (!isImpersonating) return null;

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
    <div
      style={{ height: BANNER_HEIGHT }}
      className="fixed top-0 left-0 right-0 z-[300] flex items-center gap-3 bg-amber-500 text-white px-4 shadow-md"
    >
      <Shield className="w-4 h-4 shrink-0" />
      <span className="text-sm font-medium flex-1 truncate">
        Impersonating <strong>{impersonatedName || "user"}</strong>
        {impersonatedRole && (
          <span className="ml-1 text-amber-100 capitalize">({impersonatedRole})</span>
        )}
        <span className="ml-2 text-amber-100 text-xs hidden sm:inline">
          — signed in as {adminUserName}
        </span>
      </span>
      <button
        onClick={handleReturn}
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors shrink-0"
      >
        <X className="w-3 h-3" />
        Return to Admin
      </button>
    </div>
  );
}
