"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FileText, Settings, LogOut,
  Plus, ArrowUpRight, ArrowDownRight, Minus, ExternalLink,
  Zap, Search, Brain, Globe, Shield, AlertTriangle, AlertCircle,
  CheckCircle, Lock, ChevronRight, RefreshCw, Users, TrendingUp,
  ShoppingCart, Target, X, Loader2, CheckSquare, XSquare,
  CalendarDays, Square, ChevronDown, Building2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ScoreChart } from "@/components/dashboard/ScoreChart";
import { ScoreDNAChart, INDUSTRY_BENCHMARKS } from "@/components/dashboard/ScoreDNAChart";
import { IndustryOnboarding, INDUSTRIES, type IndustryKey } from "@/components/dashboard/IndustryOnboarding";
import { FixCart } from "@/components/dashboard/FixCart";
import { ExportPDF } from "@/components/dashboard/ExportPDF";

// ── Types ──────────────────────────────────────────────────────────────────

interface PillarData { score: number; label: string; points: number; maxPoints: number }

interface AuditRecord {
  id: string;
  url: string;
  overall_score: number;
  created_at: string;
  data: {
    health?: { domain: string; schemaTypesFound: string[] };
    pillars?: Record<string, PillarData>;
    recommendations?: { id: string; title: string; description: string; priority: string; category: string; fix: string }[];
    keywords?: { top: { word: string }[]; coverageScore: number };
  };
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  industry: IndustryKey | null;
  plan: string;
}

interface WebsiteRecord {
  id: string;
  url: string;
  domain: string;
  created_at: string;
  latest_score: number | null;
  latest_audit_at: string | null;
  audit_count: number;
}

interface CompetitorResult {
  url: string;
  domain: string;
  error?: string;
  title?: string | null;
  h1?: string | null;
  wordCount?: number;
  schemaTypes?: string[];
  hasFAQSchema?: boolean;
  hasOrgSchema?: boolean;
  hasGA4?: boolean;
  hasGTM?: boolean;
  hasMetaPixel?: boolean;
  hasCTA?: boolean;
  hasPhone?: boolean;
  hasReviewMentions?: boolean;
  hasFreeTrialMention?: boolean;
  topKeywords?: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 80) return "text-green-400";
  if (s >= 60) return "text-indigo-400";
  if (s >= 40) return "text-amber-400";
  return "text-red-400";
}
function scoreBg(s: number) {
  if (s >= 80) return "bg-green-400/10 border-green-400/20";
  if (s >= 60) return "bg-indigo-400/10 border-indigo-400/20";
  if (s >= 40) return "bg-amber-400/10 border-amber-400/20";
  return "bg-red-400/10 border-red-400/20";
}
function scoreLabel(s: number) {
  if (s >= 80) return "Excellent";
  if (s >= 60) return "Good";
  if (s >= 40) return "Needs work";
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
  cro: <Target className="w-4 h-4" />,
  analytics: <TrendingUp className="w-4 h-4" />,
};

