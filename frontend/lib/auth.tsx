"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import {
  apiRequest,
  storeAuthTokens,
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  silentRefreshToken,
  ApiError,
} from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwtExp(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    return typeof parsed.exp === "number" ? parsed.exp * 1000 : null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleTokenRefresh = useCallback(
    (token: string) => {
      clearRefreshTimer();
      const expTime = parseJwtExp(token);
      if (!expTime) return;

      const now = Date.now();
      const msUntilExp = expTime - now;

      // Proactively refresh 60 seconds before token expires
      let delay = msUntilExp - 60000;
      if (delay <= 0 && msUntilExp > 10000) {
        delay = Math.floor(msUntilExp / 2);
      }

      if (delay > 0) {
        refreshTimerRef.current = setTimeout(async () => {
          await refresh();
        }, delay);
      }
    },
    [clearRefreshTimer]
  );

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const newToken = await silentRefreshToken();
      if (newToken) {
        const me = await apiRequest<User>("/api/auth/me");
        setUser(me);
        scheduleTokenRefresh(newToken);
        return true;
      } else {
        clearAuthTokens();
        setUser(null);
        clearRefreshTimer();
        return false;
      }
    } catch {
      clearAuthTokens();
      setUser(null);
      clearRefreshTimer();
      return false;
    }
  }, [clearRefreshTimer, scheduleTokenRefresh]);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const token = getAccessToken();
      const refreshToken = getRefreshToken();
      const hasCookie =
        typeof document !== "undefined" &&
        (document.cookie.includes("access_token=") ||
          document.cookie.includes("token=") ||
          document.cookie.includes("refresh_token="));

      if (!token && !refreshToken && !hasCookie) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        let me: User | null = null;
        try {
          me = await apiRequest<User>("/api/auth/me");
          if (isMounted) {
            setUser(me);
            const currentToken = getAccessToken();
            if (currentToken) scheduleTokenRefresh(currentToken);
          }
        } catch (err: any) {
          if (err instanceof ApiError && err.status === 401) {
            // Attempt silent refresh via POST /api/auth/refresh
            const newToken = await silentRefreshToken();
            if (newToken) {
              const freshMe = await apiRequest<User>("/api/auth/me");
              if (isMounted) {
                setUser(freshMe);
                scheduleTokenRefresh(newToken);
              }
            } else {
              clearAuthTokens();
              if (isMounted) setUser(null);
            }
          } else {
            clearAuthTokens();
            if (isMounted) setUser(null);
          }
        }
      } catch {
        clearAuthTokens();
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    return () => {
      isMounted = false;
      clearRefreshTimer();
    };
  }, [clearRefreshTimer, refresh, scheduleTokenRefresh]);

  const login = async (email: string, pass: string) => {
    const res = await apiRequest<{
      access_token: string;
      refresh_token?: string;
      token_type?: string;
      user: User;
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: pass }),
    });

    storeAuthTokens(res.access_token, res.refresh_token);
    setUser(res.user);
    scheduleTokenRefresh(res.access_token);

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const callbackUrl = searchParams.get("callbackUrl");
      if (callbackUrl && callbackUrl.startsWith("/")) {
        router.push(callbackUrl);
        return;
      }
    }
    router.push("/dashboard");
  };

  const logout = async () => {
    clearRefreshTimer();
    try {
      const refreshToken = getRefreshToken();
      await apiRequest("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuthTokens();
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
