import { Zap, BookOpen, CheckSquare, Bug, Square } from "lucide-react";

export const ISSUE_TYPES = [
  { id: "epic", label: "Epic", icon: Zap, color: "#6554E0", bgColor: "#EAE6FF" },
  { id: "story", label: "Story", icon: BookOpen, color: "#36B37E", bgColor: "#E3FCEF" },
  { id: "task", label: "Task", icon: CheckSquare, color: "#4C9AFF", bgColor: "#DEEBFF" },
  { id: "bug", label: "Bug", icon: Bug, color: "#DE350B", bgColor: "#FFEBE6" },
  { id: "subtask", label: "Sub-task", icon: Square, color: "#A5ADBA", bgColor: "#F4F5F7" },
] as const;

export const PRIORITIES = [
  { id: "highest", label: "Highest", color: "#DE350B" },
  { id: "high", label: "High", color: "#FF5630" },
  { id: "medium", label: "Medium", color: "#FFAB00" },
  { id: "low", label: "Low", color: "#36B37E" },
  { id: "lowest", label: "Lowest", color: "#57D9A3" },
] as const;

export const COLUMNS = [
  { id: "backlog", title: "Backlog", color: "#5E7186" },
  { id: "selected", title: "Selected for Sprint", color: "#2684FF" },
  { id: "in_progress", title: "In Progress", color: "#E97F0F" },
  { id: "review", title: "In Review", color: "#6554E0" },
  { id: "done", title: "Done", color: "#36B37E" },
] as const;

export function getIssueMeta(typeId: string) {
  return ISSUE_TYPES.find((t) => t.id === typeId) || ISSUE_TYPES[2];
}

export function getPriorityMeta(priorityId: string) {
  return PRIORITIES.find((p) => p.id === priorityId) || PRIORITIES[2];
}

export function IssueTypeIcon({ type, size = 16 }: { type: string; size?: number }) {
  const meta = getIssueMeta(type);
  const Icon = meta.icon;
  return <Icon size={size} style={{ color: meta.color }} />;
}

export function PriorityIcon({ priority, size = 14 }: { priority: string; size?: number }) {
  const meta = getPriorityMeta(priority);
  const bars = priority === "highest" || priority === "high" ? 3 : priority === "medium" ? 2 : 1;
  return (
    <div className="flex items-end gap-0.5" style={{ height: size }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: i < bars ? size - i * 3 : 3,
            background: i < bars ? meta.color : "#C1C7D0",
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}
