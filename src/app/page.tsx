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

function EmailGateScreen({ score, url, auditData, onReset }: {
  score: number; url: string; auditData: AuditData; onReset: () => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  let host = url;
  try { host = new URL(url).hostname; } catch {}

  const scoreLabel = score >= 90 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Needs Work" : "Critical Issues";
  const scoreColor = score >= 90 ? "#059669" : score >= 70 ? "#7C3AED" : score >= 50 ? "#D97706" : "#DC2626";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), url, score, auditData }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setApiError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setApiError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center relative overflow-hidden">
      <div className="absolute rounded-full pointer-events-none" style={{ width: 480, height: 480, top: -120, left: -120, background: "radial-gradient(circle, rgba(124,58,237,0.08), transparent)", filter: "blur(70px)" }} />
      <div className="absolute rounded-full pointer-events-none" style={{ width: 380, height: 380, bottom: -80, right: -80, background: "radial-gradient(circle, rgba(219,39,119,0.07), transparent)", filter: "blur(70px)" }} />

      <motion.div
        className="relative bg-white rounded-3xl p-8 sm:p-10 max-w-lg w-full"
        style={{ boxShadow: "0 32px 80px rgba(124,58,237,0.14), 0 4px 16px rgba(0,0,0,0.06)" }}
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      >
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{ background: "linear-gradient(90deg, #7C3AED, #C026D3, #DB2777)" }} />

        <AnimatePresence mode="wait">
          {submitted ? (
            /* ── Email sent confirmation ── */
            <motion.div key="sent" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}
              className="text-center py-2">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(16,185,129,0.08)", border: "2px solid rgba(16,185,129,0.2)" }}>
                <Mail className="w-7 h-7 text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-ink mb-2">Check your inbox!</h2>
              <p className="text-ink-3 text-sm leading-relaxed mb-1">
                We sent your report link to:
              </p>
              <p className="font-bold text-brand text-sm mb-5">{email}</p>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-left mb-6">
                {["Open the email from SiteScore", "Click the secure link inside", "Your full report will load instantly"].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 mb-2 last:mb-0">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-black text-white"
                      style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>{i + 1}</div>
                    <span className="text-sm text-ink-2">{step}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink-4 mb-4">The link expires in 7 days. Check your spam folder if you don&apos;t see it within a minute.</p>
              <button onClick={onReset} className="text-xs text-brand hover:text-brand-dark underline underline-offset-2 transition-colors">
                Audit a different website
              </button>
            </motion.div>
          ) : (
            /* ── Email input form ── */
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25 }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: `${scoreColor}12`, border: `2px solid ${scoreColor}25` }}>
                <CheckCircle className="w-7 h-7" style={{ color: scoreColor }} />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-3"
                style={{ background: "rgba(124,58,237,0.07)", color: "#7C3AED", border: "1px solid rgba(124,58,237,0.13)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                Audit complete · {host}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-ink mb-2">
                Your report is <span className="gradient-text">ready!</span>
              </h2>
              <p className="text-ink-3 text-sm leading-relaxed mb-5">
                We&apos;ll email you a secure link to view your full report — including your score breakdown, keyword analysis, and every issue we found.
              </p>

              {/* Score teaser */}
              <div className="flex items-center justify-center gap-4 mb-5 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div>
                  <p className="text-xs text-ink-4 font-medium mb-0.5">Overall Score</p>
                  <p className="text-4xl font-black tabular-nums" style={{ color: scoreColor }}>{score}</p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: scoreColor }}>{scoreLabel}</p>
                </div>
                <div className="w-px h-12 bg-gray-200" />
                <div className="text-left">
                  <p className="text-xs text-ink-4 mb-1.5">Your report includes:</p>
                  {["6-pillar score breakdown", "Keyword coverage analysis", "Prioritised fix list"].map(item => (
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
                {apiError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-xs text-red-600">{apiError}</p>
                  </div>
                )}
                <button type="submit" disabled={loading || !email.trim()} className="btn-gradient w-full flex items-center justify-center gap-2 py-3.5 text-sm">
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Sending your report…</span></>
                    : <><span>Email Me My Report</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
              <p className="text-xs text-ink-4 mt-3">
                We&apos;ll send a secure link to your email. No spam, ever.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
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

// ── How It Works — Step Mockups ────────────────────────────────────────────

function Step1Mockup() {
  const url = "clearsight.agency";
  const [typed, setTyped] = useState("");
  const [showBtn, setShowBtn] = useState(false);

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      if (i < url.length) { setTyped(url.slice(0, i + 1)); i++; }
      else { clearInterval(t); setTimeout(() => setShowBtn(true), 400); }
    }, 65);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
      <div style={{ background: "#1A1428", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, overflow: "hidden" }}>
        {/* Browser chrome */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {["#FF5F57","#FFBD2E","#28CA41"].map(c => <div key={c} style={{ background: c, width: 10, height: 10, borderRadius: "50%", opacity: 0.5 }} />)}
          </div>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7, padding: "4px 10px", flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#28CA41", opacity: 0.6 }} />
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "monospace" }}>
              https://{typed}<span style={{ borderRight: "1.5px solid rgba(255,255,255,0.5)", marginLeft: 1, animation: "blink 1s step-end infinite" }}>&nbsp;</span>
            </span>
          </div>
        </div>
        {/* Page */}
        <div style={{ padding: "28px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ height: 10, width: "55%", margin: "0 auto 8px", background: "rgba(255,255,255,0.07)", borderRadius: 5 }} />
            <div style={{ height: 7, width: "38%", margin: "0 auto 5px", background: "rgba(255,255,255,0.04)", borderRadius: 5 }} />
            <div style={{ height: 7, width: "28%", margin: "0 auto", background: "rgba(255,255,255,0.04)", borderRadius: 5 }} />
          </div>
          {/* Input */}
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(124,58,237,0.45)", borderRadius: 12, padding: "12px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 0 24px rgba(124,58,237,0.18)" }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(124,58,237,0.35)" }} />
            <span style={{ color: typed ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.2)", fontSize: 13 }}>
              {typed || "yourwebsite.com"}
            </span>
          </div>
          <AnimatePresence>
            {showBtn && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)", borderRadius: 12, padding: "12px 16px", textAlign: "center", boxShadow: "0 8px 28px rgba(124,58,237,0.45)" }}
              >
                <span style={{ color: "white", fontSize: 13, fontWeight: 700 }}>Get My Free Score →</span>
              </motion.div>
            )}
          </AnimatePresence>
          {/* skeleton rows */}
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            {[70, 50, 40].map((w, i) => <div key={i} style={{ height: 6, width: `${w}%`, background: "rgba(255,255,255,0.04)", borderRadius: 4 }} />)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Step2Mockup() {
  const pillars = [
    { label: "Performance", value: 72, color: "#A855F7" },
    { label: "Technical SEO", value: 85, color: "#10B981" },
    { label: "Content & Keywords", value: 61, color: "#A855F7" },
    { label: "GEO Readiness", value: 54, color: "#F59E0B" },
    { label: "AEO Readiness", value: 48, color: "#F59E0B" },
    { label: "Accessibility", value: 90, color: "#10B981" },
  ];
  const [widths, setWidths] = useState(pillars.map(() => 0));
  const [done, setDone] = useState<boolean[]>(pillars.map(() => false));
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    pillars.forEach((p, i) => {
      setTimeout(() => {
        const start = Date.now();
        const anim = () => {
          const t = Math.min((Date.now() - start) / 700, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setWidths(prev => { const n = [...prev]; n[i] = eased * p.value; return n; });
          if (t < 1) requestAnimationFrame(anim);
          else setDone(prev => { const n = [...prev]; n[i] = true; return n; });
        };
        requestAnimationFrame(anim);
      }, i * 250);
    });
    const cStart = Date.now();
    const cAnim = () => {
      const t = Math.min((Date.now() - cStart) / 2400, 1);
      setCounter(Math.round(t * 40));
      if (t < 1) requestAnimationFrame(cAnim);
    };
    requestAnimationFrame(cAnim);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
      <div style={{ background: "#1A1428", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#A855F7", boxShadow: "0 0 8px #A855F7" }} className="animate-pulse" />
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600 }}>Scanning signals…</span>
          </div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontVariantNumeric: "tabular-nums" }}>{counter} / 40</span>
        </div>
        {/* Progress bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {pillars.map((p, i) => (
            <div key={p.label}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 600 }}>{p.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ color: p.color, fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {Math.round(widths[i])}
                  </span>
                  <AnimatePresence>
                    {done[i] && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ fontSize: 11 }}>✓</motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 999, height: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 999, background: p.color, width: `${widths[i]}%`, transition: "none", boxShadow: `0 0 8px ${p.color}60` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Step3Mockup() {
  const [score, setScore] = useState(0);
  const [barWidths, setBarWidths] = useState([0, 0, 0]);
  const [showRecs, setShowRecs] = useState(false);
  const targetScore = 67;
  const bars = [
    { label: "Technical SEO", v: 72, color: "#A855F7" },
    { label: "GEO Readiness", v: 54, color: "#F59E0B" },
    { label: "Performance", v: 81, color: "#10B981" },
  ];

  useEffect(() => {
    const sStart = Date.now();
    const sAnim = () => {
      const t = Math.min((Date.now() - sStart) / 1200, 1);
      const eased = 1 - Math.pow(1 - t, 2);
      setScore(Math.round(eased * targetScore));
      if (t < 1) requestAnimationFrame(sAnim);
      else setTimeout(() => setShowRecs(true), 300);
    };
    requestAnimationFrame(sAnim);
    bars.forEach((b, i) => {
      setTimeout(() => {
        const bStart = Date.now();
        const bAnim = () => {
          const t = Math.min((Date.now() - bStart) / 700, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setBarWidths(prev => { const n = [...prev]; n[i] = eased * b.v; return n; });
          if (t < 1) requestAnimationFrame(bAnim);
        };
        requestAnimationFrame(bAnim);
      }, 400 + i * 220);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const circ = 2 * Math.PI * 32;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
      <div style={{ background: "#1A1428", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24 }}>
        {/* Score row */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
            <svg width="80" height="80">
              <defs>
                <linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#DB2777" />
                </linearGradient>
              </defs>
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
              <circle cx="40" cy="40" r="32" fill="none" stroke="url(#g3)" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ}
                transform="rotate(-90 40 40)" style={{ filter: "drop-shadow(0 0 8px rgba(168,85,247,0.5))" }} />
              <text x="40" y="44" textAnchor="middle" fontSize="18" fontWeight="900" fill="white" fontFamily="Inter, system-ui">{score}</text>
            </svg>
          </div>
          <div>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 3 }}>Overall Score</p>
            <p style={{ color: "#F59E0B", fontSize: 14, fontWeight: 700, marginBottom: 3 }}>Needs Work</p>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>3 critical issues found</p>
          </div>
        </div>
        {/* Mini pillar bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {bars.map((b, i) => (
            <div key={b.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{b.label}</span>
                <span style={{ color: b.color, fontSize: 11, fontWeight: 700 }}>{Math.round(barWidths[i])}</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 999, height: 5 }}>
                <div style={{ height: "100%", borderRadius: 999, background: b.color, width: `${barWidths[i]}%`, boxShadow: `0 0 6px ${b.color}50` }} />
              </div>
            </div>
          ))}
        </div>
        {/* Recommendation tags */}
        <AnimatePresence>
          {showRecs && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { label: "Missing Schema markup", color: "#EF4444" },
                { label: "Slow mobile load", color: "#F59E0B" },
                { label: "No FAQ schema", color: "#F59E0B" },
              ].map((r, i) => (
                <motion.span key={r.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.12 }}
                  style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: `${r.color}18`, color: r.color, border: `1px solid ${r.color}28` }}>
                  ⚠ {r.label}
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── How It Works Section ────────────────────────────────────────────────────

