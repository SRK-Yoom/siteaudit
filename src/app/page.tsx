"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Zap, BarChart2, Globe, Shield, Lock, ArrowRight, RotateCcw,
  ExternalLink, AlertTriangle, AlertCircle, CheckCircle, ChevronRight,
  FileText, Tag, Link2, Image, CheckSquare, XSquare, MinusSquare,
  TrendingUp, Brain, Sparkles,
} from "lucide-react";
import { ScoreCircle } from "@/components/audit/ScoreCircle";
import { ScorePillar } from "@/components/audit/ScorePillar";

// ── Types ──────────────────────────────────────────────────────────────────

interface Check { label: string; passed: boolean; detail: string }
interface PillarData { score: number; label: string; description: string; points: number; maxPoints: number; checks: Check[] }
interface Recommendation { id: string; title: string; description: string; priority: "critical" | "high" | "medium"; category: string; fix: string }
interface Keyword { word: string; count: number; inTitle: boolean; inH1: boolean; inMetaDesc: boolean; inURL: boolean }

interface AuditData {
  score: number;
  url: string;
  health: {
    domain: string; isHTTPS: boolean; pageCount: number | null;
    hasRobots: boolean; hasSitemap: boolean; blockedByCrawlers: boolean;
    criticalIssues: number; highIssues: number; totalIssues: number;
    schemaTypesFound: string[]; htmlFetchError: boolean;
  };
  pillars: {
    performance: PillarData; technicalSeo: PillarData; contentKeywords: PillarData;
    geoReadiness: PillarData; aeoReadiness: PillarData; accessibility: PillarData;
  };
  keywords: { top: Keyword[]; coverageScore: number };
  recommendations: Recommendation[];
  gatedRecsCount: number;
}

type Stage = "idle" | "loading" | "results" | "error";

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
  critical: { icon: AlertTriangle, label: "Critical", wrap: "border-red-500/20 bg-red-500/5", badge: "bg-red-500/15 text-red-400 border-red-500/20", iconCls: "text-red-400" },
  high: { icon: AlertCircle, label: "High Priority", wrap: "border-amber-500/20 bg-amber-500/5", badge: "bg-amber-500/15 text-amber-400 border-amber-500/20", iconCls: "text-amber-400" },
  medium: { icon: CheckCircle, label: "Medium", wrap: "border-indigo-500/20 bg-indigo-500/5", badge: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20", iconCls: "text-indigo-400" },
};

// ── Sub-components ─────────────────────────────────────────────────────────

function NavBar({ onLogoClick }: { onLogoClick?: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-ink/80 backdrop-blur-xl">
      <div className="max-w-content mx-auto px-6 h-16 flex items-center justify-between">
        <button onClick={onLogoClick} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0">
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
              <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" fill="none" strokeDasharray="28 16" strokeLinecap="round" transform="rotate(-90 10 10)" />
              <text x="10" y="14" textAnchor="middle" fontSize="8" fontWeight="800" fill="white" fontFamily="system-ui">S</text>
            </svg>
          </div>
          <span className="font-bold text-white text-lg tracking-tight group-hover:text-brand-light transition-colors">SiteScore</span>
        </button>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          Free · No signup required
        </div>
      </div>
    </header>
  );
}

function LoadingScreen({ url }: { url: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep(s => s < LOADING_STEPS.length - 1 ? s + 1 : s), 3000);
    return () => clearInterval(id);
  }, []);
  let host = url;
  try { host = new URL(url).hostname; } catch {}

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-24 text-center">
      <div className="relative mb-10">
        <div className="w-24 h-24 rounded-full border-4 border-white/5 border-t-brand animate-spin" style={{ animationDuration: "1.2s" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          {LOADING_STEPS.map(({ icon: Icon }, i) => (
            <Icon key={i} className={`w-9 h-9 absolute transition-all duration-500 ${i === step ? "opacity-100 scale-100 text-brand-light" : "opacity-0 scale-75 text-white/20"}`} />
          ))}
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Analysing <span className="text-brand-light">{host}</span></h2>
      <AnimatePresence mode="wait">
        <motion.p key={step} className="text-white/50 text-base" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
          {LOADING_STEPS[step].label}
        </motion.p>
      </AnimatePresence>
      <div className="mt-8 flex items-center gap-2">
        {LOADING_STEPS.map((_, i) => (
          <div key={i} className={`rounded-full transition-all duration-500 ${i <= step ? "w-6 h-1.5 bg-brand" : "w-1.5 h-1.5 bg-white/10"}`} />
        ))}
      </div>
      <p className="mt-8 text-xs text-white/25 max-w-sm leading-relaxed">
        We&apos;re running a full PageSpeed scan, scraping your page HTML, analysing keywords, and checking GEO + AEO readiness. This takes 20–40 seconds.
      </p>
    </div>
  );
}

