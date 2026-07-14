"use client";

import { useEffect, useState, useCallback } from "react";
import { api, type Summary, type GamingSummary, type DailyBreakdown, type WeeklyReport, type MonthlyReport, type Heatmap } from "@/lib/api";
import { formatMinutes, cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid,
} from "recharts";
import {
  Clock, TrendingUp, Gamepad2, Activity, BookOpen, Award,
  ChevronLeft, ChevronRight, Flame, Target, CalendarDays,
  BarChart3, LayoutDashboard, Zap,
} from "lucide-react";

const PIE_COLORS = ["#0052CC", "#36B37E", "#6554E0", "#FF5630", "#FFAB00", "#FF8B00", "#4C9AFF"];
const HEATMAP_COLORS = ["#EBECF0", "#C6E0FF", "#6BA4FF", "#2684FF", "#0052CC", "#0747A6"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Tab = "overview" | "weekly" | "monthly";

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [gaming, setGaming] = useState<GamingSummary | null>(null);
  const [daily, setDaily] = useState<DailyBreakdown | null>(null);
  const [heatmap, setHeatmap] = useState<Heatmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    Promise.all([api.analytics.summary(days), api.analytics.gaming(30), api.analytics.daily(30), api.analytics.heatmap(3)])
      .then(([s, g, d, h]) => { setSummary(s); setGaming(g); setDaily(d); setHeatmap(h); })
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="text-jira-textMuted p-6">Loading...</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-3 border-b border-jira-border bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-jira-purpleBg flex items-center justify-center">
              <TrendingUp size={20} className="text-jira-purple" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-jira-text">Reports & Analytics</h1>
              <div className="text-xs text-jira-textMuted">Track your time investment across activities</div>
            </div>
          </div>
          {/* Tab switcher */}
          <div className="flex bg-jira-surface border border-jira-border rounded-lg overflow-hidden">
            <TabBtn active={tab === "overview"} onClick={() => setTab("overview")} icon={<LayoutDashboard size={14} />} label="Overview" />
            <TabBtn active={tab === "weekly"} onClick={() => setTab("weekly")} icon={<BarChart3 size={14} />} label="Weekly" />
            <TabBtn active={tab === "monthly"} onClick={() => setTab("monthly")} icon={<CalendarDays size={14} />} label="Monthly" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-jira-app">
        {tab === "overview" && <OverviewTab summary={summary} gaming={gaming} daily={daily} heatmap={heatmap} days={days} setDays={setDays} />}
        {tab === "weekly" && <WeeklyTab />}
        {tab === "monthly" && <MonthlyTab />}
      </div>
    </div>
  );
}

/* ============ OVERVIEW TAB ============ */

