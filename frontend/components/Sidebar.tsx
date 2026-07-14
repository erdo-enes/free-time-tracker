"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, Clock, BarChart3, Gamepad2, Settings, Calendar, GanttChart, Sun, Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

const navItems = [
  { href: "/", label: "Board", icon: LayoutGrid },
  { href: "/roadmap", label: "Roadmap", icon: GanttChart },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/time", label: "Time Tracker", icon: Clock },
  { href: "/analytics", label: "Reports", icon: BarChart3 },
  { href: "/gaming", label: "Gaming", icon: Gamepad2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const sections = [
  { label: "PLAN", items: navItems.slice(0, 3) },
  { label: "TRACK", items: navItems.slice(3, 4) },
  { label: "INSIGHTS", items: navItems.slice(4, 6) },
  { label: "CONFIG", items: navItems.slice(6) },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <aside className="w-56 bg-jira-nav border-r border-jira-border flex flex-col flex-shrink-0">
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="px-3 py-1 text-[10px] font-bold text-jira-textLight tracking-wider">
              {section.label}
            </div>
            <div className="space-y-0.5 mt-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-1.5 rounded text-sm transition-colors",
                      active
                        ? "bg-jira-blueBg text-jira-blue font-medium"
                        : "text-jira-textSub hover:bg-jira-hover hover:text-jira-text"
                    )}
                  >
                    <Icon size={16} className={active ? "text-jira-blue" : "text-jira-textMuted"} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-jira-border flex items-center justify-between">
        <div className="text-[10px] text-jira-textLight">v3.1.0 - FreeTime Jira</div>
        <button onClick={toggle} title="Toggle theme"
          className="text-jira-textMuted hover:text-jira-text p-1 rounded hover:bg-jira-hover transition-colors">
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </aside>
  );
}
