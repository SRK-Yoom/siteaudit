"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Zap, BarChart2, Globe, Shield, Lock, ArrowRight, RotateCcw,
  ExternalLink, AlertTriangle, AlertCircle, CheckCircle, ChevronRight,
  FileText, Tag, Link2, CheckSquare, XSquare, MinusSquare,
  TrendingUp, Brain, Sparkles, User, LayoutDashboard, LogOut, Save,
  Mail, Star, TrendingDown, Lightbulb, Target, Award, Users,
} from "lucide-react";
import { ScoreCircle } from "@/components/audit/ScoreCircle";
import { ScorePillar } from "@/components/audit/ScorePillar";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/lib/auth-context";

// ── Types ──────────────────────────────────────────────────────────────────

interface Check { label: string; passed: boolean; detail: string }
interface PillarData { score: number; label: string; description: string; points: number; maxPoints: number; checks: Check[] }
interface Recommendation { id: string; title: string; description: string; priority: "critical" | "high" | "medium"; category: string; fix: string }
interface Keyword { word: string; count: number; inTitle: boolean; inH1: boolean; inMetaDesc: boolean; inURL: boolean }
interface AuditData {
  score: number; url: string;
  health: { domain: string; isHTTPS: boolean; pageCount: number | null; hasRobots: boolean; hasSitemap: boolean; blockedByCrawlers: boolean; criticalIssues: number; highIssues: number; totalIssues: number; schemaTypesFound: string[]; htmlFetchError: boolean };
  pillars: { performance: PillarData; technicalSeo: PillarData; contentKeywords: PillarData; geoReadiness: PillarData; aeoReadiness: PillarData; accessibility: PillarData };
  keywords: { top: Keyword[]; coverageScore: number };
  recommendations: Recommendation[];
  gatedRecsCount: number;
}
type Stage = "idle" | "loading" | "email-gate" | "results" | "error";

// ── Constants ──────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  { icon: Globe, label: "Reaching your website…" },
  { icon: Zap, label: "Running PageSpeed analysis…" },
  { icon: Search, label: "Extracting keywords & content signals…" },
  { icon: Brain, label: "Analysing GEO & AEO readiness…" },
  { icon: Sparkles, label: "Calculating your score…" },
];

const PILLAR_ICONS: Record<string, React.ReactNode> = {
  performance: <Zap className="w-4 h-4" />,
  technicalSeo: <Search className="w-4 h-4" />,
  contentKeywords: <FileText className="w-4 h-4" />,
  geoReadiness: <Globe className="w-4 h-4" />,
  aeoReadiness: <Brain className="w-4 h-4" />,
  accessibility: <Shield className="w-4 h-4" />,
};

const PRIORITY_CFG = {
  critical: { icon: AlertTriangle, label: "Critical", wrap: "border-red-100 bg-red-50", badge: "bg-red-50 text-red-600 border-red-100", iconCls: "text-red-500" },
  high: { icon: AlertCircle, label: "High Priority", wrap: "border-amber-100 bg-amber-50", badge: "bg-amber-50 text-amber-600 border-amber-100", iconCls: "text-amber-500" },
  medium: { icon: CheckCircle, label: "Medium", wrap: "border-violet-100 bg-violet-50", badge: "bg-violet-50 text-violet-600 border-violet-100", iconCls: "text-violet-500" },
};

// ── NavBar ──────────────────────────────────────────────────────────────────

