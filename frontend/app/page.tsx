"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { api, type Task, type Category, type Comment, type TimeEntry, type Sprint, type IssueLink, type IssueHistoryEntry } from "@/lib/api";
import { useProjects } from "@/lib/projects";
import {
  Plus, Trash2, X, Filter, MoreHorizontal, MessageCircle, Clock,
  Tag, ChevronRight, Calendar, User, CheckCircle2, Circle, AlertCircle,
  TrendingUp, ListChecks, Flag, Play, Square, Rocket, Link2, GitCommit, ArrowRight,
} from "lucide-react";
import { cn, formatMinutes } from "@/lib/utils";
import {
  ISSUE_TYPES, PRIORITIES, COLUMNS, getIssueMeta, getPriorityMeta,
  IssueTypeIcon, PriorityIcon,
} from "@/components/IssueTypes";

export default function BoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterType, setFilterType] = useState<string>("");
  const [filterAssignee, setFilterAssignee] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [filterLabel, setFilterLabel] = useState<string>("");
  const [filterEpic, setFilterEpic] = useState<string>("");
  const [boardView, setBoardView] = useState<"sprint" | "backlog">("sprint");
  const searchParams = useSearchParams();
  const { activeProject } = useProjects();
  const projectId = activeProject?.id ?? null;
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [newSprint, setNewSprint] = useState({ name: "", goal: "" });
  const [newTask, setNewTask] = useState({
    title: "", description: "", status: "backlog", priority: "medium",
    issue_type: "task", category_id: "", story_points: "", labels: "",
  });

  const load = useCallback(() => {
    if (projectId == null) {
      setTasks([]); setSprints([]);
      api.categories.list().then(setCategories);
      api.timeEntries.list({ limit: 500 }).then(setTimeEntries);
      return;
    }
    api.tasks.list({ project_id: projectId }).then(setTasks);
    api.sprints.list(projectId).then(setSprints);
    api.categories.list().then(setCategories);
    api.timeEntries.list({ limit: 500 }).then(setTimeEntries);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (searchParams.get("create") === "1") setShowCreate(true);
  }, [searchParams]);

  const activeSprint = sprints.find((s) => s.is_active) || null;
  const plannedSprints = sprints.filter((s) => !s.is_active);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const taskId = parseInt(result.draggableId);
    const destId = result.destination.droppableId;

    // Sprint board: columns are statuses
    if (boardView === "sprint") {
      const newStatus = destId;
      const newIndex = result.destination.index;
      setTasks((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((t) => t.id === taskId);
        if (idx === -1) return prev;
        updated[idx] = { ...updated[idx], status: newStatus as Task["status"], order: newIndex };
        const colTasks = updated.filter((t) => t.id !== taskId && t.status === newStatus).sort((a, b) => a.order - b.order);
        colTasks.splice(newIndex, 0, updated[idx]);
        colTasks.forEach((t, i) => { const tIdx = updated.findIndex((u) => u.id === t.id); if (tIdx >= 0) updated[tIdx] = { ...updated[tIdx], order: i }; });
        return updated;
      });
      try { await api.tasks.move(taskId, newStatus, result.destination.index); } catch { load(); }
      return;
    }

    // Backlog planning: zones are sprints or the backlog pool
    if (destId === "backlog") {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, sprint_id: null, status: "backlog" } : t));
      try { await api.tasks.update(taskId, { sprint_id: null, status: "backlog" }); } catch { load(); }
    } else if (destId.startsWith("sprint:")) {
      const sid = parseInt(destId.split(":")[1]);
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, sprint_id: sid } : t));
      try { await api.tasks.update(taskId, { sprint_id: sid }); } catch { load(); }
    }
  };

  const handleAdd = async () => {
    if (!newTask.title.trim()) return;
    const labels = newTask.labels ? newTask.labels.split(",").map((l) => l.trim()).filter(Boolean) : [];
    const sprintId = boardView === "sprint" && activeSprint ? activeSprint.id : null;
    await api.tasks.create({
      title: newTask.title, description: newTask.description,
      status: newTask.status as Task["status"], priority: newTask.priority as Task["priority"],
      issue_type: newTask.issue_type as Task["issue_type"],
      category_id: newTask.category_id ? parseInt(newTask.category_id) : null,
      project_id: projectId, sprint_id: sprintId,
      story_points: newTask.story_points ? parseInt(newTask.story_points) : null,
      labels: labels.length > 0 ? labels : undefined,
    });
    setNewTask({ title: "", description: "", status: "backlog", priority: "medium", issue_type: "task", category_id: "", story_points: "", labels: "" });
    setShowCreate(false);
    load();
  };

  const handleDelete = async (id: number) => { await api.tasks.delete(id); setSelectedTask(null); load(); };
  const handleUpdateField = async (id: number, field: string, value: any) => {
    await api.tasks.update(id, { [field]: value });
    load();
  };

  const handleCreateSprint = async () => {
    if (!newSprint.name.trim() || !projectId) return;
    await api.sprints.create({ name: newSprint.name, goal: newSprint.goal, project_id: projectId });
    setNewSprint({ name: "", goal: "" });
    setShowCreateSprint(false);
    load();
  };

  const handleStartSprint = async (id: number) => { await api.sprints.start(id); load(); setBoardView("sprint"); };
  const handleEndSprint = async (id: number) => { await api.sprints.end(id); load(); };
  const handleDeleteSprint = async (id: number) => { await api.sprints.delete(id); load(); };

  // Sprint board tasks = those in the active sprint
  const sprintBoardTasks = activeSprint ? tasks.filter((t) => t.sprint_id === activeSprint.id) : [];
  const backlogTasks = tasks.filter((t) => t.sprint_id == null);

  const matchesFilters = (t: Task) =>
    (!filterType || t.issue_type === filterType) &&
    (!filterAssignee || t.assignee === filterAssignee) &&
    (!filterPriority || t.priority === filterPriority) &&
    (!filterLabel || (t.labels || []).includes(filterLabel)) &&
    (!filterEpic || t.parent_task_id === parseInt(filterEpic));

  const filteredSprintTasks = sprintBoardTasks.filter(matchesFilters);
  const filteredBacklog = backlogTasks.filter(matchesFilters);

  const assignees = Array.from(new Set(tasks.map((t) => t.assignee).filter(Boolean))) as string[];
  const allLabels = Array.from(new Set(tasks.flatMap((t) => t.labels || [])));
  const epicOptions = tasks.filter((t) => t.issue_type === "epic");
  const hasActiveFilters = !!(filterType || filterAssignee || filterPriority || filterLabel || filterEpic);
  const clearFilters = () => { setFilterType(""); setFilterAssignee(""); setFilterPriority(""); setFilterLabel(""); setFilterEpic(""); };

  const tasksByStatus = (status: string) =>
    filteredSprintTasks.filter((t) => t.status === status).sort((a, b) => a.order - b.order);

  const totalSprint = sprintBoardTasks.length;
  const doneSprint = sprintBoardTasks.filter((t) => t.status === "done").length;
  const sprintPct = totalSprint ? Math.round((doneSprint / totalSprint) * 100) : 0;
  const sprintPoints = sprintBoardTasks.reduce((s, t) => s + (t.story_points || 0), 0);
  const donePoints = sprintBoardTasks.filter((t) => t.status === "done").reduce((s, t) => s + (t.story_points || 0), 0);

  const epics = tasks.filter((t) => t.issue_type === "epic");
  const getTimeSpent = (taskId: number) => timeEntries.filter((e) => e.task_id === taskId).reduce((s, e) => s + (e.duration_minutes || 0), 0);

  return (
    <div className="h-full flex flex-col">
      {/* Board header */}
      <div className="px-6 py-3 border-b border-jira-border bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: activeProject?.style_color || "#0052CC" }}>
              {(activeProject?.key || "FT").slice(0, 2)}
            </div>
            <div>
              <h1 className="text-lg font-bold text-jira-text">{activeProject?.name || "FreeTime Board"}</h1>
              <div className="text-xs text-jira-textMuted font-mono">{activeProject?.key || "FTJ"} &middot; {boardView === "sprint" ? "Sprint Board" : "Backlog"}</div>
            </div>
            <div className="flex bg-jira-surface border border-jira-border rounded-lg overflow-hidden ml-4">
              <button onClick={() => setBoardView("sprint")}
                className={cn("px-3 py-1.5 text-xs font-medium transition-colors",
                  boardView === "sprint" ? "bg-jira-blue text-white" : "text-jira-textSub hover:bg-jira-hover")}>
                Sprint Board
              </button>
              <button onClick={() => setBoardView("backlog")}
                className={cn("px-3 py-1.5 text-xs font-medium transition-colors",
                  boardView === "backlog" ? "bg-jira-blue text-white" : "text-jira-textSub hover:bg-jira-hover")}>
                Backlog
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {boardView === "sprint" && activeSprint && (
              <div className="flex items-center gap-3 px-3 py-1.5 bg-jira-surface rounded-lg">
                <Rocket size={14} className="text-jira-green" />
                <div className="text-xs">
                  <span className="text-jira-textMuted">Sprint: </span>
                  <span className="text-jira-text font-semibold">{activeSprint.name}</span>
                </div>
                <span className="text-jira-textMuted">|</span>
                <span className="text-xs text-jira-textMuted">{doneSprint}/{totalSprint} issues</span>
                <div className="w-24 h-2 bg-jira-border rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-jira-blue to-jira-green rounded-full transition-all" style={{ width: `${sprintPct}%` }} />
                </div>
                <span className="text-[10px] text-jira-textMuted font-mono">{donePoints}/{sprintPoints}pt</span>
              </div>
            )}
            <button onClick={() => setShowCreate(true)} className="jira-btn-primary flex items-center gap-1.5 text-xs">
              <Plus size={15} /> Create
            </button>
          </div>
        </div>
      </div>

      {/* Quick filters bar */}
      <div className="px-6 py-2 border-b border-jira-border bg-jira-surface/50 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold text-jira-textMuted uppercase tracking-wide mr-1">Quick Filters</span>
        <FilterSelect label="Type" value={filterType} onChange={setFilterType} options={ISSUE_TYPES.map((t) => ({ value: t.id, label: t.label }))} />
        <FilterSelect label="Assignee" value={filterAssignee} onChange={setFilterAssignee} options={assignees.map((a) => ({ value: a, label: a }))} />
        <FilterSelect label="Priority" value={filterPriority} onChange={setFilterPriority} options={PRIORITIES.map((p) => ({ value: p.id, label: p.label }))} />
        <FilterSelect label="Label" value={filterLabel} onChange={setFilterLabel} options={allLabels.map((l) => ({ value: l, label: l }))} />
        <FilterSelect label="Epic" value={filterEpic} onChange={setFilterEpic} options={epicOptions.map((e) => ({ value: String(e.id), label: e.title }))} />
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs text-jira-red hover:text-jira-red/70 font-medium flex items-center gap-1 px-2 py-1">
            <X size={12} /> Clear
          </button>
        )}
        {hasActiveFilters && (
          <span className="text-[10px] text-jira-textMuted ml-auto">{filteredSprintTasks.length + filteredBacklog.length} of {tasks.length} issues</span>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden bg-jira-app">
        {/* Epic sidebar (sprint view only) */}
        {boardView === "sprint" && epics.length > 0 && (
          <div className="w-56 border-r border-jira-border bg-white p-3 overflow-y-auto flex-shrink-0">
            <h3 className="text-xs font-bold text-jira-textMuted uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <TrendingUp size={14} /> Epics
            </h3>
            <div className="space-y-2">
              {epics.map((epic) => {
                const meta = getIssueMeta(epic.issue_type);
                const childTasks = tasks.filter((t) => t.parent_task_id === epic.id);
                const childDone = childTasks.filter((t) => t.status === "done").length;
                const pct = childTasks.length > 0 ? (childDone / childTasks.length) * 100 : (epic.status === "done" ? 100 : 0);
                const timeSpent = getTimeSpent(epic.id);
                return (
                  <div key={epic.id} className="p-2.5 rounded-lg border border-jira-border hover:border-jira-borderLight cursor-pointer transition-colors"
                    onClick={() => setSelectedTask(epic)}
                    style={{ borderLeft: `3px solid ${meta.color}` }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <IssueTypeIcon type={epic.issue_type} size={12} />
                      <span className="text-xs font-medium text-jira-text truncate flex-1">{epic.title}</span>
                    </div>
                    <div className="h-1.5 bg-jira-surface rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta.color }} />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-jira-textMuted">{childDone}/{childTasks.length || 1} done</span>
                      {timeSpent > 0 && <span className="text-[10px] text-jira-textMuted font-mono">{formatMinutes(timeSpent)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main board area */}
        <div className="flex-1 overflow-auto p-4">
          {boardView === "sprint" ? (
            activeSprint ? (
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-3 min-w-max h-full">
                  {COLUMNS.filter((c) => c.id !== "backlog").map((col) => {
                    const colTasks = tasksByStatus(col.id);
                    const colPoints = colTasks.reduce((s, t) => s + (t.story_points || 0), 0);
                    return (
                      <Droppable droppableId={col.id} key={col.id}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.droppableProps}
                            className={cn("w-[272px] flex flex-col rounded-lg transition-colors flex-shrink-0",
                              snapshot.isDraggingOver ? "bg-jira-blueBg/50" : "bg-jira-surface/60")}>
                            <div className="px-3 py-2.5 flex items-center gap-2 border-b border-jira-border/60">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                              <h3 className="text-xs font-bold text-jira-text uppercase tracking-wide">{col.title}</h3>
                              <span className="text-[10px] text-jira-textMuted bg-white border border-jira-border rounded-full px-1.5 py-0.5 font-mono ml-auto">{colTasks.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
                              {colTasks.map((task, idx) => (
                                <Draggable draggableId={String(task.id)} index={idx} key={task.id}>
                                  {(prov, snap) => (
                                    <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                                      onClick={() => setSelectedTask(task)}
                                      className={cn("bg-white border border-jira-border rounded-md p-3 cursor-pointer transition-all hover:shadow-cardHover hover:border-jira-borderLight group",
                                        snap.isDragging && "shadow-modal border-jira-blue")}>
                                      <TaskCardContent task={task} categories={categories} getTimeSpent={getTimeSpent} />
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              <button onClick={() => { setNewTask({ ...newTask, status: col.id }); setShowCreate(true); }}
                                className="w-full text-xs text-jira-textMuted hover:text-jira-blue hover:bg-white rounded-md py-2 flex items-center justify-center gap-1.5 transition-colors border border-dashed border-transparent hover:border-jira-border">
                                <Plus size={14} /> Create Issue
                              </button>
                            </div>
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
                </div>
              </DragDropContext>
            ) : (
              <EmptySprintState onGoBacklog={() => setBoardView("backlog")} hasPlanned={plannedSprints.length > 0} />
            )
          ) : (
            /* Backlog planning view */
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="space-y-4 min-w-max">
                {/* Planned / active sprint columns */}
                {sprints.map((sprint) => {
                  const sprintTasks = tasks.filter((t) => t.sprint_id === sprint.id);
                  const pts = sprintTasks.reduce((s, t) => s + (t.story_points || 0), 0);
                  const donePts = sprintTasks.filter((t) => t.status === "done").reduce((s, t) => s + (t.story_points || 0), 0);
                  return (
                    <div key={sprint.id} className="bg-white border border-jira-border rounded-lg flex flex-col">
                      <div className="px-4 py-2.5 border-b border-jira-border flex items-center gap-3">
                        <span className={cn("w-2.5 h-2.5 rounded-full", sprint.is_active ? "bg-jira-green" : "bg-jira-textLight")} />
                        <h3 className="text-sm font-bold text-jira-text">{sprint.name}</h3>
                        {sprint.is_active && <span className="text-[10px] font-bold text-jira-green bg-jira-greenBg px-1.5 py-0.5 rounded uppercase">Active</span>}
                        <span className="text-[10px] text-jira-textMuted font-mono">{sprintTasks.length} issues &middot; {donePts}/{pts}pt</span>
                        <div className="ml-auto flex items-center gap-1.5">
                          {sprint.is_active ? (
                            <button onClick={() => handleEndSprint(sprint.id)} className="flex items-center gap-1 text-xs text-jira-textSub hover:text-jira-red px-2 py-1 rounded hover:bg-jira-redBg transition-colors">
                              <Square size={12} /> End Sprint
                            </button>
                          ) : (
                            <button onClick={() => handleStartSprint(sprint.id)} className="flex items-center gap-1 text-xs text-jira-green hover:text-white hover:bg-jira-green px-2 py-1 rounded transition-colors font-medium">
                              <Play size={12} /> Start Sprint
                            </button>
                          )}
                          {!sprint.is_active && (
                            <button onClick={() => handleDeleteSprint(sprint.id)} className="text-jira-textMuted hover:text-jira-red p-1 rounded hover:bg-jira-hover transition-colors">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                      {sprint.goal && <div className="px-4 py-1.5 text-xs text-jira-textMuted bg-jira-surface/50 border-b border-jira-border/60">Goal: {sprint.goal}</div>}
                      <Droppable droppableId={`sprint:${sprint.id}`} direction="horizontal">
                        {(prov, snap) => (
                          <div ref={prov.innerRef} {...prov.droppableProps}
                            className={cn("flex gap-2 p-3 overflow-x-auto min-h-[88px] transition-colors", snap.isDraggingOver && "bg-jira-blueBg/40")}>
                            {sprintTasks.map((task, idx) => (
                              <Draggable draggableId={String(task.id)} index={idx} key={task.id}>
                                {(p, s) => (
                                  <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                                    onClick={() => setSelectedTask(task)}
                                    className={cn("w-64 bg-white border border-jira-border rounded-md p-3 cursor-pointer transition-all hover:shadow-cardHover",
                                      s.isDragging && "shadow-modal border-jira-blue")}>
                                    <TaskCardContent task={task} categories={categories} getTimeSpent={getTimeSpent} />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {sprintTasks.length === 0 && <div className="text-xs text-jira-textLight py-4 px-2">Drag issues here to plan this sprint</div>}
                            {prov.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}

                {/* Create sprint */}
                {showCreateSprint ? (
                  <div className="bg-white border border-jira-border rounded-lg p-3 space-y-2">
                    <input placeholder="Sprint name (e.g. Sprint 1)" value={newSprint.name}
                      onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })} className="jira-input w-full text-sm" />
                    <input placeholder="Sprint goal (optional)" value={newSprint.goal}
                      onChange={(e) => setNewSprint({ ...newSprint, goal: e.target.value })} className="jira-input w-full text-sm" />
                    <div className="flex gap-2">
                      <button onClick={handleCreateSprint} className="jira-btn-primary text-xs">Create Sprint</button>
                      <button onClick={() => setShowCreateSprint(false)} className="jira-btn-secondary text-xs">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowCreateSprint(true)} className="w-full flex items-center justify-center gap-1.5 text-sm text-jira-textMuted hover:text-jira-blue bg-white border border-dashed border-jira-border rounded-lg py-2.5 hover:border-jira-blue transition-colors">
                    <Plus size={16} /> Create Sprint
                  </button>
                )}

                {/* Backlog pool */}
                <div className="bg-white border border-jira-border rounded-lg flex flex-col">
                  <div className="px-4 py-2.5 border-b border-jira-border flex items-center gap-3">
                    <ListChecks size={15} className="text-jira-textMuted" />
                    <h3 className="text-sm font-bold text-jira-text">Backlog</h3>
                    <span className="text-[10px] text-jira-textMuted bg-jira-surface border border-jira-border rounded-full px-1.5 py-0.5 font-mono">{filteredBacklog.length} issues</span>
                  </div>
                  <Droppable droppableId="backlog" direction="horizontal">
                    {(prov, snap) => (
                      <div ref={prov.innerRef} {...prov.droppableProps}
                        className={cn("flex gap-2 p-3 overflow-x-auto min-h-[100px] transition-colors", snap.isDraggingOver && "bg-jira-blueBg/40")}>
                        {filteredBacklog.map((task, idx) => (
                          <Draggable draggableId={String(task.id)} index={idx} key={task.id}>
                            {(p, s) => (
                              <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                                onClick={() => setSelectedTask(task)}
                                className={cn("w-64 bg-white border border-jira-border rounded-md p-3 cursor-pointer transition-all hover:shadow-cardHover",
                                  s.isDragging && "shadow-modal border-jira-blue")}>
                                <TaskCardContent task={task} categories={categories} getTimeSpent={getTimeSpent} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {filteredBacklog.length === 0 && <div className="text-xs text-jira-textLight py-4 px-2">No issues in backlog. Create one to get started.</div>}
                        {prov.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            </DragDropContext>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreate && <CreateIssueModal newTask={newTask} setNewTask={setNewTask} categories={categories} onSubmit={handleAdd} onClose={() => setShowCreate(false)} />}
      {selectedTask && <TaskDetailModal task={selectedTask} categories={categories} timeEntries={timeEntries.filter((e) => e.task_id === selectedTask.id)} onClose={() => { setSelectedTask(null); load(); }} onDelete={handleDelete} onUpdate={handleUpdateField} />}
    </div>
  );
}

function TaskCardContent({ task, categories, getTimeSpent }: { task: Task; categories: Category[]; getTimeSpent: (id: number) => number }) {
  const issueMeta = getIssueMeta(task.issue_type);
  const cat = categories.find((c) => c.id === task.category_id);
  const taskTime = getTimeSpent(task.id);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
  return (
    <>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-5 h-5 rounded flex items-center justify-center" style={{ background: issueMeta.bgColor }}>
          <IssueTypeIcon type={task.issue_type} size={12} />
        </span>
        {cat && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: cat.color + "12", color: cat.color }}>{cat.name}</span>}
        <span className="text-[10px] text-jira-textMuted font-mono ml-auto">{task.key}</span>
      </div>
      <p className="text-sm text-jira-text font-medium leading-snug">{task.title}</p>
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {task.labels.map((label, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-jira-surface text-jira-textSub border border-jira-border font-medium">{label}</span>
          ))}
        </div>
      )}
      {task.due_date && (
        <div className={cn("flex items-center gap-1 mt-2 text-[10px] font-medium", isOverdue ? "text-jira-red" : "text-jira-textMuted")}>
          {isOverdue ? <AlertCircle size={11} /> : <Calendar size={11} />}
          {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      )}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-jira-border/40">
        <div className="flex items-center gap-2">
          <PriorityIcon priority={task.priority} size={12} />
          {taskTime > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-jira-textMuted">
              <Clock size={10} /> {formatMinutes(taskTime)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {task.story_points != null && (
            <span className="w-6 h-5 rounded-full bg-jira-surface border border-jira-border text-[10px] text-jira-textSub font-mono font-bold flex items-center justify-center">{task.story_points}</span>
          )}
          {task.assignee && (
            <div className="w-5 h-5 rounded-full bg-jira-blue flex items-center justify-center text-white text-[9px] font-bold">{task.assignee.charAt(0).toUpperCase()}</div>
          )}
        </div>
      </div>
    </>
  );
}

function EmptySprintState({ onGoBacklog, hasPlanned }: { onGoBacklog: () => void; hasPlanned: boolean }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-jira-blueBg flex items-center justify-center mx-auto mb-4">
          <Rocket size={26} className="text-jira-blue" />
        </div>
        <h2 className="text-base font-bold text-jira-text">No active sprint</h2>
        <p className="text-sm text-jira-textMuted mt-1 mb-4">
          {hasPlanned ? "Start a planned sprint from the backlog to begin working." : "Create a sprint in the backlog, add issues to it, then start it."}
        </p>
        <button onClick={onGoBacklog} className="jira-btn-primary inline-flex items-center gap-1.5 text-xs">
          <ChevronRight size={15} /> Go to Backlog
        </button>
      </div>
    </div>
  );
}

function CreateIssueModal({ newTask, setNewTask, categories, onSubmit, onClose }: {
  newTask: any; setNewTask: any; categories: Category[]; onSubmit: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-modal w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-jira-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-jira-text">Create Issue</h3>
          <button onClick={onClose} className="text-jira-textMuted hover:text-jira-text"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-jira-textMuted uppercase tracking-wide block mb-1.5">Issue Title *</label>
            <input autoFocus placeholder="What needs to be done?" value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()} className="jira-input w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold text-jira-textMuted uppercase tracking-wide block mb-1.5">Description</label>
            <textarea placeholder="Add a description..." value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              rows={3} className="jira-input w-full resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Issue Type" value={newTask.issue_type} onChange={(v) => setNewTask({ ...newTask, issue_type: v })} options={ISSUE_TYPES.map((t) => ({ value: t.id, label: t.label }))} />
            <FormSelect label="Status" value={newTask.status} onChange={(v) => setNewTask({ ...newTask, status: v })} options={COLUMNS.map((c) => ({ value: c.id, label: c.title }))} />
            <FormSelect label="Priority" value={newTask.priority} onChange={(v) => setNewTask({ ...newTask, priority: v })} options={PRIORITIES.map((p) => ({ value: p.id, label: p.label }))} />
            <div>
              <label className="text-xs font-semibold text-jira-textMuted uppercase tracking-wide block mb-1.5">Story Points</label>
              <input type="number" min="0" placeholder="0" value={newTask.story_points}
                onChange={(e) => setNewTask({ ...newTask, story_points: e.target.value })} className="jira-input w-full" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-jira-textMuted uppercase tracking-wide block mb-1.5">Labels (comma-separated)</label>
              <input placeholder="e.g., study, urgent, weekend" value={newTask.labels}
                onChange={(e) => setNewTask({ ...newTask, labels: e.target.value })} className="jira-input w-full" />
            </div>
            <div className="col-span-2">
              <FormSelect label="Category" value={newTask.category_id} onChange={(v) => setNewTask({ ...newTask, category_id: v })} options={[{ value: "", label: "No category" }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-jira-border">
            <button onClick={onClose} className="jira-btn-secondary">Cancel</button>
            <button onClick={onSubmit} className="jira-btn-primary">Create Issue</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskDetailModal({ task, categories, timeEntries, onClose, onDelete, onUpdate }: {
  task: Task; categories: Category[]; timeEntries: TimeEntry[];
  onClose: () => void; onDelete: (id: number) => void;
  onUpdate: (id: number, field: string, value: any) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [desc, setDesc] = useState(task.description);
  const [activeTab, setActiveTab] = useState<"description" | "comments" | "time" | "links" | "activity">("description");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [links, setLinks] = useState<IssueLink[]>([]);
  const [history, setHistory] = useState<IssueHistoryEntry[]>([]);
  const [newLinkTarget, setNewLinkTarget] = useState("");
  const [newLinkType, setNewLinkType] = useState<"blocks" | "relates" | "duplicates">("relates");
  const issueMeta = getIssueMeta(task.issue_type);
  const cat = categories.find((c) => c.id === task.category_id);
  const timeSpent = timeEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0);

  useEffect(() => {
    api.tasks.comments.list(task.id).then(setComments);
    api.tasks.links.list(task.id).then(setLinks);
    api.tasks.history(task.id).then(setHistory);
  }, [task.id]);

  const addComment = async () => {
    if (!newComment.trim()) return;
    const c = await api.tasks.comments.add(task.id, newComment);
    setComments([...comments, c]);
    setNewComment("");
  };

  const deleteComment = async (id: number) => {
    await api.tasks.comments.delete(id);
    setComments(comments.filter((c) => c.id !== id));
  };

  const addLabel = async () => {
    if (!newLabel.trim()) return;
    const labels = [...(task.labels || []), newLabel.trim()];
    await onUpdate(task.id, "labels", labels);
    setNewLabel("");
  };

  const removeLabel = async (label: string) => {
    const labels = (task.labels || []).filter((l) => l !== label);
    await onUpdate(task.id, "labels", labels);
  };

  const addLink = async () => {
    const targetId = parseInt(newLinkTarget);
    if (!targetId) return;
    try {
      const link = await api.tasks.links.create(task.id, { target_task_id: targetId, link_type: newLinkType });
      setLinks([...links, link]);
      setNewLinkTarget("");
    } catch (e) { alert(String(e).replace(/^Error:\s*/i, "")); }
  };

  const deleteLink = async (id: number) => {
    await api.tasks.links.delete(id);
    setLinks(links.filter((l) => l.id !== id));
  };

  const fieldLabel = (f: string) => {
    const map: Record<string, string> = { status: "Status", priority: "Priority", issue_type: "Issue Type", story_points: "Story Points", assignee: "Assignee", due_date: "Due Date", title: "Title", description: "Description", labels: "Labels", category_id: "Category", sprint_id: "Sprint", project_id: "Project", parent_task_id: "Parent" };
    return map[f] || f;
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-modal w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-3 border-b border-jira-border" style={{ borderLeft: `4px solid ${issueMeta.color}` }}>
          <span className="w-7 h-7 rounded flex items-center justify-center" style={{ background: issueMeta.bgColor }}>
            <IssueTypeIcon type={task.issue_type} size={16} />
          </span>
          <span className="text-xs text-jira-textMuted font-mono">{task.key}</span>
          <span className="text-xs text-jira-textMuted font-medium">{issueMeta.label}</span>
          <div className="ml-auto flex items-center gap-2">
            <button className="text-jira-textMuted hover:text-jira-text p-1 rounded hover:bg-jira-hover"><MoreHorizontal size={16} /></button>
            <button onClick={onClose} className="text-jira-textMuted hover:text-jira-text p-1 rounded hover:bg-jira-hover"><X size={18} /></button>
          </div>
        </div>

        <div className="flex flex-1 overflow-auto">
          <div className="flex-1 p-5 space-y-4 overflow-auto">
            {editingTitle ? (
              <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
                onBlur={() => { onUpdate(task.id, "title", title); setEditingTitle(false); }}
                onKeyDown={(e) => e.key === "Enter" && (onUpdate(task.id, "title", title), setEditingTitle(false))}
                className="jira-input text-base font-bold" />
            ) : (
              <h1 className="text-base font-bold text-jira-text cursor-pointer hover:bg-jira-hover rounded px-2 py-1 -mx-2"
                onClick={() => setEditingTitle(true)}>{task.title}</h1>
            )}

            <div className="flex border-b border-jira-border">
              <TabButton active={activeTab === "description"} onClick={() => setActiveTab("description")} icon={<Circle size={13} />} label="Description" />
              <TabButton active={activeTab === "comments"} onClick={() => setActiveTab("comments")} icon={<MessageCircle size={13} />} label={`Comments (${comments.length})`} />
              <TabButton active={activeTab === "time"} onClick={() => setActiveTab("time")} icon={<Clock size={13} />} label={`Time (${formatMinutes(timeSpent)})`} />
              <TabButton active={activeTab === "links"} onClick={() => setActiveTab("links")} icon={<Link2 size={13} />} label={`Links (${links.length})`} />
              <TabButton active={activeTab === "activity"} onClick={() => setActiveTab("activity")} icon={<GitCommit size={13} />} label="Activity" />
            </div>

            {activeTab === "description" && (
              <div>
                {editingDesc ? (
                  <div>
                    <textarea value={desc} onChange={(e) => setDesc(e.target.value)} autoFocus rows={5}
                      className="jira-input w-full resize-none" />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => { onUpdate(task.id, "description", desc); setEditingDesc(false); }} className="jira-btn-primary text-xs">Save</button>
                      <button onClick={() => { setEditingDesc(false); setDesc(task.description); }} className="jira-btn-secondary text-xs">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-jira-textSub whitespace-pre-wrap cursor-pointer hover:bg-jira-hover rounded px-2 py-1.5 -mx-2 min-h-[40px]"
                    onClick={() => setEditingDesc(true)}>
                    {task.description || <span className="text-jira-textMuted italic">Add a description...</span>}
                  </p>
                )}
              </div>
            )}

            {activeTab === "comments" && (
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <p className="text-sm text-jira-textMuted italic py-4 text-center">No comments yet. Add one below.</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-jira-blue flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {c.author.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 bg-jira-surface rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-jira-text">{c.author}</span>
                          <span className="text-[10px] text-jira-textMuted">{new Date(c.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          <button onClick={() => deleteComment(c.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-jira-textMuted hover:text-jira-red transition-opacity">
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <p className="text-sm text-jira-textSub">{c.body}</p>
                      </div>
                    </div>
                  ))
                )}
                <div className="flex gap-3 pt-2">
                  <div className="w-8 h-8 rounded-full bg-jira-blue flex items-center justify-center text-white text-xs font-bold flex-shrink-0">Y</div>
                  <div className="flex-1">
                    <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..." rows={2}
                      onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && addComment()}
                      className="jira-input w-full resize-none" />
                    <button onClick={addComment} className="jira-btn-primary text-xs mt-2">Add Comment</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "time" && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <TimeBox label="Original Estimate" value={task.original_estimate_minutes ? formatMinutes(task.original_estimate_minutes) : "-"} color="#0052CC" />
                  <TimeBox label="Time Spent" value={formatMinutes(timeSpent)} color="#36B37E" />
                  <TimeBox label="Remaining" value={task.remaining_estimate_minutes ? formatMinutes(task.remaining_estimate_minutes) : "-"} color="#FFAB00" />
                </div>
                {timeEntries.length === 0 ? (
                  <p className="text-sm text-jira-textMuted italic py-4 text-center">No time logged on this issue.</p>
                ) : (
                  timeEntries.map((e) => {
                    const entryCat = categories.find((c) => c.id === e.category_id);
                    return (
                      <div key={e.id} className="flex items-center gap-3 p-2.5 bg-jira-surface rounded-lg">
                        <Clock size={14} className="text-jira-textMuted" />
                        <div className="flex-1">
                          <div className="text-sm text-jira-text font-medium">{e.title}</div>
                          <div className="text-[10px] text-jira-textMuted">{new Date(e.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                        </div>
                        {entryCat && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: entryCat.color + "12", color: entryCat.color }}>{entryCat.name}</span>}
                        <span className="text-sm font-bold text-jira-text font-mono">{formatMinutes(e.duration_minutes)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "links" && (
              <div className="space-y-3">
                {links.length === 0 ? (
                  <p className="text-sm text-jira-textMuted italic py-2">No linked issues yet.</p>
                ) : (
                  links.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 p-2.5 bg-jira-surface rounded-lg group">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white border border-jira-border text-jira-textSub">{l.link_type}</span>
                      <ArrowRight size={13} className="text-jira-textLight" />
                      <span className="text-xs font-mono text-jira-textMuted">{l.target_key}</span>
                      <span className="text-sm text-jira-text flex-1 truncate">{l.target_title}</span>
                      {l.target_status && <span className="text-[10px] text-jira-textMuted capitalize">{l.target_status.replace("_", " ")}</span>}
                      <button onClick={() => deleteLink(l.id)} className="opacity-0 group-hover:opacity-100 text-jira-textMuted hover:text-jira-red transition-opacity">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-jira-border">
                  <select value={newLinkType} onChange={(e) => setNewLinkType(e.target.value as any)} className="jira-select text-xs">
                    <option value="relates">relates to</option>
                    <option value="blocks">blocks</option>
                    <option value="duplicates">duplicates</option>
                  </select>
                  <input value={newLinkTarget} onChange={(e) => setNewLinkTarget(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Issue ID" className="jira-input flex-1 text-xs" />
                  <button onClick={addLink} className="jira-btn-primary text-xs">Link</button>
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="space-y-2">
                {history.length === 0 ? (
                  <p className="text-sm text-jira-textMuted italic py-4 text-center">No activity recorded yet.</p>
                ) : (
                  history.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 text-sm">
                      <div className="w-6 h-6 rounded-full bg-jira-surface border border-jira-border flex items-center justify-center flex-shrink-0 mt-0.5">
                        <GitCommit size={12} className="text-jira-textMuted" />
                      </div>
                      <div className="flex-1">
                        <span className="text-jira-textSub">
                          {h.field === "created" ? (
                            <>Created issue</>
                          ) : (
                            <>Changed <span className="font-medium text-jira-text">{fieldLabel(h.field)}</span></>
                          )}
                          {h.old_value && h.field !== "created" && <> from <span className="font-mono text-xs bg-jira-surface px-1 rounded">{h.old_value}</span></>}
                          {h.new_value && h.field !== "created" && <> to <span className="font-mono text-xs bg-jira-blueBg text-jira-blue px-1 rounded">{h.new_value}</span></>}
                        </span>
                        <div className="text-[10px] text-jira-textLight mt-0.5">
                          {h.actor || "system"} &middot; {new Date(h.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="pt-3 border-t border-jira-border">
              <label className="text-xs font-semibold text-jira-textMuted uppercase tracking-wide block mb-1.5">Labels</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {(task.labels || []).map((label) => (
                  <span key={label} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-jira-surface text-jira-textSub border border-jira-border font-medium group">
                    {label}
                    <button onClick={() => removeLabel(label)} className="opacity-0 group-hover:opacity-100 text-jira-textMuted hover:text-jira-red"><X size={10} /></button>
                  </span>
                ))}
                <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addLabel()}
                  placeholder="Add label..." className="text-xs px-2 py-0.5 rounded border border-jira-border bg-white text-jira-textSub focus:outline-none focus:border-jira-blue w-28" />
              </div>
            </div>
          </div>

          <div className="w-60 border-l border-jira-border p-4 space-y-3 bg-jira-surface/50 flex-shrink-0">
            <ModalField label="Status">
              <select defaultValue={task.status} onChange={(e) => onUpdate(task.id, "status", e.target.value)} className="jira-select w-full text-xs">
                {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </ModalField>
            <ModalField label="Issue Type">
              <select defaultValue={task.issue_type} onChange={(e) => onUpdate(task.id, "issue_type", e.target.value)} className="jira-select w-full text-xs">
                {ISSUE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </ModalField>
            <ModalField label="Priority">
              <div className="flex items-center gap-2">
                <PriorityIcon priority={task.priority} size={14} />
                <select defaultValue={task.priority} onChange={(e) => onUpdate(task.id, "priority", e.target.value)} className="jira-select flex-1 text-xs">
                  {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </ModalField>
            <ModalField label="Story Points">
              <input type="number" defaultValue={task.story_points ?? ""}
                onBlur={(e) => onUpdate(task.id, "story_points", e.target.value ? parseInt(e.target.value) : null)}
                className="jira-input w-full text-xs" placeholder="0" />
            </ModalField>
            <ModalField label="Category">
              <select defaultValue={task.category_id ?? ""} onChange={(e) => onUpdate(task.id, "category_id", e.target.value ? parseInt(e.target.value) : null)} className="jira-select w-full text-xs">
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </ModalField>
            <ModalField label="Start Date">
              <input type="date" defaultValue={task.start_date ? new Date(task.start_date).toISOString().slice(0, 10) : ""}
                onChange={(e) => onUpdate(task.id, "start_date", e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="jira-input w-full text-xs" />
            </ModalField>
            <ModalField label="Due Date">
              <input type="date" defaultValue={task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : ""}
                onChange={(e) => onUpdate(task.id, "due_date", e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="jira-input w-full text-xs" />
            </ModalField>
            <ModalField label="Assignee">
              <input type="text" defaultValue={task.assignee ?? ""} placeholder="Unassigned"
                onBlur={(e) => onUpdate(task.id, "assignee", e.target.value || null)}
                className="jira-input w-full text-xs" />
            </ModalField>
            <div className="pt-3 border-t border-jira-border">
              <button onClick={() => onDelete(task.id)} className="text-xs text-jira-red hover:text-jira-red/70 flex items-center gap-1.5 font-medium">
                <Trash2 size={13} /> Delete Issue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={cn("flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
        active ? "border-jira-blue text-jira-blue" : "border-transparent text-jira-textMuted hover:text-jira-textSub")}>
      {icon} {label}
    </button>
  );
}

function TimeBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-jira-surface rounded-lg p-3 text-center">
      <div className="text-[10px] text-jira-textMuted uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm font-bold font-mono" style={{ color }}>{value}</div>
    </div>
  );
}

function FormSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="text-xs font-semibold text-jira-textMuted uppercase tracking-wide block mb-1.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="jira-select w-full">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-jira-textMuted uppercase tracking-wide block mb-1">{label}</label>
      {children}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className={cn("text-xs bg-white border rounded py-1 pl-2 pr-6 focus:outline-none focus:border-jira-blue cursor-pointer appearance-none transition-colors",
          value ? "border-jira-blue text-jira-blue font-medium bg-jira-blueBg" : "border-jira-border text-jira-textSub hover:border-jira-borderLight")}
        title={label}>
        <option value="">{label}: All</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronRight size={11} className={cn("absolute right-1.5 top-1/2 -translate-y-1/2 text-jira-textLight pointer-events-none rotate-90")} />
    </div>
  );
}
