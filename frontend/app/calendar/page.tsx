"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api, type TimeEntry, type Category, type Task } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  startOfWeek, addDays, format, isSameDay, parseISO,
  startOfDay, endOfDay, addMinutes, differenceInMinutes,
  isWithinInterval,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, X, Clock,
  Calendar as CalIcon, Tag,
} from "lucide-react";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SLOT_HEIGHT = 48;
const CATEGORY_COLORS = ["#0052CC", "#36B37E", "#6554E0", "#FF5630", "#FFAB00", "#FF8B00", "#4C9AFF"];

export default function CalendarPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dragSelection, setDragSelection] = useState<{ day: Date; startHour: number; endHour: number } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", category_id: "", task_id: "" });
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const dragRef = useRef<{ dayIndex: number; startSlot: number; day: Date } | null>(null);
  const calendarGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(() => {
    const weekEnd = addDays(weekStart, 7);
    api.timeEntries.list({ limit: 500 }).then((all) => {
      setEntries(all.filter((e) => {
        const d = parseISO(e.started_at);
        return d >= weekStart && d < weekEnd;
      }));
    });
    api.categories.list().then(setCategories);
    api.tasks.list().then(setTasks);
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  // Global mouseup to end drag
  useEffect(() => {
    const handleMouseUp = () => {
      if (dragRef.current && dragSelection) {
        setShowCreate(true);
      }
      dragRef.current = null;
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [dragSelection]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleSlotMouseDown = (dayIndex: number, hour: number, e: React.MouseEvent) => {
    e.preventDefault();
    const day = weekDays[dayIndex];
    dragRef.current = { dayIndex, startSlot: hour, day };
    setDragSelection({ day, startHour: hour, endHour: hour + 1 });
  };

  const handleSlotMouseEnter = (hour: number) => {
    if (!dragRef.current) return;
    const start = dragRef.current.startSlot;
    const minH = Math.min(start, hour);
    const maxH = Math.max(start, hour) + 1;
    setDragSelection({
      day: dragRef.current.day,
      startHour: minH,
      endHour: maxH,
    });
  };

  const handleCreate = async () => {
    if (!dragSelection || !createForm.title.trim()) return;
    const startDate = new Date(dragSelection.day);
    startDate.setHours(dragSelection.startHour, 0, 0, 0);
    const endDate = new Date(dragSelection.day);
    endDate.setHours(dragSelection.endHour, 0, 0, 0);
    const mins = differenceInMinutes(endDate, startDate);

    await api.timeEntries.create({
      title: createForm.title,
      category_id: createForm.category_id ? parseInt(createForm.category_id) : null,
      task_id: createForm.task_id ? parseInt(createForm.task_id) : null,
      platform: "manual" as any,
      duration_minutes: mins,
      entry_type: "manual" as const,
      started_at: startDate.toISOString(),
      ended_at: endDate.toISOString(),
    });
    setCreateForm({ title: "", category_id: "", task_id: "" });
    setShowCreate(false);
    setDragSelection(null);
    load();
  };

  const handleUpdateEntry = async (id: number, data: Partial<TimeEntry>) => {
    await api.timeEntries.update(id, data);
    setEditEntry(null);
    load();
  };

  const handleDeleteEntry = async (id: number) => {
    await api.timeEntries.delete(id);
    setEditEntry(null);
    load();
  };

  const handleMoveEntry = async (entry: TimeEntry, newDay: Date, newStartHour: number) => {
    const oldStart = parseISO(entry.started_at);
    const oldEnd = entry.ended_at ? parseISO(entry.ended_at) : addMinutes(oldStart, entry.duration_minutes);
    const duration = differenceInMinutes(oldEnd, oldStart);
    const newStart = new Date(newDay);
    newStart.setHours(newStartHour, oldStart.getMinutes(), 0, 0);
    const newEnd = addMinutes(newStart, duration);
    await api.timeEntries.update(entry.id, {
      started_at: newStart.toISOString(),
      ended_at: newEnd.toISOString(),
      duration_minutes: duration,
    });
    load();
  };

  // Get entries for a specific day
  const entriesForDay = (day: Date) =>
    entries.filter((e) => isSameDay(parseISO(e.started_at), day));

  // Position an entry on the calendar
  const entryStyle = (entry: TimeEntry) => {
    const start = parseISO(entry.started_at);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const end = entry.ended_at ? parseISO(entry.ended_at) : addMinutes(start, entry.duration_minutes);
    const endHour = end.getHours() + end.getMinutes() / 60;
    const top = startHour * SLOT_HEIGHT;
    const height = Math.max(24, (endHour - startHour) * SLOT_HEIGHT - 2);
    return { top: `${top}px`, height: `${height}px` };
  };

  const today = new Date();
  const isToday = (day: Date) => isSameDay(day, today);

  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-jira-border bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-jira-textMuted text-xs">
                <span>Plan</span><span>/</span><span className="text-jira-textSub">Calendar</span>
              </div>
              <h1 className="text-xl font-bold text-jira-text mt-0.5">
                {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
              </h1>
            </div>
            <div className="flex items-center gap-1 ml-4">
              <button onClick={prevWeek} className="p-1.5 rounded hover:bg-jira-hover text-jira-textMuted hover:text-jira-text transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextWeek} className="p-1.5 rounded hover:bg-jira-hover text-jira-textMuted hover:text-jira-text transition-colors">
                <ChevronRight size={20} />
              </button>
              <button onClick={goToday} className="jira-btn-secondary text-xs ml-1 py-1.5">Today</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setDragSelection({ day: today, startHour: 18, endHour: 20 }); setShowCreate(true); }}
              className="jira-btn-primary flex items-center gap-1.5 text-xs">
              <Plus size={14} /> Add Entry
            </button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto bg-white">
        {/* Day headers */}
        <div className="sticky top-0 z-20 flex border-b border-jira-border bg-white">
          <div className="w-16 flex-shrink-0 border-r border-jira-border" />
          {weekDays.map((day) => (
            <div key={day.toISOString()} className={cn("flex-1 text-center py-2 border-r border-jira-border last:border-r-0", isToday(day) && "bg-jira-blueBg")}>
              <div className="text-xs text-jira-textMuted font-medium uppercase">{format(day, "EEE")}</div>
              <div className={cn("text-lg font-bold", isToday(day) ? "text-jira-blue" : "text-jira-text")}>{format(day, "d")}</div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="flex relative" ref={calendarGridRef}>
          {/* Hour labels */}
          <div className="w-16 flex-shrink-0 border-r border-jira-border">
            {HOURS.map((h) => (
              <div key={h} className="text-right pr-2 text-[10px] text-jira-textMuted font-mono"
                style={{ height: SLOT_HEIGHT }}>
                <span className="relative -top-1.5">{h === 0 ? "" : `${h.toString().padStart(2, "0")}:00`}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, dayIndex) => {
            const isCurrentDay = isToday(day);
            const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60;
            const timeLineTop = currentHour * SLOT_HEIGHT;
            return (
            <div key={day.toISOString()} className={cn("flex-1 border-r border-jira-border last:border-r-0 relative", isCurrentDay && "bg-jira-blueBg/20")}>
              {/* Current time line */}
              {isCurrentDay && (
                <div className="absolute left-0 right-0 z-15 pointer-events-none" style={{ top: `${timeLineTop}px` }}>
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-jira-red -ml-1" />
                    <div className="flex-1 h-0.5 bg-jira-red" />
                  </div>
                  <div className="absolute -top-4 right-1 text-[9px] text-jira-red font-mono font-bold bg-white px-1 rounded">
                    {format(currentTime, "HH:mm")}
                  </div>
                </div>
              )}
              {/* Hour slots */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  className={cn(
                    "border-b border-jira-border/40 cursor-pointer hover:bg-jira-hover/50 transition-colors relative",
                    dragSelection && dragSelection.day && isSameDay(dragSelection.day, day) &&
                    h >= dragSelection.startHour && h < dragSelection.endHour && "bg-jira-blueBg border-jira-blue/30"
                  )}
                  style={{ height: SLOT_HEIGHT }}
                  onMouseDown={(e) => handleSlotMouseDown(dayIndex, h, e)}
                  onMouseEnter={() => handleSlotMouseEnter(h)}
                />
              ))}

              {/* Entries */}
              {entriesForDay(day).map((entry) => {
                const cat = categories.find((c) => c.id === entry.category_id);
                const color = cat?.color || "#0052CC";
                const start = parseISO(entry.started_at);
                const end = entry.ended_at ? parseISO(entry.ended_at) : addMinutes(start, entry.duration_minutes);
                return (
                  <div
                    key={entry.id}
                    className="absolute left-1 right-1 rounded-md px-2 py-1 cursor-pointer overflow-hidden shadow-card hover:shadow-cardHover transition-all z-10 group"
                    style={{
                      ...entryStyle(entry),
                      background: color + "15",
                      borderLeft: `3px solid ${color}`,
                    }}
                    onClick={(e) => { e.stopPropagation(); setEditEntry(entry); }}
                    draggable
                    onDragEnd={(e) => {
                      // Simple drag-to-move: drop on a day column
                      const rect = calendarGridRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      const x = e.clientX - rect.left - 64; // subtract hour column width
                      const y = e.clientY - rect.top;
                      const dayW = (rect.width - 64) / 7;
                      const newDayIndex = Math.floor(x / dayW);
                      const newHour = Math.floor((y - 0) / SLOT_HEIGHT);
                      if (newDayIndex >= 0 && newDayIndex < 7 && newHour >= 0 && newHour < 24) {
                        handleMoveEntry(entry, weekDays[newDayIndex], newHour);
                      }
                    }}
                  >
                    <div className="text-xs font-medium text-jira-text truncate">{entry.title}</div>
                    <div className="text-[10px] text-jira-textMuted font-mono">
                      {format(start, "HH:mm")} - {format(end, "HH:mm")}
                    </div>
                    {cat && (
                      <div className="text-[10px] mt-0.5" style={{ color }}>{cat.name}</div>
                    )}
                  </div>
                );
              })}
            </div>
            );
          })}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && dragSelection && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => { setShowCreate(false); setDragSelection(null); }}>
          <div className="bg-white rounded-lg shadow-modal max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-jira-border flex items-center justify-between">
              <h3 className="text-sm font-bold text-jira-text">New Time Entry</h3>
              <button onClick={() => { setShowCreate(false); setDragSelection(null); }} className="text-jira-textMuted hover:text-jira-text"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-jira-surface rounded-lg px-3 py-2 flex items-center gap-2 text-sm">
                <Clock size={16} className="text-jira-blue" />
                <span className="text-jira-text font-medium">
                  {format(dragSelection.day, "EEE, MMM d")}
                </span>
                <span className="text-jira-textMuted font-mono">
                  {`${dragSelection.startHour.toString().padStart(2, "0")}:00 - ${dragSelection.endHour.toString().padStart(2, "0")}:00`}
                </span>
                <span className="text-jira-textMuted ml-auto font-mono">
                  {dragSelection.endHour - dragSelection.startHour}h
                </span>
              </div>
              <input
                autoFocus
                placeholder="What did you work on? (e.g., CNCF Certification Study)"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="jira-input w-full"
              />
              <div className="flex gap-3">
                <select value={createForm.category_id} onChange={(e) => setCreateForm({ ...createForm, category_id: e.target.value })} className="jira-select flex-1">
                  <option value="">No category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={createForm.task_id} onChange={(e) => setCreateForm({ ...createForm, task_id: e.target.value })} className="jira-select flex-1">
                  <option value="">No task</option>
                  {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setShowCreate(false); setDragSelection(null); }} className="jira-btn-secondary">Cancel</button>
                <button onClick={handleCreate} className="jira-btn-primary">Create Entry</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editEntry && (
        <EditEntryModal
          entry={editEntry}
          categories={categories}
          onClose={() => setEditEntry(null)}
          onUpdate={handleUpdateEntry}
          onDelete={handleDeleteEntry}
        />
      )}
    </div>
  );
}

