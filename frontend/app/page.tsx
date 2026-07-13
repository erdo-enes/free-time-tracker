"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { api, type Task, type Category } from "@/lib/api";
import {
  Plus, Trash2, X, ChevronDown, Filter, User, Calendar,
  MoreHorizontal,
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

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setShowCreate(true);
    }
  }, [searchParams]);
  const [newTask, setNewTask] = useState({
    title: "", description: "", status: "backlog", priority: "medium",
    issue_type: "task", category_id: "", story_points: "",
  });

  const load = useCallback(() => {
    api.tasks.list().then(setTasks);
    api.categories.list().then(setCategories);
  }, []);

  useEffect(() => { load(); }, [load]);

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

  const handleDelete = async (id: number) => {
    await api.tasks.delete(id);
    setSelectedTask(null);
    load();
  };

  const handleUpdateField = async (id: number, field: string, value: any) => {
    await api.tasks.update(id, { [field]: value });
    load();
  };

  const filteredTasks = filterType ? tasks.filter((t) => t.issue_type === filterType) : tasks;
  const tasksByStatus = (status: string) =>
    filteredTasks.filter((t) => t.status === status).sort((a, b) => a.order - b.order);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="h-full flex flex-col">
      {/* Board header */}
      <div className="px-6 py-4 border-b border-jira-border bg-jira-panel">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-jira-textMuted text-xs">
              <span>Projects</span>
              <span>/</span>
              <span className="text-jira-textSub">My Free Time</span>
              <span>/</span>
              <span className="text-jira-text font-medium">Board</span>
            </div>
            <h1 className="text-xl font-bold text-jira-text mt-1">My Free Time Board</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-jira-textMuted">Sprint Progress:</span>
              <span className="text-jira-text font-medium">{doneTasks}/{totalTasks} done</span>
              <div className="w-24 h-1.5 bg-jira-surface rounded-full overflow-hidden">
                <div className="h-full bg-jira-green rounded-full" style={{ width: `${totalTasks ? (doneTasks / totalTasks) * 100 : 0}%` }} />
              </div>
            </div>
            <button className="jira-btn-secondary flex items-center gap-1.5">
              <Filter size={14} /> Filter
            </button>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="jira-select text-xs"
            >
              <option value="">All Types</option>
              {ISSUE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Create issue bar */}
      {showCreate && (
        <div className="px-6 py-3 bg-jira-surface border-b border-jira-border">
          <div className="flex gap-3 items-start">
            <div className="flex-1 grid grid-cols-6 gap-2">
              <input autoFocus placeholder="Issue title..." value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="jira-input col-span-3" />
              <select value={newTask.issue_type} onChange={(e) => setNewTask({ ...newTask, issue_type: e.target.value })} className="jira-select">
                {ISSUE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} className="jira-select">
                {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <select value={newTask.status} onChange={(e) => setNewTask({ ...newTask, status: e.target.value })} className="jira-select">
                {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <button onClick={handleAdd} className="jira-btn-primary">Create</button>
            <button onClick={() => setShowCreate(false)} className="text-jira-textMuted hover:text-jira-text"><X size={18} /></button>
          </div>
          <div className="flex gap-3 mt-2">
            <input placeholder="Description (optional)..." value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="jira-input flex-1" />
            <input type="number" placeholder="SP" value={newTask.story_points}
              onChange={(e) => setNewTask({ ...newTask, story_points: e.target.value })}
              className="jira-input w-16" />
            <select value={newTask.category_id} onChange={(e) => setNewTask({ ...newTask, category_id: e.target.value })} className="jira-select">
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="flex-1 overflow-x-auto p-4">
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="mb-3 flex items-center gap-2 text-sm text-jira-blue hover:text-jira-blueDark font-medium"
          >
            <Plus size={16} /> Create Issue
          </button>
        )}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 min-w-max">
            {COLUMNS.map((col) => {
              const colTasks = tasksByStatus(col.id);
              return (
                <Droppable droppableId={col.id} key={col.id}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className="w-[280px] flex flex-col">
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                        <h3 className="text-sm font-semibold text-jira-text">{col.title}</h3>
                        <span className="text-xs text-jira-textMuted bg-jira-surface px-1.5 py-0.5 rounded">
                          {colTasks.length}
                        </span>
                      </div>
                      <div className="flex-1 space-y-2 pb-4">
                        {colTasks.map((task, idx) => (
                          <Draggable draggableId={String(task.id)} index={idx} key={task.id}>
                            {(prov, snapshot) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                onClick={() => setSelectedTask(task)}
                                className={cn(
                                  "bg-jira-panel border border-jira-border rounded-md p-2.5 cursor-pointer transition-all hover:border-jira-borderLight",
                                  snapshot.isDragging && "border-jira-blue shadow-cardHover"
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <div className="mt-0.5 flex-shrink-0">
                                    <IssueTypeIcon type={task.issue_type} size={14} />
                                  </div>
                                  <span className="text-sm text-jira-text font-medium leading-snug flex-1">
                                    {task.title}
                                  </span>
                                </div>
                                {task.description && (
                                  <p className="text-xs text-jira-textMuted mt-1.5 line-clamp-2 pl-5">
                                    {task.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2 pl-5">
                                  <PriorityIcon priority={task.priority} size={12} />
                                  {task.story_points != null && (
                                    <span className="text-xs text-jira-textMuted bg-jira-surface px-1.5 py-0.5 rounded">
                                      {task.story_points} SP
                                    </span>
                                  )}
                                  {(() => {
                                    const cat = categories.find((c) => c.id === task.category_id);
                                    return cat && (
                                      <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                                        style={{ background: cat.color + "1A", color: cat.color }}>
                                        {cat.name}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <div className="flex items-center justify-between mt-2 pl-5">
                                  <span className="text-[10px] text-jira-textMuted font-mono">FTJ-{task.id}</span>
                                  <div className="w-6 h-6 rounded-full bg-jira-purple flex items-center justify-center text-white text-[10px] font-bold">
                                    E
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {selectedTask && (
        <TaskDetailModal task={selectedTask} categories={categories}
          onClose={() => setSelectedTask(null)}
          onDelete={handleDelete}
          onUpdate={handleUpdateField} />
      )}
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
  const priorityMeta = getPriorityMeta(task.priority);
  const cat = categories.find((c) => c.id === task.category_id);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 pt-12 px-4" onClick={onClose}>
      <div className="bg-jira-panel border border-jira-border rounded-lg max-w-3xl w-full max-h-[75vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-jira-border">
          <IssueTypeIcon type={task.issue_type} size={20} />
          <span className="text-xs text-jira-textMuted font-mono">FTJ-{task.id}</span>
          <span className="text-xs text-jira-textMuted">{issueMeta.label}</span>
          <div className="ml-auto flex items-center gap-2">
            <button className="text-jira-textMuted hover:text-jira-text p-1"><MoreHorizontal size={16} /></button>
            <button onClick={onClose} className="text-jira-textMuted hover:text-jira-text p-1"><X size={18} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-auto">
          {/* Main content */}
          <div className="flex-1 p-5 space-y-4">
            {editingTitle ? (
              <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
                onBlur={() => { onUpdate(task.id, "title", title); setEditingTitle(false); }}
                onKeyDown={(e) => e.key === "Enter" && (onUpdate(task.id, "title", title), setEditingTitle(false))}
                className="jira-input text-lg font-bold" />
            ) : (
              <h1 className="text-lg font-bold text-jira-text cursor-pointer hover:bg-jira-hover rounded px-1 -mx-1"
                onClick={() => setEditingTitle(true)}>
                {task.title}
              </h1>
            )}

            <div>
              <label className="text-xs font-semibold text-jira-textMuted uppercase tracking-wide">Description</label>
              {editingDesc ? (
                <div className="mt-1">
                  <textarea value={desc} onChange={(e) => setDesc(e.target.value)} autoFocus rows={5}
                    className="jira-input w-full" />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => { onUpdate(task.id, "description", desc); setEditingDesc(false); }}
                      className="jira-btn-primary text-xs">Save</button>
                    <button onClick={() => { setEditingDesc(false); setDesc(task.description); }}
                      className="text-jira-textMuted text-xs px-2 py-1">Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-sm text-jira-textSub whitespace-pre-wrap cursor-pointer hover:bg-jira-hover rounded px-2 py-1.5 -mx-2 min-h-[40px]"
                  onClick={() => setEditingDesc(true)}>
                  {task.description || <span className="text-jira-textMuted">Add a description...</span>}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-jira-textMuted uppercase tracking-wide">Activity</label>
              <div className="mt-2 text-xs text-jira-textMuted">
                Created {new Date(task.created_at).toLocaleDateString()} - 
                Updated {new Date(task.updated_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Sidebar metadata */}
          <div className="w-64 border-l border-jira-border p-4 space-y-3 bg-jira-app/50">
            <ModalField label="Status">
              <select defaultValue={task.status}
                onChange={(e) => onUpdate(task.id, "status", e.target.value)}
                className="jira-select w-full text-xs">
                {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </ModalField>

            <ModalField label="Issue Type">
              <select defaultValue={task.issue_type}
                onChange={(e) => onUpdate(task.id, "issue_type", e.target.value)}
                className="jira-select w-full text-xs">
                {ISSUE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </ModalField>

            <ModalField label="Priority">
              <div className="flex items-center gap-2">
                <PriorityIcon priority={task.priority} size={14} />
                <select defaultValue={task.priority}
                  onChange={(e) => onUpdate(task.id, "priority", e.target.value)}
                  className="jira-select flex-1 text-xs">
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
              <select defaultValue={task.category_id ?? ""}
                onChange={(e) => onUpdate(task.id, "category_id", e.target.value ? parseInt(e.target.value) : null)}
                className="jira-select w-full text-xs">
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </ModalField>

            {cat && (
              <ModalField label="Color">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: cat.color }} />
                  <span className="text-xs text-jira-textSub">{cat.name}</span>
                </div>
              </ModalField>
            )}

            <div className="pt-3 border-t border-jira-border">
              <button onClick={() => onDelete(task.id)}
                className="text-xs text-jira-red hover:text-jira-red/80 flex items-center gap-1.5">
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
