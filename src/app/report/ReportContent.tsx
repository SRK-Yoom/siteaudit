"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, CheckCircle, AlertTriangle, AlertCircle, ExternalLink,
  RotateCcw, FileText, Globe, Brain, Zap, Shield, Search, Lock,
  Tag, Link2, BarChart2, CheckSquare, XSquare, Target, TrendingUp, Award,
  Lightbulb,
} from "lucide-react";
import { ScoreCircle } from "@/components/audit/ScoreCircle";
import { ScorePillar } from "@/components/audit/ScorePillar";
import { useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";

// ── Types (same as page.tsx) ────────────────────────────────────────────────
interface Check { label: string; passed: boolean; detail: string }
interface PillarData { score: number; label: string; description: string; points: number; maxPoints: number; checks: Check[] }
interface Keyword { word: string; count: number; inTitle: boolean; inH1: boolean; inMetaDesc: boolean; inURL: boolean }
interface AuditData {
  score: number; url: string;
  health: { domain: string; isHTTPS: boolean; pageCount: number | null; hasRobots: boolean; hasSitemap: boolean; blockedByCrawlers: boolean; criticalIssues: number; highIssues: number; totalIssues: number; schemaTypesFound: string[]; htmlFetchError: boolean };
  pillars: { performance: PillarData; technicalSeo: PillarData; contentKeywords: PillarData; geoReadiness: PillarData; aeoReadiness: PillarData; accessibility: PillarData };
  keywords: { top: Keyword[]; coverageScore: number };
  recommendations: { id: string; title: string; description: string; priority: "critical" | "high" | "medium"; category: string; fix: string }[];
  gatedRecsCount: number;
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
  critical: { icon: AlertTriangle, label: "Critical", wrap: "border-red-100 bg-red-50", badge: "bg-red-50 text-red-600 border-red-100", iconCls: "text-red-500" },
  high: { icon: AlertCircle, label: "High Priority", wrap: "border-amber-100 bg-amber-50", badge: "bg-amber-50 text-amber-600 border-amber-100", iconCls: "text-amber-500" },
  medium: { icon: CheckCircle, label: "Medium", wrap: "border-violet-100 bg-violet-50", badge: "bg-violet-50 text-violet-600 border-violet-100", iconCls: "text-violet-500" },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function HealthBanner({ health }: { health: AuditData["health"] }) {
  const items = [
    { label: "Domain", value: health.domain, icon: <Globe className="w-3.5 h-3.5" />, alert: false },
    { label: "Pages", value: health.pageCount != null ? health.pageCount.toLocaleString() : "—", icon: <FileText className="w-3.5 h-3.5" />, alert: false },
    { label: "HTTPS", value: health.isHTTPS ? "Secure ✓" : "Not secure ✗", icon: <Shield className="w-3.5 h-3.5" />, alert: !health.isHTTPS },
    { label: "Robots.txt", value: health.hasRobots ? (health.blockedByCrawlers ? "⚠ Blocking" : "Valid ✓") : "Missing ✗", icon: <Link2 className="w-3.5 h-3.5" />, alert: !health.hasRobots || health.blockedByCrawlers },
    { label: "Sitemap", value: health.hasSitemap ? "Found ✓" : "Missing ✗", icon: <BarChart2 className="w-3.5 h-3.5" />, alert: !health.hasSitemap },
    { label: "Schema Types", value: health.schemaTypesFound.length > 0 ? health.schemaTypesFound.slice(0, 3).join(", ") : "None found", icon: <Tag className="w-3.5 h-3.5" />, alert: health.schemaTypesFound.length === 0 },
  ];
  return (
    <div className="card rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-ink-3 uppercase tracking-widest">Site Health</h3>
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
            <div className={`flex items-center gap-1.5 mb-1 ${item.alert ? "text-red-500" : "text-ink-3"}`}>{item.icon}<span className="text-xs font-medium">{item.label}</span></div>
            <p className={`text-xs font-semibold truncate ${item.alert ? "text-red-600" : "text-ink-2"}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckList({ checks }: { checks?: Check[] }) {
  if (!checks || checks.length === 0) return null;
  return (
    <div className="space-y-1.5 mt-3 pt-3 border-t border-gray-100">
      {checks.slice(0, 5).map((c, i) => (
        <div key={i} className="flex items-start gap-2">
          {c.passed ? <CheckSquare className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> : <XSquare className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />}
          <div className="min-w-0">
            <span className="text-xs font-semibold text-ink-2">{c.label}</span>
            <p className="text-xs text-ink-4 leading-snug mt-0.5">{c.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function KeywordsSection({ keywords, coverageScore }: { keywords: Keyword[]; coverageScore: number }) {
  if (!keywords || keywords.length === 0) return null;
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-ink-3 uppercase tracking-widest">Keyword Analysis</h3>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${coverageScore >= 60 ? "bg-green-50 text-green-600 border-green-100" : coverageScore >= 30 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-red-50 text-red-600 border-red-100"}`}>
          {coverageScore}% coverage
        </span>
      </div>
      <div className="card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-5 px-4 py-2 border-b border-gray-100 text-xs font-semibold text-ink-4 uppercase tracking-wide bg-gray-50">
          <div className="col-span-2">Keyword</div>
          <div className="text-center">Title</div><div className="text-center">H1</div><div className="text-center">Meta</div>
        </div>
        {keywords.slice(0, 8).map((kw, i) => (
          <div key={kw.word} className="grid grid-cols-5 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-surface transition-colors">
            <div className="col-span-2 flex items-center gap-2">
              {i === 0 && <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(124,58,237,0.08)", color: "#7C3AED", border: "1px solid rgba(124,58,237,0.15)" }}>Primary</span>}
              <span className="text-sm font-semibold text-ink">{kw.word}</span>
            </div>
            {[kw.inTitle, kw.inH1, kw.inMetaDesc].map((v, j) => (
              <div key={j} className="flex items-center justify-center">
                {v ? <CheckSquare className="w-4 h-4 text-brand" /> : <XSquare className="w-4 h-4 text-gray-300" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Report Content ─────────────────────────────────────────────────────

export function ReportContent({ auditData, email, url, token }: {
  auditData: AuditData; email: string; url: string; token: string;
}) {
  const [authOpen, setAuthOpen] = useState(false);
  const data = auditData;
  const { score, health, pillars, keywords, recommendations, gatedRecsCount } = data;

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

  const freeRecs = recommendations.slice(0, 3);
  const gatedRecs = recommendations.slice(3);

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-xl shadow-sm">
        <div className="max-w-content mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>
              <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
                <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" fill="none" strokeDasharray="28 16" strokeLinecap="round" transform="rotate(-90 10 10)" />
                <text x="10" y="14" textAnchor="middle" fontSize="8" fontWeight="800" fill="white" fontFamily="system-ui">S</text>
              </svg>
            </div>
            <span className="font-bold text-ink text-lg tracking-tight">SiteScore</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-4 hidden sm:block">Audited: <span className="font-medium text-ink-2">{host}</span></span>
            <a href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white"
              style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>
              Run New Audit <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup"
        headline="Save this report to your dashboard"
        subheadline="Create a free account to track your score over time and unlock all fixes."
        onSuccess={() => setAuthOpen(false)} />

      <div className="flex-1 pb-24">
        <div className="max-w-content mx-auto px-6">
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-5 gap-3">
            <div className="flex items-center gap-2 text-sm text-ink-3">
              <ExternalLink className="w-4 h-4 shrink-0" />
              <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-ink-2 hover:text-brand transition-colors">{host}</a>
              <span>· mobile audit · emailed to {email}</span>
            </div>
            <div className="flex gap-2">
              <a href="/" className="inline-flex items-center gap-1.5 text-xs border border-gray-200 bg-white px-3 py-2 rounded-xl text-ink-3 hover:bg-gray-50 transition-colors font-medium">
                <RotateCcw className="w-3.5 h-3.5" />New audit
              </a>
              <button onClick={() => setAuthOpen(true)} className="inline-flex items-center gap-1.5 text-xs text-brand border border-brand/20 bg-brand/5 hover:bg-brand/10 px-3 py-2 rounded-xl transition-colors font-semibold">
                Save to Dashboard
              </button>
            </div>
          </div>

          {/* Score hero */}
          <motion.div className="card rounded-3xl p-8 sm:p-10 flex flex-col md:flex-row items-center gap-10 mb-6"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="shrink-0"><ScoreCircle score={score} size={200} /></div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-ink leading-tight">{verdict.h}</h1>
              <p className="text-ink-3 mt-3 text-base leading-relaxed max-w-lg">{verdict.s}</p>
              {(health.criticalIssues > 0 || health.highIssues > 0) && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                  {health.criticalIssues > 0 && <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-full"><AlertTriangle className="w-3.5 h-3.5" />{health.criticalIssues} critical issue{health.criticalIssues > 1 ? "s" : ""}</span>}
                  {health.highIssues > 0 && <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1.5 rounded-full"><AlertCircle className="w-3.5 h-3.5" />{health.highIssues} high-priority issue{health.highIssues > 1 ? "s" : ""}</span>}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <HealthBanner health={health} />
          </motion.div>

          {/* Pillars */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h3 className="text-sm font-semibold text-ink-3 uppercase tracking-widest mb-4">Score Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
              {pillarList.map((p, i) => (
                <div key={p.key} className="flex flex-col">
                  <ScorePillar label={p.label} description={p.description} score={p.score} points={p.points} maxPoints={p.maxPoints} icon={PILLAR_ICONS[p.key]} delay={200 + i * 60} />
                  <CheckList checks={p.checks} />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Keywords */}
          {keywords?.top?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <KeywordsSection keywords={keywords.top} coverageScore={keywords.coverageScore} />
            </motion.div>
          )}

          {/* Recommendations */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <h3 className="text-sm font-semibold text-ink-3 uppercase tracking-widest mb-4">What to Fix First</h3>
            <div className="space-y-3">
              {freeRecs.map((rec, i) => {
                const cfg = PRIORITY_CFG[rec.priority];
                const Icon = cfg.icon;
                return (
                  <motion.div key={rec.id} className={`rounded-2xl border p-5 ${cfg.wrap}`}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.07 }}>
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
                                <button onClick={() => setAuthOpen(true)} className="text-xs font-semibold text-brand hover:text-brand-dark transition-colors underline underline-offset-2">
                                  Sign up free to unlock fixes
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

          {/* Locked recs */}
          {gatedRecs.length > 0 && (
            <motion.div className="mt-4 relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <div className="space-y-3 pointer-events-none select-none">
                {gatedRecs.slice(0, 2).map((rec, i) => {
                  const cfg = PRIORITY_CFG[rec.priority];
                  return (
                    <div key={i} className={`rounded-2xl border p-5 ${cfg.wrap} opacity-25 blur-sm`}>
                      <div className="flex items-start gap-4">
                        <div className="w-5 h-5 rounded shrink-0 mt-0.5" />
                        <div><div className="h-3 bg-ink/10 rounded w-24 mb-2" /><div className="h-2.5 bg-ink/5 rounded w-48" /></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-surface/80 to-surface rounded-2xl px-6 py-8 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <Lock className="w-6 h-6 text-brand" />
                </div>
                <p className="text-ink font-bold text-lg mb-1">{gatedRecsCount} more issues found</p>
                <p className="text-ink-3 text-sm max-w-xs mb-4">Create a free account to see every issue and track your improvements over time.</p>
                <button onClick={() => setAuthOpen(true)} className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-xl"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>
                  Create Free Account <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ROI strip */}
          <motion.div className="card rounded-2xl p-5 mt-8" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.04), rgba(219,39,119,0.03))", borderColor: "rgba(124,58,237,0.1)" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest mb-3">Why fixing this matters</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: <TrendingUp className="w-4 h-4" />, stat: "2.3×", desc: "more organic leads for sites scoring 90+", color: "#059669" },
                { icon: <Target className="w-4 h-4" />, stat: "+7%", desc: "conversion rate per 1-second load improvement", color: "#7C3AED" },
                { icon: <Award className="w-4 h-4" />, stat: "30%", desc: "more AI search citations with complete Schema", color: "#DB2777" },
              ].map(({ icon, stat, desc, color }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}12`, color }}>{icon}</div>
                  <div>
                    <p className="text-lg font-black" style={{ color }}>{stat}</p>
                    <p className="text-xs text-ink-3 leading-snug">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Pricing */}
          <motion.div id="plans" className="mt-10" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full mb-4"
                style={{ background: "rgba(124,58,237,0.07)", color: "#7C3AED", border: "1px solid rgba(124,58,237,0.12)" }}>
                <Lightbulb className="w-3.5 h-3.5" />We fix everything — you see results in 7 days
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-ink mb-2">Choose your fix plan</h2>
              <p className="text-ink-3 text-sm max-w-md mx-auto">Our team handles the entire fix list. Sites we fix typically see a 15–30 point score increase within 2 weeks.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { name: "Starter", price: "$499", roi: "~$1,200 avg. ROI", features: ["Title & meta optimisation", "Basic Schema markup", "Speed quick-wins", "Full audit report PDF"], cta: "Get Started", highlight: false },
                { name: "Growth", price: "$999", roi: "~$3,500 avg. ROI", features: ["Everything in Starter", "Full Technical SEO fix", "GEO & AEO Schema setup", "FAQ & HowTo schema", "30-day check-in"], cta: "Fix My Site", highlight: true },
                { name: "Authority", price: "$1,999", roi: "~$8,000+ avg. ROI", features: ["Everything in Growth", "Content strategy brief", "Link building strategy", "Monthly reporting", "90-day Slack support"], cta: "Let's Talk", highlight: false },
              ].map((plan) => (
                <div key={plan.name} className={`rounded-2xl p-6 flex flex-col relative transition-all duration-200 ${plan.highlight ? "" : "card"}`}
                  style={plan.highlight ? { background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(219,39,119,0.04))", border: "1.5px solid rgba(124,58,237,0.3)", boxShadow: "0 12px 40px rgba(124,58,237,0.15)", borderRadius: 16 } : {}}>
                  {plan.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap text-white" style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>Most Popular</div>}
                  <p className="text-xs font-bold text-ink-4 uppercase tracking-widest mb-1">{plan.name}</p>
                  <span className="text-3xl font-black text-ink mb-0.5">{plan.price}</span>
                  <p className="text-xs font-semibold text-brand mb-3">{plan.roi}</p>
                  <ul className="space-y-1.5 mb-5 flex-1">
                    {plan.features.map(f => <li key={f} className="flex items-center gap-2 text-xs text-ink-2"><CheckCircle className="w-3.5 h-3.5 text-brand shrink-0" />{f}</li>)}
                  </ul>
                  <button onClick={() => setAuthOpen(true)}
                    className={`w-full text-center text-sm font-bold py-3 rounded-xl transition-all ${plan.highlight ? "text-white" : "border border-gray-200 text-ink-2 hover:bg-gray-50 bg-white"}`}
                    style={plan.highlight ? { background: "linear-gradient(135deg, #7C3AED, #DB2777)" } : {}}>
                    {plan.cta} →
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Final CTA */}
          <motion.div className="rounded-3xl overflow-hidden mt-6" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <div className="relative p-8 sm:p-12 text-center" style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 40%, #DB2777 100%)" }}>
              <div className="inline-flex items-center gap-2 bg-white/15 text-white/80 text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-white/20">
                <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />We fix sites like {host} every week
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">Ready to fix this?</h3>
              <p className="text-white/70 text-base max-w-lg mx-auto mb-7 leading-relaxed">Our team handles everything — one week, measurable results. Book a free 30-min call to walk through your audit.</p>
              <button onClick={() => setAuthOpen(true)} className="inline-flex items-center gap-2 bg-white text-brand-dark font-bold px-8 py-4 rounded-2xl hover:bg-white/90 transition-colors text-base shadow-xl">
                Get Started — It&apos;s Free <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <footer className="border-t border-gray-100 bg-white py-6 px-6 text-center">
        <p className="text-xs text-ink-4">
          Built by <a href="https://clearsight.agency" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-dark transition-colors underline underline-offset-2">Clearsight Agency</a>
          {" "}· <a href="/" className="text-brand hover:text-brand-dark transition-colors underline underline-offset-2">Run another audit</a>
        </p>
      </footer>
    </div>
  );
}
