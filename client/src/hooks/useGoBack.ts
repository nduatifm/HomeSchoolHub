import { useLocation } from "wouter";
import { getNavCount } from "@/lib/navigationHistory";

export function useGoBack(fallbackPath: string): () => void {
  const [, navigate] = useLocation();
  return function goBack() {
    if (getNavCount() > 0) {
      window.history.back();
    } else {
      navigate(fallbackPath);
    }
  };
}
