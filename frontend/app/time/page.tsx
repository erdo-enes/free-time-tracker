"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { api, type TimeEntry, type Category, type Task } from "@/lib/api";
import { formatMinutes, formatDateTime, cn } from "@/lib/utils";
import {
  Plus, Trash2, Play, Square, Pause, Clock, Tag,
  TrendingUp, Calendar, Timer, X, ChevronRight,
} from "lucide-react";

const PLATFORM_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "steam", label: "Steam" },
  { value: "psn", label: "PlayStation" },
  { value: "xbox", label: "Xbox" },
  { value: "switch", label: "Switch (CFW)" },
  { value: "switch2", label: "Switch 2" },
  { value: "pc", label: "PC" },
];

type EntryMode = "range" | "duration" | "timer";

export default function TimeTrackerPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [view, setView] = useState<"today" | "week" | "all">("week");
  const searchParams = useSearchParams();

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerLabel, setTimerLabel] = useState("");
  const [timerCategory, setTimerCategory] = useState("");
  const [timerTask, setTimerTask] = useState("");

  // Manual entry - mode toggle
  const [entryMode, setEntryMode] = useState<EntryMode>("range");

  // Range form (18:50 to 20:50)
  const [rangeForm, setRangeForm] = useState({
    title: "", category_id: "", task_id: "", platform: "manual",
    date: new Date().toISOString().slice(0, 10),
    startTime: "18:00", endTime: "20:00",
  });

  // Duration form
  const [durForm, setDurForm] = useState({
    title: "", category_id: "", task_id: "", platform: "manual",
    hours: "", minutes: "",
  });

  const load = useCallback(() => {
    api.timeEntries.list({ limit: 200 }).then(setEntries);
    api.categories.list().then(setCategories);
    api.tasks.list().then(setTasks);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setShowAdd(true);
      setEntryMode("range");
    }
  }, [searchParams]);

  // Timer tick
  useEffect(() => {
    if (!timerRunning || timerPaused || !timerStart) return;
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - timerStart);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerPaused, timerStart]);

  const formatElapsed = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startTimer = () => {
    if (!timerLabel.trim()) return;
    setTimerRunning(true);
    setTimerPaused(false);
    setTimerStart(Date.now());
    setElapsedMs(0);
  };

  const pauseTimer = () => {
    if (timerPaused) {
      setTimerStart(Date.now() - elapsedMs);
      setTimerPaused(false);
    } else {
      setTimerPaused(true);
    }
  };

  const stopTimer = async () => {
    if (!timerLabel.trim()) return;
    const mins = Math.max(1, Math.round(elapsedMs / 60000));
    await api.timeEntries.create({
      title: timerLabel,
      category_id: timerCategory ? parseInt(timerCategory) : null,
      task_id: timerTask ? parseInt(timerTask) : null,
      platform: "manual" as any,
      duration_minutes: mins,
      entry_type: "manual" as const,
    });
    setTimerRunning(false);
    setTimerPaused(false);
    setTimerStart(null);
    setElapsedMs(0);
    setTimerLabel("");
    setTimerCategory("");
    setTimerTask("");
    load();
  };

  const cancelTimer = () => {
    setTimerRunning(false);
    setTimerPaused(false);
    setTimerStart(null);
    setElapsedMs(0);
    setTimerLabel("");
  };

  // Calculate duration from time range
  const calcRangeDuration = (): number => {
    const [sh, sm] = rangeForm.startTime.split(":").map(Number);
    const [eh, em] = rangeForm.endTime.split(":").map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60; // overnight
    return mins;
  };

  const handleRangeSubmit = async () => {
    if (!rangeForm.title.trim()) return;
    const mins = calcRangeDuration();
    if (mins <= 0) { alert("End time must be after start time"); return; }
    const startISO = new Date(`${rangeForm.date}T${rangeForm.startTime}:00`).toISOString();
    const endISO = new Date(`${rangeForm.date}T${rangeForm.endTime}:00`).toISOString();
    await api.timeEntries.create({
      title: rangeForm.title,
      category_id: rangeForm.category_id ? parseInt(rangeForm.category_id) : null,
      task_id: rangeForm.task_id ? parseInt(rangeForm.task_id) : null,
      platform: rangeForm.platform as any,
      duration_minutes: mins,
      entry_type: "manual" as const,
      started_at: startISO,
      ended_at: endISO,
    });
    setRangeForm({ ...rangeForm, title: "", category_id: "", task_id: "" });
    setShowAdd(false);
    load();
  };

  const handleDurationSubmit = async () => {
    if (!durForm.title.trim()) return;
    const mins = (parseFloat(durForm.hours) || 0) * 60 + (parseFloat(durForm.minutes) || 0);
    if (mins <= 0) { alert("Enter a duration"); return; }
    await api.timeEntries.create({
      title: durForm.title,
      category_id: durForm.category_id ? parseInt(durForm.category_id) : null,
      task_id: durForm.task_id ? parseInt(durForm.task_id) : null,
      platform: durForm.platform as any,
      duration_minutes: mins,
      entry_type: "manual" as const,
    });
    setDurForm({ ...durForm, title: "", category_id: "", task_id: "", hours: "", minutes: "" });
    setShowAdd(false);
    load();
  };

  const handleDelete = async (id: number) => {
    await api.timeEntries.delete(id);
    load();
  };

  const handleAddCategory = async () => {
    const name = prompt("Category name (e.g., CNCF Prep, TOEFL, ALES, Gaming):");
    if (!name) return;
    const colors = ["#2684FF", "#36B37E", "#6554E0", "#E5494A", "#E97F0F", "#FFC400"];
    const color = colors[categories.length % colors.length];
    await api.categories.create({ name, color });
    load();
  };

  // Filter entries
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const filteredEntries = entries.filter((e) => {
    const d = new Date(e.started_at);
    if (view === "today") return d >= startOfDay;
    if (view === "week") return d >= startOfWeek;
    return true;
  });

  const grouped: Record<string, TimeEntry[]> = {};
  filteredEntries.forEach((e) => {
    const day = new Date(e.started_at).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(e);
  });

  const totalMinutes = filteredEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  const todayMinutes = entries.filter((e) => new Date(e.started_at) >= startOfDay).reduce((s, e) => s + (e.duration_minutes || 0), 0);

  const byCategory: Record<string, number> = {};
  filteredEntries.forEach((e) => {
    const cat = categories.find((c) => c.id === e.category_id);
    const name = cat?.name || "Uncategorized";
    byCategory[name] = (byCategory[name] || 0) + (e.duration_minutes || 0);
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-3 border-b border-jira-border bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-jira-greenBg flex items-center justify-center">
              <Clock size={20} className="text-jira-green" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-jira-text">Time Tracker</h1>
              <div className="text-xs text-jira-textMuted">Log study sessions, exam prep, and personal time</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-jira-surface border border-jira-border rounded overflow-hidden">
              {(["today", "week", "all"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className={cn("px-3 py-1.5 text-xs font-medium transition-colors",
                    view === v ? "bg-jira-blue text-white" : "text-jira-textSub hover:bg-jira-hover")}>
                  {v === "today" ? "Today" : v === "week" ? "This Week" : "All Time"}
                </button>
              ))}
            </div>
            <button onClick={handleAddCategory} className="jira-btn-secondary flex items-center gap-1.5 text-xs">
              <Tag size={13} /> Category
            </button>
            <button onClick={() => { setShowAdd(!showAdd); setEntryMode("range"); }} className="jira-btn-primary flex items-center gap-1.5 text-xs">
              <Plus size={14} /> Add Entry
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6 bg-jira-app">
        {/* Timer bar - always visible */}
        <div className="jira-card p-4">
          {timerRunning ? (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-sm text-jira-text font-medium mb-2">{timerLabel}</div>
                <div className="flex gap-2">
                  <select value={timerCategory} onChange={(e) => setTimerCategory(e.target.value)} className="jira-select text-xs">
                    <option value="">No category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={timerTask} onChange={(e) => setTimerTask(e.target.value)} className="jira-select text-xs">
                    <option value="">No task</option>
                    {tasks.filter((t) => t.status !== "done").map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="text-center px-6">
                <div className={cn("text-4xl font-mono font-bold tabular-nums", timerPaused ? "text-jira-textMuted" : "text-jira-green")}>
                  {formatElapsed(elapsedMs)}
                </div>
                <div className="text-xs text-jira-textMuted mt-1 uppercase tracking-wider">
                  {timerPaused ? "Paused" : "Running"}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={pauseTimer}
                  className="jira-btn-secondary flex items-center gap-1.5 text-xs py-2">
                  {timerPaused ? <><Play size={14} /> Resume</> : <><Pause size={14} /> Pause</>}
                </button>
                <button onClick={stopTimer}
                  className="bg-jira-red hover:bg-jira-red/80 text-white px-4 py-2 rounded text-xs font-medium flex items-center gap-1.5 transition-colors">
                  <Square size={12} /> Stop & Save
                </button>
                <button onClick={cancelTimer}
                  className="text-jira-textMuted hover:text-jira-red text-xs px-2 py-2">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-jira-green/15 flex items-center justify-center flex-shrink-0">
                <Timer size={20} className="text-jira-green" />
              </div>
              <input
                placeholder="What are you working on? (e.g., CNCF Practice Exam, TOEFL Reading...)"
                value={timerLabel}
                onChange={(e) => setTimerLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startTimer()}
                className="jira-input flex-1"
              />
              <button onClick={startTimer}
                className="bg-jira-green hover:bg-jira-green/80 text-white px-5 py-2.5 rounded text-sm font-semibold flex items-center gap-2 transition-colors flex-shrink-0">
                <Play size={16} /> Start
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatBox label="This Week" value={formatMinutes(totalMinutes)} icon={<Clock size={18} />} color="#0052CC" bg="#DEEBFF" />
          <StatBox label="Today" value={formatMinutes(todayMinutes)} icon={<Calendar size={18} />} color="#36B37E" bg="#E3FCEF" />
          <StatBox label="Entries" value={filteredEntries.length.toString()} icon={<TrendingUp size={18} />} color="#6554E0" bg="#EAE6FF" />
          <StatBox label="Avg / Day" value={formatMinutes(totalMinutes / 7)} icon={<TrendingUp size={18} />} color="#FFAB00" bg="#FFFAE6" />
        </div>

        {/* Add entry panel with mode tabs */}
        {showAdd && (
          <div className="jira-card overflow-hidden">
            {/* Mode tabs */}
            <div className="flex items-center border-b border-jira-border bg-jira-surface">
              <ModeTab active={entryMode === "range"} onClick={() => setEntryMode("range")} icon={<Clock size={14} />} label="Time Range" />
              <ModeTab active={entryMode === "duration"} onClick={() => setEntryMode("duration")} icon={<Timer size={14} />} label="Duration" />
              <div className="flex-1" />
              <button onClick={() => setShowAdd(false)} className="px-4 text-jira-textMuted hover:text-jira-text">
                <X size={18} />
              </button>
            </div>

            {/* Range mode: 18:50 to 20:50 */}
            {entryMode === "range" && (
              <div className="p-5 space-y-4">
                <input
                  autoFocus
                  placeholder="What did you work on? (e.g., CNCF Certification Study)"
                  value={rangeForm.title}
                  onChange={(e) => setRangeForm({ ...rangeForm, title: e.target.value })}
                  className="jira-input w-full text-base"
                />
                <div className="grid grid-cols-4 gap-3 items-end">
                  <FormField label="Date">
                    <input type="date" value={rangeForm.date}
                      onChange={(e) => setRangeForm({ ...rangeForm, date: e.target.value })}
                      className="jira-input w-full" />
                  </FormField>
                  <FormField label="Start Time">
                    <input type="time" value={rangeForm.startTime}
                      onChange={(e) => setRangeForm({ ...rangeForm, startTime: e.target.value })}
                      className="jira-input w-full" />
                  </FormField>
                  <FormField label="End Time">
                    <input type="time" value={rangeForm.endTime}
                      onChange={(e) => setRangeForm({ ...rangeForm, endTime: e.target.value })}
                      className="jira-input w-full" />
                  </FormField>
                  <FormField label="Duration">
                    <div className="jira-input w-full text-jira-text font-mono font-bold text-center bg-jira-surface/50">
                      {formatMinutes(calcRangeDuration())}
                    </div>
                  </FormField>
                </div>
                <div className="flex flex-wrap gap-3">
                  <select value={rangeForm.category_id}
                    onChange={(e) => setRangeForm({ ...rangeForm, category_id: e.target.value })}
                    className="jira-select">
                    <option value="">No category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={rangeForm.task_id}
                    onChange={(e) => setRangeForm({ ...rangeForm, task_id: e.target.value })}
                    className="jira-select">
                    <option value="">No task</option>
                    {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                  <select value={rangeForm.platform}
                    onChange={(e) => setRangeForm({ ...rangeForm, platform: e.target.value })}
                    className="jira-select">
                    {PLATFORM_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <button onClick={handleRangeSubmit} className="jira-btn-primary ml-auto flex items-center gap-2">
                    <Plus size={16} /> Add Entry
                  </button>
                </div>
              </div>
            )}

            {/* Duration mode */}
            {entryMode === "duration" && (
              <div className="p-5 space-y-4">
                <input
                  autoFocus
                  placeholder="What did you work on? (e.g., ALES Math Practice)"
                  value={durForm.title}
                  onChange={(e) => setDurForm({ ...durForm, title: e.target.value })}
                  className="jira-input w-full text-base"
                />
                <div className="flex flex-wrap gap-3 items-end">
                  <FormField label="Hours">
                    <input type="number" min="0" placeholder="0" value={durForm.hours}
                      onChange={(e) => setDurForm({ ...durForm, hours: e.target.value })}
                      className="jira-input w-24" />
                  </FormField>
                  <FormField label="Minutes">
                    <input type="number" min="0" max="59" placeholder="0" value={durForm.minutes}
                      onChange={(e) => setDurForm({ ...durForm, minutes: e.target.value })}
                      className="jira-input w-24" />
                  </FormField>
                  <select value={durForm.category_id}
                    onChange={(e) => setDurForm({ ...durForm, category_id: e.target.value })}
                    className="jira-select">
                    <option value="">No category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={durForm.task_id}
                    onChange={(e) => setDurForm({ ...durForm, task_id: e.target.value })}
                    className="jira-select">
                    <option value="">No task</option>
                    {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                  <select value={durForm.platform}
                    onChange={(e) => setDurForm({ ...durForm, platform: e.target.value })}
                    className="jira-select">
                    {PLATFORM_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <button onClick={handleDurationSubmit} className="jira-btn-primary ml-auto flex items-center gap-2">
                    <Plus size={16} /> Add Entry
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Category breakdown bar */}
        {Object.keys(byCategory).length > 0 && (
          <div className="jira-card p-4">
            <h3 className="text-sm font-semibold text-jira-text mb-3">Time by Category</h3>
            <div className="space-y-2">
              {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([name, mins]) => {
                const cat = categories.find((c) => c.name === name);
                const pct = totalMinutes > 0 ? (mins / totalMinutes) * 100 : 0;
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xs text-jira-textSub w-36 truncate font-medium">{name}</span>
                    <div className="flex-1 h-6 bg-jira-surface rounded overflow-hidden">
                      <div className="h-full rounded flex items-center px-2 transition-all"
                        style={{ width: `${pct}%`, background: (cat?.color || "#2684FF") + "30", borderLeft: `3px solid ${cat?.color || "#2684FF"}` }}>
                        <span className="text-xs font-medium" style={{ color: cat?.color || "#2684FF" }}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <span className="text-xs text-jira-text font-mono font-bold w-16 text-right">{formatMinutes(mins)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span key={c.id}
                className="text-xs px-2.5 py-1 rounded-full border font-medium"
                style={{ borderColor: c.color + "40", color: c.color, background: c.color + "10" }}>
                {c.name}
              </span>
            ))}
          </div>
        )}

        {/* Entries grouped by day */}
        <div className="space-y-4">
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-16">
              <Clock size={36} className="mx-auto mb-3 text-jira-textMuted opacity-30" />
              <p className="text-jira-textMuted text-sm">No time entries for this period.</p>
              <p className="text-jira-textMuted text-xs mt-1">Start a timer or add an entry with a time range to get started.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([day, dayEntries]) => {
              const dayTotal = dayEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
              return (
                <div key={day}>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-bold text-jira-text">{day}</h3>
                    <span className="text-xs text-jira-textMuted font-mono">{formatMinutes(dayTotal)}</span>
                    <div className="flex-1 h-px bg-jira-border" />
                  </div>
                  <div className="space-y-1.5">
                    {dayEntries.map((entry) => {
                      const cat = categories.find((c) => c.id === entry.category_id);
                      const task = tasks.find((t) => t.id === entry.task_id);
                      const startTime = new Date(entry.started_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
                      const endTime = entry.ended_at ? new Date(entry.ended_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : null;
                      return (
                        <div key={entry.id}
                          className="jira-card p-3 flex items-center gap-3 group hover:border-jira-borderLight transition-all">
                          <div className="w-1 h-10 rounded-full flex-shrink-0"
                            style={{ background: cat?.color || "#364759" }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-jira-text font-medium truncate">{entry.title}</span>
                              {entry.entry_type === "gaming" ? (
                                <span className="text-[10px] bg-jira-green/15 text-jira-green px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Auto</span>
                              ) : (
                                <span className="text-[10px] bg-jira-blue/15 text-jira-blue px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Manual</span>
                              )}
                              {cat && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                  style={{ background: cat.color + "15", color: cat.color }}>
                                  {cat.name}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-jira-textMuted mt-1 flex items-center gap-2 font-mono">
                              <Clock size={11} />
                              <span>{startTime}{endTime && ` - ${endTime}`}</span>
                              <span className="text-jira-textMuted/50">|</span>
                              <span>{PLATFORM_OPTIONS.find((p) => p.value === entry.platform)?.label || entry.platform}</span>
                              {task && <><span className="text-jira-textMuted/50">|</span><span className="text-jira-blue truncate">{task.title}</span></>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold text-jira-text font-mono">{formatMinutes(entry.duration_minutes)}</div>
                          </div>
                          <button onClick={() => handleDelete(entry.id)}
                            className="opacity-0 group-hover:opacity-100 text-jira-textMuted hover:text-jira-red transition-all p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function ModeTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
        active ? "border-jira-blue text-jira-blue" : "border-transparent text-jira-textMuted hover:text-jira-textSub"
      )}
    >
      {icon} {label}
    </button>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-jira-textMuted font-medium">{label}</label>
      {children}
    </div>
  );
}

function StatBox({ label, value, icon, color, bg }: { label: string; value: string; icon: React.ReactNode; color: string; bg: string }) {
  return (
    <div className="jira-card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: bg }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <div className="text-xl font-bold text-jira-text">{value}</div>
      <div className="text-xs text-jira-textMuted mt-0.5">{label}</div>
    </div>
  );
}
