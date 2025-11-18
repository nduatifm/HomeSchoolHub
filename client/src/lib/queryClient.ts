import { QueryClient } from "@tanstack/react-query";

export async function apiRequest(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("sessionId");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

async function defaultQueryFn({ queryKey }: { queryKey: any[] }) {
  const url = queryKey[0];
  return apiRequest(url);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});
