"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, parseApiError } from "../../lib/api";

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await apiRequest("/api/auth/me", { method: "GET" });

      if (!response.ok) {
        setUser(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("session_id");
        }
        return null;
      }

      const profile = await response.json();
      setUser(profile);
      return profile;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await apiRequest("/api/auth/me", { method: "GET" });

        if (cancelled) return;

        if (response.ok) {
          const profile = await response.json();
          setUser(profile);
        } else {
          setUser(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem("session_id");
          }
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const response = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const data = await response.json();
    if (data.session_id && typeof window !== "undefined") {
      localStorage.setItem("session_id", data.session_id);
    }
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async ({ name, email, password }) => {
    const registerResponse = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });

    if (!registerResponse.ok) {
      throw new Error(await parseApiError(registerResponse));
    }

    return login({ email, password });
  }, [login]);

  const logout = useCallback(async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("session_id");
      }
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      signup,
      logout,
      refreshUser,
    }),
    [user, loading, login, signup, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
