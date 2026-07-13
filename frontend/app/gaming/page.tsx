"use client";

import { useEffect, useState, useCallback } from "react";
import { api, type GamingSession, type GamingSummary } from "@/lib/api";
import { formatMinutes, formatDateTime } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import { Gamepad2, Monitor, Tv, Clock, Activity } from "lucide-react";

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  steam: { label: "Steam", color: "#2684FF" },
  psn: { label: "PlayStation", color: "#0052CC" },
  xbox: { label: "Xbox", color: "#36B37E" },
  switch: { label: "Switch (CFW)", color: "#E5494A" },
  switch2: { label: "Switch 2", color: "#E5494A" },
  pc: { label: "PC", color: "#6554E0" },
};

const PIE_COLORS = ["#2684FF", "#36B37E", "#6554E0", "#E5494A", "#E97F0F", "#FFC400", "#4BADE8"];

export default function GamingPage() {
  const [sessions, setSessions] = useState<GamingSession[]>([]);
  const [summary, setSummary] = useState<GamingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([api.gaming.sessions(50), api.analytics.gaming(30)])
      .then(([s, g]) => { setSessions(s); setSummary(g); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-jira-textMuted p-6">Loading...</div>;

  const gameData = summary ? Object.entries(summary.by_game).slice(0, 10).map(([name, mins]) => ({ name, minutes: mins })) : [];
  const platformData = summary ? Object.entries(summary.by_platform).map(([name, mins]) => ({ name: PLATFORM_META[name]?.label || name, minutes: mins, color: PLATFORM_META[name]?.color || "#6554E0" })) : [];
  const accountData = summary ? Object.entries(summary.by_account).map(([name, mins]) => ({ name, minutes: mins })) : [];
  const activeSessions = sessions.filter((s) => s.is_active);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-jira-border bg-jira-panel">
        <div className="flex items-center gap-2 text-jira-textMuted text-xs">
          <span>Insights</span><span>/</span><span className="text-jira-textSub">Gaming Activity</span>
        </div>
        <h1 className="text-xl font-bold text-jira-text mt-1">Gaming Activity</h1>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {activeSessions.length > 0 && (
          <div className="space-y-2">
            {activeSessions.map((s) => {
              const meta = PLATFORM_META[s.platform] || { label: s.platform, color: "#36B37E" };
              return (
                <div key={s.id} className="jira-card p-4 border-jira-green/30 flex items-center gap-4" style={{ background: "linear-gradient(90deg, rgba(54,179,126,0.08), transparent)" }}>
                  <div className="w-3 h-3 rounded-full bg-jira-green animate-pulse flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-jira-text">
                      {s.account_username ? `${s.account_username} is playing: ` : "Currently playing: "}{s.game_name}
                    </div>
                    <div className="text-xs text-jira-textMuted mt-0.5">{meta.label} - started {formatDateTime(s.started_at)}</div>
                  </div>
                  <Gamepad2 className="text-jira-green" size={24} />
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          <StatBox label="Total Gaming (30d)" value={summary ? formatMinutes(summary.total_minutes) : "-"} icon={<Gamepad2 size={16} />} color="#6554E0" />
          <StatBox label="Sessions" value={summary?.session_count?.toString() ?? "-"} icon={<Activity size={16} />} color="#2684FF" />
          <StatBox label="Unique Games" value={summary ? Object.keys(summary.by_game).length.toString() : "-"} icon={<Tv size={16} />} color="#36B37E" />
          <StatBox label="Active Now" value={activeSessions.length.toString()} icon={<Clock size={16} />} color="#E97F0F" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="jira-card p-5">
            <h3 className="text-sm font-semibold text-jira-text mb-4">Time by Platform</h3>
            {platformData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={platformData} dataKey="minutes" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                    {platformData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #DFE1E6", borderRadius: 6, color: "#172B4D" }} formatter={(v: number) => formatMinutes(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>

          <div className="jira-card p-5">
            <h3 className="text-sm font-semibold text-jira-text mb-4">Time by Account</h3>
            {accountData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={accountData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
                  <XAxis type="number" stroke="#6B778C" fontSize={11} tickFormatter={(v) => formatMinutes(v)} />
                  <YAxis type="category" dataKey="name" stroke="#6B778C" fontSize={11} width={120} />
                  <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #DFE1E6", borderRadius: 6, color: "#172B4D" }} formatter={(v: number) => formatMinutes(v)} />
                  <Bar dataKey="minutes" fill="#2684FF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </div>

        <div className="jira-card p-5">
          <h3 className="text-sm font-semibold text-jira-text mb-4">Top Games</h3>
          {gameData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gameData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
                <XAxis type="number" stroke="#6B778C" fontSize={11} tickFormatter={(v) => formatMinutes(v)} />
                <YAxis type="category" dataKey="name" stroke="#6B778C" fontSize={11} width={180} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #DFE1E6", borderRadius: 6, color: "#172B4D" }} formatter={(v: number) => formatMinutes(v)} />
                <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
                  {gameData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-jira-text mb-3">Recent Sessions</h3>
          <div className="space-y-1.5">
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <Gamepad2 size={28} className="mx-auto mb-2 text-jira-textMuted opacity-30" />
                <p className="text-jira-textMuted text-sm">No gaming sessions recorded.</p>
                <p className="text-jira-textMuted text-xs mt-1">Add watched accounts in Settings to start tracking.</p>
              </div>
            ) : (
              sessions.map((s) => {
                const meta = PLATFORM_META[s.platform] || { label: s.platform, color: "#6554E0" };
                return (
                  <div key={s.id} className="jira-card p-3 flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-jira-text truncate">
                        {s.game_name}
                        {s.is_active && <span className="ml-2 text-xs text-jira-green font-medium">LIVE</span>}
                      </div>
                      <div className="text-xs text-jira-textMuted mt-0.5">
                        {meta.label}{s.account_username && ` - ${s.account_username}`} - {formatDateTime(s.started_at)}
                        {s.ended_at && ` to ${formatDateTime(s.ended_at)}`}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-jira-text font-mono flex-shrink-0">
                      {s.is_active ? "..." : formatMinutes(s.duration_minutes)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
  return <div className="h-[260px] flex items-center justify-center text-jira-textMuted text-sm">No gaming data yet</div>;
}
