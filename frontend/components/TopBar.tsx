"use client";

import { Search, Bell, Plus, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export function TopBar() {
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCreate = (type: string) => {
    setShowDropdown(false);
    if (type === "issue") router.push("/?create=1");
    else if (type === "time") router.push("/time?create=1");
    else if (type === "calendar") router.push("/calendar");
  };

  return (
    <header className="h-12 bg-jira-nav border-b border-jira-border flex items-center px-4 gap-4 flex-shrink-0 relative z-50 shadow-card">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-jira-blue rounded flex items-center justify-center">
          <span className="text-white font-bold text-sm">FJ</span>
        </div>
        <span className="text-jira-text font-semibold text-sm hidden sm:block">FreeTime Jira</span>
      </div>

      <div className="flex items-center gap-1 text-jira-textMuted text-sm">
        <span className="hover:text-jira-textSub cursor-pointer px-2 py-1 rounded hover:bg-jira-hover transition-colors">Projects</span>
        <span className="hover:text-jira-textSub cursor-pointer px-2 py-1 rounded hover:bg-jira-hover transition-colors">My Board</span>
      </div>

      <div className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-jira-textMuted" />
          <input
            placeholder="Search issues, time entries..."
            className="w-full bg-jira-surface border border-jira-border rounded pl-9 pr-3 py-1.5 text-sm text-jira-text placeholder-jira-textLight focus:outline-none focus:border-jira-blue focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1.5 bg-jira-blue hover:bg-jira-blueDark text-white px-3 py-1.5 rounded text-sm font-medium transition-colors shadow-card"
        >
          <Plus size={15} /> Create
          <ChevronDown size={13} />
        </button>
        {showDropdown && (
          <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-jira-border rounded-lg shadow-dropdown py-1.5 z-50">
            <button onClick={() => handleCreate("issue")} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-jira-textSub hover:bg-jira-hover transition-colors">
              <div className="w-7 h-7 rounded bg-jira-blueBg flex items-center justify-center"><Plus size={15} className="text-jira-blue" /></div>
              <div className="text-left"><div className="font-medium text-jira-text">Issue</div><div className="text-xs text-jira-textMuted">Create a board task</div></div>
            </button>
            <button onClick={() => handleCreate("time")} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-jira-textSub hover:bg-jira-hover transition-colors">
              <div className="w-7 h-7 rounded bg-jira-greenBg flex items-center justify-center"><Plus size={15} className="text-jira-green" /></div>
              <div className="text-left"><div className="font-medium text-jira-text">Time Entry</div><div className="text-xs text-jira-textMuted">Log time manually</div></div>
            </button>
            <button onClick={() => handleCreate("calendar")} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-jira-textSub hover:bg-jira-hover transition-colors">
              <div className="w-7 h-7 rounded bg-jira-purpleBg flex items-center justify-center"><Plus size={15} className="text-jira-purple" /></div>
              <div className="text-left"><div className="font-medium text-jira-text">Calendar Entry</div><div className="text-xs text-jira-textMuted">Drag to create on calendar</div></div>
            </button>
          </div>
        )}
        <button className="text-jira-textMuted hover:text-jira-textSub relative">
          <Bell size={18} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-jira-red rounded-full" />
        </button>
        <div className="w-8 h-8 bg-jira-blue rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:ring-2 hover:ring-jira-blue/30 transition-all">
          E
        </div>
      </div>
    </header>
  );
}