function OverviewTab({ summary, gaming, daily, heatmap, days, setDays }: {
  summary: Summary | null; gaming: GamingSummary | null; daily: DailyBreakdown | null; heatmap: Heatmap | null;
  days: number; setDays: (d: number) => void;
}) {
  const categoryData = summary ? Object.entries(summary.by_category).map(([name, mins]) => ({ name, minutes: mins })) : [];
  const platformData = summary ? Object.entries(summary.by_platform).map(([name, mins]) => ({ name, minutes: mins })) : [];
  const gameData = gaming ? Object.entries(gaming.by_game).slice(0, 10).map(([name, mins]) => ({ name, minutes: mins })) : [];
  const dailyData = daily ? Object.entries(daily).map(([date, platforms]) => {
    const d: any = { date: date.slice(5) };
    Object.entries(platforms).forEach(([plat, mins]) => { d[plat] = mins; });
    d.total = Object.values(platforms).reduce((a, b) => a + b, 0);
    return d;
  }) : [];
  const avgPerDay = summary ? summary.total_minutes / days : 0;
  const topCategory = categoryData.length > 0 ? categoryData[0] : null;

  return (
    <div className="p-6 space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div className="flex bg-jira-surface border border-jira-border rounded-lg overflow-hidden">
          {[7, 14, 30].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={cn("px-4 py-1.5 text-xs font-medium transition-colors",
                days === d ? "bg-jira-blue text-white" : "text-jira-textSub hover:bg-jira-hover")}>
              {d} days
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label={`Total Time (${days}d)`} value={summary ? formatMinutes(summary.total_minutes) : "-"} sublabel="tracked time" icon={<Clock size={18} />} color="#0052CC" bg="#DEEBFF" />
        <StatCard label="Daily Average" value={formatMinutes(avgPerDay)} sublabel={`${days} day period`} icon={<TrendingUp size={18} />} color="#36B37E" bg="#E3FCEF" />
        <StatCard label="Time Entries" value={summary?.entry_count?.toString() ?? "0"} sublabel="total logged" icon={<Activity size={18} />} color="#6554E0" bg="#EAE6FF" />
        <StatCard label="Top Category" value={topCategory?.name ?? "N/A"} sublabel={topCategory ? formatMinutes(topCategory.minutes) : "no data"} icon={<Award size={18} />} color="#FFAB00" bg="#FFFAE6" />
      </div>

      {/* Activity heatmap */}
      {heatmap && <HeatmapCard heatmap={heatmap} />}

      {/* Daily trend */}
      <div className="jira-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-jira-text">Daily Time Tracking Trend</h3>
          <span className="text-xs text-jira-textMuted">Last 30 days</span>
        </div>
        {dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0052CC" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0052CC" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
              <XAxis dataKey="date" stroke="#6B778C" fontSize={11} />
              <YAxis stroke="#6B778C" fontSize={11} tickFormatter={(v) => formatMinutes(v)} />
              <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #DFE1E6", borderRadius: 8, color: "#172B4D", fontSize: 12 }} formatter={(v: number) => formatMinutes(v)} />
              <Area type="monotone" dataKey="total" stroke="#0052CC" strokeWidth={2} fill="url(#colorTotal)" name="Total Time" dot={{ r: 3, fill: "#0052CC" }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>

      {/* Category + Platform */}
      <div className="grid grid-cols-2 gap-4">
        <div className="jira-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-jira-text">Time by Category</h3>
            <BookOpen size={16} className="text-jira-textMuted" />
          </div>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryData} dataKey="minutes" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2} label={(e) => `${e.name}`}>
                  {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #DFE1E6", borderRadius: 8, color: "#172B4D", fontSize: 12 }} formatter={(v: number) => formatMinutes(v)} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#6B778C" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
        <div className="jira-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-jira-text">Time by Platform</h3>
            <Activity size={16} className="text-jira-textMuted" />
          </div>
          {platformData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={platformData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
                <XAxis dataKey="name" stroke="#6B778C" fontSize={11} />
                <YAxis stroke="#6B778C" fontSize={11} tickFormatter={(v) => formatMinutes(v)} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #DFE1E6", borderRadius: 8, color: "#172B4D", fontSize: 12 }} formatter={(v: number) => formatMinutes(v)} cursor={{ fill: "#F4F5F7" }} />
                <Bar dataKey="minutes" fill="#0052CC" radius={[6, 6, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Category breakdown table */}
      {categoryData.length > 0 && (
        <div className="jira-card overflow-hidden">
          <div className="px-5 py-4 border-b border-jira-border"><h3 className="text-sm font-bold text-jira-text">Category Breakdown</h3></div>
          <table className="w-full text-sm">
            <thead><tr className="bg-jira-surface border-b border-jira-border">
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-jira-textMuted uppercase tracking-wide">Category</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-jira-textMuted uppercase tracking-wide">Time</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-jira-textMuted uppercase tracking-wide">Share</th>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-jira-textMuted uppercase tracking-wide w-1/3">Distribution</th>
            </tr></thead>
            <tbody>
              {categoryData.map((cat, i) => {
                const pct = summary && summary.total_minutes > 0 ? (cat.minutes / summary.total_minutes) * 100 : 0;
                return (
                  <tr key={cat.name} className="border-b border-jira-border/50 last:border-b-0 hover:bg-jira-surface/50 transition-colors">
                    <td className="px-5 py-3"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} /><span className="text-jira-text font-medium">{cat.name}</span></div></td>
                    <td className="px-5 py-3 text-right text-jira-text font-mono font-bold">{formatMinutes(cat.minutes)}</td>
                    <td className="px-5 py-3 text-right text-jira-textMuted font-mono">{pct.toFixed(1)}%</td>
                    <td className="px-5 py-3"><div className="h-2 bg-jira-surface rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============ HEATMAP ============ */

function HeatmapCard({ heatmap }: { heatmap: Heatmap }) {
  // Group days into weeks (columns)
  const weeks: Heatmap["days"][] = [];
  let currentWeek: Heatmap["days"] = [];
  const firstDay = new Date(heatmap.days[0].date);
  const firstDayDow = (firstDay.getDay() + 6) % 7; // Monday=0

  // Pad start
  for (let i = 0; i < firstDayDow; i++) currentWeek.push({ date: "", minutes: 0, level: 0 });
  heatmap.days.forEach((d, i) => {
    currentWeek.push(d);
    if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
  });
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return (
    <div className="jira-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-jira-text flex items-center gap-2"><Zap size={16} className="text-jira-yellow" /> Activity Heatmap</h3>
        <div className="flex items-center gap-3 text-xs text-jira-textMuted">
          <span>{heatmap.active_days} active days</span>
          <span>|</span>
          <span>{formatMinutes(heatmap.total_minutes)} total</span>
          <div className="flex items-center gap-1 ml-2">
            <span>Less</span>
            {HEATMAP_COLORS.map((c, i) => <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />)}
            <span>More</span>
          </div>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {/* Weekday labels */}
        <div className="flex flex-col gap-1 pr-2">
          {WEEKDAYS.map((d, i) => <div key={i} className="h-3.5 text-[9px] text-jira-textMuted flex items-center">{i % 2 === 0 ? d : ""}</div>)}
        </div>
        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <div key={di}
                className={cn("w-3.5 h-3.5 rounded-sm transition-all hover:ring-2 hover:ring-jira-blue/30 cursor-pointer", !day.date && "opacity-0")}
                style={{ background: day.date ? HEATMAP_COLORS[day.level] : "transparent" }}
                title={day.date ? `${day.date}: ${formatMinutes(day.minutes)}` : ""} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ WEEKLY TAB ============ */

function WeeklyTab() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.analytics.weeklyReport(offset).then(setReport).finally(() => setLoading(false));
  }, [offset]);

  if (loading || !report) return <div className="text-jira-textMuted p-6">Loading weekly report...</div>;

  const changePositive = report.change_pct >= 0;
  const maxDayMinutes = Math.max(...report.days.map((d) => d.total_minutes), 1);

  return (
    <div className="p-6 space-y-6">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setOffset(offset + 1)} className="p-2 rounded-lg hover:bg-jira-hover text-jira-textMuted hover:text-jira-text transition-colors border border-jira-border bg-white"><ChevronLeft size={18} /></button>
          <div className="text-sm font-bold text-jira-text">
            {new Date(report.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(report.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
          <button onClick={() => setOffset(Math.max(0, offset - 1))} disabled={offset === 0} className="p-2 rounded-lg hover:bg-jira-hover text-jira-textMuted hover:text-jira-text transition-colors border border-jira-border bg-white disabled:opacity-40"><ChevronRight size={18} /></button>
          {offset !== 0 && <button onClick={() => setOffset(0)} className="jira-btn-secondary text-xs py-1.5">This Week</button>}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Total Time" value={formatMinutes(report.total_minutes)} sublabel={report.total_hours < 1 ? `${Math.round(report.total_minutes)} min` : `${report.total_hours}h`} icon={<Clock size={18} />} color="#0052CC" bg="#DEEBFF" />
        <StatCard label="Active Days" value={`${report.active_days}/7`} sublabel="days with activity" icon={<CalendarDays size={18} />} color="#36B37E" bg="#E3FCEF" />
        <StatCard label="Longest Streak" value={`${report.longest_streak} days`} sublabel="consecutive active" icon={<Flame size={18} />} color="#FF5630" bg="#FFEBE6" />
        <StatCard label="Entries" value={report.entry_count.toString()} sublabel="time entries logged" icon={<Activity size={18} />} color="#6554E0" bg="#EAE6FF" />
        <StatCard label="vs Last Week" value={`${changePositive ? "+" : ""}${report.change_pct}%`} sublabel={formatMinutes(report.prev_week_minutes) + " prev"} icon={<TrendingUp size={18} />} color={changePositive ? "#36B37E" : "#FF5630"} bg={changePositive ? "#E3FCEF" : "#FFEBE6"} />
      </div>

      {/* Daily bar chart */}
      <div className="jira-card p-5">
        <h3 className="text-sm font-bold text-jira-text mb-4">Daily Breakdown</h3>
        <div className="flex gap-3 items-end h-48">
          {report.days.map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
              <div className="text-[10px] text-jira-textMuted font-mono">{day.total_minutes > 0 ? formatMinutes(day.total_minutes) : ""}</div>
              <div className="w-full bg-jira-surface rounded-t-md overflow-hidden flex items-end" style={{ height: "120px" }}>
                <div className={cn("w-full rounded-t-md transition-all", day.is_today && "ring-2 ring-jira-blue ring-offset-1")}
                  style={{ height: `${(day.total_minutes / maxDayMinutes) * 100}%`, background: day.is_weekend ? "#6554E0" : "#0052CC", minHeight: day.total_minutes > 0 ? "4px" : "0" }} />
              </div>
              <div className={cn("text-[10px] font-medium", day.is_today ? "text-jira-blue" : "text-jira-textMuted")}>{day.day_name.slice(0, 3)}</div>
              <div className="text-[9px] text-jira-textMuted">{day.short_date}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-jira-textMuted">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-jira-blue" /> Weekday</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-jira-purple" /> Weekend</div>
        </div>
      </div>

      {/* Per-day detail table */}
      <div className="jira-card overflow-hidden">
        <div className="px-5 py-4 border-b border-jira-border"><h3 className="text-sm font-bold text-jira-text">Daily Details</h3></div>
        <div className="divide-y divide-jira-border">
          {report.days.map((day) => (
            <div key={day.date} className={cn("px-5 py-3", day.is_today && "bg-jira-blueBg/30")}>
              <div className="flex items-center gap-3 mb-2">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold", day.total_minutes > 0 ? "bg-jira-blueBg text-jira-blue" : "bg-jira-surface text-jira-textMuted")}>
                  {new Date(day.date).getDate()}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-jira-text">{day.day_name}</div>
                  <div className="text-xs text-jira-textMuted">{day.entry_count} entries {day.is_weekend && "- Weekend"}</div>
                </div>
                <div className="text-sm font-bold text-jira-text font-mono">{formatMinutes(day.total_minutes)}</div>
              </div>
              {day.entries.length > 0 && (
                <div className="ml-13 space-y-1 pl-13">
                  {day.entries.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 text-xs py-1 pl-1">
                      <div className="w-1 h-3 rounded-full" style={{ background: e.category_color || "#C1C7D0" }} />
                      <span className="text-jira-textSub flex-1 truncate">{e.title}</span>
                      <span className="text-jira-textMuted font-mono">{new Date(e.started_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                      <span className="text-jira-text font-mono font-bold w-12 text-right">{formatMinutes(e.duration_minutes)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ MONTHLY TAB ============ */

function MonthlyTab() {
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.analytics.monthlyReport(offset).then(setReport).finally(() => setLoading(false));
  }, [offset]);

  if (loading || !report) return <div className="text-jira-textMuted p-6">Loading monthly report...</div>;

  const changePositive = report.change_pct >= 0;
  const maxWeekMinutes = Math.max(...report.weeks.map((w) => w.total_minutes), 1);
  const maxDayMins = Math.max(...report.weeks.flatMap((w) => w.days.map((d) => d.minutes)), 1);
  const categoryData = Object.entries(report.by_category).map(([name, mins]) => ({ name, minutes: mins }));

  return (
    <div className="p-6 space-y-6">
      {/* Month navigation */}
      <div className="flex items-center gap-3">
        <button onClick={() => setOffset(offset + 1)} className="p-2 rounded-lg hover:bg-jira-hover text-jira-textMuted hover:text-jira-text transition-colors border border-jira-border bg-white"><ChevronLeft size={18} /></button>
        <div className="text-sm font-bold text-jira-text">{report.month_name}</div>
        <button onClick={() => setOffset(Math.max(0, offset - 1))} disabled={offset === 0} className="p-2 rounded-lg hover:bg-jira-hover text-jira-textMuted hover:text-jira-text transition-colors border border-jira-border bg-white disabled:opacity-40"><ChevronRight size={18} /></button>
        {offset !== 0 && <button onClick={() => setOffset(0)} className="jira-btn-secondary text-xs py-1.5">This Month</button>}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Total Time" value={formatMinutes(report.total_minutes)} sublabel={`${report.total_hours}h total`} icon={<Clock size={18} />} color="#0052CC" bg="#DEEBFF" />
        <StatCard label="Active Days" value={`${report.active_days}/${report.days_in_month}`} sublabel="days with activity" icon={<Target size={18} />} color="#36B37E" bg="#E3FCEF" />
        <StatCard label="Daily Average" value={formatMinutes(report.daily_avg_minutes)} sublabel="per day" icon={<TrendingUp size={18} />} color="#6554E0" bg="#EAE6FF" />
        <StatCard label="Best Day" value={report.best_day ? formatMinutes(report.best_day.minutes) : "-"} sublabel={report.best_day ? new Date(report.best_day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "no data"} icon={<Award size={18} />} color="#FFAB00" bg="#FFFAE6" />
        <StatCard label="vs Last Month" value={`${changePositive ? "+" : ""}${report.change_pct}%`} sublabel={formatMinutes(report.prev_month_minutes) + " prev"} icon={<TrendingUp size={18} />} color={changePositive ? "#36B37E" : "#FF5630"} bg={changePositive ? "#E3FCEF" : "#FFEBE6"} />
      </div>

      {/* Calendar grid view */}
      <div className="jira-card p-5">
        <h3 className="text-sm font-bold text-jira-text mb-4">Monthly Calendar</h3>
        <div className="grid grid-cols-7 gap-1.5">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="text-center text-[10px] font-bold text-jira-textMuted uppercase py-1">{d}</div>)}
          {/* Empty cells for days before the 1st */}
          {report.weeks[0]?.days.map((d, i) => {
            const firstDow = (new Date(d.date).getDay() + 6) % 7;
            const beforeFirst = i === 0 ? Array.from({ length: firstDow }, () => null) : [];
            return (
              <>
                {beforeFirst.map((_, bi) => <div key={`empty-${bi}`} className="aspect-square" />)}
                <MonthlyDayCell key={d.date} day={d} maxMins={maxDayMins} />
              </>
            );
          })}
          {/* Remaining weeks */}
          {report.weeks.slice(1).flatMap((w) => w.days.map((d) => <MonthlyDayCell key={d.date} day={d} maxMins={maxDayMins} />))}
        </div>
        <div className="flex items-center justify-end gap-2 mt-3 text-xs text-jira-textMuted">
          <span>Less</span>
          {HEATMAP_COLORS.map((c, i) => <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />)}
          <span>More</span>
        </div>
      </div>

      {/* Weekly bars */}
      <div className="jira-card p-5">
        <h3 className="text-sm font-bold text-jira-text mb-4">Weekly Breakdown</h3>
        <div className="space-y-3">
          {report.weeks.map((week) => (
            <div key={week.week_num} className="flex items-center gap-3">
              <span className="text-xs text-jira-textMuted font-medium w-16">Week {week.week_num}</span>
              <div className="flex-1 h-7 bg-jira-surface rounded-md overflow-hidden">
                <div className="h-full rounded-md flex items-center px-2 transition-all" style={{ width: `${(week.total_minutes / maxWeekMinutes) * 100}%`, background: "linear-gradient(90deg, #0052CC, #4C9AFF)" }}>
                  <span className="text-[10px] text-white font-mono font-bold">{week.total_minutes > 0 ? formatMinutes(week.total_minutes) : ""}</span>
                </div>
              </div>
              <span className="text-xs text-jira-textMuted w-20 text-right">{week.active_days} active days</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category pie */}
      {categoryData.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="jira-card p-5">
            <h3 className="text-sm font-bold text-jira-text mb-4">Category Distribution</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryData} dataKey="minutes" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2} label={(e) => `${e.name}`}>
                  {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #DFE1E6", borderRadius: 8, color: "#172B4D", fontSize: 12 }} formatter={(v: number) => formatMinutes(v)} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#6B778C" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="jira-card p-5">
            <h3 className="text-sm font-bold text-jira-text mb-4">Category Breakdown</h3>
            <div className="space-y-2">
              {categoryData.map((cat, i) => {
                const pct = report.total_minutes > 0 ? (cat.minutes / report.total_minutes) * 100 : 0;
                return (
                  <div key={cat.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-jira-textSub font-medium w-28 truncate">{cat.name}</span>
                    <div className="flex-1 h-2 bg-jira-surface rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} /></div>
                    <span className="text-xs text-jira-text font-mono font-bold w-14 text-right">{formatMinutes(cat.minutes)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthlyDayCell({ day, maxMins }: { day: { date: string; day: number; minutes: number; is_today: boolean; is_weekend: boolean }, maxMins: number }) {
  const level = day.minutes === 0 ? 0 : day.minutes < 30 ? 1 : day.minutes < 60 ? 2 : day.minutes < 120 ? 3 : 4;
  const isFuture = new Date(day.date) > new Date();
  return (
    <div className={cn("aspect-square rounded-md flex flex-col items-center justify-center text-xs transition-all relative",
      day.is_today && "ring-2 ring-jira-blue ring-offset-1",
      isFuture && "opacity-40")}
      style={{ background: HEATMAP_COLORS[level] }}
      title={`${day.date}: ${formatMinutes(day.minutes)}`}>
      <span className={cn("font-mono font-bold", level >= 3 ? "text-white" : "text-jira-textSub")}>{day.day}</span>
      {day.minutes > 0 && <span className={cn("text-[8px] font-mono", level >= 3 ? "text-white/80" : "text-jira-textMuted")}>{Math.round(day.minutes)}m</span>}
    </div>
  );
}

/* ============ SHARED COMPONENTS ============ */

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={cn("flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-jira-blue text-white" : "text-jira-textSub hover:bg-jira-hover")}>
      {icon} {label}
    </button>
  );
}

function StatCard({ label, value, sublabel, icon, color, bg }: { label: string; value: string; sublabel: string; icon: React.ReactNode; color: string; bg: string }) {
  return (
    <div className="jira-card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: bg }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <div className="text-xl font-bold text-jira-text">{value}</div>
      <div className="text-xs text-jira-textMuted mt-0.5">{label}</div>
      <div className="text-[10px] text-jira-textLight mt-0.5">{sublabel}</div>
    </div>
  );
}

function EmptyChart() {
  return <div className="h-[260px] flex items-center justify-center text-jira-textMuted text-sm">No data yet</div>;
}
