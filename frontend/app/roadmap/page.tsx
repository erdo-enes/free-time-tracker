"use client";

import { useEffect, useState, useCallback } from "react";
import { api, type Task } from "@/lib/api";
import { useProjects } from "@/lib/projects";
import { GanttChart, ChevronLeft, ChevronRight } from "lucide-react";
import { differenceInDays, addDays, format, startOfWeek, eachDayOfInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { getIssueMeta, IssueTypeIcon } from "@/components/IssueTypes";

export default function RoadmapPage() {
  const { activeProject } = useProjects();
  const projectId = activeProject?.id ?? null;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Task | null>(null);
  const [offsetWeeks, setOffsetWeeks] = useState(0);

  const load = useCallback(() => {
    if (projectId == null) { setTasks([]); return; }
    api.tasks.list({ project_id: projectId }).then(setTasks);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const epics = tasks.filter((t) => t.issue_type === "epic");
  const childCount = (epicId: number) => tasks.filter((t) => t.parent_task_id === epicId);
  const childDone = (epicId: number) => tasks.filter((t) => t.parent_task_id === epicId && t.status === "done").length;

  // Timeline window: 8 weeks starting from offsetWeeks
  const today = new Date();
  const windowStart = startOfWeek(addDays(today, offsetWeeks * 7), { weekStartsOn: 1 });
  const windowEnd = addDays(windowStart, 8 * 7 - 1);
  const totalDays = differenceInDays(windowEnd, windowStart) + 1;
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(windowStart, i * 7));

  const dayPct = (date: Date) => (differenceInDays(date, windowStart) / totalDays) * 100;
  const epicStart = (e: Task) => (e.start_date ? new Date(e.start_date) : new Date(e.created_at));
  const epicEnd = (e: Task) => {
    if (e.due_date) return new Date(e.due_date);
    const s = epicStart(e);
    return addDays(s, 14);
  };
  const clampedStart = (e: Task) => (epicStart(e) < windowStart ? windowStart : epicStart(e));
  const clampedEnd = (e: Task) => (epicEnd(e) > windowEnd ? windowEnd : epicEnd(e));

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-3 border-b border-jira-border bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-jira-purpleBg flex items-center justify-center">
              <GanttChart size={20} className="text-jira-purple" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-jira-text">Roadmap</h1>
              <div className="text-xs text-jira-textMuted font-mono">{activeProject?.key || "FTJ"} &middot; Epic timeline</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setOffsetWeeks(offsetWeeks - 4)} className="jira-btn-secondary !px-2 !py-1.5"><ChevronLeft size={14} /></button>
            <span className="text-xs font-medium text-jira-textSub w-44 text-center">
              {format(windowStart, "MMM d")} - {format(windowEnd, "MMM d, yyyy")}
            </span>
            <button onClick={() => setOffsetWeeks(offsetWeeks + 4)} className="jira-btn-secondary !px-2 !py-1.5"><ChevronRight size={14} /></button>
            <button onClick={() => setOffsetWeeks(0)} className="jira-btn-secondary text-xs">Today</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-jira-app">
        {epics.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-jira-purpleBg flex items-center justify-center mx-auto mb-4">
                <GanttChart size={26} className="text-jira-purple" />
              </div>
              <h2 className="text-base font-bold text-jira-text">No epics yet</h2>
              <p className="text-sm text-jira-textMuted mt-1">Create an epic issue and set start/due dates to see it on the roadmap.</p>
            </div>
          </div>
        ) : (
          <div className="min-w-max">
            {/* Timeline header */}
            <div className="sticky top-0 z-10 flex border-b border-jira-border bg-white">
              <div className="w-64 flex-shrink-0 px-4 py-2 text-[10px] font-bold text-jira-textMuted uppercase tracking-wide border-r border-jira-border">Epic</div>
              <div className="relative flex-1" style={{ minWidth: 640 }}>
                {weeks.map((w, i) => (
                  <div key={i} className="absolute top-0 bottom-0 border-l border-jira-border/60 px-2 py-2"
                    style={{ left: `${(i / 8) * 100}%`, width: `${100 / 8}%` }}>
                    <div className="text-[11px] font-semibold text-jira-textSub">{format(w, "MMM d")}</div>
                  </div>
                ))}
                <div className="h-9" />
              </div>
            </div>

            {/* Today line marker offset */}
            {today >= windowStart && today <= windowEnd && (
              <div className="relative">
                <div className="absolute top-0 bottom-0 w-0.5 bg-jira-red z-20" style={{ left: `calc(256px + ${dayPct(today)}% * (100% - 256px) / 100%)` }} />
              </div>
            )}

            {/* Epic rows */}
            <div>
              {epics.map((epic) => {
                const meta = getIssueMeta(epic.issue_type);
                const children = childCount(epic.id);
                const done = childDone(epic.id);
                const pct = children.length > 0 ? (done / children.length) * 100 : (epic.status === "done" ? 100 : 0);
                const start = clampedStart(epic);
                const end = clampedEnd(epic);
                const leftPct = dayPct(start);
                const widthPct = Math.max(dayPct(end) - leftPct, 2);
                const spansWindow = epicEnd(epic) >= windowStart && epicStart(epic) <= windowEnd;
                return (
                  <div key={epic.id} className="flex border-b border-jira-border/60 hover:bg-jira-surface/40">
                    <div className="w-64 flex-shrink-0 px-4 py-3 border-r border-jira-border/60 flex items-center gap-2">
                      <span className="w-5 h-5 rounded flex items-center justify-center" style={{ background: meta.bgColor }}>
                        <IssueTypeIcon type={epic.issue_type} size={12} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-jira-text truncate cursor-pointer hover:text-jira-blue" onClick={() => setSelected(epic)}>{epic.title}</div>
                        <div className="text-[10px] text-jira-textMuted font-mono">{epic.key} &middot; {done}/{children.length} done</div>
                      </div>
                    </div>
                    <div className="relative flex-1" style={{ minWidth: 640, height: 56 }}>
                      {/* week gridlines */}
                      {weeks.map((w, i) => (
                        <div key={i} className="absolute top-0 bottom-0 border-l border-jira-border/40" style={{ left: `${(i / 8) * 100}%` }} />
                      ))}
                      {spansWindow && (
                        <div className="absolute top-1/2 -translate-y-1/2 rounded-md shadow-card overflow-hidden cursor-pointer hover:shadow-cardHover transition-all"
                          style={{ left: `${leftPct}%`, width: `${widthPct}%`, height: 28, background: meta.color + "22", border: `1px solid ${meta.color}` }}
                          onClick={() => setSelected(epic)}>
                          <div className="h-full rounded-md" style={{ width: `${pct}%`, background: meta.color }} />
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                            {Math.round(pct)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Lightweight epic detail popover */}
      {selected && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-lg shadow-modal w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded flex items-center justify-center" style={{ background: getIssueMeta(selected.issue_type).bgColor }}>
                <IssueTypeIcon type={selected.issue_type} size={16} />
              </span>
              <span className="text-xs font-mono text-jira-textMuted">{selected.key}</span>
              <button onClick={() => setSelected(null)} className="ml-auto text-jira-textMuted hover:text-jira-text">✕</button>
            </div>
            <h2 className="text-base font-bold text-jira-text">{selected.title}</h2>
            <p className="text-sm text-jira-textSub mt-2 whitespace-pre-wrap">{selected.description || <span className="text-jira-textMuted italic">No description</span>}</p>
            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div><span className="text-jira-textMuted">Start: </span><span className="text-jira-text font-medium">{selected.start_date ? format(new Date(selected.start_date), "MMM d, yyyy") : "—"}</span></div>
              <div><span className="text-jira-textMuted">Due: </span><span className="text-jira-text font-medium">{selected.due_date ? format(new Date(selected.due_date), "MMM d, yyyy") : "—"}</span></div>
              <div><span className="text-jira-textMuted">Children: </span><span className="text-jira-text font-medium">{childCount(selected.id).length}</span></div>
              <div><span className="text-jira-textMuted">Done: </span><span className="text-jira-text font-medium">{childDone(selected.id)}</span></div>
            </div>
            <div className="mt-3">
              <div className="h-2 bg-jira-surface rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${childCount(selected.id).length > 0 ? (childDone(selected.id) / childCount(selected.id).length) * 100 : 0}%`, background: getIssueMeta(selected.issue_type).color }} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-jira-border">
              <div className="text-[10px] font-bold text-jira-textMuted uppercase tracking-wide mb-2">Child Issues</div>
              {childCount(selected.id).length === 0 ? (
                <div className="text-xs text-jira-textMuted italic">No child issues linked to this epic.</div>
              ) : (
                <div className="space-y-1 max-h-40 overflow-auto">
                  {childCount(selected.id).map((c) => (
                    <div key={c.id} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-jira-textMuted">{c.key}</span>
                      <span className="text-jira-textSub flex-1 truncate">{c.title}</span>
                      <span className={cn("text-[10px] capitalize", c.status === "done" ? "text-jira-green" : "text-jira-textMuted")}>{c.status.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
