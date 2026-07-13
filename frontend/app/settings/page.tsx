"use client";

import { useEffect, useState, useCallback } from "react";
import { api, type WatchedAccount } from "@/lib/api";
import { Plus, Trash2, Activity, Gamepad2, Settings, Info } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

const PLATFORM_META: Record<string, { label: string; color: string; placeholder: string }> = {
  steam: { label: "Steam", color: "#2684FF", placeholder: "Steam vanity URL or SteamID64" },
  psn: { label: "PlayStation", color: "#0052CC", placeholder: "PSN Online ID" },
  xbox: { label: "Xbox", color: "#36B37E", placeholder: "Xbox Gamertag" },
  switch2: { label: "Switch 2", color: "#E5494A", placeholder: "Nintendo Switch Online username" },
};

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<WatchedAccount[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ platform: "steam", username: "", display_name: "" });

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
      <div className="px-6 py-4 border-b border-jira-border bg-jira-panel">
        <div className="flex items-center gap-2 text-jira-textMuted text-xs">
          <span>Config</span><span>/</span><span className="text-jira-textSub">Settings</span>
        </div>
        <h1 className="text-xl font-bold text-jira-text mt-1">Settings</h1>
      </div>

      <div className="flex-1 overflow-auto p-6 max-w-3xl space-y-6">
        {/* Watched Accounts */}
        <div className="jira-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-jira-text flex items-center gap-2">
              <Activity size={16} className="text-jira-blue" /> Watched Gaming Accounts
            </h3>
            <button onClick={() => setShowAdd(!showAdd)} className="jira-btn-primary flex items-center gap-1.5 text-xs">
              <Plus size={14} /> Add Account
            </button>
          </div>

          {showAdd && (
            <div className="mb-4 bg-jira-surface border border-jira-border rounded-lg p-4 space-y-3">
              <div className="flex gap-3">
                <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="jira-select">
                  {Object.entries(PLATFORM_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <input autoFocus placeholder={PLATFORM_META[form.platform]?.placeholder}
                  value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="jira-input flex-1" />
              </div>
              <input placeholder="Display name (optional, e.g., My PS5)"
                value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                className="jira-input w-full" />
              <div className="flex gap-2">
                <button onClick={handleAdd} className="jira-btn-primary text-xs">Add</button>
                <button onClick={() => setShowAdd(false)} className="text-jira-textMuted text-xs px-3 py-1.5">Cancel</button>
              </div>
            </div>
          )}

          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <Gamepad2 size={28} className="mx-auto mb-2 text-jira-textMuted opacity-30" />
              <p className="text-sm text-jira-textMuted">No watched accounts yet.</p>
              <p className="text-xs text-jira-textMuted mt-1">Add Steam, PSN, Xbox, or Switch 2 accounts to auto-track gaming time.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {accounts.map((acc) => {
                const meta = PLATFORM_META[acc.platform] || { label: acc.platform, color: "#6554E0" };
                return (
                  <div key={acc.id} className="flex items-center gap-3 p-3 bg-jira-surface rounded border border-jira-border">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-jira-text">
                        {acc.display_name || acc.username}
                        <span className="text-xs text-jira-textMuted ml-2">{meta.label}</span>
                      </div>
                      <div className="text-xs text-jira-textMuted truncate">
                        {acc.last_status || "Not checked yet"}
                        {acc.last_checked && ` - ${formatDateTime(acc.last_checked)}`}
                      </div>
                    </div>
                    <button onClick={() => handleToggle(acc.id, acc.is_active)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                        acc.is_active ? "bg-jira-green/20 text-jira-green" : "bg-jira-surface text-jira-textMuted border border-jira-border"}`}>
                      {acc.is_active ? "Active" : "Paused"}
                    </button>
                    <button onClick={() => handleDelete(acc.id)} className="text-jira-textMuted hover:text-jira-red transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="jira-card p-5">
          <h3 className="text-sm font-semibold text-jira-text mb-3 flex items-center gap-2">
            <Info size={16} className="text-jira-blue" /> How Monitoring Works
          </h3>
          <div className="space-y-2 text-sm text-jira-textSub">
            <p>1. A <strong className="text-jira-text">monitoring account</strong> authenticates with each platform using API keys in <code className="text-jira-blue text-xs bg-jira-surface px-1 rounded">backend/.env</code></p>
            <p>2. Every 5 minutes, the backend checks all watched accounts via each platforms friends/presence API</p>
            <p>3. When a watched account starts playing, a gaming session is automatically created</p>
            <p>4. When they stop, the session closes and a time entry is logged automatically</p>
            <p className="text-xs text-jira-textMuted pt-2 border-t border-jira-border">Note: The monitoring account must be friends with watched accounts on each platform.</p>
          </div>
        </div>

        {/* Switch CFW info */}
        <div className="jira-card p-5">
          <h3 className="text-sm font-semibold text-jira-text mb-3 flex items-center gap-2">
            <Settings size={16} className="text-jira-blue" /> Nintendo Switch (CFW Collector)
          </h3>
          <div className="space-y-2 text-sm text-jira-textSub">
            <p>The original Switch uses a homebrew collector running directly on the console.</p>
            <p>It POSTs to <code className="text-jira-blue text-xs bg-jira-surface px-1 rounded">/api/gaming/switch/ingest</code> every 30 seconds when a game is running.</p>
            <p className="text-xs text-jira-textMuted">See <code className="text-jira-blue">switch-collector/README.md</code> for build and installation instructions.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
