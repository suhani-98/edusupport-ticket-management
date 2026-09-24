import { useEffect, useMemo, useState, type ReactNode } from "react";
import { clearToken, getToken, setToken } from "../lib/token";
import { setUnauthorizedHandler } from "../services/api";
import { currentUserRequest, loginRequest } from "../services/auth.service";
import type { AuthUser } from "../types/auth";
import { AuthContext, type AuthContextValue } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(() => getToken() !== null);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
    });
  }, []);

  useEffect(() => {
    if (!getToken()) {
      return;
    }
    let cancelled = false;
    currentUserRequest()
      .then((result) => {
        if (!cancelled) {
          setUser(result.user);
        }
      })
      .catch(() => {
        clearToken();
        if (!cancelled) {
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      async login(email, password) {
        const result = await loginRequest(email, password);
        setToken(result.token);
        setUser(result.user);
        return result.user;
      },
      logout() {
        clearToken();
        setUser(null);
      },
      async refreshUser() {
        if (!getToken()) {
          setUser(null);
          return;
        }
        const result = await currentUserRequest();
        setUser(result.user);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
