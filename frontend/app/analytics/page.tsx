"use client";

import { useEffect, useState } from "react";
import { api, type Summary, type GamingSummary, type DailyBreakdown } from "@/lib/api";
import { formatMinutes } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import { Clock, TrendingUp, Gamepad2, Calendar, Activity } from "lucide-react";

const PIE_COLORS = ["#2684FF", "#36B37E", "#6554E0", "#E5494A", "#E97F0F", "#FFC400", "#4BADE8"];

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [gaming, setGaming] = useState<GamingSummary | null>(null);
  const [daily, setDaily] = useState<DailyBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    Promise.all([api.analytics.summary(days), api.analytics.gaming(30), api.analytics.daily(30)])
      .then(([s, g, d]) => { setSummary(s); setGaming(g); setDaily(d); })
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="text-jira-textMuted p-6">Loading...</div>;

  const categoryData = summary
    ? Object.entries(summary.by_category).map(([name, mins]) => ({ name, minutes: mins }))
    : [];

  const platformData = summary
    ? Object.entries(summary.by_platform).map(([name, mins]) => ({ name, minutes: mins }))
    : [];

  const gameData = gaming
    ? Object.entries(gaming.by_game).slice(0, 10).map(([name, mins]) => ({ name, minutes: mins }))
    : [];

  // Daily stacked data
  const dailyData = daily
    ? Object.entries(daily).map(([date, platforms]) => {
        const d: any = { date: date.slice(5) };
        Object.entries(platforms).forEach(([plat, mins]) => { d[plat] = mins; });
        d.total = Object.values(platforms).reduce((a, b) => a + b, 0);
        return d;
      })
    : [];

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-jira-border bg-jira-panel">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-jira-textMuted text-xs">
              <span>Insights</span><span>/</span><span className="text-jira-textSub">Reports</span>
            </div>
            <h1 className="text-xl font-bold text-jira-text mt-1">Reports & Analytics</h1>
          </div>
          <div className="flex bg-jira-surface border border-jira-border rounded overflow-hidden">
            {[7, 14, 30].map((d) => (
              <button key={d} onClick={() => { setDays(d); setLoading(true); }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  days === d ? "bg-jira-blue text-white" : "text-jira-textSub hover:bg-jira-hover"}`}>
                {d} days
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3">
          <StatBox label={`Total Time (${days}d)`} value={summary ? formatMinutes(summary.total_minutes) : "-"} icon={<Clock size={16} />} color="#2684FF" />
          <StatBox label="Time Entries" value={summary?.entry_count?.toString() ?? "-"} icon={<Activity size={16} />} color="#36B37E" />
          <StatBox label="Gaming Time (30d)" value={gaming ? formatMinutes(gaming.total_minutes) : "-"} icon={<Gamepad2 size={16} />} color="#6554E0" />
          <StatBox label="Gaming Sessions" value={gaming?.session_count?.toString() ?? "-"} icon={<TrendingUp size={16} />} color="#E97F0F" />
        </div>

        {/* Daily trend */}
        <div className="jira-card p-5">
          <h3 className="text-sm font-semibold text-jira-text mb-4">Daily Time Tracking Trend</h3>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
                <XAxis dataKey="date" stroke="#6B778C" fontSize={11} />
                <YAxis stroke="#6B778C" fontSize={11} tickFormatter={(v) => formatMinutes(v)} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #DFE1E6", borderRadius: 6, color: "#172B4D" }} formatter={(v: number) => formatMinutes(v)} />
                <Line type="monotone" dataKey="total" stroke="#2684FF" strokeWidth={2} name="Total" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Category + Platform */}
        <div className="grid grid-cols-2 gap-4">
          <div className="jira-card p-5">
            <h3 className="text-sm font-semibold text-jira-text mb-4">Time by Category</h3>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={categoryData} dataKey="minutes" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                    {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #DFE1E6", borderRadius: 6, color: "#172B4D" }} formatter={(v: number) => formatMinutes(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>

          <div className="jira-card p-5">
            <h3 className="text-sm font-semibold text-jira-text mb-4">Time by Platform</h3>
            {platformData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={platformData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
                  <XAxis dataKey="name" stroke="#6B778C" fontSize={11} />
                  <YAxis stroke="#6B778C" fontSize={11} tickFormatter={(v) => formatMinutes(v)} />
                  <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #DFE1E6", borderRadius: 6, color: "#172B4D" }} formatter={(v: number) => formatMinutes(v)} />
                  <Bar dataKey="minutes" fill="#2684FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </div>

        {/* Top games */}
        <div className="jira-card p-5">
          <h3 className="text-sm font-semibold text-jira-text mb-4">Top Games (Last 30 Days)</h3>
          {gameData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gameData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
                <XAxis type="number" stroke="#6B778C" fontSize={11} tickFormatter={(v) => formatMinutes(v)} />
                <YAxis type="category" dataKey="name" stroke="#6B778C" fontSize={11} width={160} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #DFE1E6", borderRadius: 6, color: "#172B4D" }} formatter={(v: number) => formatMinutes(v)} />
                <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
                  {gameData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="jira-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-xs text-jira-textMuted">{label}</span>
      </div>
      <div className="text-xl font-bold text-jira-text">{value}</div>
    </div>
  );
}

function EmptyChart() {
  return <div className="h-[260px] flex items-center justify-center text-jira-textMuted text-sm">No data yet</div>;
}
