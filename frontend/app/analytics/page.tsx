"use client";

import { useEffect, useState } from "react";
import { api, type Summary, type GamingSummary, type DailyBreakdown } from "@/lib/api";
import { formatMinutes } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid, Area, AreaChart,
} from "recharts";
import { Clock, TrendingUp, Gamepad2, Activity, BookOpen, Award } from "lucide-react";

const PIE_COLORS = ["#0052CC", "#36B37E", "#6554E0", "#FF5630", "#FFAB00", "#FF8B00", "#4C9AFF"];

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

  const categoryData = summary ? Object.entries(summary.by_category).map(([name, mins]) => ({ name, minutes: mins })) : [];
  const platformData = summary ? Object.entries(summary.by_platform).map(([name, mins]) => ({ name, minutes: mins })) : [];
  const gameData = gaming ? Object.entries(gaming.by_game).slice(0, 10).map(([name, mins]) => ({ name, minutes: mins })) : [];

  const dailyData = daily
    ? Object.entries(daily).map(([date, platforms]) => {
        const d: any = { date: date.slice(5) };
        Object.entries(platforms).forEach(([plat, mins]) => { d[plat] = mins; });
        d.total = Object.values(platforms).reduce((a, b) => a + b, 0);
        return d;
      })
    : [];

  const avgPerDay = summary ? summary.total_minutes / days : 0;
  const topCategory = categoryData.length > 0 ? categoryData[0] : null;

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
          <div className="flex bg-jira-surface border border-jira-border rounded-lg overflow-hidden">
            {[7, 14, 30].map((d) => (
              <button key={d} onClick={() => { setDays(d); setLoading(true); }}
                className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                  days === d ? "bg-jira-blue text-white" : "text-jira-textSub hover:bg-jira-hover"}`}>
                {d} days
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6 bg-jira-app">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label={`Total Time (${days}d)`} value={summary ? formatMinutes(summary.total_minutes) : "-"} sublabel="tracked time" icon={<Clock size={18} />} color="#0052CC" bg="#DEEBFF" />
          <StatCard label="Daily Average" value={formatMinutes(avgPerDay)} sublabel={`${days} day period`} icon={<TrendingUp size={18} />} color="#36B37E" bg="#E3FCEF" />
          <StatCard label="Time Entries" value={summary?.entry_count?.toString() ?? "0"} sublabel="total logged" icon={<Activity size={18} />} color="#6554E0" bg="#EAE6FF" />
          <StatCard label="Top Category" value={topCategory?.name ?? "N/A"} sublabel={topCategory ? formatMinutes(topCategory.minutes) : "no data"} icon={<Award size={18} />} color="#FFAB00" bg="#FFFAE6" />
        </div>

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
                  <Pie data={categoryData} dataKey="minutes" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2}
                    label={(e) => `${e.name}`}>
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

        {/* Top games */}
        {gameData.length > 0 && (
          <div className="jira-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-jira-text">Top Games (Last 30 Days)</h3>
              <Gamepad2 size={16} className="text-jira-textMuted" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gameData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
                <XAxis type="number" stroke="#6B778C" fontSize={11} tickFormatter={(v) => formatMinutes(v)} />
                <YAxis type="category" dataKey="name" stroke="#6B778C" fontSize={11} width={160} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #DFE1E6", borderRadius: 8, color: "#172B4D", fontSize: 12 }} formatter={(v: number) => formatMinutes(v)} cursor={{ fill: "#F4F5F7" }} />
                <Bar dataKey="minutes" radius={[0, 6, 6, 0]} maxBarSize={30}>
                  {gameData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category breakdown table */}
        {categoryData.length > 0 && (
          <div className="jira-card overflow-hidden">
            <div className="px-5 py-4 border-b border-jira-border">
              <h3 className="text-sm font-bold text-jira-text">Category Breakdown</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-jira-surface border-b border-jira-border">
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-jira-textMuted uppercase tracking-wide">Category</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-jira-textMuted uppercase tracking-wide">Time</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-jira-textMuted uppercase tracking-wide">Share</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-jira-textMuted uppercase tracking-wide w-1/3">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {categoryData.map((cat, i) => {
                  const [name, mins] = [cat.name, cat.minutes];
                  const pct = summary && summary.total_minutes > 0 ? (mins / summary.total_minutes) * 100 : 0;
                  return (
                    <tr key={name} className="border-b border-jira-border/50 last:border-b-0 hover:bg-jira-surface/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-jira-text font-medium">{name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-jira-text font-mono font-bold">{formatMinutes(mins)}</td>
                      <td className="px-5 py-3 text-right text-jira-textMuted font-mono">{pct.toFixed(1)}%</td>
                      <td className="px-5 py-3">
                        <div className="h-2 bg-jira-surface rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
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