function NavBar({ onLogoClick, onSignIn, onSignUp }: {
  onLogoClick?: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-xl shadow-sm">
      <div className="max-w-content mx-auto px-6 h-16 flex items-center justify-between">
        <button onClick={onLogoClick} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
              <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" fill="none" strokeDasharray="28 16" strokeLinecap="round" transform="rotate(-90 10 10)" />
              <text x="10" y="14" textAnchor="middle" fontSize="8" fontWeight="800" fill="white" fontFamily="system-ui">S</text>
            </svg>
          </div>
          <span className="font-bold text-ink text-lg tracking-tight group-hover:text-brand transition-colors">SiteScore</span>
        </button>

        {!loading && (
          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative">
                <button onClick={() => setMenuOpen(v => !v)}
                  className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 transition-colors">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs text-ink-2 font-medium max-w-[100px] truncate hidden sm:block">
                    {user.user_metadata?.full_name ?? user.email?.split("@")[0]}
                  </span>
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden"
                      initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }}>
                      <button onClick={() => { setMenuOpen(false); router.push("/dashboard"); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-ink-2 hover:bg-gray-50 transition-colors">
                        <LayoutDashboard className="w-4 h-4 text-brand" />Dashboard
                      </button>
                      <div className="border-t border-gray-100" />
                      <button onClick={() => { setMenuOpen(false); signOut(); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-ink-3 hover:bg-gray-50 transition-colors">
                        <LogOut className="w-4 h-4" />Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <button onClick={onSignIn} className="text-sm text-ink-3 hover:text-ink transition-colors font-medium px-3 py-2">Sign In</button>
                <button onClick={onSignUp} className="btn-gradient inline-flex items-center gap-1.5 text-sm px-4 py-2">
                  Create Free Account
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

// ── Loading Screen ──────────────────────────────────────────────────────────

function LoadingScreen({ url }: { url: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep(s => s < LOADING_STEPS.length - 1 ? s + 1 : s), 3500);
    return () => clearInterval(id);
  }, []);
  let host = url;
  try { host = new URL(url).hostname; } catch {}

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-24 text-center">
      <div className="relative mb-10">
        <div className="w-24 h-24 rounded-full" style={{ border: "4px solid #F3F4F6", borderTopColor: "#7C3AED", animation: "spin 1.2s linear infinite" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          {LOADING_STEPS.map(({ icon: Icon }, i) => (
            <Icon key={i} className={`w-9 h-9 absolute transition-all duration-500 ${i === step ? "opacity-100 scale-100 text-brand" : "opacity-0 scale-75 text-ink-4"}`} />
          ))}
        </div>
      </div>
      <h2 className="text-2xl font-bold text-ink mb-2">Analysing <span className="gradient-text">{host}</span></h2>
      <AnimatePresence mode="wait">
        <motion.p key={step} className="text-ink-3 text-base" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
          {LOADING_STEPS[step].label}
        </motion.p>
      </AnimatePresence>
      <div className="mt-8 flex items-center gap-2">
        {LOADING_STEPS.map((_, i) => (
          <div key={i} className={`rounded-full transition-all duration-500 ${i <= step ? "w-6 h-1.5 bg-brand" : "w-1.5 h-1.5 bg-gray-200"}`} />
        ))}
      </div>
      <p className="mt-8 text-xs text-ink-4 max-w-sm leading-relaxed">
        Running a full PageSpeed scan, analysing HTML structure, extracting keywords, and checking GEO + AEO readiness. This takes 20–40 seconds.
      </p>
    </div>
  );
}

// ── Email Gate Screen ───────────────────────────────────────────────────────

function EmailGateScreen({ score, url, onSubmit }: { score: number; url: string; onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  let host = url;
  try { host = new URL(url).hostname; } catch {}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await onSubmit(email.trim());
  };

  const scoreLabel = score >= 90 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Needs Work" : "Critical Issues";
  const scoreColor = score >= 90 ? "#059669" : score >= 70 ? "#7C3AED" : score >= 50 ? "#D97706" : "#DC2626";

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center relative overflow-hidden">
      {/* Gradient orbs */}
      <div className="orb w-96 h-96 opacity-20 -top-24 -left-24" style={{ background: "radial-gradient(circle, #7C3AED, transparent)" }} />
      <div className="orb w-80 h-80 opacity-15 -bottom-16 -right-16" style={{ background: "radial-gradient(circle, #DB2777, transparent)" }} />

      <motion.div
        className="relative bg-white rounded-3xl p-8 sm:p-10 max-w-lg w-full shadow-2xl"
        style={{ boxShadow: "0 32px 80px rgba(124,58,237,0.15), 0 4px 16px rgba(0,0,0,0.06)" }}
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      >
        {/* Gradient top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{ background: "linear-gradient(90deg, #7C3AED, #C026D3, #DB2777)" }} />

        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: `${scoreColor}15`, border: `2px solid ${scoreColor}30` }}>
          <CheckCircle className="w-8 h-8" style={{ color: scoreColor }} />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-3"
          style={{ background: "rgba(124,58,237,0.08)", color: "#7C3AED", border: "1px solid rgba(124,58,237,0.15)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
          Audit complete for {host}
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-ink mb-2">
          Your report is <span className="gradient-text">ready!</span>
        </h2>
        <p className="text-ink-3 text-sm leading-relaxed mb-6">
          We found your overall score and a detailed breakdown across 6 pillars — including specific issues to fix.
          Enter your email to view the full report.
        </p>

        {/* Score teaser */}
        <div className="flex items-center justify-center gap-4 mb-6 p-4 rounded-2xl bg-gray-50 border border-gray-100">
          <div>
            <p className="text-xs text-ink-4 font-medium mb-0.5">Overall Score</p>
            <p className="text-4xl font-black tabular-nums" style={{ color: scoreColor }}>{score}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: scoreColor }}>{scoreLabel}</p>
          </div>
          <div className="w-px h-12 bg-gray-200" />
          <div className="text-left">
            <p className="text-xs text-ink-4 mb-1">What&apos;s inside your report:</p>
            {["6-pillar score breakdown", "Keyword analysis", "All fixes & recommendations"].map(item => (
              <div key={item} className="flex items-center gap-1.5 text-xs text-ink-3 mt-1">
                <CheckCircle className="w-3.5 h-3.5 text-brand shrink-0" />{item}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4" />
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required
              className="input-field w-full pl-10 pr-4 py-3.5 text-sm"
              autoFocus
            />
          </div>
          <button type="submit" disabled={loading || !email.trim()} className="btn-gradient w-full flex items-center justify-center gap-2 py-3.5 text-sm">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><span>View My Free Report</span><ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
        <p className="text-xs text-ink-4 mt-3">
          No spam. Unsubscribe anytime. Or{" "}
          <button onClick={() => onSubmit("")} className="text-brand hover:text-brand-dark underline underline-offset-2 transition-colors">
            skip for now
          </button>
        </p>
      </motion.div>
    </div>
  );
}

// ── Health Banner ───────────────────────────────────────────────────────────

function HealthBanner({ health }: { health: AuditData["health"] }) {
  const items = [
    { label: "Domain", value: health.domain, icon: <Globe className="w-3.5 h-3.5" /> },
    { label: "Pages", value: health.pageCount != null ? health.pageCount.toLocaleString() : "—", icon: <FileText className="w-3.5 h-3.5" /> },
    { label: "HTTPS", value: health.isHTTPS ? "Secure ✓" : "Not secure ✗", icon: <Shield className="w-3.5 h-3.5" />, alert: !health.isHTTPS },
    { label: "Robots.txt", value: health.hasRobots ? (health.blockedByCrawlers ? "⚠ Blocking" : "Valid ✓") : "Missing ✗", icon: <Link2 className="w-3.5 h-3.5" />, alert: !health.hasRobots || health.blockedByCrawlers },
    { label: "Sitemap", value: health.hasSitemap ? "Found ✓" : "Missing ✗", icon: <BarChart2 className="w-3.5 h-3.5" />, alert: !health.hasSitemap },
    { label: "Schema types", value: health.schemaTypesFound.length > 0 ? health.schemaTypesFound.slice(0, 3).join(", ") : "None found", icon: <Tag className="w-3.5 h-3.5" />, alert: health.schemaTypesFound.length === 0 },
  ];

  return (
    <div className="card rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-ink-3 uppercase tracking-widest">Site Health Overview</h3>
        {(health.criticalIssues > 0 || health.highIssues > 0) && (
          <div className="flex gap-2">
            {health.criticalIssues > 0 && <span className="text-xs font-bold bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-full">{health.criticalIssues} Critical</span>}
            {health.highIssues > 0 && <span className="text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100 px-2.5 py-1 rounded-full">{health.highIssues} High</span>}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map(item => (
          <div key={item.label} className={`rounded-xl p-3 ${item.alert ? "bg-red-50 border border-red-100" : "bg-gray-50 border border-gray-100"}`}>
            <div className={`flex items-center gap-1.5 mb-1 ${item.alert ? "text-red-500" : "text-ink-3"}`}>
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </div>
            <p className={`text-xs font-semibold truncate ${item.alert ? "text-red-600" : "text-ink-2"}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Keyword Section ─────────────────────────────────────────────────────────

function KwDot({ present }: { present: boolean }) {
  return (
    <div className="flex items-center justify-center">
      {present ? <CheckSquare className="w-4 h-4 text-brand" /> : <XSquare className="w-4 h-4 text-gray-300" />}
    </div>
  );
}

function KeywordSection({ keywords, coverageScore }: { keywords: Keyword[]; coverageScore: number }) {
  if (keywords.length === 0) return null;
  const FREE_LIMIT = 4;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-ink-3 uppercase tracking-widest">Keyword Analysis</h3>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${coverageScore >= 60 ? "bg-green-50 text-green-600 border-green-100" : coverageScore >= 30 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-red-50 text-red-600 border-red-100"}`}>
          {coverageScore}% keyword coverage
        </span>
      </div>
      <div className="card rounded-2xl overflow-hidden mb-8">
        <div className="grid grid-cols-5 gap-0 px-4 py-2 border-b border-gray-100 text-xs font-semibold text-ink-4 uppercase tracking-wide bg-gray-50">
          <div className="col-span-2">Keyword</div>
          <div className="text-center">Title</div>
          <div className="text-center">H1</div>
          <div className="text-center">Meta</div>
        </div>
        {keywords.slice(0, FREE_LIMIT).map((kw, i) => (
          <motion.div key={kw.word} className="grid grid-cols-5 gap-0 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-surface transition-colors"
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }}>
            <div className="col-span-2 flex items-center gap-2">
              {i === 0 && <span className="text-xs badge-brand px-1.5 py-0.5 rounded font-bold">Primary</span>}
              <span className="text-sm font-semibold text-ink">{kw.word}</span>
            </div>
            <KwDot present={kw.inTitle} />
            <KwDot present={kw.inH1} />
            <KwDot present={kw.inMetaDesc} />
          </motion.div>
        ))}
        {keywords.length > FREE_LIMIT && (
          <div className="relative">
            <div className="px-4 py-3 opacity-20 pointer-events-none select-none grid grid-cols-5 gap-0">
              <div className="col-span-2 text-sm font-semibold text-ink blur-sm">{keywords[FREE_LIMIT].word}</div>
              <div className="text-center blur-sm"><CheckSquare className="w-4 h-4 text-brand mx-auto" /></div>
              <div className="text-center blur-sm"><XSquare className="w-4 h-4 text-gray-300 mx-auto" /></div>
              <div className="text-center blur-sm"><CheckSquare className="w-4 h-4 text-brand mx-auto" /></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-white/80 to-white rounded-b-2xl">
              <p className="text-xs text-ink-4 flex items-center gap-1"><Lock className="w-3 h-3" />{keywords.length - FREE_LIMIT} more keywords — sign up to unlock</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Check List ──────────────────────────────────────────────────────────────

function CheckList({ checks, gated = false }: { checks?: Check[]; gated?: boolean }) {
  if (!checks || checks.length === 0) return null;
  const FREE = 3;
  const visible = checks.slice(0, FREE);
  const hidden = checks.slice(FREE);
  return (
    <div className="space-y-1.5 mt-3 pt-3 border-t border-gray-100">
      {visible.map((c, i) => (
        <div key={i} className="flex items-start gap-2">
          {c.passed ? <CheckSquare className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> : <XSquare className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />}
          <div className="min-w-0">
            <span className="text-xs font-semibold text-ink-2">{c.label}</span>
            <p className="text-xs text-ink-4 leading-snug mt-0.5">{c.detail}</p>
          </div>
        </div>
      ))}
      {gated && hidden.length > 0 && (
        <div className="relative mt-2">
          <div className="opacity-20 pointer-events-none select-none space-y-1.5">
            {hidden.slice(0, 2).map((c, i) => (
              <div key={i} className="flex items-start gap-2 blur-sm">
                <MinusSquare className="w-3.5 h-3.5 text-ink-4 shrink-0 mt-0.5" />
                <span className="text-xs text-ink-3">{c.label}</span>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-ink-4 flex items-center gap-1"><Lock className="w-3 h-3" />{hidden.length} more checks</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Results Screen ──────────────────────────────────────────────────────────

function ResultsScreen({ data, onReset, onSavePrompt, savedToAccount, onUpgrade }: {
  data: AuditData; onReset: () => void; onSavePrompt: () => void;
  savedToAccount: boolean; onUpgrade: () => void;
}) {
  const { user } = useAuth();
  const { score, url, health, pillars, keywords, recommendations, gatedRecsCount } = data;
  const freeRecs = recommendations.slice(0, 3);
  const gatedRecs = recommendations.slice(3);
  let host = url;
  try { host = new URL(url).hostname; } catch {}

  const verdict = score >= 90
    ? { h: "Your site is in great shape!", s: "You're ahead of most competitors. A few tweaks could push you even higher.", color: "#059669" }
    : score >= 70
      ? { h: "Solid foundation — but you're leaving traffic on the table.", s: "Fixing the issues below could meaningfully boost your rankings and AI visibility.", color: "#7C3AED" }
      : score >= 50
        ? { h: "Significant gaps are holding your site back.", s: "These issues are actively costing you traffic and potential customers right now.", color: "#D97706" }
        : { h: "Your site needs urgent attention.", s: "Critical issues are preventing search engines and AI systems from properly indexing your business.", color: "#DC2626" };

  const pillarList = [
    { key: "performance", ...(pillars.performance ?? {}) },
    { key: "technicalSeo", ...(pillars.technicalSeo ?? {}) },
    { key: "contentKeywords", ...(pillars.contentKeywords ?? {}) },
    { key: "geoReadiness", ...(pillars.geoReadiness ?? {}) },
    { key: "aeoReadiness", ...(pillars.aeoReadiness ?? {}) },
    { key: "accessibility", ...(pillars.accessibility ?? {}) },
  ];

  return (
    <div className="flex-1 pb-24 bg-surface">
      <div className="max-w-content mx-auto px-6">
        {/* Top bar */}
        <motion.div className="flex items-center justify-between py-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-2 text-sm text-ink-3">
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span className="font-medium text-ink-2 truncate max-w-[200px] sm:max-w-sm">{host}</span>
            <span>· mobile audit</span>
            {health.htmlFetchError && <span className="text-xs bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full">HTML fetch limited</span>}
          </div>
          <button onClick={onReset} className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />Audit another site
          </button>
        </motion.div>

        {/* Save banner */}
        <AnimatePresence>
          {savedToAccount ? (
            <motion.div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              <p className="text-sm text-green-700 font-medium flex-1">Saved to your dashboard.</p>
              <a href="/dashboard" className="text-xs text-green-600 hover:text-green-800 font-semibold underline underline-offset-2 transition-colors">View Dashboard →</a>
            </motion.div>
          ) : !user && (
            <motion.div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 flex-1">
                <Save className="w-4 h-4 text-brand shrink-0" />
                <div>
                  <p className="text-sm text-ink font-medium">Track this score over time</p>
                  <p className="text-xs text-ink-3">Create a free account to save this report and monitor progress with each fix.</p>
                </div>
              </div>
              <button onClick={onSavePrompt} className="btn-gradient inline-flex items-center gap-1.5 text-xs px-4 py-2 shrink-0 whitespace-nowrap">
                Save Free <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Score hero */}
        <motion.div className="card rounded-3xl p-8 sm:p-10 flex flex-col md:flex-row items-center gap-10 mb-6" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="shrink-0"><ScoreCircle score={score} size={200} /></div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink leading-tight">{verdict.h}</h2>
            <p className="text-ink-3 mt-3 text-base leading-relaxed max-w-lg">{verdict.s}</p>
            {(health.criticalIssues > 0 || health.highIssues > 0) && (
              <div className="mt-5 flex flex-wrap gap-2 justify-center md:justify-start">
                {health.criticalIssues > 0 && <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-full"><AlertTriangle className="w-3.5 h-3.5" />{health.criticalIssues} critical issue{health.criticalIssues > 1 ? "s" : ""}</span>}
                {health.highIssues > 0 && <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1.5 rounded-full"><AlertCircle className="w-3.5 h-3.5" />{health.highIssues} high-priority issue{health.highIssues > 1 ? "s" : ""}</span>}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <HealthBanner health={health} />
        </motion.div>

        {/* Pillars */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <h3 className="text-sm font-semibold text-ink-3 uppercase tracking-widest mb-4">Score Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {pillarList.map((p, i) => (
              <div key={p.key} className="flex flex-col">
                <ScorePillar label={p.label} description={p.description} score={p.score} points={p.points} maxPoints={p.maxPoints} icon={PILLAR_ICONS[p.key]} delay={250 + i * 70} />
                <CheckList checks={p.checks} gated={true} />
              </div>
            ))}
          </div>
        </motion.div>

        <KeywordSection keywords={keywords.top} coverageScore={keywords.coverageScore} />

        {/* Recommendations */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.45 }}>
          <h3 className="text-sm font-semibold text-ink-3 uppercase tracking-widest mb-4">What to Fix First</h3>
          <div className="space-y-3">
            {freeRecs.map((rec, i) => {
              const cfg = PRIORITY_CFG[rec.priority];
              const Icon = cfg.icon;
              return (
                <motion.div key={rec.id} className={`rounded-2xl border p-5 ${cfg.wrap}`} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.5 + i * 0.07 }}>
                  <div className="flex items-start gap-4">
                    <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${cfg.iconCls}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${cfg.badge}`}>{cfg.label}</span>
                        <span className="text-xs text-ink-4 font-medium">{rec.category}</span>
                      </div>
                      <p className="font-semibold text-sm text-ink">{rec.title}</p>
                      <p className="text-sm mt-1.5 leading-relaxed text-ink-3">{rec.description}</p>
                      <div className="mt-3 pt-3 border-t border-white/60">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-semibold text-ink-3 shrink-0 mt-0.5">How to fix:</span>
                          <div className="relative flex-1 min-w-0">
                            <p className="text-xs text-ink-4 leading-snug blur-sm select-none pointer-events-none" aria-hidden="true">{rec.fix}</p>
                            <div className="absolute inset-0 flex items-center gap-2">
                              <Lock className="w-3 h-3 text-brand shrink-0" />
                              <button onClick={onUpgrade} className="text-xs font-semibold text-brand hover:text-brand-dark transition-colors underline underline-offset-2">
                                Select a plan to unlock
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Gated recs */}
        {gatedRecs.length > 0 && (
          <motion.div className="mt-4 relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
            <div className="space-y-3 pointer-events-none select-none">
              {gatedRecs.slice(0, 2).map((rec, i) => {
                const cfg = PRIORITY_CFG[rec.priority];
                return (
                  <div key={i} className={`rounded-2xl border p-5 ${cfg.wrap} opacity-25 blur-sm`}>
                    <div className="flex items-start gap-4">
                      <div className="w-5 h-5 rounded bg-current shrink-0 mt-0.5" />
                      <div><div className="h-3 bg-ink/10 rounded w-24 mb-2" /><div className="h-2.5 bg-ink/5 rounded w-48" /></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-surface/80 to-surface rounded-2xl px-6 py-8 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
                <Lock className="w-6 h-6 text-brand" />
              </div>
              <p className="text-ink font-bold text-lg mb-1">{gatedRecsCount} more issue{gatedRecsCount > 1 ? "s" : ""} found</p>
              <p className="text-ink-3 text-sm max-w-xs mb-5">Our team can fix all of this for you. Book a free call and we&apos;ll walk through every issue.</p>
              <button onClick={onUpgrade} className="btn-gradient inline-flex items-center gap-2 px-6 py-3 text-sm">
                Get Full Report + Fix Plan <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ROI Banner */}
        <motion.div className="card rounded-2xl p-5 mt-8 mb-4" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.04), rgba(219,39,119,0.03))", borderColor: "rgba(124,58,237,0.1)" }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest mb-3">Why fixing this matters</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: <TrendingUp className="w-4 h-4" />, stat: "2.3×", desc: "more organic leads for sites scoring 90+", color: "#059669" },
              { icon: <Target className="w-4 h-4" />, stat: "+7%", desc: "conversion rate per 1-second load time improvement", color: "#7C3AED" },
              { icon: <Award className="w-4 h-4" />, stat: "30%", desc: "more AI search citations for sites with complete Schema", color: "#DB2777" },
            ].map(({ icon, stat, desc, color }, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}12`, color }}>
                  {icon}
                </div>
                <div>
                  <p className="text-lg font-black" style={{ color }}>{stat}</p>
                  <p className="text-xs text-ink-3 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pricing Plans */}
        <motion.div id="plans" className="mt-10" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.65 }}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 badge-brand px-4 py-2 rounded-full mb-4">
              <Lightbulb className="w-3.5 h-3.5" />We fix everything — you see results in 7 days
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-ink mb-2">Choose your fix plan</h3>
            <p className="text-ink-3 text-sm max-w-md mx-auto">
              Our team handles the entire fix list. Sites we fix typically see a 15–30 point score increase within 2 weeks.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              {
                name: "Starter", price: "$499", period: "one-time",
                desc: "Quick wins that move the needle fast",
                roi: "Average ROI: $1,200 in recovered organic traffic",
                features: ["Title & meta optimisation", "Basic Schema markup", "Speed quick-wins", "Full audit report PDF"],
                cta: "Get Started", highlight: false,
              },
              {
                name: "Growth", price: "$999", period: "one-time",
                desc: `Complete fix list for ${host}`,
                roi: "Average ROI: $3,500 in new organic revenue",
                features: ["Everything in Starter", "Full Technical SEO fix", "GEO & AEO Schema setup", "FAQ & HowTo schema", "Content keyword audit", "30-day results check-in"],
                cta: "Fix My Site", highlight: true,
              },
              {
                name: "Authority", price: "$1,999", period: "one-time",
                desc: "Complete overhaul + 90-day support",
                roi: "Average ROI: $8,000+ in new revenue",
                features: ["Everything in Growth", "Competitor gap analysis", "Content strategy brief", "Link building strategy", "Monthly reporting", "90-day Slack support"],
                cta: "Let's Talk", highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 flex flex-col relative transition-all duration-200 ${plan.highlight ? "shadow-glow-brand scale-[1.02]" : "card"}`}
                style={plan.highlight ? { background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(219,39,119,0.04))", border: "1.5px solid rgba(124,58,237,0.3)", boxShadow: "0 12px 40px rgba(124,58,237,0.15)" } : {}}
              >
                {plan.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 btn-gradient text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">Most Popular</div>}
                <p className="text-xs font-bold text-ink-4 uppercase tracking-widest mb-1">{plan.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-3xl font-black text-ink">{plan.price}</span>
                  <span className="text-ink-4 text-sm mb-1">/ {plan.period}</span>
                </div>
                <p className="text-xs text-ink-3 mb-1">{plan.desc}</p>
                <p className="text-xs font-semibold text-brand mb-4">{plan.roi}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-ink-2">
                      <CheckCircle className="w-3.5 h-3.5 text-brand shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onUpgrade}
                  className={`w-full text-center text-sm font-bold py-3 rounded-xl transition-all ${plan.highlight ? "btn-gradient" : "border border-gray-200 text-ink-2 hover:bg-gray-50 bg-white"}`}
                >
                  {plan.cta} <ArrowRight className="w-4 h-4 inline ml-1" />
                </button>
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-ink-4 text-xs">
              Not sure which plan?{" "}
              <button onClick={onUpgrade} className="text-brand hover:text-brand-dark underline underline-offset-2 transition-colors font-semibold">Book a free 30-min strategy call</button>
              {" "}— we&apos;ll tell you exactly what to fix first.
            </p>
          </div>
        </motion.div>

        {/* CTA Banner */}
        <motion.div className="rounded-3xl overflow-hidden mt-10" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.75 }}>
          <div className="relative p-8 sm:p-12 text-center overflow-hidden" style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 40%, #DB2777 100%)" }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-white/15 text-white/80 text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-white/20">
                <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />We fix sites like yours every week
              </div>
              <h3 className="text-2xl sm:text-4xl font-black text-white mb-4 leading-tight">
                We can fix <span className="text-yellow-300">{host}</span><br />in 7 days.
              </h3>
              <p className="text-white/70 text-base max-w-xl mx-auto mb-8 leading-relaxed">
                Our team handles everything — speed optimisation, Technical SEO, Schema markup, GEO & AEO readiness. One week. Measurable results.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={onUpgrade} className="inline-flex items-center justify-center gap-2 bg-white text-brand-dark font-bold px-8 py-4 rounded-2xl hover:bg-white/90 transition-colors text-base shadow-xl">
                  See Plans & Pricing <ArrowRight className="w-5 h-5" />
                </button>
                <button onClick={onUpgrade} className="inline-flex items-center justify-center gap-2 border border-white/25 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors text-base">
                  Free Strategy Call <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-white/40 text-xs mt-6">No commitment. Free 30-minute call to walk through your audit results.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Idle / Landing Screen ───────────────────────────────────────────────────

function IdleScreen({ onSubmit, inputUrl, setInputUrl, inputRef, onSignUp }: {
  onSubmit: (e: React.FormEvent) => void;
  inputUrl: string;
  setInputUrl: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  onSignUp: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-16 pb-16 text-center overflow-hidden">
        {/* Background orbs */}
        <div className="orb w-[500px] h-[500px] opacity-[0.07] -top-32 -left-32" style={{ background: "radial-gradient(circle, #7C3AED, transparent)" }} />
        <div className="orb w-[400px] h-[400px] opacity-[0.06] -top-16 -right-24" style={{ background: "radial-gradient(circle, #DB2777, transparent)" }} />
        <div className="orb w-[300px] h-[300px] opacity-[0.05] bottom-0 left-1/2" style={{ background: "radial-gradient(circle, #2563EB, transparent)" }} />

        <motion.div className="inline-flex items-center gap-2 badge-brand px-4 py-2 rounded-full mb-8" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse" />
          Free · Instant · No credit card required
        </motion.div>

        <motion.h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-ink leading-[1.08] tracking-tight mb-5 max-w-4xl"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}>
          Is your website ready<br />for the <span className="gradient-text">AI era?</span>
        </motion.h1>

        <motion.p className="text-lg sm:text-xl text-ink-3 max-w-xl mb-3 leading-relaxed"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
          Get your free SEO, GEO & AEO audit score in 30 seconds — with a full breakdown of what&apos;s holding you back and how much it&apos;s costing you.
        </motion.p>

        <motion.form onSubmit={onSubmit} className="w-full max-w-2xl"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
          <div className="flex flex-col sm:flex-row gap-2 p-2 bg-white border border-gray-200 rounded-2xl shadow-card">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-4 pointer-events-none" />
              <input
                ref={inputRef} type="text" value={inputUrl} onChange={e => setInputUrl(e.target.value)}
                placeholder="yourwebsite.com" autoFocus spellCheck={false} autoComplete="off"
                className="w-full pl-12 pr-4 py-3.5 bg-transparent text-ink placeholder:text-ink-4 text-base focus:outline-none rounded-xl url-input"
              />
            </div>
            <button type="submit" disabled={!inputUrl.trim()}
              className="btn-gradient inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base shrink-0">
              Get My Free Score <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-ink-4 mt-3 text-center">Powered by Google PageSpeed Insights · Works on any public website</p>
        </motion.form>

        {/* Social proof numbers */}
        <motion.div className="flex flex-wrap items-center justify-center gap-6 mt-10"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          {[
            { v: "90+", l: "score required to rank #1 in AI search" },
            { v: "2.3×", l: "more leads for high-scoring sites" },
            { v: "30s", l: "to get your full report" },
          ].map(({ v, l }) => (
            <div key={l} className="flex items-center gap-2">
              <span className="text-xl font-black gradient-text">{v}</span>
              <span className="text-xs text-ink-4 max-w-[120px] leading-tight">{l}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Why it matters */}
      <section className="bg-white border-y border-gray-100 px-6 py-14">
        <div className="max-w-content mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-ink-4 uppercase tracking-widest mb-2">Why this matters for your business</p>
            <h2 className="text-2xl sm:text-3xl font-black text-ink">Poor website health is costing you customers <span className="gradient-text">right now</span></h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <TrendingDown className="w-5 h-5" />, stat: "68%", desc: "of websites score below 60 on SEO — losing potential customers to competitors who outrank them", color: "#DC2626" },
              { icon: <Brain className="w-5 h-5" />, stat: "73%", desc: "of searches will be answered by AI by 2026. Sites without Schema markup won't be cited at all", color: "#7C3AED" },
              { icon: <Zap className="w-5 h-5" />, stat: "53%", desc: "of mobile visitors abandon a site that takes longer than 3 seconds to load, costing you enquiries", color: "#D97706" },
              { icon: <TrendingUp className="w-5 h-5" />, stat: "$15k+", desc: "estimated annual revenue lost by a typical SME with poor SEO and no structured data", color: "#059669" },
            ].map(({ icon, stat, desc, color }, i) => (
              <motion.div key={i} className="card rounded-2xl p-5"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}10`, color }}>
                  {icon}
                </div>
                <p className="text-3xl font-black mb-2" style={{ color }}>{stat}</p>
                <p className="text-xs text-ink-3 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-14">
        <div className="max-w-content mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-ink-4 uppercase tracking-widest mb-2">How it works</p>
            <h2 className="text-2xl sm:text-3xl font-black text-ink">Your audit in <span className="gradient-text">3 simple steps</span></h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: "01", icon: <Search className="w-6 h-6" />, title: "Enter your URL", desc: "Just paste your website URL above. No account needed. No credit card. Nothing to install." },
              { step: "02", icon: <Brain className="w-6 h-6" />, title: "We analyse 6 pillars", desc: "Our engine runs PageSpeed analysis, scrapes your HTML, checks Schema markup, keywords, robots.txt, and 40+ signals." },
              { step: "03", icon: <Target className="w-6 h-6" />, title: "Get your score + fix plan", desc: "Receive a detailed score across SEO, GEO, AEO, Performance and more — with prioritised recommendations." },
            ].map(({ step, icon, title, desc }, i) => (
              <motion.div key={step} className="flex flex-col items-center text-center relative"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }}>
                {i < 2 && <div className="hidden sm:block absolute top-8 left-[60%] w-[40%] h-px border-t-2 border-dashed border-gray-200" />}
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 relative" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(219,39,119,0.06))", border: "1px solid rgba(124,58,237,0.15)" }}>
                  <div className="text-brand">{icon}</div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>{i + 1}</div>
                </div>
                <h3 className="font-bold text-ink mb-2">{title}</h3>
                <p className="text-sm text-ink-3 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What we analyse */}
      <section className="bg-white border-y border-gray-100 px-6 py-14">
        <div className="max-w-content mx-auto">
          <p className="text-center text-xs font-semibold text-ink-4 uppercase tracking-widest mb-8">6 pillars analysed in every audit</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: <Zap className="w-5 h-5" />, label: "Performance", sub: "Core Web Vitals, speed, mobile score" },
              { icon: <Search className="w-5 h-5" />, label: "Technical SEO", sub: "Meta, sitemap, crawlability, HTTPS" },
              { icon: <FileText className="w-5 h-5" />, label: "Content & Keywords", sub: "Keyword placement, headings, depth" },
              { icon: <Globe className="w-5 h-5" />, label: "GEO Readiness", sub: "AI citation, Schema, entity signals" },
              { icon: <Brain className="w-5 h-5" />, label: "AEO Readiness", sub: "Featured snippets, FAQ, voice search" },
              { icon: <Shield className="w-5 h-5" />, label: "Accessibility", sub: "WCAG compliance, best practices" },
            ].map(({ icon, label, sub }, i) => (
              <motion.div key={label} className="card rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center hover:scale-[1.02] transition-transform"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 + i * 0.07 }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-brand" style={{ background: "rgba(124,58,237,0.08)" }}>{icon}</div>
                <div>
                  <p className="text-xs font-bold text-ink leading-tight">{label}</p>
                  <p className="text-xs text-ink-4 mt-0.5 leading-snug">{sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-14">
        <div className="max-w-content mx-auto">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold text-ink-4 uppercase tracking-widest mb-2">What clients say</p>
            <h2 className="text-2xl sm:text-3xl font-black text-ink">Real results, <span className="gradient-text">real businesses</span></h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { name: "Priya S.", role: "Founder, E-commerce brand", quote: "My score was 41 when I first ran the audit. After the team fixed the issues, it jumped to 79 in two weeks. Organic traffic went up 40%.", stars: 5 },
              { name: "Marcus T.", role: "Head of Marketing, SaaS startup", quote: "The AEO recommendations were eye-opening. We had zero FAQ schema. After adding it, we started appearing in Google AI answers within days.", stars: 5 },
              { name: "Aisha M.", role: "Business owner, Local services", quote: "I had no idea what Schema markup was. The audit showed me exactly what was missing. The fix team set everything up and now my business appears in AI search.", stars: 5 },
            ].map(({ name, role, quote, stars }) => (
              <div key={name} className="card rounded-2xl p-5">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: stars }).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-ink-2 leading-relaxed mb-4">&ldquo;{quote}&rdquo;</p>
                <div>
                  <p className="text-sm font-bold text-ink">{name}</p>
                  <p className="text-xs text-ink-4">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 pb-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card rounded-3xl p-8 sm:p-10" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(219,39,119,0.04))", borderColor: "rgba(124,58,237,0.15)" }}>
            <h2 className="text-2xl sm:text-3xl font-black text-ink mb-3">
              Don&apos;t let your competitors rank above you.<br />
              <span className="gradient-text">Check your score — free.</span>
            </h2>
            <p className="text-ink-3 mb-6 text-sm">No signup needed. Takes 30 seconds. Find out what&apos;s holding your website back right now.</p>
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="btn-gradient inline-flex items-center gap-2 px-8 py-4 text-base">
              Run My Free Audit <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-xs text-ink-4 mt-4 flex items-center justify-center gap-4">
              <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-500" />Free forever</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-500" />No credit card</span>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-brand" />Join 500+ businesses</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("idle");
  const [inputUrl, setInputUrl] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [pendingSave, setPendingSave] = useState(false);
  const [savedToAccount, setSavedToAccount] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && pendingSave && auditData) {
      setPendingSave(false);
      saveAudit(auditData);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pendingSave, auditData]);

  const saveAudit = useCallback(async (data: AuditData) => {
    try {
      const res = await fetch("/api/reports/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditData: data }),
      });
      if (res.ok) setSavedToAccount(true);
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = inputUrl.trim();
    if (!url) return;
    setSubmittedUrl(url);
    setStage("loading");
    setErrorMsg(""); setSavedToAccount(false);
    try {
      const res = await fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json() as AuditData & { error?: string };
      if (!res.ok || data.error) { setErrorMsg(data.error ?? "Something went wrong."); setStage("error"); return; }
      setAuditData(data);
      // If already logged in, auto-save and skip email gate
      if (user) { saveAudit(data); setStage("results"); }
      else { setStage("email-gate"); }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStage("error");
    }
  };

  const handleEmailGate = async (email: string) => {
    if (email) {
      try {
        await fetch("/api/leads", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, url: submittedUrl, score: auditData?.score }),
        });
      } catch {}
    }
    setStage("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setStage("idle"); setInputUrl(""); setAuditData(null);
    setErrorMsg(""); setSavedToAccount(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSavePrompt = () => { setPendingSave(true); setAuthMode("signup"); setAuthOpen(true); };
  const handleOpenSignIn = () => { setAuthMode("signin"); setAuthOpen(true); };
  const handleOpenSignUp = () => { setAuthMode("signup"); setAuthOpen(true); };
  const handleUpgrade = () => { setAuthMode("signup"); setAuthOpen(true); };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <NavBar onLogoClick={stage !== "idle" ? handleReset : undefined} onSignIn={handleOpenSignIn} onSignUp={handleOpenSignUp} />

      <AuthModal
        isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode}
        headline={pendingSave ? "Save your audit report" : undefined}
        subheadline={pendingSave ? "Create a free account to track your score over time." : undefined}
        onSuccess={() => { setAuthOpen(false); }}
      />

      <AnimatePresence mode="wait">
        {stage === "idle" && (
          <motion.div key="idle" className="flex-1 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <IdleScreen onSubmit={handleSubmit} inputUrl={inputUrl} setInputUrl={setInputUrl} inputRef={inputRef} onSignUp={handleOpenSignUp} />
          </motion.div>
        )}

        {stage === "loading" && (
          <motion.div key="loading" className="flex-1 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <LoadingScreen url={submittedUrl} />
          </motion.div>
        )}

        {stage === "email-gate" && auditData && (
          <motion.div key="email-gate" className="flex-1 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <EmailGateScreen score={auditData.score} url={submittedUrl} onSubmit={handleEmailGate} />
          </motion.div>
        )}

        {stage === "results" && auditData && (
          <motion.div key="results" className="flex-1 flex flex-col" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <ResultsScreen data={auditData} onReset={handleReset} onSavePrompt={handleSavePrompt} savedToAccount={savedToAccount} onUpgrade={handleUpgrade} />
          </motion.div>
        )}

        {stage === "error" && (
          <motion.div key="error" className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-6">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-ink mb-3">Couldn&apos;t analyse that site</h2>
            <p className="text-ink-3 text-base max-w-sm mb-8 leading-relaxed">{errorMsg}</p>
            <button onClick={handleReset} className="btn-gradient inline-flex items-center gap-2 px-6 py-3 text-sm">
              <RotateCcw className="w-4 h-4" />Try a different URL
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="border-t border-gray-100 bg-white py-6 px-6 text-center">
        <p className="text-xs text-ink-4">
          Built by{" "}
          <a href="https://clearsight.agency" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-dark transition-colors underline underline-offset-2">Clearsight Agency</a>
          {" "}· Powered by Google PageSpeed Insights + HTML analysis
        </p>
      </footer>
    </div>
  );
}