const PRIORITY_CFG = {
  critical: { icon: AlertTriangle, badge: "bg-red-500/15 text-red-400 border-red-500/20", wrap: "border-red-500/20 bg-red-500/5" },
  high:     { icon: AlertCircle,   badge: "bg-amber-500/15 text-amber-400 border-amber-500/20", wrap: "border-amber-500/20 bg-amber-500/5" },
  medium:   { icon: CheckCircle,   badge: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20", wrap: "border-indigo-500/20 bg-indigo-500/5" },
};

// ── Action Plan Effort Map ──────────────────────────────────────────────────

type EffortLevel = "quick" | "medium" | "strategic";

interface EffortMeta {
  effort: EffortLevel;
  impact: number;
  timeEstimate: string;
}

const EFFORT_MAP: Record<string, EffortMeta> = {
  "sitemap":      { effort: "quick",    impact: 8,  timeEstimate: "20 min" },
  "meta-desc":    { effort: "quick",    impact: 5,  timeEstimate: "45 min" },
  "https":        { effort: "quick",    impact: 8,  timeEstimate: "30 min" },
  "h1":           { effort: "quick",    impact: 6,  timeEstimate: "30 min" },
  "alt-text":     { effort: "quick",    impact: 4,  timeEstimate: "45 min" },
  "canonical":    { effort: "quick",    impact: 5,  timeEstimate: "30 min" },
  "org-schema":   { effort: "medium",   impact: 8,  timeEstimate: "1–2 hrs" },
  "faq-schema":   { effort: "medium",   impact: 7,  timeEstimate: "1–2 hrs" },
  "lh-seo":       { effort: "medium",   impact: 6,  timeEstimate: "2–4 hrs" },
  "perf-med":     { effort: "medium",   impact: 5,  timeEstimate: "2–4 hrs" },
  "perf":         { effort: "medium",   impact: 8,  timeEstimate: "4–8 hrs" },
  "aeo-content":  { effort: "strategic", impact: 15, timeEstimate: "4 hrs/mo" },
  "kw-coverage":  { effort: "strategic", impact: 12, timeEstimate: "Ongoing" },
  "a11y":         { effort: "medium",   impact: 4,  timeEstimate: "2 hrs" },
};

function getEffortMeta(rec: { id: string; priority: string }): EffortMeta {
  const match = EFFORT_MAP[rec.id];
  if (match) return match;
  if (rec.priority === "critical") return { effort: "medium", impact: 6, timeEstimate: "4–8 hrs" };
  if (rec.priority === "high")     return { effort: "medium", impact: 4, timeEstimate: "1–2 hrs" };
  return { effort: "strategic", impact: 3, timeEstimate: "Ongoing" };
}

// ── Streak Calculation ────────────────────────────────────────────────────

function calculateStreak(audits: AuditRecord[]): number {
  if (audits.length < 2) return 0;
  let streak = 0;
  for (let i = 0; i < audits.length - 1; i++) {
    if (audits[i].overall_score >= audits[i + 1].overall_score) streak++;
    else break;
  }
  return streak;
}

// ── Site Switcher ─────────────────────────────────────────────────────────

function SiteSwitcher({
  websites,
  activeSiteId,
  onSelect,
}: {
  websites: WebsiteRecord[];
  activeSiteId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = websites.find((w) => w.id === activeSiteId) ?? websites[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (websites.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors text-sm"
      >
        <Globe className="w-3.5 h-3.5 text-ink-4 shrink-0" />
        <span className="text-white font-medium max-w-[140px] truncate">{active?.domain ?? "Select site"}</span>
        {active?.latest_score != null && (
          <span className={`text-xs font-bold tabular-nums ${scoreColor(active.latest_score)}`}>
            {active.latest_score}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-ink-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full mt-2 w-64 bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            <div className="px-3 py-2 border-b border-white/8">
              <p className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Your Sites</p>
            </div>
            <div className="py-1 max-h-60 overflow-y-auto">
              {websites.map((w) => (
                <button
                  key={w.id}
                  onClick={() => { onSelect(w.id); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left ${
                    w.id === activeSiteId ? "bg-brand/12" : "hover:bg-white/5"
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center shrink-0">
                    <Globe className="w-3.5 h-3.5 text-ink-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{w.domain}</p>
                    <p className="text-xs text-ink-4">{w.audit_count} audit{w.audit_count !== 1 ? "s" : ""}</p>
                  </div>
                  {w.latest_score != null && (
                    <span className={`text-xs font-black tabular-nums shrink-0 ${scoreColor(w.latest_score)}`}>
                      {w.latest_score}
                    </span>
                  )}
                  {w.id === activeSiteId && (
                    <CheckCircle className="w-3.5 h-3.5 text-brand-light shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────

function Sidebar({ activeTab, onTab, onSignOut, userName, plan }: {
  activeTab: string; onTab: (t: string) => void; onSignOut: () => void;
  userName: string; plan: string;
}) {
  const navItems = [
    { id: "overview",     icon: LayoutDashboard, label: "Overview" },
    { id: "my-sites",     icon: Building2,       label: "My Sites" },
    { id: "reports",      icon: FileText,        label: "All Reports" },
    { id: "action-plan",  icon: CalendarDays,    label: "Action Plan" },
    { id: "compete",      icon: Users,           label: "Competitor Radar" },
    { id: "settings",     icon: Settings,        label: "Settings" },
  ];
  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-gray-100 bg-surface min-h-screen sticky top-0">
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
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => onTab(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === id ? "bg-brand/15 text-brand-light border border-brand/20" : "text-ink-3 hover:text-ink-2 hover:bg-gray-50"}`}>
            <Icon className="w-4 h-4 shrink-0" />{label}
          </button>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs font-semibold text-ink-2 truncate">{userName}</p>
          <span className="text-xs bg-brand/15 text-brand-light border border-brand/20 px-1.5 py-0.5 rounded font-bold capitalize">{plan}</span>
        </div>
        <button onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-ink-4 hover:text-ink-2 hover:bg-gray-50 transition-all">
          <LogOut className="w-4 h-4 shrink-0" />Sign out
        </button>
      </div>
    </aside>
  );
}

// ── My Sites Tab ───────────────────────────────────────────────────────────

function MySitesTab({
  websites,
  onNewAudit,
  onViewReports,
}: {
  websites: WebsiteRecord[];
  onNewAudit: () => void;
  onViewReports: (siteId: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">My Sites</h3>
          <p className="text-xs text-ink-4 mt-0.5">{websites.length} site{websites.length !== 1 ? "s" : ""} tracked</p>
        </div>
        <button
          onClick={onNewAudit}
          className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />Add Site
        </button>
      </div>

      {websites.length === 0 ? (
        <div className="card rounded-2xl p-12 text-center">
          <Building2 className="w-10 h-10 text-ink-4 mx-auto mb-3" />
          <p className="text-sm text-ink-3 font-medium mb-4">No sites tracked yet</p>
          <p className="text-xs text-ink-4 mb-5">Run your first audit to start tracking a website.</p>
          <button
            onClick={onNewAudit}
            className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />Audit a Site
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {websites.map((site, i) => (
            <motion.div
              key={site.id}
              className="card rounded-2xl p-5 flex flex-col gap-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-ink-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{site.domain}</p>
                  <a
                    href={site.url.startsWith("http") ? site.url : `https://${site.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-ink-4 hover:text-ink-2 transition-colors flex items-center gap-1 mt-0.5"
                  >
                    <span className="truncate max-w-[120px]">{site.url.replace(/^https?:\/\//, "")}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>

              {/* Score badge */}
              {site.latest_score != null ? (
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${scoreBg(site.latest_score)}`}>
                  <span className={`text-2xl font-black tabular-nums ${scoreColor(site.latest_score)}`}>
                    {site.latest_score}
                  </span>
                  <div>
                    <p className={`text-xs font-semibold ${scoreColor(site.latest_score)}`}>
                      {scoreLabel(site.latest_score)}
                    </p>
                    {site.latest_audit_at && (
                      <p className="text-xs text-ink-4 mt-0.5">{formatDate(site.latest_audit_at)}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/8 bg-white/3">
                  <span className="text-2xl font-black text-white/20">—</span>
                  <p className="text-xs text-ink-4">No audit yet</p>
                </div>
              )}

              {/* Audit count */}
              <p className="text-xs text-ink-4">
                <span className="font-semibold text-ink-3">{site.audit_count}</span> audit{site.audit_count !== 1 ? "s" : ""} run
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-auto pt-1">
                <button
                  onClick={() => onViewReports(site.id)}
                  className="flex-1 text-xs font-semibold text-white bg-white/8 hover:bg-white/12 border border-white/10 px-3 py-2 rounded-xl transition-colors text-center"
                >
                  View Reports
                </button>
                <Link
                  href={`/?url=${encodeURIComponent(site.url)}`}
                  className="flex-1 text-xs font-semibold text-brand-light bg-brand/10 hover:bg-brand/15 border border-brand/20 px-3 py-2 rounded-xl transition-colors text-center"
                >
                  Run Audit
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────

function OverviewTab({
  audits,
  profile,
  onNewAudit,
  onPlanCheckout,
  checkoutLoading,
}: {
  audits: AuditRecord[];
  profile: Profile | null;
  onNewAudit: () => void;
  onPlanCheckout?: (plan: "starter" | "growth" | "authority") => void;
  checkoutLoading?: string | null;
}) {
  const latest = audits[0];
  const previous = audits[1];
  const diff = latest && previous ? latest.overall_score - previous.overall_score : null;
  const chartData = [...audits].reverse().slice(-12).map(a => ({ date: formatShortDate(a.created_at), score: a.overall_score }));
  const pillars = latest?.data?.pillars ?? {};
  const recs = latest?.data?.recommendations ?? [];
  const industry = profile?.industry ?? null;
  const industryLabel = industry ? INDUSTRIES.find(i => i.key === industry)?.label : null;
  const benchmarks = industry ? INDUSTRY_BENCHMARKS[industry] : null;
  const pillarKeys = ["performance", "technicalSeo", "contentKeywords", "geoReadiness", "aeoReadiness", "accessibility", "cro", "analytics"];
  const streak = calculateStreak(audits);

  return (
    <div className="space-y-6">
      {/* Choose a plan CTA */}
      {onPlanCheckout && (
        <motion.div className="rounded-2xl p-5 border border-brand/20 bg-gradient-to-br from-brand/10 to-transparent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-bold text-ink-4 uppercase tracking-widest mb-2">Get your site fixed</p>
          <p className="text-sm font-semibold text-white mb-3">Choose a plan — we deliver the fixes or you unlock the full report and do it yourself.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onPlanCheckout("starter")} disabled={!!checkoutLoading}
              className="text-xs font-bold px-4 py-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-colors disabled:opacity-60">
              {checkoutLoading === "starter" ? "…" : "Starter £99"}
            </button>
            <button onClick={() => onPlanCheckout("growth")} disabled={!!checkoutLoading}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white transition-colors disabled:opacity-60">
              {checkoutLoading === "growth" ? "…" : "Growth £999 — We fix it"}
            </button>
            <button onClick={() => onPlanCheckout("authority")} disabled={!!checkoutLoading}
              className="text-xs font-bold px-4 py-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-colors disabled:opacity-60">
              {checkoutLoading === "authority" ? "…" : "Authority £1,999"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <motion.div className="card rounded-2xl p-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-xs text-ink-3 font-medium mb-1">Overall Score</p>
          <p className={`text-3xl font-black tabular-nums ${latest ? scoreColor(latest.overall_score) : "text-white/20"}`}>{latest?.overall_score ?? "—"}</p>
          {latest && <p className="text-xs text-ink-4 mt-1">{scoreLabel(latest.overall_score)}</p>}
        </motion.div>
        <motion.div className="card rounded-2xl p-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-xs text-ink-3 font-medium mb-1">vs Last Audit</p>
          <div className="flex items-center gap-1">
            {diff === null ? <p className="text-3xl font-black text-white/20">—</p>
              : diff > 0 ? <><ArrowUpRight className="w-5 h-5 text-green-400" /><p className="text-3xl font-black text-green-400 tabular-nums">+{diff}</p></>
              : diff < 0 ? <><ArrowDownRight className="w-5 h-5 text-red-400" /><p className="text-3xl font-black text-red-400 tabular-nums">{diff}</p></>
              : <><Minus className="w-5 h-5 text-ink-4" /><p className="text-3xl font-black text-ink-4 tabular-nums">0</p></>}
          </div>
          <p className="text-xs text-ink-4 mt-1">pts change</p>
        </motion.div>
        <motion.div className="card rounded-2xl p-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <p className="text-xs text-ink-3 font-medium mb-1">Total Audits</p>
          <p className="text-3xl font-black text-white tabular-nums">{audits.length}</p>
          <p className="text-xs text-ink-4 mt-1">reports saved</p>
        </motion.div>
        <motion.div
          className={`rounded-2xl p-4 border ${streak >= 2 ? "border-orange-500/30" : "card"}`}
          style={streak >= 2 ? { background: "linear-gradient(135deg, rgba(251,146,60,0.12), rgba(245,158,11,0.08))" } : {}}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="text-xs text-ink-3 font-medium mb-1">Streak</p>
          <p className={`text-3xl font-black tabular-nums ${streak >= 2 ? "text-orange-400" : "text-white/20"}`}>
            {streak >= 2 ? `${streak}` : streak === 1 ? "1" : "0"}
            {streak >= 2 && <span className="ml-1">🔥</span>}
          </p>
          <p className="text-xs text-ink-4 mt-1">
            {streak >= 2
              ? `${streak}-week improvement streak`
              : streak === 1
                ? "1-week streak — keep going!"
                : "Start your streak by running a new audit"}
          </p>
        </motion.div>
      </div>

      {/* Score history + DNA chart side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div className="card rounded-2xl p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Score History</h3>
              <p className="text-xs text-ink-4 mt-0.5">Last {chartData.length} audit{chartData.length !== 1 ? "s" : ""}</p>
            </div>
            <button onClick={onNewAudit} className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
              <Plus className="w-3.5 h-3.5" />New Audit
            </button>
          </div>
          <ScoreChart data={chartData} />
        </motion.div>

        <motion.div className="card rounded-2xl p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-white">Score DNA</h3>
            <p className="text-xs text-ink-4 mt-0.5">
              {industry ? `Your scores vs ${industryLabel} industry average` : "All pillar scores at a glance"}
            </p>
          </div>
          {latest ? (
            <ScoreDNAChart pillars={pillars} industry={industry} />
          ) : (
            <div className="h-[260px] flex items-center justify-center text-ink-4 text-xs">Run your first audit to see the chart</div>
          )}
        </motion.div>
      </div>

      {/* Pillar breakdown with benchmarks */}
      {Object.keys(pillars).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <h3 className="text-xs font-semibold text-ink-3 uppercase tracking-widest mb-3">Pillar Breakdown {benchmarks ? "vs Industry Average" : ""}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {pillarKeys.map((key, i) => {
              const p = pillars[key];
              if (!p) return null;
              const bench = benchmarks ? benchmarks[i] : null;
              const delta = bench !== null ? p.score - bench : null;
              return (
                <div key={key} className="card rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-2 text-ink-3">{PILLAR_ICONS[key]}<span className="text-xs font-medium truncate">{p.label}</span></div>
                  <div className="flex items-end justify-between">
                    <span className={`text-xl font-black tabular-nums ${scoreColor(p.score)}`}>{p.score}</span>
                    {delta !== null && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${delta >= 0 ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"}`}>
                        {delta >= 0 ? "+" : ""}{delta} vs avg
                      </span>
                    )}
                  </div>
                  {bench !== null && (
                    <div className="mt-2">
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.score}%`, background: "linear-gradient(90deg,#7C3AED,#DB2777)" }} />
                      </div>
                      <p className="text-xs text-ink-4 mt-1">Avg: {bench}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Top recommendations */}
      {recs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h3 className="text-xs font-semibold text-ink-3 uppercase tracking-widest mb-3">Top Priorities</h3>
          <div className="space-y-2">
            {recs.slice(0, 4).map((rec) => {
              const cfg = PRIORITY_CFG[rec.priority as keyof typeof PRIORITY_CFG] ?? PRIORITY_CFG.medium;
              const Icon = cfg.icon;
              return (
                <div key={rec.id} className={`rounded-xl border p-4 ${cfg.wrap}`}>
                  <div className="flex items-start gap-3">
                    <Icon className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>{rec.priority}</span>
                        <span className="text-xs text-ink-4">{rec.category}</span>
                      </div>
                      <p className="text-xs font-semibold text-white">{rec.title}</p>
                      <p className="text-xs text-ink-4 mt-1 leading-snug">{rec.description}</p>
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <p className="text-xs text-ink-3 leading-snug"><span className="font-semibold">Fix: </span>{rec.fix}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Action Plan Tab ────────────────────────────────────────────────────────

interface ActionRec {
  id: string;
  title: string;
  priority: string;
  effort: EffortLevel;
  impact: number;
  timeEstimate: string;
}

const PHASE_CONFIG = {
  quick: {
    label: "30-Day Quick Wins",
    subtitle: "High impact, low effort — start here",
    color: "text-green-400",
    border: "border-green-500/20",
    bg: "bg-green-500/5",
    badge: "bg-green-500/15 text-green-400 border-green-500/20",
    barColor: "#10B981",
  },
  medium: {
    label: "60-Day Improvements",
    subtitle: "High impact, medium effort",
    color: "text-indigo-400",
    border: "border-indigo-500/20",
    bg: "bg-indigo-500/5",
    badge: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    barColor: "#7C3AED",
  },
  strategic: {
    label: "90-Day Strategic",
    subtitle: "Compounding returns over time",
    color: "text-amber-400",
    border: "border-amber-500/20",
    bg: "bg-amber-500/5",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    barColor: "#F59E0B",
  },
};

function ActionPlanTab({ audits, onNewAudit }: { audits: AuditRecord[]; onNewAudit: () => void }) {
  const latest = audits[0];
  const recs = latest?.data?.recommendations ?? [];
  const storageKey = latest ? `sitescore_action_plan_${latest.id}` : null;

  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setChecked(JSON.parse(saved) as Record<string, boolean>);
    } catch {}
  }, [storageKey]);

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] };
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  };

  const actionRecs: ActionRec[] = recs.map(rec => {
    const meta = getEffortMeta(rec);
    return { id: rec.id, title: rec.title, priority: rec.priority, ...meta };
  });

  const byEffort = {
    quick:    actionRecs.filter(r => r.effort === "quick"),
    medium:   actionRecs.filter(r => r.effort === "medium"),
    strategic: actionRecs.filter(r => r.effort === "strategic"),
  };

  const totalImpact = actionRecs.filter(r => checked[r.id]).reduce((sum, r) => sum + r.impact, 0);
  const totalItems = actionRecs.length;
  const doneItems = actionRecs.filter(r => checked[r.id]).length;

  if (!latest) {
    return (
      <div className="card rounded-2xl p-12 text-center">
        <CalendarDays className="w-10 h-10 text-ink-4 mx-auto mb-3" />
        <p className="text-sm text-ink-3 font-medium mb-4">No audit yet — run one to generate your action plan</p>
        <button onClick={onNewAudit} className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
          <Plus className="w-4 h-4" />Run First Audit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header progress */}
      <div className="card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Your 30/60/90 Day Plan</h3>
            <p className="text-xs text-ink-4 mt-0.5">Based on your latest audit · {latest.data?.health?.domain ?? latest.url}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-3 font-medium">{doneItems}/{totalItems} done</p>
            {totalImpact > 0 && (
              <p className="text-xs text-green-400 font-bold mt-0.5">+{totalImpact} pts potential</p>
            )}
          </div>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${totalItems > 0 ? (doneItems / totalItems) * 100 : 0}%`, background: "linear-gradient(90deg,#7C3AED,#10B981)" }}
          />
        </div>
      </div>

      {/* Phase groups */}
      {(["quick", "medium", "strategic"] as EffortLevel[]).map(phase => {
        const items = byEffort[phase];
        if (items.length === 0) return null;
        const cfg = PHASE_CONFIG[phase];
        const phaseImpact = items.reduce((sum, r) => sum + r.impact, 0);
        return (
          <motion.div key={phase} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</h4>
                <p className="text-xs text-ink-4 mt-0.5">{cfg.subtitle}</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.badge}`}>+{phaseImpact} pts max</span>
            </div>
            <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
              {items.map((rec, i) => {
                const isDone = !!checked[rec.id];
                return (
                  <div key={rec.id}
                    className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${i > 0 ? "border-t border-white/6" : ""} ${isDone ? "opacity-50" : ""}`}>
                    <button
                      onClick={() => toggle(rec.id)}
                      className="shrink-0 text-ink-3 hover:text-brand-light transition-colors"
                      aria-label={isDone ? "Mark incomplete" : "Mark complete"}>
                      {isDone ? (
                        <CheckSquare className="w-4 h-4 text-brand-light" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${isDone ? "line-through text-ink-4" : "text-white"}`}>{rec.title}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 shrink-0">
                      <span className="text-xs text-green-400 font-bold tabular-nums">+{rec.impact} pts</span>
                      <span className="text-xs text-ink-4">{rec.timeEstimate}</span>
                    </div>
                    <a
                      href="/#plans"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-brand-light border border-brand/20 bg-brand/8 hover:bg-brand/15 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                      <ShoppingCart className="w-3 h-3" />Fix for me
                    </a>
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      {recs.length === 0 && (
        <div className="card rounded-2xl p-8 text-center">
          <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-3" />
          <p className="text-sm text-white font-semibold">No action items found</p>
          <p className="text-xs text-ink-4 mt-1">Your site looks clean — run a new audit to refresh recommendations.</p>
        </div>
      )}
    </div>
  );
}

// ── Reports Tab ────────────────────────────────────────────────────────────

function ReportsTab({ audits, onNewAudit }: { audits: AuditRecord[]; onNewAudit: () => void }) {
  const pillarKeys = ["performance", "technicalSeo", "contentKeywords", "geoReadiness", "aeoReadiness", "accessibility", "cro", "analytics"];
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-ink-3 uppercase tracking-widest">All Reports ({audits.length})</h3>
        <button onClick={onNewAudit} className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
          <Plus className="w-3.5 h-3.5" />New Audit
        </button>
      </div>
      {audits.length === 0 ? (
        <div className="card rounded-2xl p-10 text-center"><p className="text-ink-4 text-sm">No reports yet. Run your first audit to get started.</p></div>
      ) : (
        <div className="space-y-2">
          {audits.map((audit, i) => {
            const domain = audit.data?.health?.domain ?? (() => { try { return new URL(audit.url).hostname; } catch { return audit.url; } })();
            return (
              <motion.div key={audit.id} className="card rounded-2xl p-4 flex items-center gap-4 hover:border-white/12 transition-colors group"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
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
                <div className="hidden sm:flex items-center gap-1">
                  {pillarKeys.map((key) => {
                    const p = audit.data?.pillars?.[key];
                    if (!p) return null;
                    return <div key={key} title={`${p.label}: ${p.score}`} className={`w-1.5 h-6 rounded-full ${p.score >= 70 ? "bg-green-400/60" : p.score >= 50 ? "bg-amber-400/60" : "bg-red-400/60"}`} />;
                  })}
                </div>
                <a href={audit.url} target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-ink-2 transition-colors" onClick={e => e.stopPropagation()}>
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

// ── Competitor Radar Tab ───────────────────────────────────────────────────

const COMPARE_SIGNALS = [
  { key: "hasCTA",            label: "CTA above fold" },
  { key: "hasOrgSchema",      label: "Org Schema" },
  { key: "hasFAQSchema",      label: "FAQ Schema" },
  { key: "hasGA4",            label: "Google Analytics 4" },
  { key: "hasGTM",            label: "Google Tag Manager" },
  { key: "hasMetaPixel",      label: "Meta Pixel" },
  { key: "hasPhone",          label: "Phone visible" },
  { key: "hasReviewMentions", label: "Review mentions" },
  { key: "hasFreeTrialMention", label: "Free trial offer" },
];

function CompetitorRadarTab({ ownAudit }: { ownAudit: AuditRecord | null }) {
  const [urls, setUrls] = useState(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CompetitorResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyse = async () => {
    const valid = urls.filter(u => u.trim());
    if (!valid.length) return;
    setLoading(true); setError(null); setResults(null);
    try {
      const res = await fetch("/api/competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: valid }),
      });
      const data = await res.json() as { competitors?: CompetitorResult[]; error?: string };
      if (data.error) { setError(data.error); } else { setResults(data.competitors ?? []); }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const ownSignals = ownAudit?.data as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Competitor Radar</h3>
        <p className="text-xs text-ink-4 mb-4">Enter up to 3 competitor URLs. We&apos;ll analyse their signals and show exactly what they have that you don&apos;t.</p>
        <div className="card rounded-2xl p-5 space-y-3">
          {urls.map((url, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs font-bold text-ink-4 w-20 shrink-0">Competitor {i + 1}</span>
              <input
                type="text" value={url}
                onChange={e => setUrls(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                placeholder={`competitor${i + 1}.com`}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-ink-4 focus:outline-none focus:border-brand/50 transition-colors"
              />
              {url && <button onClick={() => setUrls(prev => { const n = [...prev]; n[i] = ""; return n; })} className="text-ink-4 hover:text-ink-2"><X className="w-4 h-4" /></button>}
            </div>
          ))}
          <div className="pt-2">
            <button onClick={handleAnalyse} disabled={loading || !urls.some(u => u.trim())}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Analysing…</> : <>Analyse Competitors</>}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="card rounded-xl p-4 border-red-500/20 bg-red-500/5 text-red-400 text-sm">{error}</div>}

      {results && results.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-ink-3 uppercase tracking-widest mb-3">Signal Comparison</h3>
          <div className="card rounded-2xl overflow-hidden">
            <div className="grid border-b border-white/8 bg-white/3" style={{ gridTemplateColumns: `1fr repeat(${results.length + 1}, 1fr)` }}>
              <div className="px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wider">Signal</div>
              <div className="px-3 py-3 text-xs font-bold text-brand-light truncate">Your Site</div>
              {results.map(r => (
                <div key={r.domain} className="px-3 py-3 text-xs font-bold text-white truncate">{r.domain}</div>
              ))}
            </div>
            {COMPARE_SIGNALS.map(({ key, label }) => (
              <div key={key} className="grid border-b border-white/5 hover:bg-white/2 transition-colors" style={{ gridTemplateColumns: `1fr repeat(${results.length + 1}, 1fr)` }}>
                <div className="px-4 py-3 text-xs font-medium text-ink-3">{label}</div>
                <div className="px-3 py-3">
                  {(ownSignals?.[key] as boolean) ? <CheckSquare className="w-4 h-4 text-brand" /> : <XSquare className="w-4 h-4 text-white/20" />}
                </div>
                {results.map(r => (
                  <div key={r.domain} className="px-3 py-3">
                    {r.error ? <span className="text-xs text-red-400/60">err</span>
                      : (r[key as keyof CompetitorResult] as boolean) ? <CheckSquare className="w-4 h-4 text-green-400" /> : <XSquare className="w-4 h-4 text-white/20" />}
                  </div>
                ))}
              </div>
            ))}
            {results.some(r => r.topKeywords?.length) && (
              <div className="grid border-b border-white/5" style={{ gridTemplateColumns: `1fr repeat(${results.length + 1}, 1fr)` }}>
                <div className="px-4 py-3 text-xs font-medium text-ink-3">Top Keywords</div>
                <div className="px-3 py-3">
                  {(ownAudit?.data?.keywords?.top ?? []).slice(0, 3).map(k => (
                    <span key={k.word} className="inline-block text-xs bg-brand/15 text-brand-light rounded px-1.5 py-0.5 mr-1 mb-1">{k.word}</span>
                  ))}
                </div>
                {results.map(r => (
                  <div key={r.domain} className="px-3 py-3">
                    {(r.topKeywords ?? []).slice(0, 3).map(k => (
                      <span key={k} className="inline-block text-xs bg-white/8 text-ink-3 rounded px-1.5 py-0.5 mr-1 mb-1">{k}</span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!results && !loading && (
        <div className="card rounded-2xl p-8 text-center">
          <Users className="w-10 h-10 text-ink-4 mx-auto mb-3" />
          <p className="text-sm text-ink-3 font-medium">Enter competitor URLs above to see a side-by-side signal comparison</p>
          <p className="text-xs text-ink-4 mt-1">We check CTA, schema, analytics, trust signals, and keywords — no account needed on their end</p>
        </div>
      )}
    </div>
  );
}

// ── Settings Tab ───────────────────────────────────────────────────────────

function SettingsTab({ profile, onIndustryChange }: { profile: Profile | null; onIndustryChange: () => void }) {
  const industryLabel = profile?.industry ? INDUSTRIES.find(i => i.key === profile.industry)?.label : null;
  return (
    <div className="max-w-lg space-y-6">
      <div className="card rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Account</h3>
        <div className="space-y-3">
          <div><label className="text-xs text-ink-3 font-medium">Name</label><p className="text-sm text-white mt-1">{profile?.full_name ?? "—"}</p></div>
          <div><label className="text-xs text-ink-3 font-medium">Email</label><p className="text-sm text-white mt-1">{profile?.email ?? "—"}</p></div>
          <div><label className="text-xs text-ink-3 font-medium">Plan</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-white capitalize">{profile?.plan ?? "free"}</span>
              <Link href="/#plans" className="text-xs text-brand-light hover:text-white transition-colors underline underline-offset-2">Upgrade</Link>
            </div>
          </div>
        </div>
      </div>
      <div className="card rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Industry Vertical</h3>
        <p className="text-xs text-ink-3 mb-3">Your industry determines benchmark scores and conversion recommendations.</p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white">{industryLabel ?? "Not set"}</span>
          <button onClick={onIndustryChange} className="text-xs font-semibold text-brand-light hover:text-white transition-colors underline underline-offset-2">
            {industryLabel ? "Change" : "Set Industry"}
          </button>
        </div>
      </div>
      <div className="card rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-2">Phase 3 Features</h3>
        <div className="space-y-2">
          {[
            { label: "Fix streak gamification", done: true },
            { label: "Shareable score cards", done: true },
            { label: "30/60/90 day action plan", done: true },
            { label: "Multi-site management", done: true },
            { label: "Weekly email digest", done: false },
            { label: "Schema Generator tool", done: false },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-2 text-sm text-ink-3">
              {f.done
                ? <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                : <Lock className="w-3.5 h-3.5 text-brand-light shrink-0" />}
              {f.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [websites, setWebsites] = useState<WebsiteRecord[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showIndustryModal, setShowIndustryModal] = useState(false);

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const [auditsRes, profileRes, websitesRes] = await Promise.all([
        fetch("/api/reports"),
        fetch("/api/profile"),
        fetch("/api/websites"),
      ]);
      if (auditsRes.ok) {
        const { audits: data } = await auditsRes.json() as { audits: AuditRecord[] };
        setAudits(data ?? []);
      }
      if (profileRes.ok) {
        const { profile: p } = await profileRes.json() as { profile: Profile };
        setProfile(p);
        if (!p?.industry) setShowIndustryModal(true);
      }
      if (websitesRes.ok) {
        const { websites: ws } = await websitesRes.json() as { websites: WebsiteRecord[] };
        setWebsites(ws ?? []);
      }
    } finally {
      setFetching(false);
    }
  }, []);

  // Auto-select active site from most recent audit
  useEffect(() => {
    if (activeSiteId || websites.length === 0 || audits.length === 0) return;
    const latestAuditDomain = (() => {
      try { return new URL(audits[0].url).hostname; } catch { return null; }
    })();
    const match = latestAuditDomain ? websites.find(w => w.domain === latestAuditDomain) : null;
    setActiveSiteId(match?.id ?? websites[0]?.id ?? null);
  }, [audits, websites, activeSiteId]);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/"); return; }
    if (user) fetchData();
  }, [user, authLoading, fetchData, router]);

  // Restore audit saved before OAuth redirect (create-account flow)
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("pendingAudit");
      if (!raw) return;
      const { auditData } = JSON.parse(raw) as { auditData: unknown; url?: string };
      sessionStorage.removeItem("pendingAudit");
      fetch("/api/reports/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditData }),
      }).then((res) => { if (res.ok) fetchData(); });
    } catch {}
  }, [user, fetchData]);

  const handleIndustryComplete = (industry: IndustryKey) => {
    setProfile(prev => prev ? { ...prev, industry } : null);
    setShowIndustryModal(false);
  };

  const handleNewAudit = () => router.push("/");

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const handlePlanCheckout = async (plan: "starter" | "growth" | "authority") => {
    setCheckoutLoading(plan);
    try {
      const site = websites.find(w => w.id === activeSiteId);
      let domain = site?.domain ?? "";
      if (!domain && audits[0]?.url) { try { domain = new URL(audits[0].url).hostname; } catch {} }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email: user?.email ?? undefined, domain }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "Checkout failed");
    } catch {
      alert("Could not start checkout.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleViewReports = (siteId: string) => {
    setActiveSiteId(siteId);
    setActiveTab("reports");
  };

  // Filter audits to the active site
  const filteredAudits = (() => {
    if (!activeSiteId) return audits;
    const site = websites.find(w => w.id === activeSiteId);
    if (!site) return audits;
    return audits.filter(a => {
      try { return new URL(a.url).hostname === site.domain; } catch { return false; }
    });
  })();

  if (authLoading || fetching) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-brand animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const userName = profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? "Member";

  const tabs = [
    { id: "overview",    icon: LayoutDashboard, label: "Overview" },
    { id: "my-sites",    icon: Building2,       label: "Sites" },
    { id: "reports",     icon: FileText,        label: "Reports" },
    { id: "action-plan", icon: CalendarDays,    label: "Plan" },
    { id: "compete",     icon: Users,           label: "Compete" },
    { id: "settings",    icon: Settings,        label: "Settings" },
  ];

  const headerLabel: Record<string, string> = {
    "overview":    "Overview",
    "my-sites":    "My Sites",
    "reports":     "All Reports",
    "action-plan": "Action Plan",
    "compete":     "Competitor Radar",
    "settings":    "Settings",
  };

  const activeSite = websites.find(w => w.id === activeSiteId);

  return (
    <div className="min-h-screen bg-surface flex">
      <IndustryOnboarding isOpen={showIndustryModal} onComplete={handleIndustryComplete} />

      <Sidebar activeTab={activeTab} onTab={setActiveTab} onSignOut={signOut}
        userName={userName} plan={profile?.plan ?? "free"} />

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
        <button onClick={handleNewAudit} className="inline-flex items-center gap-1.5 bg-brand text-white text-xs font-bold px-3 py-1.5 rounded-lg">
          <Plus className="w-3 h-3" />New Audit
        </button>
      </div>

      <main className="flex-1 min-w-0">
        {/* Header */}
        <div className="sticky top-0 z-40 border-b border-gray-100 bg-surface/80 backdrop-blur-xl px-6 md:px-8 h-16 flex items-center justify-between mt-14 md:mt-0">
          <div>
            <h1 className="text-sm font-semibold text-white">{headerLabel[activeTab] ?? activeTab}</h1>
            {activeSite
              ? <p className="text-xs text-ink-4">{activeSite.domain}</p>
              : audits[0] && <p className="text-xs text-ink-4">{audits[0].data?.health?.domain ?? "your website"}</p>
            }
          </div>
          <div className="flex items-center gap-2">
            {websites.length > 1 && activeTab !== "my-sites" && (
              <SiteSwitcher
                websites={websites}
                activeSiteId={activeSiteId}
                onSelect={setActiveSiteId}
              />
            )}
            <button onClick={fetchData} className="p-2 rounded-lg hover:bg-gray-50 text-ink-4 hover:text-ink-2 transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <FixCart domain={activeSite?.domain ?? audits[0]?.data?.health?.domain ?? ""} />
            {audits[0] && <ExportPDF audit={audits[0]} />}
            <button onClick={handleNewAudit} className="hidden sm:inline-flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
              <Plus className="w-3.5 h-3.5" />New Audit
            </button>
          </div>
        </div>

        {/* Mobile bottom tabs */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-gray-100 bg-surface/95 backdrop-blur-xl flex">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${activeTab === id ? "text-brand-light" : "text-ink-4"}`}>
              <Icon className="w-5 h-5" />{label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-6 md:px-8 py-6 pb-24 md:pb-8 max-w-5xl">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {activeTab === "overview"    && <OverviewTab audits={filteredAudits} profile={profile} onNewAudit={handleNewAudit} onPlanCheckout={handlePlanCheckout} checkoutLoading={checkoutLoading} />}
              {activeTab === "my-sites"    && <MySitesTab websites={websites} onNewAudit={handleNewAudit} onViewReports={handleViewReports} />}
              {activeTab === "reports"     && <ReportsTab audits={filteredAudits} onNewAudit={handleNewAudit} />}
              {activeTab === "action-plan" && <ActionPlanTab audits={filteredAudits} onNewAudit={handleNewAudit} />}
              {activeTab === "compete"     && <CompetitorRadarTab ownAudit={filteredAudits[0] ?? null} />}
              {activeTab === "settings"    && <SettingsTab profile={profile} onIndustryChange={() => setShowIndustryModal(true)} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
