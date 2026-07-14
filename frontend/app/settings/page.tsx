"use client";

import { useEffect, useState, useCallback } from "react";
import { api, type WatchedAccount } from "@/lib/api";
import { Plus, Trash2, Activity, Settings, Info, Gamepad2, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { formatDateTime, cn } from "@/lib/utils";

const PLATFORM_META: Record<string, { label: string; color: string; placeholder: string; bg: string; envKey: string }> = {
  steam: { label: "Steam", color: "#0052CC", bg: "#DEEBFF", placeholder: "Steam vanity URL or SteamID64", envKey: "FREETIME_STEAM_API_KEY" },
  psn: { label: "PlayStation", color: "#0747A6", bg: "#DEEBFF", placeholder: "PSN Online ID", envKey: "FREETIME_PSN_NPSSO_TOKEN" },
  xbox: { label: "Xbox", color: "#107C10", bg: "#E3FCEF", placeholder: "Xbox Gamertag", envKey: "FREETIME_XBOX_OPENXBL_KEY" },
  switch2: { label: "Switch 2", color: "#DE350B", bg: "#FFEBE6", placeholder: "Nintendo Switch Online username", envKey: "FREETIME_SWITCH2_NSO_TOKEN" },
};

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<WatchedAccount[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ platform: "steam", username: "", display_name: "" });
  const [expandedInfo, setExpandedInfo] = useState<string | null>("monitoring");

  const load = useCallback(() => { api.watchedAccounts.list().then(setAccounts); }, []);
  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.username.trim()) return;
    try {
      await api.watchedAccounts.create({ platform: form.platform, username: form.username, display_name: form.display_name || undefined });
      setForm({ platform: "steam", username: "", display_name: "" });
      setShowAdd(false);
      load();
    } catch (e: any) { alert(`Failed: ${e.message}`); }
  };

  const handleToggle = async (id: number, active: boolean) => { await api.watchedAccounts.update(id, !active); load(); };
  const handleDelete = async (id: number) => { await api.watchedAccounts.delete(id); load(); };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-3 border-b border-jira-border bg-white">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-jira-surface flex items-center justify-center">
            <Settings size={20} className="text-jira-textSub" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-jira-text">Settings</h1>
            <div className="text-xs text-jira-textMuted">Manage monitored accounts and platform configuration</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 max-w-4xl space-y-6 bg-jira-app">
        {/* Watched Accounts Card */}
        <div className="jira-card overflow-hidden">
          <div className="px-5 py-4 border-b border-jira-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-jira-blueBg flex items-center justify-center">
                <Activity size={18} className="text-jira-blue" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-jira-text">Watched Gaming Accounts</h3>
                <p className="text-xs text-jira-textMuted">{accounts.length} accounts being monitored</p>
              </div>
            </div>
            <button onClick={() => setShowAdd(!showAdd)} className="jira-btn-primary flex items-center gap-1.5 text-xs">
              <Plus size={14} /> Add Account
            </button>
          </div>

          {/* Add form */}
          {showAdd && (
            <div className="px-5 py-4 bg-jira-surface border-b border-jira-border">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <label className="text-xs text-jira-textMuted font-medium block mb-1">Platform</label>
                    <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="jira-select w-40">
                      {Object.entries(PLATFORM_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-jira-textMuted font-medium block mb-1">Username / ID</label>
                    <input autoFocus placeholder={PLATFORM_META[form.platform]?.placeholder}
                      value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                      className="jira-input w-full" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-jira-textMuted font-medium block mb-1">Display Name (optional)</label>
                    <input placeholder="e.g., My PS5, Living Room Xbox"
                      value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                      className="jira-input w-full" />
                  </div>
                  <div className="flex items-end gap-2">
                    <button onClick={handleAdd} className="jira-btn-primary text-xs">Add</button>
                    <button onClick={() => setShowAdd(false)} className="jira-btn-secondary text-xs">Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Account list */}
          {accounts.length === 0 ? (
            <div className="text-center py-12">
              <Gamepad2 size={32} className="mx-auto mb-3 text-jira-textLight" />
              <p className="text-sm text-jira-textMuted font-medium">No watched accounts yet</p>
              <p className="text-xs text-jira-textLight mt-1">Add Steam, PSN, Xbox, or Switch 2 accounts to auto-track gaming time.</p>
            </div>
          ) : (
            <div className="divide-y divide-jira-border">
              {accounts.map((acc) => {
                const meta = PLATFORM_META[acc.platform] || { label: acc.platform, color: "#6554E0", bg: "#EAE6FF" };
                return (
                  <div key={acc.id} className="flex items-center gap-4 px-5 py-3 hover:bg-jira-surface/50 transition-colors">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                      <Gamepad2 size={16} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-jira-text">{acc.display_name || acc.username}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                      </div>
                      <div className="text-xs text-jira-textMuted truncate mt-0.5">
                        {acc.last_status || "Not checked yet"}
                        {acc.last_checked && ` - ${formatDateTime(acc.last_checked)}`}
                      </div>
                    </div>
                    <button onClick={() => handleToggle(acc.id, acc.is_active)}
                      className={cn("text-xs px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5",
                        acc.is_active ? "bg-jira-greenBg text-jira-green" : "bg-jira-surface text-jira-textMuted border border-jira-border")}>
                      {acc.is_active ? <><span className="w-1.5 h-1.5 rounded-full bg-jira-green animate-pulse" /> Active</> : "Paused"}
                    </button>
                    <button onClick={() => handleDelete(acc.id)} className="text-jira-textMuted hover:text-jira-red transition-colors p-1.5 rounded hover:bg-jira-redBg">
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expandable info sections */}
        <div className="jira-card overflow-hidden">
          <button onClick={() => setExpandedInfo(expandedInfo === "monitoring" ? null : "monitoring")}
            className="w-full px-5 py-4 flex items-center gap-3 hover:bg-jira-surface/50 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-jira-purpleBg flex items-center justify-center flex-shrink-0">
              <Info size={18} className="text-jira-purple" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-bold text-jira-text">How Monitoring Works</h3>
              <p className="text-xs text-jira-textMuted">Monitoring account authenticates with each platform to check watched accounts</p>
            </div>
            <ChevronRight size={18} className={cn("text-jira-textMuted transition-transform", expandedInfo === "monitoring" && "rotate-90")} />
          </button>
          {expandedInfo === "monitoring" && (
            <div className="px-5 pb-5 space-y-3 border-t border-jira-border pt-4">
              <Step n={1} text="A monitoring account authenticates with each platform using API keys in backend/.env" />
              <Step n={2} text="Every 5 minutes, the backend checks all watched accounts via each platforms friends/presence API" />
              <Step n={3} text="When a watched account starts playing, a gaming session is automatically created" />
              <Step n={4} text="When they stop, the session closes and a time entry is logged automatically" />
              <div className="mt-3 p-3 bg-jira-yellowBg rounded-lg flex items-start gap-2">
                <Info size={14} className="text-jira-yellow mt-0.5 flex-shrink-0" />
                <p className="text-xs text-jira-textSub">The monitoring account must be friends with watched accounts on each platform for presence to work.</p>
              </div>
            </div>
          )}
        </div>

        {/* Platform API key config */}
        <div className="jira-card overflow-hidden">
          <button onClick={() => setExpandedInfo(expandedInfo === "apikeys" ? null : "apikeys")}
            className="w-full px-5 py-4 flex items-center gap-3 hover:bg-jira-surface/50 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-jira-blueBg flex items-center justify-center flex-shrink-0">
              <Settings size={18} className="text-jira-blue" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-bold text-jira-text">Platform API Keys</h3>
              <p className="text-xs text-jira-textMuted">Configure monitoring account credentials in backend/.env</p>
            </div>
            <ChevronRight size={18} className={cn("text-jira-textMuted transition-transform", expandedInfo === "apikeys" && "rotate-90")} />
          </button>
          {expandedInfo === "apikeys" && (
            <div className="px-5 pb-5 border-t border-jira-border pt-4 space-y-3">
              {Object.entries(PLATFORM_META).map(([key, meta]) => (
                <div key={key} className="flex items-center gap-3 p-3 bg-jira-surface rounded-lg">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                    <Gamepad2 size={14} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-jira-text">{meta.label}</div>
                    <div className="text-xs text-jira-textMuted font-mono">{meta.envKey}</div>
                  </div>
                  <span className="text-xs text-jira-textLight flex items-center gap-1">
                    <XCircle size={14} className="text-jira-textLight" /> Not configured
                  </span>
                </div>
              ))}
              <div className="mt-3 p-3 bg-jira-blueBg rounded-lg">
                <p className="text-xs text-jira-textSub">
                  Add your API keys to <code className="text-jira-blue font-mono bg-white px-1 rounded">backend/.env</code> and restart the backend.
                  See <code className="text-jira-blue font-mono">README.md</code> for instructions on obtaining each key.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Switch CFW info */}
        <div className="jira-card overflow-hidden">
          <button onClick={() => setExpandedInfo(expandedInfo === "switch" ? null : "switch")}
            className="w-full px-5 py-4 flex items-center gap-3 hover:bg-jira-surface/50 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-jira-redBg flex items-center justify-center flex-shrink-0">
              <Gamepad2 size={18} className="text-jira-red" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-bold text-jira-text">Nintendo Switch (CFW Collector)</h3>
              <p className="text-xs text-jira-textMuted">Homebrew sysmodule that runs on the console - no monitoring account needed</p>
            </div>
            <ChevronRight size={18} className={cn("text-jira-textMuted transition-transform", expandedInfo === "switch" && "rotate-90")} />
          </button>
          {expandedInfo === "switch" && (
            <div className="px-5 pb-5 border-t border-jira-border pt-4 space-y-3">
              <p className="text-sm text-jira-textSub">The original Switch uses a homebrew collector running directly on the console via Atmosphere CFW.</p>
              <div className="bg-jira-surface rounded-lg p-3 font-mono text-xs text-jira-textSub">
                <div className="text-jira-textMuted mb-1">POST /api/gaming/switch/ingest</div>
                <div>{'{ "game_name": "Zelda TOTK", "started_at": "...", "ended_at": "...", "device_name": "Switch OLED" }'}</div>
              </div>
              <p className="text-xs text-jira-textMuted">See <code className="text-jira-blue font-mono">switch-collector/README.md</code> for build and installation instructions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-jira-blue text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{n}</div>
      <p className="text-sm text-jira-textSub pt-0.5">{text}</p>
    </div>
  );
}
