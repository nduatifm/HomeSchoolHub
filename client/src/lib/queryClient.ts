import { QueryClient } from "@tanstack/react-query";

export class ApiError extends Error {
  requiresRole?: boolean;
  requiresVerification?: boolean;
  requiresGoogle?: boolean;
  email?: string;
  status?: number;
  role?: string;

  constructor(message: string, options?: { requiresRole?: boolean; requiresVerification?: boolean; requiresGoogle?: boolean; email?: string; status?: number; role?: string }) {
    super(message);
    this.name = 'ApiError';
    this.requiresRole = options?.requiresRole;
    this.requiresVerification = options?.requiresVerification;
    this.requiresGoogle = options?.requiresGoogle;
    this.email = options?.email;
    this.status = options?.status;
    this.role = options?.role;
  }
}

export async function apiRequest(url: string, options: RequestInit = {}) {
  // Normal sessions use httpOnly cookies (set by the server) — never accessible to JS.
  // Impersonation flows (admin become-user, parent view-as-child) temporarily store
  // the impersonated session token in localStorage and send it via Authorization
  // header so the server can distinguish it from the real cookie session.
  const impersonationToken = localStorage.getItem("sessionId");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (impersonationToken) {
    headers["Authorization"] = `Bearer ${impersonationToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Request failed" }));
    if (response.status === 401) {
      // Only treat 401 as a session expiry when it comes from a protected
      // endpoint, not from auth flows where 401 means "bad credentials/token".
      const isAuthFlow = url.startsWith("/api/auth/") && url !== "/api/auth/me";
      if (!isAuthFlow) {
        window.dispatchEvent(new Event("lyra:auth:expired"));
      }
    }
    throw new ApiError(errorData.error || "Request failed", {
      requiresRole: errorData.requiresRole,
      requiresVerification: errorData.requiresVerification,
      requiresGoogle: errorData.requiresGoogle,
      email: errorData.email,
      status: response.status,
      role: errorData.role,
    });
  }

  return response.json();
}

export async function apiUpload(url: string, formData: FormData, options: RequestInit = {}) {
  const impersonationToken = localStorage.getItem("sessionId");
  const headers: HeadersInit = {
    ...options.headers,
  };

  if (impersonationToken) {
    headers["Authorization"] = `Bearer ${impersonationToken}`;
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

export function apiUploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (progress: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const impersonationToken = localStorage.getItem("sessionId");

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          resolve({ success: true });
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || "Upload failed"));
        } catch {
          reject(new Error("Upload failed"));
        }
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload aborted"));
    });

    xhr.open("POST", url);

    if (impersonationToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${impersonationToken}`);
    }

    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

async function defaultQueryFn({ queryKey }: { queryKey: any[] }) {
  const url = queryKey
    .filter((segment) => segment !== undefined && segment !== null)
    .join('/');
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
