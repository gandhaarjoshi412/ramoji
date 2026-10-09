const getApiBase = () => {
  if (typeof window !== "undefined") {
    // In browser: always use relative path "" if NEXT_PUBLIC_API_URL is unset or points to localhost/127.0.0.1.
    // This allows requests to proxy smoothly through Next.js rewrites without Mixed Content or CORS errors.
    const publicUrl = process.env.NEXT_PUBLIC_API_URL;
    if (publicUrl && !publicUrl.includes("localhost") && !publicUrl.includes("127.0.0.1")) {
      return publicUrl;
    }
    return "";
  }
  // Server-side (SSR / Node.js)
  return process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
};

const API_BASE = getApiBase();

export class ApiError extends Error {
  status: number;
  data?: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// Token storage helpers
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token") || localStorage.getItem("token");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

export function storeAuthTokens(accessToken: string, refreshToken?: string | null) {
  if (typeof window === "undefined") return;
  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("token", accessToken);
  document.cookie = `access_token=${accessToken}; path=/; max-age=1800; SameSite=Lax`;
  document.cookie = `token=${accessToken}; path=/; max-age=1800; SameSite=Lax`;

  if (refreshToken) {
    localStorage.setItem("refresh_token", refreshToken);
    document.cookie = `refresh_token=${refreshToken}; path=/; max-age=604800; SameSite=Lax`;
  }
}

export function clearAuthTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
  document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "token=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "refresh_token=; path=/; max-age=0; SameSite=Lax";
}

// Global promise to deduplicate concurrent refresh attempts
let refreshPromise: Promise<string | null> | null = null;

export async function silentRefreshToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      const currentToken = getAccessToken();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (currentToken) {
        headers["Authorization"] = `Bearer ${currentToken}`;
      }

      const bodyPayload = refreshToken
        ? JSON.stringify({ refresh_token: refreshToken })
        : JSON.stringify({});

      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers,
        credentials: "include",
        body: bodyPayload,
      });

      if (!res.ok) {
        throw new Error("Refresh failed");
      }

      const data = await res.json();
      if (data && data.access_token) {
        storeAuthTokens(data.access_token, data.refresh_token);
        return data.access_token as string;
      }
      throw new Error("Invalid refresh response");
    } catch {
      clearAuthTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry: boolean = false
): Promise<T> {
  const token = getAccessToken();

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 204) {
    return null as T;
  }

  // Intercept 401 Unauthorized
  if (res.status === 401) {
    const isAuthRoute =
      endpoint.includes("/api/auth/login") ||
      endpoint.includes("/api/auth/refresh");

    if (!isAuthRoute && !isRetry && typeof window !== "undefined") {
      const newToken = await silentRefreshToken();
      if (newToken) {
        const retryHeaders: HeadersInit = {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        };
        return apiRequest<T>(endpoint, { ...options, headers: retryHeaders }, true);
      } else {
        clearAuthTokens();
        if (window.location.pathname !== "/login") {
          const currentPath = window.location.pathname + window.location.search;
          window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
        }
      }
    }
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      const isAuthRoute =
        endpoint.includes("/api/auth/login") ||
        endpoint.includes("/api/auth/refresh");
      if (!isAuthRoute) {
        clearAuthTokens();
        if (window.location.pathname !== "/login") {
          const currentPath = window.location.pathname + window.location.search;
          window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
        }
      }
    }
    let errorMsg = res.statusText || "Request failed";
    if (data?.detail) {
      if (typeof data.detail === "string") {
        errorMsg = data.detail;
      } else if (Array.isArray(data.detail)) {
        errorMsg = data.detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ");
      } else if (typeof data.detail === "object") {
        errorMsg = data.detail.message || JSON.stringify(data.detail);
      }
    } else if (data?.message && typeof data.message === "string") {
      errorMsg = data.message;
    }
    throw new ApiError(errorMsg, res.status, data);
  }

  return data as T;
}

export const formatINR = (val: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val || 0);
};

export const formatKg = (val: number): string => {
  return `${(val || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg`;
};
