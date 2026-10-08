/**
 * Auth Context & Guard per Task 2 [F1-8].
 * Manages user authentication state, session validation,
 * and automatic redirection upon session expiration.
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/apiClient";

const AuthContext = createContext(null);

export function safeReturnTo(candidate) {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//"))
    return "/";
  try {
    const target = new URL(candidate, window.location.origin);
    if (target.origin !== window.location.origin) return "/";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = async () => {
    try {
      const session = await api.get("/v1/auth/me", { skipAuth: true });
      setUser({
        user_id: session.user_id,
        username: session.display_name,
        avatar_url: session.avatar_url,
        is_authenticated: true,
        onboarding_complete: Boolean(session.onboarding_complete),
      });
      return true;
    } catch {
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void checkSession();
    const onUnauthorized = () => setUser(null);
    window.addEventListener("vynl:unauthorized", onUnauthorized);
    return () =>
      window.removeEventListener("vynl:unauthorized", onUnauthorized);
  }, []);

  const login = async (returnTo = "/") => {
    const safeTarget = safeReturnTo(returnTo);
    const query = new URLSearchParams({ return_to: safeTarget });
    window.location.assign(`/v1/auth/google/start?${query.toString()}`);
    return true;
  };

  const logout = async () => {
    try {
      await api.post("/v1/auth/logout", undefined, { skipAuth: true });
    } finally {
      setUser(null);
      window.dispatchEvent(new Event("vynl:session-ended"));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user?.is_authenticated,
        isLoading,
        login,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