function EditEntryModal({ entry, categories, onClose, onUpdate, onDelete }: {
  entry: TimeEntry; categories: Category[];
  onClose: () => void;
  onUpdate: (id: number, data: Partial<TimeEntry>) => void;
  onDelete: (id: number) => void;
}) {
  const start = parseISO(entry.started_at);
  const end = entry.ended_at ? parseISO(entry.ended_at) : addMinutes(start, entry.duration_minutes);
  const [title, setTitle] = useState(entry.title);
  const [date, setDate] = useState(format(start, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(format(start, "HH:mm"));
  const [endTime, setEndTime] = useState(format(end, "HH:mm"));
  const [categoryId, setCategoryId] = useState(entry.category_id?.toString() || "");
  const cat = categories.find((c) => c.id === entry.category_id);

  const handleSave = () => {
    const newStart = new Date(`${date}T${startTime}:00`);
    const newEnd = new Date(`${date}T${endTime}:00`);
    const mins = differenceInMinutes(newEnd, newStart);
    onUpdate(entry.id, {
      title,
      category_id: categoryId ? parseInt(categoryId) : null,
      started_at: newStart.toISOString(),
      ended_at: newEnd.toISOString(),
      duration_minutes: mins,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-modal max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-jira-border flex items-center justify-between"
          style={{ borderLeft: `4px solid ${cat?.color || "#0052CC"}` }}>
          <h3 className="text-sm font-bold text-jira-text">Edit Time Entry</h3>
          <button onClick={onClose} className="text-jira-textMuted hover:text-jira-text"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="jira-input w-full" />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-jira-textMuted font-medium block mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="jira-input w-full" />
            </div>
            <div>
              <label className="text-xs text-jira-textMuted font-medium block mb-1">Start</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="jira-input w-full" />
            </div>
            <div>
              <label className="text-xs text-jira-textMuted font-medium block mb-1">End</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="jira-input w-full" />
            </div>
          </div>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="jira-select w-full">
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex justify-between pt-2 border-t border-jira-border">
            <button onClick={() => onDelete(entry.id)} className="text-sm text-jira-red hover:text-jira-red/70 flex items-center gap-1.5">
              <Trash2 size={14} /> Delete
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="jira-btn-secondary">Cancel</button>
              <button onClick={handleSave} className="jira-btn-primary">Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
