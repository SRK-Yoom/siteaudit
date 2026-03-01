"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard, TrendingUp, FileText, Settings, LogOut,
  Plus, ArrowUpRight, ArrowDownRight, Minus, ExternalLink,
  Zap, Search, Brain, Globe, Shield, AlertTriangle, AlertCircle,
  CheckCircle, Lock, ChevronRight, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ScoreChart } from "@/components/dashboard/ScoreChart";

// ── Types ──────────────────────────────────────────────────────────────────

interface AuditRecord {
  id: string;
  url: string;
  overall_score: number;
  created_at: string;
  data: {
    health?: { domain: string; schemaTypesFound: string[] };
    pillars?: Record<string, { score: number; label: string; points: number; maxPoints: number }>;
    recommendations?: { id: string; title: string; description: string; priority: string; category: string; fix: string }[];
    keywords?: { top: { word: string }[]; coverageScore: number };
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 90) return "text-green-400";
  if (s >= 70) return "text-indigo-400";
  if (s >= 50) return "text-amber-400";
  return "text-red-400";
}

function scoreBg(s: number) {
  if (s >= 90) return "bg-green-400/10 border-green-400/20";
  if (s >= 70) return "bg-indigo-400/10 border-indigo-400/20";
  if (s >= 50) return "bg-amber-400/10 border-amber-400/20";
  return "bg-red-400/10 border-red-400/20";
}

