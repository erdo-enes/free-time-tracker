"use client";

import { Search, Bell, Plus, ChevronDown, KanbanSquare, Clock, Calendar, Settings, LayoutGrid, LogOut, User, FolderKanban, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, type Task, type TimeEntry } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useProjects } from "@/lib/projects";
import { cn, formatMinutes, formatDateTime } from "@/lib/utils";

type DropdownType = "create" | "projects" | "notifications" | "profile" | "search" | null;

export function TopBar() {
  const [openDropdown, setOpenDropdown] = useState<DropdownType>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ tasks: Task[]; entries: TimeEntry[] } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { projects, activeProject, setActiveProjectId, reload: reloadProjects } = useProjects();
  const profileName = user?.display_name || user?.username || "User";
  const profileInitial = (user?.display_name || user?.username || "U").charAt(0).toUpperCase();
  const containerRef = useRef<HTMLDivElement>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProject, setNewProject] = useState({ key: "", name: "" });
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load data for notifications
  const loadNotifData = useCallback(async () => {
    try {
      const [tasks, entries] = await Promise.all([
        api.tasks.list(),
        api.timeEntries.list({ limit: 10 }),
      ]);
      setRecentTasks(tasks.slice(0, 5));
      setRecentEntries(entries.slice(0, 5));
      const unread = tasks.filter((t) => t.status !== "done").length + entries.length;
      setNotifCount(Math.min(unread, 9));
    } catch {}
  }, []);

  useEffect(() => { loadNotifData(); }, [loadNotifData]);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults(null); return; }
    setSearchLoading(true);
    try {
      const [tasks, entries] = await Promise.all([
        api.tasks.list(),
        api.timeEntries.list({ limit: 200 }),
      ]);
      const ql = q.toLowerCase();
      setSearchResults({
        tasks: tasks.filter((t) => t.title.toLowerCase().includes(ql) || t.description?.toLowerCase().includes(ql)).slice(0, 5),
        entries: entries.filter((e) => e.title.toLowerCase().includes(ql)).slice(0, 5),
      });
    } catch {}
    setSearchLoading(false);
  }, []);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setOpenDropdown("search");
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(value), 250);
  };

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setSearchQuery(""); setSearchResults(null); setOpenDropdown(null); }
  };

  const handleCreate = (type: string) => {
    setOpenDropdown(null);
    if (type === "issue") router.push("/?create=1");
    else if (type === "time") router.push("/time?create=1");
    else if (type === "calendar") router.push("/calendar");
  };

  const handleNavigate = (path: string) => {
    setOpenDropdown(null);
    router.push(path);
  };

  const toggleDropdown = (type: DropdownType) => {
    setOpenDropdown(openDropdown === type ? null : type);
    if (type === "notifications") setNotifCount(0);
  };

  return (
    <header ref={containerRef} className="h-12 bg-white border-b border-jira-border flex items-center px-4 gap-4 flex-shrink-0 relative z-50 shadow-card">
      {/* Logo */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
        <div className="w-7 h-7 bg-jira-blue rounded flex items-center justify-center">
          <span className="text-white font-bold text-sm">FJ</span>
        </div>
        <span className="text-jira-text font-semibold text-sm hidden sm:block">FreeTime Jira</span>
      </div>

      {/* Projects + My Board */}
      <div className="flex items-center gap-1 text-jira-textMuted text-sm relative">
        <button onClick={() => toggleDropdown("projects")}
          className={cn("flex items-center gap-1 hover:text-jira-textSub px-2 py-1 rounded hover:bg-jira-hover transition-colors", openDropdown === "projects" && "bg-jira-hover text-jira-textSub")}>
          Projects <ChevronDown size={12} className={cn("transition-transform", openDropdown === "projects" && "rotate-180")} />
        </button>
        <button onClick={() => handleNavigate("/")}
          className={cn("hover:text-jira-textSub px-2 py-1 rounded hover:bg-jira-hover transition-colors", pathname === "/" && "text-jira-blue font-medium")}>
          My Board
        </button>

        {/* Projects dropdown */}
        {openDropdown === "projects" && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-jira-border rounded-lg shadow-dropdown py-1.5 z-50">
            <div className="px-3 py-1.5 text-[10px] font-bold text-jira-textMuted uppercase tracking-wider">Projects</div>
            {projects.length === 0 && (
              <div className="px-3 py-3 text-sm text-jira-textMuted">No projects yet.</div>
            )}
            {projects.map((p) => (
              <button key={p.id} onClick={() => { setActiveProjectId(p.id); setOpenDropdown(null); router.push("/"); }}
                className={cn("w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-jira-hover transition-colors text-left",
                  activeProject?.id === p.id ? "bg-jira-blueBg" : "text-jira-textSub")}>
                <div className="w-7 h-7 rounded flex items-center justify-center text-white font-bold text-[10px]" style={{ background: p.style_color }}>{p.key.slice(0, 2)}</div>
                <div className="text-left flex-1">
                  <div className="font-medium text-jira-text">{p.name}</div>
                  <div className="text-xs text-jira-textMuted font-mono">{p.key}</div>
                </div>
                {activeProject?.id === p.id && <span className="w-2 h-2 rounded-full bg-jira-blue" />}
              </button>
            ))}
            <div className="border-t border-jira-border my-1" />
            {showCreateProject ? (
              <div className="px-3 py-2 space-y-2">
                <input placeholder="KEY (e.g. CKA)" value={newProject.key} maxLength={10}
                  onChange={(e) => setNewProject({ ...newProject, key: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                  className="jira-input w-full text-xs font-mono" />
                <input placeholder="Project name" value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="jira-input w-full text-xs" />
                <div className="flex gap-2">
                  <button onClick={async () => {
                    if (!newProject.key.trim() || !newProject.name.trim()) return;
                    try { await api.projects.create({ key: newProject.key, name: newProject.name }); reloadProjects(); setNewProject({ key: "", name: "" }); setShowCreateProject(false); }
                    catch (e) { alert(String(e).replace(/^Error:\s*/i, "")); }
                  }} className="jira-btn-primary text-xs flex-1">Create</button>
                  <button onClick={() => setShowCreateProject(false)} className="jira-btn-secondary text-xs">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowCreateProject(true)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-jira-blue hover:bg-jira-hover transition-colors">
                <Plus size={15} /> New Project
              </button>
            )}
            <div className="border-t border-jira-border my-1" />
            <button onClick={() => handleNavigate("/calendar")} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-jira-textSub hover:bg-jira-hover transition-colors">
              <Calendar size={15} className="text-jira-textMuted ml-1" />
              <span>Calendar</span>
            </button>
            <button onClick={() => handleNavigate("/time")} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-jira-textSub hover:bg-jira-hover transition-colors">
              <Clock size={15} className="text-jira-textMuted ml-1" />
              <span>Time Tracker</span>
            </button>
            <button onClick={() => handleNavigate("/analytics")} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-jira-textSub hover:bg-jira-hover transition-colors">
              <FolderKanban size={15} className="text-jira-textMuted ml-1" />
              <span>Reports</span>
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-auto relative">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-jira-textMuted pointer-events-none" />
          <input
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            onKeyDown={handleSearchKey}
            onFocus={() => setOpenDropdown("search")}
            placeholder="Search issues, time entries..."
            className="w-full bg-jira-surface border border-jira-border rounded pl-9 pr-8 py-1.5 text-sm text-jira-text placeholder-jira-textLight focus:outline-none focus:border-jira-blue focus:bg-white transition-all"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(""); setSearchResults(null); setOpenDropdown(null); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-jira-textMuted hover:text-jira-text">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {openDropdown === "search" && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-jira-border rounded-lg shadow-dropdown max-h-96 overflow-auto z-50">
            {searchLoading ? (
              <div className="px-4 py-6 text-center text-sm text-jira-textMuted">Searching...</div>
            ) : searchResults && (searchResults.tasks.length > 0 || searchResults.entries.length > 0) ? (
              <div className="py-1.5">
                {searchResults.tasks.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-[10px] font-bold text-jira-textMuted uppercase tracking-wider">Issues</div>
                    {searchResults.tasks.map((t) => (
                      <button key={t.id} onClick={() => { handleNavigate("/"); setSearchQuery(""); setSearchResults(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-jira-hover transition-colors text-left">
                        <span className="text-[10px] text-jira-textMuted font-mono w-14">{t.key}</span>
                        <span className="text-sm text-jira-text flex-1 truncate">{t.title}</span>
                        <span className="text-[10px] text-jira-textMuted capitalize">{t.status.replace("_", " ")}</span>
                      </button>
                    ))}
                  </>
                )}
                {searchResults.entries.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-[10px] font-bold text-jira-textMuted uppercase tracking-wider border-t border-jira-border mt-1 pt-2">Time Entries</div>
                    {searchResults.entries.map((e) => (
                      <button key={e.id} onClick={() => { handleNavigate("/time"); setSearchQuery(""); setSearchResults(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-jira-hover transition-colors text-left">
                        <Clock size={12} className="text-jira-textMuted flex-shrink-0" />
                        <span className="text-sm text-jira-text flex-1 truncate">{e.title}</span>
                        <span className="text-[10px] text-jira-textMuted font-mono">{formatMinutes(e.duration_minutes)}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            ) : (
              !searchLoading && <div className="px-4 py-6 text-center text-sm text-jira-textMuted">No results for &quot;{searchQuery}&quot;</div>
            )}
          </div>
        )}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3 relative">
        {/* Create button */}
        <button onClick={() => toggleDropdown("create")}
          className="flex items-center gap-1.5 bg-jira-blue hover:bg-jira-blueDark text-white px-3 py-1.5 rounded text-sm font-medium transition-colors shadow-card">
          <Plus size={15} /> Create
          <ChevronDown size={13} className={cn("transition-transform", openDropdown === "create" && "rotate-180")} />
        </button>
        {openDropdown === "create" && (
          <div className="absolute top-full right-24 mt-1 w-56 bg-white border border-jira-border rounded-lg shadow-dropdown py-1.5 z-50">
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

        {/* Notifications */}
        <button onClick={() => toggleDropdown("notifications")}
          className={cn("text-jira-textMuted hover:text-jira-textSub relative p-1 rounded transition-colors", openDropdown === "notifications" && "bg-jira-hover")}>
          <Bell size={18} />
          {notifCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-jira-red rounded-full text-white text-[9px] font-bold flex items-center justify-center">{notifCount}</span>}
        </button>
        {openDropdown === "notifications" && (
          <div className="absolute top-full right-8 mt-1 w-80 bg-white border border-jira-border rounded-lg shadow-dropdown z-50 max-h-96 overflow-auto">
            <div className="px-4 py-3 border-b border-jira-border flex items-center justify-between">
              <span className="text-sm font-bold text-jira-text">Notifications</span>
              <span className="text-[10px] text-jira-textMuted">{notifCount} active</span>
            </div>
            <div className="py-1">
              {recentTasks.length === 0 && recentEntries.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-jira-textMuted">No recent activity</div>
              ) : (
                <>
                  <div className="px-3 py-1 text-[10px] font-bold text-jira-textMuted uppercase tracking-wider">Recent Issues</div>
                  {recentTasks.map((t) => (
                    <button key={t.id} onClick={() => { handleNavigate("/"); setOpenDropdown(null); }}
                      className="w-full flex items-start gap-2 px-3 py-2 hover:bg-jira-hover transition-colors text-left">
                      {t.status === "done" ? <CheckCircle2 size={14} className="text-jira-green mt-0.5 flex-shrink-0" /> : <AlertCircle size={14} className="text-jira-yellow mt-0.5 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-jira-text truncate">{t.title}</div>
                        <div className="text-[10px] text-jira-textMuted">{t.key} - {t.status.replace("_", " ")}</div>
                      </div>
                    </button>
                  ))}
                  <div className="px-3 py-1 text-[10px] font-bold text-jira-textMuted uppercase tracking-wider border-t border-jira-border mt-1 pt-2">Recent Time Entries</div>
                  {recentEntries.map((e) => (
                    <button key={e.id} onClick={() => { handleNavigate("/time"); setOpenDropdown(null); }}
                      className="w-full flex items-start gap-2 px-3 py-2 hover:bg-jira-hover transition-colors text-left">
                      <Clock size={14} className="text-jira-blue mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-jira-text truncate">{e.title}</div>
                        <div className="text-[10px] text-jira-textMuted">{formatDateTime(e.started_at)} - {formatMinutes(e.duration_minutes)}</div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
            <div className="border-t border-jira-border px-4 py-2 flex justify-between items-center">
              <button onClick={() => { handleNavigate("/analytics"); setOpenDropdown(null); }} className="text-xs text-jira-blue hover:text-jira-blueDark font-medium">View Reports</button>
              <button onClick={() => setNotifCount(0)} className="text-xs text-jira-textMuted hover:text-jira-text">Mark all read</button>
            </div>
          </div>
        )}

        {/* Profile */}
        <button onClick={() => toggleDropdown("profile")}
          className={cn("w-8 h-8 bg-jira-blue rounded-full flex items-center justify-center text-white text-xs font-bold transition-all hover:ring-2 hover:ring-jira-blue/30", openDropdown === "profile" && "ring-2 ring-jira-blue/30")}>
          {profileInitial}
        </button>
        {openDropdown === "profile" && (
          <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-jira-border rounded-lg shadow-dropdown py-1.5 z-50">
            <div className="px-4 py-3 border-b border-jira-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-jira-blue rounded-full flex items-center justify-center text-white text-sm font-bold">{profileInitial}</div>
                <div>
                  <div className="text-sm font-bold text-jira-text">{profileName}</div>
                  <div className="text-xs text-jira-textMuted">@{user?.username || "user"}</div>
                </div>
              </div>
            </div>
            <div className="py-1">
              <button onClick={() => handleNavigate("/")} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-jira-textSub hover:bg-jira-hover transition-colors">
                <LayoutGrid size={15} className="text-jira-textMuted" /> My Board
              </button>
              <button onClick={() => handleNavigate("/calendar")} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-jira-textSub hover:bg-jira-hover transition-colors">
                <Calendar size={15} className="text-jira-textMuted" /> Calendar
              </button>
              <button onClick={() => handleNavigate("/time")} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-jira-textSub hover:bg-jira-hover transition-colors">
                <Clock size={15} className="text-jira-textMuted" /> Time Tracker
              </button>
              <button onClick={() => handleNavigate("/analytics")} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-jira-textSub hover:bg-jira-hover transition-colors">
                <FolderKanban size={15} className="text-jira-textMuted" /> Reports
              </button>
              <div className="border-t border-jira-border my-1" />
              <button onClick={() => handleNavigate("/settings")} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-jira-textSub hover:bg-jira-hover transition-colors">
                <Settings size={15} className="text-jira-textMuted" /> Settings
              </button>
              <button onClick={() => handleNavigate("/gaming")} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-jira-textSub hover:bg-jira-hover transition-colors">
                <KanbanSquare size={15} className="text-jira-textMuted" /> Gaming
              </button>
              <div className="border-t border-jira-border my-1" />
              <button onClick={() => { setOpenDropdown(null); logout(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-jira-red hover:bg-jira-redBg transition-colors">
                <LogOut size={15} /> Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
