"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, TOKEN_KEY, type User } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (data: { username: string; password: string; email?: string; display_name?: string }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadMe = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const me = await api.auth.me();
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await api.auth.login(username, password);
      setToken(res.access_token);
      setUser(res.user);
      return res.user;
    },
    []
  );

  const register = useCallback(
    async (data: { username: string; password: string; email?: string; display_name?: string }) => {
      const res = await api.auth.register(data);
      setToken(res.access_token);
      setUser(res.user);
      return res.user;
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
