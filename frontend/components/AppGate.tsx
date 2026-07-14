"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";

export function AppGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  useEffect(() => {
    if (!loading && !user && !isLogin) {
      router.replace("/login");
    }
  }, [loading, user, isLogin, router]);

  if (isLogin) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-jira-app">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 bg-jira-blue rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">FJ</span>
          </div>
          <div className="text-sm text-jira-textMuted">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-jira-app">
          {children}
        </main>
      </div>
    </div>
  );
}
