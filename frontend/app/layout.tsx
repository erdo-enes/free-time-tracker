import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ProjectsProvider } from "@/lib/projects";
import { ThemeProvider } from "@/lib/theme";
import { AppGate } from "@/components/AppGate";

export const metadata: Metadata = {
  title: "FreeTime Jira",
  description: "Track and organize your free time - exam prep, gaming, and more",
};

const themeInitScript = `
(function(){try{
  var t = localStorage.getItem('ftj_theme');
  if(!t){ t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  if(t === 'dark'){ document.documentElement.classList.add('dark'); }
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ProjectsProvider>
              <AppGate>{children}</AppGate>
            </ProjectsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