function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const duration = 4500;
    const start = Date.now();
    let rafId: number;
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min((elapsed / duration) * 100, 100);
      setProgress(p);
      if (p < 100) rafId = requestAnimationFrame(tick);
      else setActiveStep(s => (s + 1) % 3);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [activeStep]);

  const steps = [
    { title: "Enter your website URL", desc: "Just paste your URL — no sign-up, no credit card. We start the scan immediately." },
    { title: "We scan 40+ signals in real time", desc: "PageSpeed analysis, HTML scraping, keyword extraction, Schema checks, robots.txt, and more — all in under 45 seconds." },
    { title: "Get your score + prioritised fix list", desc: "A detailed score across 6 pillars with specific issues ranked by impact, so you know exactly what to fix first." },
  ];

  return (
    <section className="relative overflow-hidden" style={{ background: "#0B0918" }}>
      {/* Orbs */}
      <div className="absolute rounded-full pointer-events-none" style={{ width: 500, height: 500, top: -100, left: -100, background: "radial-gradient(circle, rgba(124,58,237,0.25), transparent)", filter: "blur(80px)" }} />
      <div className="absolute rounded-full pointer-events-none" style={{ width: 400, height: 400, bottom: -80, right: -80, background: "radial-gradient(circle, rgba(219,39,119,0.2), transparent)", filter: "blur(80px)" }} />

      <div className="max-w-content mx-auto px-6 py-20 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">

          {/* Left: step navigator */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>How it works</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-10 leading-tight">
              See your website through<br />
              <span className="gradient-text">a search engine&apos;s eyes</span>
            </h2>
            <div className="space-y-3">
              {steps.map((step, i) => {
                const isActive = activeStep === i;
                return (
                  <button key={i} onClick={() => setActiveStep(i)}
                    className="w-full text-left rounded-2xl transition-all duration-300 relative overflow-hidden"
                    style={{ padding: "16px 20px", background: isActive ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.02)", border: `1px solid ${isActive ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.05)"}` }}>
                    {/* Progress underline */}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 h-0.5" style={{ background: "linear-gradient(90deg, #7C3AED, #DB2777)", width: `${progress}%` }} />
                    )}
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-xs font-black transition-all duration-300"
                        style={isActive ? { background: "linear-gradient(135deg, #7C3AED, #DB2777)", color: "white" } : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.25)" }}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-bold text-sm transition-colors duration-300" style={{ color: isActive ? "white" : "rgba(255,255,255,0.35)" }}>{step.title}</p>
                        <p className="text-xs mt-1.5 leading-relaxed transition-colors duration-300" style={{ color: isActive ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.18)" }}>{step.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: animated mockup */}
          <div>
            <AnimatePresence mode="wait">
              {activeStep === 0 && <Step1Mockup key="s1" />}
              {activeStep === 1 && <Step2Mockup key="s2" />}
              {activeStep === 2 && <Step3Mockup key="s3" />}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
}

// ── Hero Report Mockup ──────────────────────────────────────────────────────

function HeroReportMockup() {
  // Two-phase loop: scanning (0-2s) → results (2-9s) → repeat
  const [phase, setPhase] = useState<"scanning" | "results">("scanning");
  const [score, setScore] = useState(0);
  const [barWidths, setBarWidths] = useState([0, 0, 0, 0, 0, 0]);
  const [showRecs, setShowRecs] = useState(false);

  const pillars = [
    { label: "Performance", v: 52, color: "#F59E0B" },
    { label: "Technical SEO", v: 78, color: "#7C3AED" },
    { label: "Content", v: 65, color: "#7C3AED" },
    { label: "GEO Readiness", v: 44, color: "#EF4444" },
    { label: "AEO Readiness", v: 38, color: "#EF4444" },
    { label: "Accessibility", v: 91, color: "#10B981" },
  ];

  const reset = () => {
    setPhase("scanning"); setScore(0); setBarWidths([0,0,0,0,0,0]); setShowRecs(false);
  };

  useEffect(() => {
    const scanTimer = setTimeout(() => {
      setPhase("results");
      // Count up score
      const s = Date.now();
      const countUp = () => {
        const t = Math.min((Date.now() - s) / 1000, 1);
        setScore(Math.round((1 - Math.pow(1-t, 2)) * 59));
        if (t < 1) requestAnimationFrame(countUp);
      };
      requestAnimationFrame(countUp);
      // Staggered bars
      pillars.forEach((p, i) => {
        setTimeout(() => {
          const bs = Date.now();
          const anim = () => {
            const t = Math.min((Date.now() - bs) / 600, 1);
            const e = 1 - Math.pow(1 - t, 3);
            setBarWidths(prev => { const n=[...prev]; n[i]=e*p.v; return n; });
            if (t < 1) requestAnimationFrame(anim);
          };
          requestAnimationFrame(anim);
        }, 300 + i * 150);
      });
      setTimeout(() => setShowRecs(true), 1800);
      // Loop
      setTimeout(reset, 8000);
    }, 2200);
    return () => clearTimeout(scanTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const circ = 2 * Math.PI * 38;
  const domain = "example-business.com";

  return (
    <div className="relative">
      {/* Subtle glow behind card */}
      <div className="absolute inset-0 rounded-3xl opacity-25 blur-2xl pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(219,39,119,0.2))", transform: "scale(0.92) translateY(16px)" }} />

      <div style={{ background: "#0F0B1E", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, overflow: "hidden", position: "relative" }}>
        {/* Window chrome */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {["#FF5F57","#FFBD2E","#28CA41"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.5 }} />)}
          </div>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#28CA41", opacity: 0.7 }} />
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, fontFamily: "monospace" }}>sitescore.app · auditing {domain}</span>
          </div>
        </div>

        <div style={{ padding: "20px 20px 24px" }}>
          <AnimatePresence mode="wait">
            {phase === "scanning" ? (
              <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ width: 40, height: 40, border: "3px solid rgba(124,58,237,0.2)", borderTopColor: "#7C3AED", borderRadius: "50%", margin: "0 auto 14px", animation: "spin 1s linear infinite" }} />
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600 }}>Scanning {domain}…</p>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                  {["Connecting to PageSpeed API", "Fetching HTML structure", "Analysing keywords & Schema"].map((s, i) => (
                    <motion.div key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.4 }}
                      style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "rgba(255,255,255,0.3)", justifyContent: "center" }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#7C3AED", opacity: 0.7 }} />
                      {s}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                {/* Score row */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <svg width="90" height="90" style={{ flexShrink: 0 }}>
                    <defs>
                      <linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#7C3AED" />
                        <stop offset="100%" stopColor="#DB2777" />
                      </linearGradient>
                    </defs>
                    <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
                    <circle cx="45" cy="45" r="38" fill="none" stroke="url(#hg)" strokeWidth="7" strokeLinecap="round"
                      strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ}
                      transform="rotate(-90 45 45)" style={{ filter: "drop-shadow(0 0 8px rgba(124,58,237,0.5))" }} />
                    <text x="45" y="50" textAnchor="middle" fontSize="20" fontWeight="900" fill="white" fontFamily="Inter, system-ui">{score}</text>
                  </svg>
                  <div>
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginBottom: 3 }}>{domain}</p>
                    <p style={{ color: "#F59E0B", fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Needs Work</p>
                    <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 10 }}>4 critical issues found</p>
                  </div>
                </div>

                {/* Pillar bars */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                  {pillars.map((p, i) => (
                    <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, width: 90, flexShrink: 0 }}>{p.label}</span>
                      <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 999, height: 5 }}>
                        <div style={{ height: "100%", borderRadius: 999, background: p.color, width: `${barWidths[i]}%`, boxShadow: `0 0 6px ${p.color}50` }} />
                      </div>
                      <span style={{ color: p.color, fontSize: 10, fontWeight: 700, width: 22, textAlign: "right" }}>{Math.round(barWidths[i])}</span>
                    </div>
                  ))}
                </div>

                {/* Rec tags */}
                <AnimatePresence>
                  {showRecs && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {[
                        { t: "Missing Schema markup", c: "#EF4444" },
                        { t: "Slow mobile load", c: "#F59E0B" },
                        { t: "No FAQ schema", c: "#F59E0B" },
                      ].map((r, i) => (
                        <motion.span key={r.t} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                          style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: `${r.c}18`, color: r.c, border: `1px solid ${r.c}28` }}>
                          ⚠ {r.t}
                        </motion.span>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Product Preview Section ─────────────────────────────────────────────────

function ProductPreviewSection() {
  const [activeTab, setActiveTab] = useState(0);
  const [manualOverride, setManualOverride] = useState(false);

  // Auto-advance tabs every 5s unless user clicked manually
  useEffect(() => {
    if (manualOverride) return;
    const id = setInterval(() => setActiveTab(t => (t + 1) % 3), 5000);
    return () => clearInterval(id);
  }, [manualOverride]);

  const tabs = [
    { label: "Score & Overview", icon: <Award className="w-4 h-4" /> },
    { label: "6-Pillar Breakdown", icon: <BarChart2 className="w-4 h-4" /> },
    { label: "Fix Recommendations", icon: <Target className="w-4 h-4" /> },
  ];

  return (
    <section className="bg-white border-b border-gray-100 px-6 py-14">
      <div className="max-w-content mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-ink-4 uppercase tracking-widest mb-2">What your report looks like</p>
          <h2 className="text-2xl sm:text-3xl font-black text-ink">See exactly what you&apos;ll get</h2>
          <p className="text-sm text-ink-3 mt-2 max-w-md mx-auto">Run a free audit on any website and get a detailed report like this in under 45 seconds.</p>
        </div>

        {/* Tab bar */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center bg-gray-100 rounded-2xl p-1.5 gap-1">
            {tabs.map((tab, i) => (
              <button key={i} onClick={() => { setActiveTab(i); setManualOverride(true); }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={activeTab === i ? { background: "white", color: "#0F0A1E", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" } : { color: "#9CA3AF" }}>
                <span style={activeTab === i ? { color: "#7C3AED" } : {}}>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview panel */}
        <div className="max-w-3xl mx-auto">
          {/* Window chrome */}
          <div className="rounded-t-2xl px-4 py-3 flex items-center gap-3" style={{ background: "#1A1428" }}>
            <div className="flex gap-1.5">
              {["#FF5F57","#FFBD2E","#28CA41"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.5 }} />)}
            </div>
            <div className="flex-1 bg-white/5 border border-white/8 rounded-md px-3 py-1.5 text-xs font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>
              sitescore.app · example-business.com
            </div>
          </div>

          <div className="rounded-b-2xl overflow-hidden" style={{ background: "#0F0B1E", border: "1px solid rgba(255,255,255,0.06)", borderTop: "none", minHeight: 320 }}>
            <AnimatePresence mode="wait">
              {activeTab === 0 && <PreviewTab0 key="t0" />}
              {activeTab === 1 && <PreviewTab1 key="t1" />}
              {activeTab === 2 && <PreviewTab2 key="t2" />}
            </AnimatePresence>
          </div>

          <p className="text-center text-xs text-ink-4 mt-4">Sample report — your actual results will reflect your website</p>
        </div>
      </div>
    </section>
  );
}

function PreviewTab0() {
  const [score, setScore] = useState(0);
  const circ = 2 * Math.PI * 52;
  useEffect(() => {
    const s = Date.now();
    const anim = () => {
      const t = Math.min((Date.now() - s) / 1100, 1);
      setScore(Math.round((1 - Math.pow(1-t, 2)) * 73));
      if (t < 1) requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }, []);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}
      style={{ padding: "28px 28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
        {/* Score circle */}
        <div style={{ flexShrink: 0 }}>
          <svg width="120" height="120">
            <defs>
              <linearGradient id="pg0" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="100%" stopColor="#A855F7" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
            <circle cx="60" cy="60" r="52" fill="none" stroke="url(#pg0)" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={circ - (score/100)*circ}
              transform="rotate(-90 60 60)" style={{ filter: "drop-shadow(0 0 10px rgba(124,58,237,0.45))" }} />
            <text x="60" y="65" textAnchor="middle" fontSize="26" fontWeight="900" fill="white" fontFamily="Inter,system-ui">{score}</text>
          </svg>
        </div>
        {/* Verdict */}
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 999, padding: "4px 12px", marginBottom: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#A855F7", display: "block" }} />
            <span style={{ color: "#A855F7", fontSize: 11, fontWeight: 700 }}>Good — keep improving</span>
          </div>
          <p style={{ color: "white", fontSize: 18, fontWeight: 700, lineHeight: 1.3, marginBottom: 8 }}>Solid foundation — but you&apos;re leaving traffic on the table.</p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, lineHeight: 1.6 }}>Fixing the issues below could meaningfully boost your rankings and AI visibility.</p>
        </div>
      </div>
      {/* Health strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
        {[
          { l: "HTTPS", v: "Secure ✓", ok: true },
          { l: "Sitemap", v: "Found ✓", ok: true },
          { l: "Robots.txt", v: "Valid ✓", ok: true },
          { l: "Schema Types", v: "2 found", ok: true },
          { l: "Domain Authority", v: "DA 28", ok: true },
          { l: "Pages Found", v: "~140 pages", ok: true },
        ].map(item => (
          <div key={item.l} style={{ background: item.ok ? "rgba(16,185,129,0.07)" : "rgba(239,68,68,0.07)", border: `1px solid ${item.ok ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"}`, borderRadius: 10, padding: "8px 12px" }}>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginBottom: 2 }}>{item.l}</p>
            <p style={{ color: item.ok ? "#10B981" : "#EF4444", fontSize: 12, fontWeight: 700 }}>{item.v}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function PreviewTab1() {
  const pillars = [
    { label: "Performance", desc: "Core Web Vitals · Speed", v: 52, color: "#F59E0B", pts: "8/15" },
    { label: "Technical SEO", desc: "Meta · Sitemap · HTTPS", v: 78, color: "#7C3AED", pts: "17/22" },
    { label: "Content & Keywords", desc: "Placement · Depth", v: 65, color: "#A855F7", pts: "10/15" },
    { label: "GEO Readiness", desc: "Schema · AI citations", v: 44, color: "#EF4444", pts: "9/20" },
    { label: "AEO Readiness", desc: "FAQ · Voice · Snippets", v: 38, color: "#EF4444", pts: "8/20" },
    { label: "Accessibility", desc: "WCAG · Best practices", v: 91, color: "#10B981", pts: "7/8" },
  ];
  const [widths, setWidths] = useState(pillars.map(() => 0));
  useEffect(() => {
    pillars.forEach((p, i) => {
      setTimeout(() => {
        const s = Date.now();
        const anim = () => {
          const t = Math.min((Date.now()-s)/600, 1);
          const e = 1 - Math.pow(1-t,3);
          setWidths(prev => { const n=[...prev]; n[i]=e*p.v; return n; });
          if (t<1) requestAnimationFrame(anim);
        };
        requestAnimationFrame(anim);
      }, i*120);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}
      style={{ padding: "24px 24px 28px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10 }}>
        {pillars.map((p, i) => (
          <div key={p.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <p style={{ color: "white", fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{p.label}</p>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{p.desc}</p>
              </div>
              <span style={{ fontSize: 20, fontWeight: 900, color: p.color }}>{Math.round(widths[i])}</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 999, height: 6, marginBottom: 6 }}>
              <div style={{ height: "100%", borderRadius: 999, background: p.color, width: `${widths[i]}%`, boxShadow: `0 0 8px ${p.color}50` }} />
            </div>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, textAlign: "right" }}>{p.pts} pts</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function PreviewTab2() {
  const recs = [
    { priority: "Critical", cat: "GEO Readiness", title: "No Organization or LocalBusiness schema", desc: "ChatGPT, Perplexity and Google AI Overviews use this schema to identify who you are. Without it, you're invisible to AI search.", color: "#EF4444" },
    { priority: "High", cat: "AEO Readiness", title: "Missing FAQ / HowTo schema", desc: "FAQ and HowTo schema enable Google rich results and dramatically improve chances of being cited by AI systems.", color: "#F59E0B" },
    { priority: "High", cat: "Performance", title: "Slow mobile load (LCP 4.2s)", desc: "Your Largest Contentful Paint is 4.2s on mobile. Google recommends under 2.5s. This is losing you organic traffic.", color: "#F59E0B" },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}
      style={{ padding: "20px 20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
      {recs.map((r, i) => (
        <motion.div key={r.title} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
          style={{ background: `${r.color}0A`, border: `1px solid ${r.color}20`, borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: `${r.color}18`, color: r.color, border: `1px solid ${r.color}25` }}>{r.priority}</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{r.cat}</span>
          </div>
          <p style={{ color: "white", fontSize: 13, fontWeight: 700, marginBottom: 5 }}>{r.title}</p>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.6 }}>{r.desc}</p>
          <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Lock style={{ width: 12, height: 12, color: "#7C3AED", flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "#A78BFA", fontWeight: 600 }}>How to fix — unlock with a plan</span>
          </div>
        </motion.div>
      ))}
    </motion.div>
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
      {/* Hero — two column */}
      <section className="relative overflow-hidden bg-white border-b border-gray-100 px-6 pt-14 pb-0">
        <div className="max-w-content mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center pb-12 lg:pb-16">

            {/* Left: clean text + form */}
            <div>
              <motion.div className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6"
                style={{ background: "rgba(124,58,237,0.07)", color: "#7C3AED", border: "1px solid rgba(124,58,237,0.12)" }}
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                Free · Instant · No account needed
              </motion.div>

              <motion.h1 className="text-4xl sm:text-5xl font-black text-ink leading-[1.1] tracking-tight mb-4"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }}>
                Is your website ready<br />for the <span className="gradient-text">AI era?</span>
              </motion.h1>

              <motion.p className="text-base text-ink-3 max-w-md mb-7 leading-relaxed"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                Get a full SEO, GEO & AEO audit in under 45 seconds. See your score, what&apos;s broken, and what it&apos;s costing you.
              </motion.p>

              <motion.form onSubmit={onSubmit} className="w-full max-w-lg"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
                <div className="flex flex-col sm:flex-row gap-2 p-1.5 bg-white border border-gray-200 rounded-2xl shadow-card">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4 pointer-events-none" />
                    <input
                      ref={inputRef} type="text" value={inputUrl} onChange={e => setInputUrl(e.target.value)}
                      placeholder="yourwebsite.com" autoFocus spellCheck={false} autoComplete="off"
                      className="w-full pl-11 pr-3 py-3 bg-transparent text-ink placeholder:text-ink-4 text-sm focus:outline-none rounded-xl url-input"
                    />
                  </div>
                  <button type="submit" disabled={!inputUrl.trim()} className="btn-gradient inline-flex items-center justify-center gap-2 px-6 py-3 text-sm shrink-0">
                    Get My Free Score <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.form>

              <motion.div className="flex flex-wrap gap-4 mt-5"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                {[
                  { v: "~40s", l: "full audit time" },
                  { v: "6", l: "pillars analysed" },
                  { v: "40+", l: "signals checked" },
                ].map(({ v, l }) => (
                  <div key={l} className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-ink">{v}</span>
                    <span className="text-xs text-ink-4">{l}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: animated report mockup */}
            <motion.div className="relative lg:self-end"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
              <HeroReportMockup />
            </motion.div>

          </div>
        </div>
      </section>

      {/* Product Preview Section */}
      <ProductPreviewSection />

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

      <HowItWorksSection />

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

  // Email gate is now self-contained — handleEmailGate removed; EmailGateScreen handles its own submission

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
            <EmailGateScreen score={auditData.score} url={submittedUrl} auditData={auditData} onReset={handleReset} />
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
