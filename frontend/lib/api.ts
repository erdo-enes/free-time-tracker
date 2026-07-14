const BASE = "/api";

export const TOKEN_KEY = "ftj_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    setToken(null);
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new Error("401: Unauthorized");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Category {
  id: number;
  name: string;
  color: string;
  is_default: boolean;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: "backlog" | "selected" | "in_progress" | "review" | "done";
  priority: "lowest" | "low" | "medium" | "high" | "highest";
  issue_type: "epic" | "story" | "task" | "bug" | "subtask";
  category_id: number | null;
  parent_task_id: number | null;
  project_id: number | null;
  issue_number: number | null;
  sprint_id: number | null;
  key: string;
  story_points: number | null;
  start_date: string | null;
  due_date: string | null;
  labels: string[] | null;
  original_estimate_minutes: number | null;
  remaining_estimate_minutes: number | null;
  assignee: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  task_id: number;
  author: string;
  body: string;
  created_at: string;
}

export interface Sprint {
  id: number;
  name: string;
  goal: string;
  is_active: boolean;
  project_id: number | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface TimeEntry {
  id: number;
  task_id: number | null;
  category_id: number | null;
  title: string;
  entry_type: "manual" | "gaming";
  platform: "steam" | "psn" | "xbox" | "switch" | "switch2" | "pc" | "manual";
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

export interface GamingSession {
  id: number;
  platform: string;
  game_name: string;
  game_id: string | null;
  account_username: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  is_active: boolean;
}

export interface Summary {
  days: number;
  total_minutes: number;
  total_hours: number;
  by_category: Record<string, number>;
  by_platform: Record<string, number>;
  entry_count: number;
}

export interface DailyBreakdown {
  [date: string]: Record<string, number>;
}

export interface GamingSummary {
  days: number;
  total_minutes: number;
  total_hours: number;
  session_count: number;
  by_game: Record<string, number>;
  by_platform: Record<string, number>;
  by_device: Record<string, number>;
  by_account: Record<string, number>;
}

export interface WeeklyReportDay {
  date: string;
  day_name: string;
  short_date: string;
  is_today: boolean;
  is_weekend: boolean;
  total_minutes: number;
  entry_count: number;
  by_category: Record<string, number>;
  entries: {
    id: number;
    title: string;
    duration_minutes: number;
    category: string | null;
    category_color: string | null;
    started_at: string;
  }[];
}

export interface WeeklyReport {
  period: string;
  offset: number;
  start_date: string;
  end_date: string;
  total_minutes: number;
  total_hours: number;
  active_days: number;
  longest_streak: number;
  entry_count: number;
  change_pct: number;
  prev_week_minutes: number;
  by_category: Record<string, number>;
  days: WeeklyReportDay[];
}

export interface MonthlyReportWeek {
  week_num: number;
  start_date: string;
  end_date: string;
  total_minutes: number;
  active_days: number;
  days: {
    date: string;
    day: number;
    minutes: number;
    is_today: boolean;
    is_weekend: boolean;
  }[];
}

export interface MonthlyReport {
  period: string;
  offset: number;
  month_name: string;
  days_in_month: number;
  total_minutes: number;
  total_hours: number;
  active_days: number;
  daily_avg_minutes: number;
  best_day: { date: string; minutes: number } | null;
  entry_count: number;
  change_pct: number;
  prev_month_minutes: number;
  by_category: Record<string, number>;
  weeks: MonthlyReportWeek[];
}

export interface HeatmapDay {
  date: string;
  minutes: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface Heatmap {
  months: number;
  start_date: string;
  end_date: string;
  days: HeatmapDay[];
  max_minutes: number;
  total_minutes: number;
  active_days: number;
  total_days: number;
}

export interface VelocitySprint {
  sprint_id: number;
  name: string;
  is_active: boolean;
  started_at: string | null;
  ended_at: string | null;
  total_points: number;
  completed_points: number;
  issue_count: number;
  done_count: number;
}

export interface Velocity {
  sprints: VelocitySprint[];
}

export interface BurndownPoint {
  date: string;
  day: number;
  ideal: number;
  remaining: number;
}

export interface Burndown {
  sprint_id: number;
  sprint_name: string;
  is_active: boolean;
  total_points: number;
  start_date: string;
  end_date: string;
  series: BurndownPoint[];
}

export interface CumulativeFlow {
  project_id: number;
  start_date: string;
  end_date: string;
  statuses: string[];
  series: { date: string; backlog: number; selected: number; in_progress: number; review: number; done: number }[];
}

export interface WatchedAccount {
  id: number;
  platform: "psn" | "xbox" | "switch2" | "steam";
  username: string;
  display_name: string | null;
  platform_account_id: string | null;
  is_active: boolean;
  last_checked: string | null;
  last_status: string;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string | null;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: User;
}

export interface IssueLink {
  id: number;
  source_task_id: number;
  target_task_id: number;
  target_key: string | null;
  target_title: string | null;
  target_status: string | null;
  link_type: "blocks" | "relates" | "duplicates";
  created_at: string;
}

export interface IssueHistoryEntry {
  id: number;
  task_id: number;
  field: string;
  old_value: string | null;
  new_value: string | null;
  actor: string | null;
  created_at: string;
}

export interface Project {
  id: number;
  key: string;
  name: string;
  description: string;
  style_color: string;
  lead: string | null;
  created_at: string;
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      fetchApi<AuthToken>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
    register: (data: { username: string; password: string; email?: string; display_name?: string }) =>
      fetchApi<AuthToken>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    me: () => fetchApi<User>("/auth/me"),
  },
  projects: {
    list: () => fetchApi<Project[]>("/projects"),
    create: (data: { key: string; name: string; description?: string; style_color?: string; lead?: string }) =>
      fetchApi<Project>("/projects", { method: "POST", body: JSON.stringify({ ...data, key: data.key.toUpperCase() }) }),
    update: (id: number, data: Partial<Project>) =>
      fetchApi<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi<void>(`/projects/${id}`, { method: "DELETE" }),
    stats: (id: number) => fetchApi<{ total: number; done: number; open: number; story_points: number; done_points: number }>(`/projects/${id}/stats`),
  },
  categories: {
    list: () => fetchApi<Category[]>("/categories"),
    create: (data: { name: string; color: string }) =>
      fetchApi<Category>("/categories", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi<void>(`/categories/${id}`, { method: "DELETE" }),
  },
  tasks: {
    list: (opts?: { status?: string; project_id?: number; sprint_id?: number }) => {
      const qs = new URLSearchParams();
      if (opts?.status) qs.set("status", opts.status);
      if (opts?.project_id) qs.set("project_id", String(opts.project_id));
      if (opts?.sprint_id !== undefined) qs.set("sprint_id", String(opts.sprint_id));
      const q = qs.toString();
      return fetchApi<Task[]>(`/tasks${q ? `?${q}` : ""}`);
    },
    create: (data: Partial<Task>) =>
      fetchApi<Task>("/tasks", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Task>) =>
      fetchApi<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi<void>(`/tasks/${id}`, { method: "DELETE" }),
    move: (id: number, newStatus: string, newOrder: number = 0) =>
      fetchApi<Task>(`/tasks/${id}/move?new_status=${newStatus}&new_order=${newOrder}`, { method: "POST" }),
    comments: {
      list: (taskId: number) => fetchApi<Comment[]>(`/tasks/${taskId}/comments`),
      add: (taskId: number, body: string) =>
        fetchApi<Comment>(`/tasks/${taskId}/comments`, { method: "POST", body: JSON.stringify({ body }) }),
      delete: (commentId: number) => fetchApi<void>(`/tasks/comments/${commentId}`, { method: "DELETE" }),
    },
    links: {
      list: (taskId: number) => fetchApi<IssueLink[]>(`/tasks/${taskId}/links`),
      create: (taskId: number, data: { target_task_id: number; link_type: string }) =>
        fetchApi<IssueLink>(`/tasks/${taskId}/links`, { method: "POST", body: JSON.stringify(data) }),
      delete: (linkId: number) => fetchApi<void>(`/tasks/links/${linkId}`, { method: "DELETE" }),
    },
    history: (taskId: number) => fetchApi<IssueHistoryEntry[]>(`/tasks/${taskId}/history`),
  },
  timeEntries: {
    list: (params?: { category_id?: number; platform?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.category_id) qs.set("category_id", String(params.category_id));
      if (params?.platform) qs.set("platform", params.platform);
      if (params?.limit) qs.set("limit", String(params.limit));
      return fetchApi<TimeEntry[]>(`/time-entries?${qs}`);
    },
    create: (data: Partial<TimeEntry>) =>
      fetchApi<TimeEntry>("/time-entries", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<TimeEntry>) =>
      fetchApi<TimeEntry>(`/time-entries/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi<void>(`/time-entries/${id}`, { method: "DELETE" }),
  },
  analytics: {
    summary: (days: number = 7) => fetchApi<Summary>(`/analytics/summary?days=${days}`),
    daily: (days: number = 30) => fetchApi<DailyBreakdown>(`/analytics/daily?days=${days}`),
    gaming: (days: number = 30) => fetchApi<GamingSummary>(`/analytics/gaming?days=${days}`),
    weeklyReport: (offset: number = 0) => fetchApi<WeeklyReport>(`/analytics/weekly-report?offset=${offset}`),
    monthlyReport: (offset: number = 0) => fetchApi<MonthlyReport>(`/analytics/monthly-report?offset=${offset}`),
    heatmap: (months: number = 3) => fetchApi<Heatmap>(`/analytics/heatmap?months=${months}`),
    velocity: (projectId: number) => fetchApi<Velocity>(`/analytics/velocity?project_id=${projectId}`),
    burndown: (sprintId: number) => fetchApi<Burndown>(`/analytics/burndown?sprint_id=${sprintId}`),
    cumulativeFlow: (projectId: number, days: number = 30) => fetchApi<CumulativeFlow>(`/analytics/cumulative-flow?project_id=${projectId}&days=${days}`),
  },
  gaming: {
    sessions: (limit: number = 50) => fetchApi<GamingSession[]>(`/gaming/sessions?limit=${limit}`),
  },
  sprints: {
    list: (projectId?: number) => {
      const qs = new URLSearchParams();
      if (projectId) qs.set("project_id", String(projectId));
      return fetchApi<Sprint[]>(`/sprints${qs.toString() ? `?${qs}` : ""}`);
    },
    create: (data: { name: string; goal?: string; project_id?: number }) =>
      fetchApi<Sprint>("/sprints", { method: "POST", body: JSON.stringify(data) }),
    start: (id: number) => fetchApi<Sprint>(`/sprints/${id}/start`, { method: "POST" }),
    end: (id: number) => fetchApi<Sprint>(`/sprints/${id}/end`, { method: "POST" }),
    delete: (id: number) => fetchApi<void>(`/sprints/${id}`, { method: "DELETE" }),
  },
  watchedAccounts: {
    list: () => fetchApi<WatchedAccount[]>("/watched-accounts"),
    create: (data: { platform: string; username: string; display_name?: string }) =>
      fetchApi<WatchedAccount>("/watched-accounts", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, is_active: boolean) =>
      fetchApi<WatchedAccount>(`/watched-accounts/${id}?is_active=${is_active}`, { method: "PATCH" }),
    delete: (id: number) => fetchApi<void>(`/watched-accounts/${id}`, { method: "DELETE" }),
  },
};
