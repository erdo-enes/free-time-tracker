"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { api, type Task, type Category } from "@/lib/api";
import {
  Plus, Trash2, X, Filter, MoreHorizontal, GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ISSUE_TYPES, PRIORITIES, COLUMNS, getIssueMeta, getPriorityMeta,
  IssueTypeIcon, PriorityIcon,
} from "@/components/IssueTypes";

export default function BoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterType, setFilterType] = useState<string>("");
  const searchParams = useSearchParams();
  const [newTask, setNewTask] = useState({
    title: "", description: "", status: "backlog", priority: "medium",
    issue_type: "task", category_id: "", story_points: "",
  });

  const load = useCallback(() => {
    api.tasks.list().then(setTasks);
    api.categories.list().then(setCategories);
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
    setTasks((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((t) => t.id === taskId);
      if (idx === -1) return prev;
      updated[idx] = { ...updated[idx], status: newStatus as Task["status"] };
      return updated;
    });
    try { await api.tasks.move(taskId, newStatus, newIndex); } catch { load(); }
  };

  const handleAdd = async () => {
    if (!newTask.title.trim()) return;
    await api.tasks.create({
      title: newTask.title, description: newTask.description,
      status: newTask.status as Task["status"], priority: newTask.priority as Task["priority"],
      issue_type: newTask.issue_type as Task["issue_type"],
      category_id: newTask.category_id ? parseInt(newTask.category_id) : null,
      story_points: newTask.story_points ? parseInt(newTask.story_points) : null,
    });
    setNewTask({ title: "", description: "", status: "backlog", priority: "medium", issue_type: "task", category_id: "", story_points: "" });
    setShowCreate(false);
    load();
  };

  const handleDelete = async (id: number) => { await api.tasks.delete(id); setSelectedTask(null); load(); };
  const handleUpdateField = async (id: number, field: string, value: any) => { await api.tasks.update(id, { [field]: value }); load(); };

  const filteredTasks = filterType ? tasks.filter((t) => t.issue_type === filterType) : tasks;
  const tasksByStatus = (status: string) => filteredTasks.filter((t) => t.status === status).sort((a, b) => a.order - b.order);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const sprintPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

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
          </div>
          <div className="flex items-center gap-4">
            {/* Sprint progress */}
            <div className="flex items-center gap-3 px-3 py-1.5 bg-jira-surface rounded-lg">
              <div className="text-xs">
                <span className="text-jira-textMuted">Sprint: </span>
                <span className="text-jira-text font-semibold">{doneTasks}/{totalTasks}</span>
              </div>
              <div className="w-32 h-2 bg-jira-border rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-jira-blue to-jira-green rounded-full transition-all duration-500" style={{ width: `${sprintPct}%` }} />
              </div>
              <span className="text-xs text-jira-textMuted font-mono">{sprintPct}%</span>
            </div>
            {/* Filter */}
            <div className="relative">
              <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-jira-textMuted pointer-events-none" />
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-jira-border rounded text-jira-textSub focus:outline-none focus:border-jira-blue cursor-pointer appearance-none">
                <option value="">All Types</option>
                {ISSUE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <button onClick={() => setShowCreate(true)} className="jira-btn-primary flex items-center gap-1.5 text-xs">
              <Plus size={15} /> Create Issue
            </button>
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 bg-jira-app">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 min-w-max h-full">
            {COLUMNS.map((col) => {
              const colTasks = tasksByStatus(col.id);
              const colPoints = colTasks.reduce((s, t) => s + (t.story_points || 0), 0);
              return (
                <Droppable droppableId={col.id} key={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "w-[272px] flex flex-col rounded-lg transition-colors",
                        snapshot.isDraggingOver ? "bg-jira-blueBg/50" : "bg-jira-surface/60"
                      )}
                    >
                      {/* Column header */}
                      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-jira-border/60">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                        <h3 className="text-xs font-bold text-jira-text uppercase tracking-wide">{col.title}</h3>
                        <span className="text-[10px] text-jira-textMuted bg-white border border-jira-border rounded-full px-1.5 py-0.5 font-mono ml-auto">
                          {colTasks.length}
                        </span>
                      </div>
                      {/* Cards */}
                      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
                        {colTasks.map((task, idx) => {
                          const issueMeta = getIssueMeta(task.issue_type);
                          const cat = categories.find((c) => c.id === task.category_id);
                          return (
                            <Draggable draggableId={String(task.id)} index={idx} key={task.id}>
                              {(prov, snap) => (
                                <div
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  {...prov.dragHandleProps}
                                  onClick={() => setSelectedTask(task)}
                                  className={cn(
                                    "bg-white border border-jira-border rounded-md p-3 cursor-pointer transition-all hover:shadow-cardHover hover:border-jira-borderLight group",
                                    snap.isDragging && "shadow-modal border-jira-blue"
                                  )}
                                >
                                  {/* Top row: issue type + category badge */}
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <span className="w-5 h-5 rounded flex items-center justify-center" style={{ background: issueMeta.bgColor }}>
                                      <IssueTypeIcon type={task.issue_type} size={12} />
                                    </span>
                                    {cat && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                        style={{ background: cat.color + "12", color: cat.color }}>
                                        {cat.name}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-jira-textMuted font-mono ml-auto">FTJ-{task.id}</span>
                                  </div>
                                  {/* Title */}
                                  <p className="text-sm text-jira-text font-medium leading-snug">{task.title}</p>
                                  {/* Description preview */}
                                  {task.description && (
                                    <p className="text-xs text-jira-textMuted mt-1 line-clamp-2">{task.description}</p>
                                  )}
                                  {/* Bottom row: priority + story points */}
                                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-jira-border/40">
                                    <div className="flex items-center gap-2">
                                      <PriorityIcon priority={task.priority} size={12} />
                                      <span className="text-[10px] text-jira-textMuted font-medium">
                                        {getPriorityMeta(task.priority).label}
                                      </span>
                                    </div>
                                    {task.story_points != null && (
                                      <span className="w-6 h-5 rounded-full bg-jira-surface border border-jira-border text-[10px] text-jira-textSub font-mono font-bold flex items-center justify-center">
                                        {task.story_points}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        {/* Add card button */}
                        <button
                          onClick={() => { setNewTask({ ...newTask, status: col.id }); setShowCreate(true); }}
                          className="w-full text-xs text-jira-textMuted hover:text-jira-blue hover:bg-white rounded-md py-2 flex items-center justify-center gap-1.5 transition-colors border border-dashed border-transparent hover:border-jira-border"
                        >
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

      {/* Create modal */}
      {showCreate && (
        <CreateIssueModal
          newTask={newTask}
          setNewTask={setNewTask}
          categories={categories}
          onSubmit={handleAdd}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Detail modal */}
      {selectedTask && (
        <TaskDetailModal task={selectedTask} categories={categories}
          onClose={() => setSelectedTask(null)}
          onDelete={handleDelete}
          onUpdate={handleUpdateField} />
      )}
    </div>
  );
}

function CreateIssueModal({ newTask, setNewTask, categories, onSubmit, onClose }: {
  newTask: any; setNewTask: any; categories: Category[];
  onSubmit: () => void; onClose: () => void;
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
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              className="jira-input w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold text-jira-textMuted uppercase tracking-wide block mb-1.5">Description</label>
            <textarea placeholder="Add a description..." value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              rows={3} className="jira-input w-full resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-jira-textMuted uppercase tracking-wide block mb-1.5">Issue Type</label>
              <select value={newTask.issue_type} onChange={(e) => setNewTask({ ...newTask, issue_type: e.target.value })} className="jira-select w-full">
                {ISSUE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-jira-textMuted uppercase tracking-wide block mb-1.5">Status</label>
              <select value={newTask.status} onChange={(e) => setNewTask({ ...newTask, status: e.target.value })} className="jira-select w-full">
                {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-jira-textMuted uppercase tracking-wide block mb-1.5">Priority</label>
              <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} className="jira-select w-full">
                {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-jira-textMuted uppercase tracking-wide block mb-1.5">Story Points</label>
              <input type="number" min="0" placeholder="0" value={newTask.story_points}
                onChange={(e) => setNewTask({ ...newTask, story_points: e.target.value })}
                className="jira-input w-full" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-jira-textMuted uppercase tracking-wide block mb-1.5">Category</label>
              <select value={newTask.category_id} onChange={(e) => setNewTask({ ...newTask, category_id: e.target.value })} className="jira-select w-full">
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
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

function TaskDetailModal({ task, categories, onClose, onDelete, onUpdate }: {
  task: Task; categories: Category[];
  onClose: () => void; onDelete: (id: number) => void;
  onUpdate: (id: number, field: string, value: any) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [desc, setDesc] = useState(task.description);
  const issueMeta = getIssueMeta(task.issue_type);
  const cat = categories.find((c) => c.id === task.category_id);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-modal w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
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
          <div className="flex-1 p-5 space-y-4">
            {editingTitle ? (
              <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
                onBlur={() => { onUpdate(task.id, "title", title); setEditingTitle(false); }}
                onKeyDown={(e) => e.key === "Enter" && (onUpdate(task.id, "title", title), setEditingTitle(false))}
                className="jira-input text-base font-bold" />
            ) : (
              <h1 className="text-base font-bold text-jira-text cursor-pointer hover:bg-jira-hover rounded px-2 py-1 -mx-2"
                onClick={() => setEditingTitle(true)}>
                {task.title}
              </h1>
            )}
            <div>
              <label className="text-xs font-semibold text-jira-textMuted uppercase tracking-wide block mb-1.5">Description</label>
              {editingDesc ? (
                <div>
                  <textarea value={desc} onChange={(e) => setDesc(e.target.value)} autoFocus rows={5}
                    className="jira-input w-full resize-none" />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => { onUpdate(task.id, "description", desc); setEditingDesc(false); }}
                      className="jira-btn-primary text-xs">Save</button>
                    <button onClick={() => { setEditingDesc(false); setDesc(task.description); }}
                      className="jira-btn-secondary text-xs">Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-jira-textSub whitespace-pre-wrap cursor-pointer hover:bg-jira-hover rounded px-2 py-1.5 -mx-2 min-h-[40px]"
                  onClick={() => setEditingDesc(true)}>
                  {task.description || <span className="text-jira-textMuted italic">Add a description...</span>}
                </p>
              )}
            </div>
            <div className="pt-3 border-t border-jira-border">
              <label className="text-xs font-semibold text-jira-textMuted uppercase tracking-wide block mb-1.5">Activity</label>
              <div className="text-xs text-jira-textMuted space-y-1">
                <div>Created {new Date(task.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                <div>Updated {new Date(task.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
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

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-jira-textMuted uppercase tracking-wide block mb-1">{label}</label>
      {children}
    </div>
  );
}