function HealthBanner({ health }: { health: AuditData["health"] }) {
  const items = [
    { label: "Domain", value: health.domain, icon: <Globe className="w-3.5 h-3.5" /> },
    { label: "Pages (sitemap)", value: health.pageCount != null ? health.pageCount.toLocaleString() : "—", icon: <FileText className="w-3.5 h-3.5" /> },
    { label: "HTTPS", value: health.isHTTPS ? "Secure ✓" : "Not secure ✗", icon: <Lock className="w-3.5 h-3.5" />, alert: !health.isHTTPS },
    { label: "Robots.txt", value: health.hasRobots ? (health.blockedByCrawlers ? "⚠ Blocking" : "Valid ✓") : "Missing ✗", icon: <Link2 className="w-3.5 h-3.5" />, alert: !health.hasRobots || health.blockedByCrawlers },
    { label: "Sitemap", value: health.hasSitemap ? "Found ✓" : "Missing ✗", icon: <BarChart2 className="w-3.5 h-3.5" />, alert: !health.hasSitemap },
    { label: "Schema types", value: health.schemaTypesFound.length > 0 ? health.schemaTypesFound.slice(0, 3).join(", ") : "None found", icon: <Tag className="w-3.5 h-3.5" />, alert: health.schemaTypesFound.length === 0 },
  ];

  return (
    <div className="glass-card rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Site Health Overview</h3>
        {(health.criticalIssues > 0 || health.highIssues > 0) && (
          <div className="flex gap-2">
            {health.criticalIssues > 0 && <span className="text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full">{health.criticalIssues} Critical</span>}
            {health.highIssues > 0 && <span className="text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full">{health.highIssues} High</span>}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map(item => (
          <div key={item.label} className={`rounded-xl p-3 ${item.alert ? "bg-red-500/5 border border-red-500/15" : "bg-white/3 border border-white/5"}`}>
            <div className={`flex items-center gap-1.5 mb-1 ${item.alert ? "text-red-400" : "text-white/30"}`}>
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </div>
            <p className={`text-xs font-semibold truncate ${item.alert ? "text-red-300" : "text-white/70"}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function KeywordSection({ keywords, coverageScore }: { keywords: Keyword[]; coverageScore: number }) {
  if (keywords.length === 0) return null;
  const FREE_LIMIT = 4;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-widest">Keyword Analysis</h3>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${coverageScore >= 60 ? "bg-green-500/10 text-green-400 border-green-500/20" : coverageScore >= 30 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
          {coverageScore}% keyword coverage
        </span>
      </div>
      <div className="glass-card rounded-2xl overflow-hidden mb-8">
        <div className="grid grid-cols-5 gap-0 px-4 py-2 border-b border-white/5 text-xs font-semibold text-white/30 uppercase tracking-wide">
          <div className="col-span-2">Keyword</div>
          <div className="text-center">Title</div>
          <div className="text-center">H1</div>
          <div className="text-center">Meta</div>
        </div>
        {keywords.slice(0, FREE_LIMIT).map((kw, i) => (
          <motion.div key={kw.word} className="grid grid-cols-5 gap-0 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }}>
            <div className="col-span-2 flex items-center gap-2">
              {i === 0 && <span className="text-xs bg-brand/20 text-brand-light px-1.5 py-0.5 rounded font-bold">Primary</span>}
              <span className="text-sm font-semibold text-white">{kw.word}</span>
            </div>
            <KwDot present={kw.inTitle} />
            <KwDot present={kw.inH1} />
            <KwDot present={kw.inMetaDesc} />
          </motion.div>
        ))}
        {keywords.length > FREE_LIMIT && (
          <div className="relative">
            <div className="px-4 py-3 opacity-30 pointer-events-none select-none grid grid-cols-5 gap-0">
              {[keywords[FREE_LIMIT]].map(kw => (
                <>
                  <div className="col-span-2 text-sm font-semibold text-white blur-sm">{kw.word}</div>
                  <div className="text-center blur-sm"><CheckSquare className="w-4 h-4 text-green-400 mx-auto" /></div>
                  <div className="text-center blur-sm"><XSquare className="w-4 h-4 text-white/20 mx-auto" /></div>
                  <div className="text-center blur-sm"><CheckSquare className="w-4 h-4 text-green-400 mx-auto" /></div>
                </>
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-ink/70 to-ink/90">
              <div className="text-center">
                <Lock className="w-4 h-4 text-white/40 mx-auto mb-1" />
                <p className="text-xs text-white/40">{keywords.length - FREE_LIMIT} more keywords — unlock full report</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function KwDot({ present }: { present: boolean }) {
  return (
    <div className="flex items-center justify-center">
      {present
        ? <CheckSquare className="w-4 h-4 text-green-400" />
        : <XSquare className="w-4 h-4 text-white/20" />}
    </div>
  );
}

function CheckList({ checks, gated = false }: { checks: Check[]; gated?: boolean }) {
  const FREE = 3;
  const visible = checks.slice(0, FREE);
  const hidden = checks.slice(FREE);

  return (
    <div className="space-y-1.5 mt-3 pt-3 border-t border-white/5">
      {visible.map((c, i) => (
        <div key={i} className="flex items-start gap-2">
          {c.passed
            ? <CheckSquare className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
            : <XSquare className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />}
          <div className="min-w-0">
            <span className="text-xs font-semibold text-white/70">{c.label}</span>
            <p className="text-xs text-white/35 leading-snug mt-0.5">{c.detail}</p>
          </div>
        </div>
      ))}
      {gated && hidden.length > 0 && (
        <div className="relative mt-2">
          <div className="opacity-20 pointer-events-none select-none space-y-1.5">
            {hidden.slice(0, 2).map((c, i) => (
              <div key={i} className="flex items-start gap-2 blur-sm">
                <MinusSquare className="w-3.5 h-3.5 text-white/40 shrink-0 mt-0.5" />
                <span className="text-xs text-white/50">{c.label}</span>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-white/30 flex items-center gap-1"><Lock className="w-3 h-3" />{hidden.length} more checks</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsScreen({ data, onReset }: { data: AuditData; onReset: () => void }) {
  const { score, url, health, pillars, keywords, recommendations, gatedRecsCount } = data;
  const freeRecs = recommendations.slice(0, 3);
  const gatedRecs = recommendations.slice(3);

  let host = url;
  try { host = new URL(url).hostname; } catch {}

  const verdict = score >= 90 ? { h: "Your site is in great shape!", s: "You're ahead of most competitors. A few tweaks could push you even higher." }
    : score >= 70 ? { h: "Solid foundation — but you're leaving traffic on the table.", s: "Fixing the issues below could meaningfully boost your rankings and AI visibility." }
    : score >= 50 ? { h: "Significant gaps are holding your site back.", s: "These issues are actively costing you traffic and potential customers right now." }
    : { h: "Your site needs urgent attention.", s: "Critical issues are preventing search engines and AI systems from properly indexing your business." };

  const pillarList = [
    { key: "performance", ...pillars.performance },
    { key: "technicalSeo", ...pillars.technicalSeo },
    { key: "contentKeywords", ...pillars.contentKeywords },
    { key: "geoReadiness", ...pillars.geoReadiness },
    { key: "aeoReadiness", ...pillars.aeoReadiness },
    { key: "accessibility", ...pillars.accessibility },
  ];

  return (
    <div className="flex-1 pb-24">
      <div className="max-w-content mx-auto px-6">
        {/* Reset bar */}
        <motion.div className="flex items-center justify-between py-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-2 text-sm text-white/40">
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span className="font-medium text-white/60 truncate max-w-[200px] sm:max-w-sm">{host}</span>
            <span>· mobile audit</span>
            {health.htmlFetchError && <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">HTML fetch blocked — some signals estimated</span>}
          </div>
          <button onClick={onReset} className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />Audit another site
          </button>
        </motion.div>

        {/* Score hero */}
        <motion.div className="glass-card rounded-3xl p-8 sm:p-10 flex flex-col md:flex-row items-center gap-10 mb-6" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="shrink-0"><ScoreCircle score={score} size={200} /></div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{verdict.h}</h2>
            <p className="text-white/50 mt-3 text-base leading-relaxed max-w-lg">{verdict.s}</p>
            {(health.criticalIssues > 0 || health.highIssues > 0) && (
              <div className="mt-5 flex flex-wrap gap-2 justify-center md:justify-start">
                {health.criticalIssues > 0 && <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-full"><AlertTriangle className="w-3.5 h-3.5" />{health.criticalIssues} critical issue{health.criticalIssues > 1 ? "s" : ""}</span>}
                {health.highIssues > 0 && <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-full"><AlertCircle className="w-3.5 h-3.5" />{health.highIssues} high-priority issue{health.highIssues > 1 ? "s" : ""}</span>}
              </div>
            )}
          </div>
        </motion.div>

        {/* Site health */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <HealthBanner health={health} />
        </motion.div>

        {/* Pillars */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <h3 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-4">Score Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {pillarList.map((p, i) => (
              <div key={p.key} className="flex flex-col">
                <ScorePillar label={p.label} description={p.description} score={p.score} points={p.points} maxPoints={p.maxPoints} icon={PILLAR_ICONS[p.key]} delay={250 + i * 70} />
                <CheckList checks={p.checks} gated={true} />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Keywords */}
        <KeywordSection keywords={keywords.top} coverageScore={keywords.coverageScore} />

        {/* Free recommendations */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.45 }}>
          <h3 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-4">What to Fix First</h3>
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
                        <span className="text-xs text-white/30 font-medium">{rec.category}</span>
                      </div>
                      <p className="font-semibold text-sm text-white">{rec.title}</p>
                      <p className="text-sm mt-1.5 leading-relaxed text-white/50">{rec.description}</p>
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-xs text-white/40"><span className="font-semibold text-white/60">How to fix: </span>{rec.fix}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Gated recommendations */}
        {gatedRecs.length > 0 && (
          <motion.div className="mt-4 relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
            {/* Blurred preview */}
            <div className="space-y-3 pointer-events-none select-none">
              {gatedRecs.slice(0, 2).map((rec, i) => {
                const cfg = PRIORITY_CFG[rec.priority];
                return (
                  <div key={i} className={`rounded-2xl border p-5 ${cfg.wrap} opacity-30 blur-sm`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-5 h-5 rounded bg-current ${cfg.iconCls} shrink-0 mt-0.5`} />
                      <div>
                        <div className="h-3 bg-white/20 rounded w-24 mb-2" />
                        <div className="h-2.5 bg-white/10 rounded w-48" />
                        <div className="h-2.5 bg-white/10 rounded w-36 mt-1" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Gate overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-ink/80 to-ink rounded-2xl px-6 py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-brand/20 border border-brand/30 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-brand-light" />
              </div>
              <p className="text-white font-bold text-lg mb-1">
                {gatedRecsCount} more issue{gatedRecsCount > 1 ? "s" : ""} found
              </p>
              <p className="text-white/40 text-sm max-w-xs mb-5">
                We can fix all of this for you. Book a free call and we&apos;ll walk through every issue with a clear fix plan.
              </p>
              <a href="https://clearsight.agency/contact" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm">
                Get Full Report + Fix Plan <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div className="rounded-3xl overflow-hidden mt-10" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.65 }}>
          <div className="relative bg-gradient-to-br from-brand-dark via-brand to-violet-600 p-8 sm:p-12 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white/70 text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-white/15">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />We fix sites like yours every week
              </div>
              <h3 className="text-2xl sm:text-4xl font-black text-white mb-4 leading-tight">
                We can fix <span className="text-yellow-300">{host}</span><br />in 7 days.
              </h3>
              <p className="text-white/60 text-base max-w-xl mx-auto mb-8 leading-relaxed">
                Our team handles everything — speed optimisation, Technical SEO, Schema markup, GEO & AEO readiness. One week. Measurable results. No tech knowledge required from you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="https://clearsight.agency/contact" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-white text-brand-dark font-bold px-8 py-4 rounded-2xl hover:bg-white/90 transition-colors text-base shadow-xl">
                  Book a Free Strategy Call <ArrowRight className="w-5 h-5" />
                </a>
                <a href="https://clearsight.agency/pricing" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors text-base">
                  See Pricing <ChevronRight className="w-4 h-4" />
                </a>
              </div>
              <p className="text-white/30 text-xs mt-6">No commitment. Free 30-minute call to walk through your audit results.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function Home() {
  const [stage, setStage] = useState<Stage>("idle");
  const [inputUrl, setInputUrl] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = inputUrl.trim();
    if (!url) return;
    setSubmittedUrl(url);
    setStage("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json() as AuditData & { error?: string };
      if (!res.ok || data.error) { setErrorMsg(data.error ?? "Something went wrong."); setStage("error"); return; }
      setAuditData(data);
      setStage("results");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStage("error");
    }
  };

  const handleReset = () => { setStage("idle"); setInputUrl(""); setAuditData(null); setErrorMsg(""); setTimeout(() => inputRef.current?.focus(), 100); };

  return (
    <div className="min-h-screen flex flex-col bg-ink">
      <NavBar onLogoClick={stage !== "idle" ? handleReset : undefined} />

      <AnimatePresence mode="wait">
        {stage === "idle" && (
          <motion.div key="idle" className="flex-1 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <section className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-12 text-center relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand/10 blur-[120px] pointer-events-none" />
              <motion.div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white/60 text-xs font-semibold px-4 py-2 rounded-full mb-8" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />Free · Instant · No signup required
              </motion.div>
              <motion.h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white leading-[1.08] tracking-tight mb-6 max-w-4xl" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}>
                How visible is<br /><span className="gradient-text">your website?</span>
              </motion.h1>
              <motion.p className="text-lg sm:text-xl text-white/50 max-w-xl mb-12 leading-relaxed" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
                Enter any URL and get a comprehensive SEO, GEO & AEO audit score in under 60 seconds — with a breakdown of exactly what to fix.
              </motion.p>
              <motion.form onSubmit={handleSubmit} className="w-full max-w-2xl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
                <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 pointer-events-none" />
                    <input ref={inputRef} type="text" value={inputUrl} onChange={e => setInputUrl(e.target.value)} placeholder="yourwebsite.com" className="url-input w-full pl-12 pr-4 py-3.5 bg-transparent text-white placeholder:text-white/25 text-base focus:outline-none rounded-xl" autoFocus spellCheck={false} autoComplete="off" />
                  </div>
                  <button type="submit" disabled={!inputUrl.trim()} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-base shrink-0 shadow-lg shadow-brand/30">
                    Run Free Audit <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-white/20 mt-3 text-center">Powered by Google PageSpeed Insights + HTML analysis · Works on any public website</p>
              </motion.form>
            </section>

            <section className="border-t border-white/5 px-6 py-14">
              <div className="max-w-content mx-auto">
                <p className="text-center text-xs font-semibold text-white/30 uppercase tracking-widest mb-8">6 pillars analysed in every audit</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { icon: <Zap className="w-5 h-5" />, label: "Performance", sub: "15 pts" },
                    { icon: <Search className="w-5 h-5" />, label: "Technical SEO", sub: "22 pts" },
                    { icon: <FileText className="w-5 h-5" />, label: "Content & Keywords", sub: "15 pts" },
                    { icon: <Globe className="w-5 h-5" />, label: "GEO Readiness", sub: "20 pts" },
                    { icon: <Brain className="w-5 h-5" />, label: "AEO Readiness", sub: "20 pts" },
                    { icon: <Shield className="w-5 h-5" />, label: "Accessibility", sub: "8 pts" },
                  ].map(({ icon, label, sub }, i) => (
                    <motion.div key={label} className="glass-card rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 + i * 0.07 }}>
                      <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand-light flex items-center justify-center">{icon}</div>
                      <div>
                        <p className="text-xs font-semibold text-white leading-tight">{label}</p>
                        <p className="text-xs text-white/30 mt-0.5">{sub}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <motion.div className="mt-12 grid grid-cols-3 gap-6 pt-10 border-t border-white/5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                  {[{ v: "~40s", l: "Average audit time" }, { v: "6", l: "Pillars analysed" }, { v: "100%", l: "Free, always" }].map(({ v, l }) => (
                    <div key={l} className="text-center">
                      <p className="text-3xl font-black text-white">{v}</p>
                      <p className="text-xs text-white/30 mt-1">{l}</p>
                    </div>
                  ))}
                </motion.div>
              </div>
            </section>
          </motion.div>
        )}

        {stage === "loading" && (
          <motion.div key="loading" className="flex-1 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <LoadingScreen url={submittedUrl} />
          </motion.div>
        )}

        {stage === "error" && (
          <motion.div key="error" className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Couldn&apos;t analyse that site</h2>
            <p className="text-white/40 text-base max-w-sm mb-8 leading-relaxed">{errorMsg}</p>
            <button onClick={handleReset} className="inline-flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl transition-colors">
              <RotateCcw className="w-4 h-4" />Try a different URL
            </button>
          </motion.div>
        )}

        {stage === "results" && auditData && (
          <motion.div key="results" className="flex-1 flex flex-col" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <ResultsScreen data={auditData} onReset={handleReset} />
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="border-t border-white/5 py-6 px-6 text-center">
        <p className="text-xs text-white/20">
          Built by <a href="https://clearsight.agency" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/70 transition-colors underline underline-offset-2">Clearsight Agency</a> · Powered by Google PageSpeed Insights + HTML analysis
        </p>
      </footer>
    </div>
  );
}