function scoreLabel(s: number) {
  if (s >= 90) return "Excellent";
  if (s >= 70) return "Good";
  if (s >= 50) return "Needs work";
  return "Poor";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const PILLAR_ICONS: Record<string, React.ReactNode> = {
  performance: <Zap className="w-4 h-4" />,
  technicalSeo: <Search className="w-4 h-4" />,
  contentKeywords: <FileText className="w-4 h-4" />,
  geoReadiness: <Globe className="w-4 h-4" />,
  aeoReadiness: <Brain className="w-4 h-4" />,
  accessibility: <Shield className="w-4 h-4" />,
};

const PRIORITY_CFG = {
  critical: { icon: AlertTriangle, badge: "bg-red-500/15 text-red-400 border-red-500/20", wrap: "border-red-500/20 bg-red-500/5" },
  high: { icon: AlertCircle, badge: "bg-amber-500/15 text-amber-400 border-amber-500/20", wrap: "border-amber-500/20 bg-amber-500/5" },
  medium: { icon: CheckCircle, badge: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20", wrap: "border-indigo-500/20 bg-indigo-500/5" },
};

// ── Nav Sidebar ────────────────────────────────────────────────────────────

function Sidebar({ activeTab, onTab, onSignOut, userName }: {
  activeTab: string;
  onTab: (t: string) => void;
  onSignOut: () => void;
  userName: string;
}) {
  const navItems = [
    { id: "overview", icon: LayoutDashboard, label: "Overview" },
    { id: "reports", icon: FileText, label: "All Reports" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-gray-100 bg-surface min-h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 h-16 flex items-center border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shrink-0">
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" fill="none" strokeDasharray="28 16" strokeLinecap="round" transform="rotate(-90 10 10)" />
              <text x="10" y="14" textAnchor="middle" fontSize="8" fontWeight="800" fill="white" fontFamily="system-ui">S</text>
            </svg>
          </div>
          <span className="font-bold text-white text-base tracking-tight group-hover:text-brand-light transition-colors">SiteScore</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTab(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === id
                ? "bg-brand/15 text-brand-light border border-brand/20"
                : "text-ink-3 hover:text-ink-2 hover:bg-gray-50"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs font-semibold text-ink-2 truncate">{userName}</p>
          <span className="text-xs bg-brand/15 text-brand-light border border-brand/20 px-1.5 py-0.5 rounded font-bold">Free</span>
        </div>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-ink-4 hover:text-ink-2 hover:bg-gray-50 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────

function OverviewTab({ audits, onNewAudit }: { audits: AuditRecord[]; onNewAudit: () => void }) {
  const latest = audits[0];
  const previous = audits[1];
  const diff = latest && previous ? latest.overall_score - previous.overall_score : null;

  const chartData = [...audits].reverse().slice(-12).map(a => ({
    date: formatShortDate(a.created_at),
    score: a.overall_score,
  }));

  const pillars = latest?.data?.pillars ?? {};
  const pillarList = Object.entries(pillars);

  const recs = latest?.data?.recommendations ?? [];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Latest score */}
        <motion.div className="card rounded-2xl p-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-xs text-ink-3 font-medium mb-1">Latest Score</p>
          <p className={`text-3xl font-black tabular-nums ${latest ? scoreColor(latest.overall_score) : "text-white/20"}`}>
            {latest?.overall_score ?? "—"}
          </p>
          {latest && <p className="text-xs text-ink-4 mt-1">{scoreLabel(latest.overall_score)}</p>}
        </motion.div>

        {/* Change */}
        <motion.div className="card rounded-2xl p-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-xs text-ink-3 font-medium mb-1">vs Last Audit</p>
          <div className="flex items-center gap-1">
            {diff === null
              ? <p className="text-3xl font-black text-white/20">—</p>
              : diff > 0
                ? <><ArrowUpRight className="w-5 h-5 text-green-400" /><p className="text-3xl font-black text-green-400 tabular-nums">+{diff}</p></>
                : diff < 0
                  ? <><ArrowDownRight className="w-5 h-5 text-red-400" /><p className="text-3xl font-black text-red-400 tabular-nums">{diff}</p></>
                  : <><Minus className="w-5 h-5 text-ink-4" /><p className="text-3xl font-black text-ink-4 tabular-nums">0</p></>
            }
          </div>
          <p className="text-xs text-ink-4 mt-1">pts change</p>
        </motion.div>

        {/* Total audits */}
        <motion.div className="card rounded-2xl p-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <p className="text-xs text-ink-3 font-medium mb-1">Total Audits</p>
          <p className="text-3xl font-black text-white tabular-nums">{audits.length}</p>
          <p className="text-xs text-ink-4 mt-1">reports saved</p>
        </motion.div>

        {/* Last audited */}
        <motion.div className="card rounded-2xl p-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="text-xs text-ink-3 font-medium mb-1">Last Audited</p>
          <p className="text-lg font-black text-white leading-tight mt-1">{latest ? formatShortDate(latest.created_at) : "—"}</p>
          {latest && <p className="text-xs text-ink-4 mt-1 truncate">{latest.data?.health?.domain ?? latest.url}</p>}
        </motion.div>
      </div>

      {/* Score history chart */}
      <motion.div className="card rounded-2xl p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Score History</h3>
            <p className="text-xs text-ink-4 mt-0.5">Your overall score over the last {chartData.length} audit{chartData.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={onNewAudit}
            className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />New Audit
          </button>
        </div>
        <ScoreChart data={chartData} />
      </motion.div>

      {/* Pillar breakdown */}
      {pillarList.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-xs font-semibold text-ink-3 uppercase tracking-widest mb-3">Latest Score Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {pillarList.map(([key, pillar]) => (
              <div key={key} className="card rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-ink-3 shrink-0">
                    {PILLAR_ICONS[key]}
                  </div>
                  <span className="text-xs font-semibold text-ink-2 leading-tight">{pillar.label}</span>
                </div>
                <div className="flex items-end justify-between">
                  <p className={`text-2xl font-black tabular-nums ${scoreColor(pillar.score)}`}>{pillar.score}</p>
                  <span className="text-xs text-ink-4 mb-0.5">/100</span>
                </div>
                <div className="mt-2 h-1 bg-gray-50 rounded-full overflow-hidden">
                  <div className="h-full bg-brand/60 rounded-full" style={{ width: `${pillar.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recommendations — FULLY UNGATED for members */}
      {recs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <h3 className="text-xs font-semibold text-ink-3 uppercase tracking-widest mb-3">What to Fix First</h3>
          <div className="space-y-3">
            {recs.map((rec, i) => {
              const pkey = rec.priority as "critical" | "high" | "medium";
              const cfg = PRIORITY_CFG[pkey] ?? PRIORITY_CFG.medium;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={rec.id}
                  className={`rounded-2xl border p-5 ${cfg.wrap}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-4 h-4 shrink-0 mt-0.5 text-current opacity-60" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>{rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)}</span>
                        <span className="text-xs text-ink-4">{rec.category}</span>
                      </div>
                      <p className="font-semibold text-sm text-white">{rec.title}</p>
                      <p className="text-sm mt-1 leading-relaxed text-ink-3">{rec.description}</p>
                      {/* UNGATED: How to fix is fully visible for members */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-ink-3 leading-relaxed">
                          <span className="font-semibold text-ink-2">How to fix: </span>
                          {rec.fix}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {audits.length === 0 && (
        <motion.div
          className="card rounded-3xl p-12 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-brand-light" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Run your first audit</h3>
          <p className="text-ink-3 text-sm max-w-xs mx-auto mb-6">
            Enter your website URL on the homepage to generate your first score report.
            It takes about 30 seconds.
          </p>
          <button
            onClick={onNewAudit}
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />Run First Audit
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ── Reports Tab ────────────────────────────────────────────────────────────

function ReportsTab({ audits, onNewAudit }: { audits: AuditRecord[]; onNewAudit: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-ink-3 uppercase tracking-widest">All Reports ({audits.length})</h3>
        <button
          onClick={onNewAudit}
          className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />New Audit
        </button>
      </div>

      {audits.length === 0 ? (
        <div className="card rounded-2xl p-10 text-center">
          <p className="text-ink-4 text-sm">No reports yet. Run your first audit to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {audits.map((audit, i) => {
            const domain = audit.data?.health?.domain ?? new URL(audit.url).hostname;
            return (
              <motion.div
                key={audit.id}
                className="card rounded-2xl p-4 flex items-center gap-4 hover:border-white/12 transition-colors group"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${scoreBg(audit.overall_score)}`}>
                  <span className={`text-lg font-black tabular-nums ${scoreColor(audit.overall_score)}`}>{audit.overall_score}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{domain}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-ink-4">{formatDate(audit.created_at)}</p>
                    <span className={`text-xs font-semibold ${scoreColor(audit.overall_score)}`}>{scoreLabel(audit.overall_score)}</span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                  {Object.values(audit.data?.pillars ?? {}).map((p, pi) => (
                    <div
                      key={pi}
                      title={`${p.label}: ${p.score}`}
                      className={`w-1.5 h-6 rounded-full ${
                        p.score >= 70 ? "bg-green-400/60" : p.score >= 50 ? "bg-amber-400/60" : "bg-red-400/60"
                      }`}
                    />
                  ))}
                </div>
                <a
                  href={audit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/20 hover:text-ink-2 transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-ink-3 transition-colors" />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Settings Tab ───────────────────────────────────────────────────────────

function SettingsTab({ user }: { user: { email?: string; user_metadata?: { full_name?: string } } }) {
  return (
    <div className="max-w-lg space-y-6">
      <div className="card rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Account</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-ink-3 font-medium">Name</label>
            <p className="text-sm text-white mt-1">{user.user_metadata?.full_name ?? "—"}</p>
          </div>
          <div>
            <label className="text-xs text-ink-3 font-medium">Email</label>
            <p className="text-sm text-white mt-1">{user.email}</p>
          </div>
          <div>
            <label className="text-xs text-ink-3 font-medium">Plan</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-white">Free</span>
              <Link href="/#plans" className="text-xs text-brand-light hover:text-white transition-colors underline underline-offset-2">Upgrade</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="card rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-2">Coming Soon</h3>
        <div className="space-y-2">
          {["Industry benchmarking", "Competitor Radar", "Weekly email digest", "Conversion Intelligence score", "GA4 / GTM setup check"].map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-ink-3">
              <Lock className="w-3.5 h-3.5 text-brand-light shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard Page ────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchAudits = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const { audits: data } = await res.json();
        setAudits(data ?? []);
      }
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/"); return; }
    if (user) fetchAudits();
  }, [user, authLoading, fetchAudits, router]);

  const handleNewAudit = () => router.push("/");

  if (authLoading || fetching) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-brand animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const userName = user.user_metadata?.full_name ?? user.email ?? "Member";

  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar
        activeTab={activeTab}
        onTab={setActiveTab}
        onSignOut={signOut}
        userName={userName}
      />

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 border-b border-gray-100 bg-surface/90 backdrop-blur-xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-brand flex items-center justify-center">
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" fill="none" strokeDasharray="28 16" strokeLinecap="round" transform="rotate(-90 10 10)" />
            </svg>
          </div>
          <span className="font-bold text-white text-sm">SiteScore</span>
        </Link>
        <button
          onClick={handleNewAudit}
          className="inline-flex items-center gap-1.5 bg-brand text-white text-xs font-bold px-3 py-1.5 rounded-lg"
        >
          <Plus className="w-3 h-3" />New Audit
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-0 md:pt-0">
        {/* Header */}
        <div className="sticky top-0 z-40 border-b border-gray-100 bg-surface/80 backdrop-blur-xl px-6 md:px-8 h-16 flex items-center justify-between mt-14 md:mt-0">
          <div>
            <h1 className="text-sm font-semibold text-white capitalize">{activeTab}</h1>
            {audits[0] && (
              <p className="text-xs text-ink-4">
                {audits[0].data?.health?.domain ?? "your website"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAudits}
              className="p-2 rounded-lg hover:bg-gray-50 text-ink-4 hover:text-ink-2 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleNewAudit}
              className="hidden sm:inline-flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />New Audit
            </button>
          </div>
        </div>

        {/* Mobile bottom tabs */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-gray-100 bg-surface/95 backdrop-blur-xl flex">
          {[
            { id: "overview", icon: LayoutDashboard, label: "Overview" },
            { id: "reports", icon: FileText, label: "Reports" },
            { id: "settings", icon: Settings, label: "Settings" },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                activeTab === id ? "text-brand-light" : "text-ink-4"
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-6 md:px-8 py-6 pb-24 md:pb-8 max-w-5xl">
          {activeTab === "overview" && <OverviewTab audits={audits} onNewAudit={handleNewAudit} />}
          {activeTab === "reports" && <ReportsTab audits={audits} onNewAudit={handleNewAudit} />}
          {activeTab === "settings" && <SettingsTab user={user} />}
        </div>
      </main>
    </div>
  );
}
