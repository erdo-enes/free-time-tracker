const BASE = "/api";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
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
  story_points: number | null;
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

export const api = {
  categories: {
    list: () => fetchApi<Category[]>("/categories"),
    create: (data: { name: string; color: string }) =>
      fetchApi<Category>("/categories", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi<void>(`/categories/${id}`, { method: "DELETE" }),
  },
  tasks: {
    list: (status?: string) => fetchApi<Task[]>(`/tasks${status ? `?status=${status}` : ""}`),
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
  },
  gaming: {
    sessions: (limit: number = 50) => fetchApi<GamingSession[]>(`/gaming/sessions?limit=${limit}`),
  },
  sprints: {
    list: () => fetchApi<Sprint[]>("/sprints"),
    create: (data: { name: string; goal?: string }) =>
      fetchApi<Sprint>("/sprints", { method: "POST", body: JSON.stringify(data) }),
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
