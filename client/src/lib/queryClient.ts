import { QueryClient } from "@tanstack/react-query";

export class ApiError extends Error {
  requiresRole?: boolean;
  status?: number;
  
  constructor(message: string, options?: { requiresRole?: boolean; status?: number }) {
    super(message);
    this.name = 'ApiError';
    this.requiresRole = options?.requiresRole;
    this.status = options?.status;
  }
}

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
    const errorData = await response.json().catch(() => ({ error: "Request failed" }));
    throw new ApiError(errorData.error || "Request failed", {
      requiresRole: errorData.requiresRole,
      status: response.status,
    });
  }

  return response.json();
}

export async function apiUpload(url: string, formData: FormData, options: RequestInit = {}) {
  const token = localStorage.getItem("sessionId");
  const headers: HeadersInit = {
    ...options.headers,
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    ...options,
    body: formData,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(error.error || "Upload failed");
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
