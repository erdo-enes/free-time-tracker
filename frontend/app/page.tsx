"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { api, type Task, type Category, type Comment, type TimeEntry } from "@/lib/api";
import {
  Plus, Trash2, X, Filter, MoreHorizontal, MessageCircle, Clock,
  Tag, ChevronRight, Calendar, User, CheckCircle2, Circle, AlertCircle,
  TrendingUp, ListChecks,
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
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterType, setFilterType] = useState<string>("");
  const [boardView, setBoardView] = useState<"sprint" | "backlog">("sprint");
  const searchParams = useSearchParams();
  const [newTask, setNewTask] = useState({
    title: "", description: "", status: "backlog", priority: "medium",
    issue_type: "task", category_id: "", story_points: "", labels: "",
  });

  const load = useCallback(() => {
    api.tasks.list().then(setTasks);
    api.categories.list().then(setCategories);
    api.timeEntries.list({ limit: 500 }).then(setTimeEntries);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (searchParams.get("create") === "1") setShowCreate(true);
  }, [searchParams]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const taskId = parseInt(result.draggableId);
    const newStatus = result.destination.droppableId;
    const newIndex = result.destination.index;
    const oldStatus = result.source.droppableId;
    const oldIndex = result.source.index;

    // Reorder within same column or move across columns
    setTasks((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((t) => t.id === taskId);
      if (idx === -1) return prev;
      updated[idx] = { ...updated[idx], status: newStatus as Task["status"], order: newIndex };
      // Reorder others
      const colTasks = updated
        .filter((t) => t.id !== taskId && t.status === newStatus)
        .sort((a, b) => a.order - b.order);
      colTasks.splice(newIndex, 0, updated[idx]);
      colTasks.forEach((t, i) => {
        const tIdx = updated.findIndex((u) => u.id === t.id);
        if (tIdx >= 0) updated[tIdx] = { ...updated[tIdx], order: i };
      });
      return updated;
    });

    try { await api.tasks.move(taskId, newStatus, newIndex); } catch { load(); }
  };

  const handleAdd = async () => {
    if (!newTask.title.trim()) return;
    const labels = newTask.labels ? newTask.labels.split(",").map((l) => l.trim()).filter(Boolean) : [];
    await api.tasks.create({
      title: newTask.title, description: newTask.description,
      status: newTask.status as Task["status"], priority: newTask.priority as Task["priority"],
      issue_type: newTask.issue_type as Task["issue_type"],
      category_id: newTask.category_id ? parseInt(newTask.category_id) : null,
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

  const filteredTasks = filterType ? tasks.filter((t) => t.issue_type === filterType) : tasks;
  const boardTasks = boardView === "sprint"
    ? filteredTasks.filter((t) => t.status !== "backlog")
    : filteredTasks.filter((t) => t.status === "backlog");

  const tasksByStatus = (status: string) =>
    boardTasks.filter((t) => t.status === status).sort((a, b) => a.order - b.order);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const sprintPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Epic panel data
  const epics = tasks.filter((t) => t.issue_type === "epic");
  const getTimeSpent = (taskId: number) => timeEntries.filter((e) => e.task_id === taskId).reduce((s, e) => s + (e.duration_minutes || 0), 0);

  const visibleColumns = boardView === "sprint"
    ? COLUMNS.filter((c) => c.id !== "backlog")
    : COLUMNS.filter((c) => c.id === "backlog");

  return (
    <div className="h-full flex flex-col">
      {/* Board header */}
      <div className="px-6 py-3 border-b border-jira-border bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-jira-blueBg flex items-center justify-center">
              <span className="text-jira-blue font-bold text-lg">FT</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-jira-text">FreeTime Board</h1>
              <div className="text-xs text-jira-textMuted">Personal Sprint Board</div>
            </div>
            {/* Sprint/Backlog toggle */}
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
            <div className="flex items-center gap-3 px-3 py-1.5 bg-jira-surface rounded-lg">
              <ListChecks size={14} className="text-jira-textMuted" />
              <div className="text-xs">
                <span className="text-jira-textMuted">Progress: </span>
                <span className="text-jira-text font-semibold">{doneTasks}/{totalTasks}</span>
              </div>
              <div className="w-32 h-2 bg-jira-border rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-jira-blue to-jira-green rounded-full transition-all duration-500" style={{ width: `${sprintPct}%` }} />
              </div>
              <span className="text-xs text-jira-textMuted font-mono">{sprintPct}%</span>
            </div>
            <div className="relative">
              <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-jira-textMuted pointer-events-none" />
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-jira-border rounded text-jira-textSub focus:outline-none focus:border-jira-blue cursor-pointer appearance-none">
                <option value="">All Types</option>
                {ISSUE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <button onClick={() => setShowCreate(true)} className="jira-btn-primary flex items-center gap-1.5 text-xs">
              <Plus size={15} /> Create
            </button>
          </div>
        </div>
      </div>

      {/* Board + Epic panel */}
      <div className="flex-1 flex overflow-hidden bg-jira-app">
        {/* Epic sidebar */}
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

        {/* Kanban columns */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-3 min-w-max h-full">
              {visibleColumns.map((col) => {
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
                          {colTasks.map((task, idx) => {
                            const issueMeta = getIssueMeta(task.issue_type);
                            const cat = categories.find((c) => c.id === task.category_id);
                            const taskTime = getTimeSpent(task.id);
                            const taskComments = 0; // would need to count
                            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
                            return (
                              <Draggable draggableId={String(task.id)} index={idx} key={task.id}>
                                {(prov, snap) => (
                                  <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                                    onClick={() => setSelectedTask(task)}
                                    className={cn("bg-white border border-jira-border rounded-md p-3 cursor-pointer transition-all hover:shadow-cardHover hover:border-jira-borderLight group",
                                      snap.isDragging && "shadow-modal border-jira-blue")}>
                                    {/* Top row */}
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <span className="w-5 h-5 rounded flex items-center justify-center" style={{ background: issueMeta.bgColor }}>
                                        <IssueTypeIcon type={task.issue_type} size={12} />
                                      </span>
                                      {cat && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: cat.color + "12", color: cat.color }}>{cat.name}</span>}
                                      <span className="text-[10px] text-jira-textMuted font-mono ml-auto">FTJ-{task.id}</span>
                                    </div>
                                    {/* Title */}
                                    <p className="text-sm text-jira-text font-medium leading-snug">{task.title}</p>
                                    {/* Labels */}
                                    {task.labels && task.labels.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {task.labels.map((label, i) => (
                                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-jira-surface text-jira-textSub border border-jira-border font-medium">{label}</span>
                                        ))}
                                      </div>
                                    )}
                                    {/* Due date */}
                                    {task.due_date && (
                                      <div className={cn("flex items-center gap-1 mt-2 text-[10px] font-medium", isOverdue ? "text-jira-red" : "text-jira-textMuted")}>
                                        {isOverdue ? <AlertCircle size={11} /> : <Calendar size={11} />}
                                        {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                      </div>
                                    )}
                                    {/* Bottom row */}
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
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
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
        </div>
      </div>

      {/* Modals */}
      {showCreate && <CreateIssueModal newTask={newTask} setNewTask={setNewTask} categories={categories} onSubmit={handleAdd} onClose={() => setShowCreate(false)} />}
      {selectedTask && <TaskDetailModal task={selectedTask} categories={categories} timeEntries={timeEntries.filter((e) => e.task_id === selectedTask.id)} onClose={() => { setSelectedTask(null); load(); }} onDelete={handleDelete} onUpdate={handleUpdateField} />}
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
  const [activeTab, setActiveTab] = useState<"description" | "comments" | "time">("description");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const issueMeta = getIssueMeta(task.issue_type);
  const cat = categories.find((c) => c.id === task.category_id);
  const timeSpent = timeEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0);

  useEffect(() => {
    api.tasks.comments.list(task.id).then(setComments);
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

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-modal w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-jira-border" style={{ borderLeft: `4px solid ${issueMeta.color}` }}>
          <span className="w-7 h-7 rounded flex items-center justify-center" style={{ background: issueMeta.bgColor }}>
            <IssueTypeIcon type={task.issue_type} size={16} />
          </span>
          <span className="text-xs text-jira-textMuted font-mono">FTJ-{task.id}</span>
          <span className="text-xs text-jira-textMuted font-medium">{issueMeta.label}</span>
          <div className="ml-auto flex items-center gap-2">
            <button className="text-jira-textMuted hover:text-jira-text p-1 rounded hover:bg-jira-hover"><MoreHorizontal size={16} /></button>
            <button onClick={onClose} className="text-jira-textMuted hover:text-jira-text p-1 rounded hover:bg-jira-hover"><X size={18} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-auto">
          {/* Main content */}
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

            {/* Tabs */}
            <div className="flex border-b border-jira-border">
              <TabButton active={activeTab === "description"} onClick={() => setActiveTab("description")} icon={<Circle size={13} />} label="Description" />
              <TabButton active={activeTab === "comments"} onClick={() => setActiveTab("comments")} icon={<MessageCircle size={13} />} label={`Comments (${comments.length})`} />
              <TabButton active={activeTab === "time"} onClick={() => setActiveTab("time")} icon={<Clock size={13} />} label={`Time (${formatMinutes(timeSpent)})`} />
            </div>

            {/* Tab content */}
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
                {/* Time tracking widget */}
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

            {/* Labels */}
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

          {/* Sidebar */}
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
