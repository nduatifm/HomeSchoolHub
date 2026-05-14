import { useEffect } from "react";
import { Users, X } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

const BANNER_HEIGHT = 40;

export function getIsViewingAsChild(): boolean {
  return !!localStorage.getItem("parentSessionId");
}

export default function ManagedChildBanner() {
  const parentSessionId = localStorage.getItem("parentSessionId");
  const parentUserName = localStorage.getItem("parentUserName") ?? "your account";
  const childName = localStorage.getItem("parentChildName") ?? "child";

  const isViewing = !!parentSessionId;

  useEffect(() => {
    if (isViewing) {
      document.documentElement.style.paddingTop = `${BANNER_HEIGHT}px`;
    }
    return () => {
      document.documentElement.style.paddingTop = "";
    };
  }, [isViewing]);

  if (!isViewing) return null;

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
    <div
      style={{ height: BANNER_HEIGHT }}
      className="fixed top-0 left-0 right-0 z-[300] flex items-center gap-3 bg-amber-500 text-white px-4 shadow-md"
    >
      <Users className="w-4 h-4 shrink-0" />
      <span className="text-sm font-medium flex-1 truncate">
        Viewing <strong>{childName}</strong>'s account
        <span className="ml-2 text-violet-200 text-xs hidden sm:inline">
          — signed in as {parentUserName}
        </span>
      </span>
      <button
        onClick={handleReturn}
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors shrink-0"
      >
        <X className="w-3 h-3" />
        Return to your account
      </button>
    </div>
  );
}
