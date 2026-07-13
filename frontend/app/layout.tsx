import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "FreeTime Jira",
  description: "Track and organize your free time - exam prep, gaming, and more",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="flex h-screen flex-col">
          <Suspense fallback={<div className="h-12 bg-jira-nav border-b border-jira-border" />}>
            <TopBar />
          </Suspense>
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-auto bg-jira-app">
              <Suspense fallback={<div className="p-6 text-jira-textMuted">Loading...</div>}>
                {children}
              </Suspense>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
