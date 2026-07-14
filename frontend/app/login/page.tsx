"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { KanbanSquare, Clock, Gamepad2, BarChart3, AlertCircle, Loader2, Lock, User, Mail } from "lucide-react";

type Mode = "login" | "register";

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register({
          username: username.trim(),
          password,
          email: email.trim() || undefined,
          display_name: displayName.trim() || undefined,
        });
      }
      router.replace("/");
    } catch (err) {
      const msg = String(err).replace(/^Error:\s*/i, "");
      setError(msg.includes("401") ? "Invalid username or password" : msg || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setPassword("");
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden lg:flex w-[46%] flex-col justify-between p-12 text-white relative overflow-hidden bg-gradient-to-br from-[#0747A6] via-[#0052CC] to-[#0065FF]">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 backdrop-blur rounded-lg flex items-center justify-center ring-1 ring-white/20">
            <span className="text-white font-bold text-lg">FJ</span>
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight">FreeTime Jira</div>
            <div className="text-xs text-blue-100/80">Personal time &amp; project tracking</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Where does your<br />free time go?
          </h1>
          <p className="mt-4 text-blue-100/90 text-base leading-relaxed">
            Plan with a Jira-style board, log time like ClockWatch Pro, and track gaming sessions automatically - all in one self-hosted workspace.
          </p>
          <div className="mt-8 space-y-3">
            {[
              { icon: KanbanSquare, text: "Kanban board with epics, stories, sprints & labels" },
              { icon: Clock, text: "Live timer & manual time-range logging" },
              { icon: BarChart3, text: "Weekly / monthly reports & activity heatmap" },
              { icon: Gamepad2, text: "Automatic Steam, PSN, Xbox & Switch tracking" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-blue-50">
                <div className="w-8 h-8 bg-white/10 rounded-md flex items-center justify-center ring-1 ring-white/15">
                  <Icon size={16} />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-blue-100/70">
          &copy; {new Date().getFullYear()} FreeTime Jira - Self-hosted
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center bg-jira-app px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 bg-jira-blue rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FJ</span>
            </div>
            <span className="text-jira-text font-bold text-lg">FreeTime Jira</span>
          </div>

          <div className="bg-white border border-jira-border rounded-xl shadow-modal p-8">
            <h2 className="text-xl font-bold text-jira-text tracking-tight">
              {mode === "login" ? "Log in to your account" : "Create your account"}
            </h2>
            <p className="text-sm text-jira-textMuted mt-1">
              {mode === "login"
                ? "Enter your credentials to access your board."
                : "Set up a local account to start tracking your time."}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Field label="Username" icon={<User size={15} />}>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  required
                  minLength={3}
                  maxLength={100}
                  placeholder="e.g. admin"
                  className="w-full bg-white border border-jira-border rounded-md pl-9 pr-3 py-2 text-sm text-jira-text placeholder-jira-textLight focus:outline-none focus:border-jira-blue focus:ring-2 focus:ring-jira-blue/20 transition-all"
                />
              </Field>

              {mode === "register" && (
                <>
                  <Field label="Display name (optional)" icon={<User size={15} />}>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={100}
                      placeholder="e.g. Enes"
                      className="w-full bg-white border border-jira-border rounded-md pl-9 pr-3 py-2 text-sm text-jira-text placeholder-jira-textLight focus:outline-none focus:border-jira-blue focus:ring-2 focus:ring-jira-blue/20 transition-all"
                    />
                  </Field>
                  <Field label="Email (optional)" icon={<Mail size={15} />}>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="you@example.com"
                      className="w-full bg-white border border-jira-border rounded-md pl-9 pr-3 py-2 text-sm text-jira-text placeholder-jira-textLight focus:outline-none focus:border-jira-blue focus:ring-2 focus:ring-jira-blue/20 transition-all"
                    />
                  </Field>
                </>
              )}

              <Field label="Password" icon={<Lock size={15} />}>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  type="password"
                  placeholder={mode === "login" ? "Enter your password" : "At least 6 characters"}
                  className="w-full bg-white border border-jira-border rounded-md pl-9 pr-3 py-2 text-sm text-jira-text placeholder-jira-textLight focus:outline-none focus:border-jira-blue focus:ring-2 focus:ring-jira-blue/20 transition-all"
                />
              </Field>

              {error && (
                <div className="flex items-start gap-2 bg-jira-redBg border border-jira-red/30 rounded-md px-3 py-2 text-sm text-jira-red">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-jira-blue hover:bg-jira-blueDark disabled:opacity-60 disabled:cursor-not-allowed text-white py-2.5 rounded-md text-sm font-semibold transition-colors shadow-card flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {mode === "login" ? "Log in" : "Sign up"}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-jira-textMuted">
              {mode === "login" ? (
                <>
                  No account yet?{" "}
                  <button onClick={() => switchMode("register")} className="text-jira-blue hover:text-jira-blueDark font-medium">
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button onClick={() => switchMode("login")} className="text-jira-blue hover:text-jira-blueDark font-medium">
                    Log in
                  </button>
                </>
              )}
            </div>
          </div>

          {mode === "login" && (
            <div className="mt-4 bg-jira-blueBg border border-jira-blue/20 rounded-lg px-4 py-3 text-xs text-jira-textSub">
              <div className="font-semibold text-jira-blue mb-0.5">Default account</div>
              Username <span className="font-mono font-semibold">admin</span> &middot; Password <span className="font-mono font-semibold">admin123</span>
              <div className="text-jira-textMuted mt-1">Change it after logging in by registering a new user.</div>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-jira-textLight">
            Local accounts only - your data never leaves your machine.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-jira-textSub mb-1.5">{label}</span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-jira-textLight pointer-events-none">{icon}</span>
        {children}
      </div>
    </label>
  );
}
