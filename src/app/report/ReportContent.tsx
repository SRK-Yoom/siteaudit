"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, CheckCircle, AlertTriangle, AlertCircle, ExternalLink,
  RotateCcw, FileText, Globe, Brain, Zap, Shield, Search, Lock,
  Tag, Link2, BarChart2, Target, TrendingUp, Award,
  Lightbulb, Share2, Check, ChevronDown, CheckSquare, XSquare,
} from "lucide-react";
import { useState, useEffect } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { ExportPDF } from "@/components/dashboard/ExportPDF";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Check { label: string; passed: boolean; detail: string }
interface PillarData { score: number; label: string; description: string; points: number; maxPoints: number; checks: Check[] }
interface Keyword { word: string; count: number; inTitle: boolean; inH1: boolean; inMetaDesc: boolean; inURL: boolean }
interface AuditData {
  score: number; url: string;
  health: { domain: string; isHTTPS: boolean; pageCount: number | null; hasRobots: boolean; hasSitemap: boolean; blockedByCrawlers: boolean; criticalIssues: number; highIssues: number; totalIssues: number; schemaTypesFound: string[]; htmlFetchError: boolean };
  pillars: { performance: PillarData; technicalSeo: PillarData; contentKeywords: PillarData; geoReadiness: PillarData; aeoReadiness: PillarData; accessibility: PillarData; cro?: PillarData; analytics?: PillarData };
  keywords: { top: Keyword[]; coverageScore: number };
  recommendations: { id: string; title: string; description: string; priority: "critical" | "high" | "medium"; category: string; fix: string }[];
  gatedRecsCount: number;
}

// ── Design tokens ─────────────────────────────────────────────────────────────
function getAccent(score: number) {
  if (score >= 90) return { bar: "#10B981", bg: "#F0FDF4", border: "#BBF7D0", text: "#059669", label: "Excellent", dot: "#10B981" };
  if (score >= 70) return { bar: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", text: "#7C3AED", label: "Good", dot: "#7C3AED" };
  if (score >= 50) return { bar: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", label: "Fair", dot: "#F59E0B" };
  return { bar: "#EF4444", bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", label: "Poor", dot: "#EF4444" };
}

const PILLAR_META: Record<string, { icon: React.ReactNode; color: string }> = {
  performance:     { icon: <Zap className="w-5 h-5" />,       color: "#F59E0B" },
  technicalSeo:    { icon: <Search className="w-5 h-5" />,     color: "#7C3AED" },
  contentKeywords: { icon: <FileText className="w-5 h-5" />,   color: "#A855F7" },
  geoReadiness:    { icon: <Globe className="w-5 h-5" />,      color: "#0EA5E9" },
  aeoReadiness:    { icon: <Brain className="w-5 h-5" />,      color: "#8B5CF6" },
  accessibility:   { icon: <Shield className="w-5 h-5" />,     color: "#10B981" },
  cro:             { icon: <Target className="w-5 h-5" />,     color: "#EC4899" },
  analytics:       { icon: <TrendingUp className="w-5 h-5" />, color: "#06B6D4" },
};

const PRIORITY_CFG = {
  critical: { Icon: AlertTriangle, label: "Critical",      bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", badge: "#FEE2E2" },
  high:     { Icon: AlertCircle,   label: "High Priority", bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", badge: "#FEF3C7" },
  medium:   { Icon: CheckCircle,   label: "Medium",        bg: "#F5F3FF", border: "#DDD6FE", text: "#7C3AED", badge: "#EDE9FE" },
};

// ── Pillar Card (expandable) ──────────────────────────────────────────────────
function PillarCard({ pillarKey, data, delay }: { pillarKey: string; data: PillarData; delay: number }) {
  const [open, setOpen] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const accent = getAccent(data.score ?? 0);
  const meta = PILLAR_META[pillarKey] ?? { icon: <Target className="w-5 h-5" />, color: "#7C3AED" };

  useEffect(() => {
    const t = setTimeout(() => setBarWidth(data.score ?? 0), delay);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passedChecks = (data.checks ?? []).filter(c => c.passed).length;
  const totalChecks  = (data.checks ?? []).length;

  return (
    <motion.div
      className="bg-white rounded-2xl overflow-hidden cursor-pointer select-none"
      style={{ border: `1px solid ${accent.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.03)" }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: delay / 1000 }}
      onClick={() => setOpen(o => !o)}
    >
      {/* Coloured top accent bar */}
      <div style={{ height: 4, background: meta.color, opacity: 0.85 }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${meta.color}15`, color: meta.color }}>
              {meta.icon}
            </div>
            <div>
              <p className="font-bold text-[#0F0A1E] text-sm leading-tight">{data.label || "—"}</p>
              <p className="text-xs text-[#6B7280] mt-0.5 leading-snug">{data.description}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-3xl font-black tabular-nums" style={{ color: accent.text }}>{data.score ?? 0}</span>
            <span className="text-xs text-[#9CA3AF] ml-0.5">/100</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full rounded-full mb-3" style={{ background: "#F3F4F6" }}>
          <div className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${barWidth}%`, background: meta.color }} />
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ color: accent.text, background: accent.bg, border: `1px solid ${accent.border}` }}>
            {accent.label}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9CA3AF]">
              <span className="text-[#374151] font-semibold">{data.points ?? 0}</span> / {data.maxPoints ?? 100} pts
            </span>
            {totalChecks > 0 && (
              <button className="flex items-center gap-1 text-xs font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors">
                <span>{passedChecks}/{totalChecks} checks</span>
                <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-3.5 h-3.5" />
                </motion.div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable checks */}
      <AnimatePresence>
        {open && totalChecks > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-gray-100">
              <div className="space-y-2">
                {(data.checks ?? []).map((c, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl"
                    style={{ background: c.passed ? "#F0FDF4" : "#FEF2F2" }}>
                    {c.passed
                      ? <CheckSquare className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                      : <XSquare    className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />}
                    <div>
                      <p className="text-xs font-semibold" style={{ color: c.passed ? "#065F46" : "#991B1B" }}>{c.label}</p>
                      <p className="text-xs mt-0.5 leading-snug" style={{ color: c.passed ? "#047857" : "#B91C1C" }}>{c.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Health Chip ───────────────────────────────────────────────────────────────
function HealthChip({ label, value, icon, alert }: { label: string; value: string; icon: React.ReactNode; alert: boolean }) {
  return (
    <div className="flex-shrink-0 flex flex-col gap-1.5 px-4 py-3 rounded-2xl min-w-[120px]"
      style={{
        background: alert ? "#FEF2F2" : "#F0FDF4",
        border: `1px solid ${alert ? "#FECACA" : "#BBF7D0"}`,
      }}>
      <div className="flex items-center gap-1.5" style={{ color: alert ? "#DC2626" : "#059669" }}>
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="text-sm font-bold truncate" style={{ color: alert ? "#991B1B" : "#065F46" }}>{value}</p>
    </div>
  );
}

// ── Keyword row ───────────────────────────────────────────────────────────────
function KwDot({ present }: { present: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold`}
      style={{ background: present ? "#F0FDF4" : "#F3F4F6", color: present ? "#059669" : "#9CA3AF", border: `1px solid ${present ? "#BBF7D0" : "#E5E7EB"}` }}>
      {present ? "✓" : "–"}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function ReportContent({ auditData, email, url, token }: {
  auditData: AuditData; email: string; url: string; token: string;
}) {
  const [authOpen, setAuthOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handlePlanCheckout = async (plan: "starter" | "growth" | "authority") => {
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email: email || undefined, domain: (() => { try { return new URL(url).hostname; } catch { return url; } })() }),
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

  const auditForPDF = {
    id: token, url,
    overall_score: auditData.score,
    created_at: new Date().toISOString(),
    data: {
      health: auditData.health,
      pillars: Object.fromEntries(
        Object.entries(auditData.pillars).map(([k, v]) => [
          k, { score: v.score, label: v.label, points: v.points, maxPoints: v.maxPoints },
        ])
      ),
      recommendations: auditData.recommendations,
    },
  };

  const handleShare = async () => {
    setShareLoading(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditData, url, score: auditData.score }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        if (res.status === 401) { setAuthOpen(true); return; }
        alert(err.error ?? "Failed to generate share link");
        return;
      }
      const { shareUrl } = await res.json() as { token: string; shareUrl: string };
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    } catch { alert("Could not copy to clipboard."); }
    finally { setShareLoading(false); }
  };

  const { score, health, pillars, keywords, recommendations, gatedRecsCount } = auditData;
  let host = url;
  try { host = new URL(url).hostname; } catch {}

  const verdict =
    score >= 90 ? { h: "Your site is in great shape!", sub: "You're ahead of most competitors. A few tweaks could push you even higher.", color: "#059669" } :
    score >= 70 ? { h: "Solid foundation — but you're leaving traffic on the table.", sub: "Fixing the issues below could meaningfully boost your rankings and AI visibility.", color: "#7C3AED" } :
    score >= 50 ? { h: "Significant gaps are holding your site back.", sub: "These issues are actively costing you traffic and potential customers right now.", color: "#D97706" } :
                  { h: "Your site needs urgent attention.", sub: "Critical issues are preventing search engines and AI systems from finding your business.", color: "#DC2626" };

  const pillarList = [
    { key: "performance",     ...(pillars.performance     ?? {}) as PillarData },
    { key: "technicalSeo",    ...(pillars.technicalSeo    ?? {}) as PillarData },
    { key: "contentKeywords", ...(pillars.contentKeywords ?? {}) as PillarData },
    { key: "geoReadiness",    ...(pillars.geoReadiness    ?? {}) as PillarData },
    { key: "aeoReadiness",    ...(pillars.aeoReadiness    ?? {}) as PillarData },
    { key: "accessibility",   ...(pillars.accessibility   ?? {}) as PillarData },
    ...(pillars.cro       ? [{ key: "cro",       ...pillars.cro       }] : []),
    ...(pillars.analytics ? [{ key: "analytics", ...pillars.analytics }] : []),
  ];

  const freeRecs   = recommendations.slice(0, 3);
  const gatedRecs  = recommendations.slice(3);

  const healthItems = [
    { label: "Domain",      value: health.domain,                                                   icon: <Globe  className="w-3.5 h-3.5" />, alert: false },
    { label: "Pages",       value: health.pageCount != null ? String(health.pageCount) : "—",       icon: <FileText className="w-3.5 h-3.5" />, alert: false },
    { label: "HTTPS",       value: health.isHTTPS ? "Secure ✓" : "Not secure ✗",                   icon: <Shield className="w-3.5 h-3.5" />, alert: !health.isHTTPS },
    { label: "Robots.txt",  value: health.hasRobots ? (health.blockedByCrawlers ? "⚠ Blocking" : "Valid ✓") : "Missing ✗", icon: <Link2    className="w-3.5 h-3.5" />, alert: !health.hasRobots || health.blockedByCrawlers },
    { label: "Sitemap",     value: health.hasSitemap ? "Found ✓" : "Missing ✗",                    icon: <BarChart2 className="w-3.5 h-3.5" />, alert: !health.hasSitemap },
    { label: "Schema Types",value: health.schemaTypesFound.length > 0 ? health.schemaTypesFound.slice(0, 2).join(", ") : "None found", icon: <Tag className="w-3.5 h-3.5" />, alert: health.schemaTypesFound.length === 0 },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F8F8FB" }}>

      {/* ── Sticky nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-xl">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>
              <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
                <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" fill="none" strokeDasharray="28 16" strokeLinecap="round" transform="rotate(-90 10 10)" />
                <text x="10" y="14" textAnchor="middle" fontSize="8" fontWeight="800" fill="white" fontFamily="system-ui">S</text>
              </svg>
            </div>
            <span className="font-bold text-[#0F0A1E] text-base">SiteScore</span>
          </a>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="text-xs text-[#9CA3AF] hidden sm:block shrink-0">Audited: <strong className="text-[#374151]">{host}</strong></span>
            <button onClick={handleShare} disabled={shareLoading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors shrink-0"
              style={shareCopied ? { background: "#F0FDF4", color: "#059669", borderColor: "#BBF7D0" } : { background: "white", color: "#374151", borderColor: "#E5E7EB" }}>
              {shareCopied ? <><Check className="w-3.5 h-3.5" />Copied!</> : shareLoading ? <><Share2 className="w-3.5 h-3.5 animate-pulse" />Sharing…</> : <><Share2 className="w-3.5 h-3.5" />Share</>}
            </button>
            <ExportPDF audit={auditForPDF} variant="primary" />
            <a href="/" className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white shrink-0"
              style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>
              New Audit <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup"
        headline="Save this report to your dashboard"
        subheadline="Create a free account to track your score over time and unlock all fixes."
        onSuccess={() => setAuthOpen(false)} />

      <div className="flex-1 pb-24">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6">

          {/* ── Score Hero ──────────────────────────────────────────────────── */}
          <motion.div className="mt-6 rounded-3xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 55%, #DB2777 100%)" }}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="px-6 py-8 sm:px-10 sm:py-10 flex flex-col md:flex-row items-center gap-8">
              {/* Score circle — light version on dark bg */}
              <div className="shrink-0 relative">
                <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full flex flex-col items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.2)" }}>
                  <span className="text-6xl sm:text-7xl font-black text-white tabular-nums leading-none">{score}</span>
                  <span className="text-white/60 text-sm font-medium mt-1">/ 100</span>
                  <div className="mt-2 px-3 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(255,255,255,0.18)", color: "white" }}>
                    {verdict.color === "#059669" ? "Excellent" : verdict.color === "#7C3AED" ? "Good" : verdict.color === "#D97706" ? "Needs Work" : "Critical"}
                  </div>
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 text-white/80 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {host} · mobile audit · sent to {email}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3">{verdict.h}</h1>
                <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-lg mb-5">{verdict.sub}</p>

                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {health.criticalIssues > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-red-500/20 text-white border border-red-400/30 px-3 py-1.5 rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5" />{health.criticalIssues} critical issue{health.criticalIssues > 1 ? "s" : ""}
                    </span>
                  )}
                  {health.highIssues > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-400/20 text-white border border-amber-300/30 px-3 py-1.5 rounded-full">
                      <AlertCircle className="w-3.5 h-3.5" />{health.highIssues} high-priority issue{health.highIssues > 1 ? "s" : ""}
                    </span>
                  )}
                  <button onClick={() => setAuthOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-white text-[#7C3AED] px-3 py-1.5 rounded-full hover:bg-white/90 transition-colors">
                    Save to Dashboard <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Site Health — horizontal scroll chips ───────────────────────── */}
          <motion.div className="mt-5"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">Site Health</p>
              {(health.criticalIssues > 0 || health.highIssues > 0) && (
                <div className="flex gap-2">
                  {health.criticalIssues > 0 && <span className="text-xs font-bold bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-full">{health.criticalIssues} Critical</span>}
                  {health.highIssues    > 0 && <span className="text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100 px-2.5 py-1 rounded-full">{health.highIssues} High</span>}
                </div>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {healthItems.map(item => (
                <HealthChip key={item.label} {...item} />
              ))}
            </div>
          </motion.div>

          {/* ── Score Breakdown — swipable on mobile ────────────────────────── */}
          <motion.div className="mt-8"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">Score Breakdown</p>
              <span className="text-xs text-[#9CA3AF] sm:hidden">← swipe to explore →</span>
            </div>

            {/* Mobile: horizontal scroll with snap */}
            <div className="sm:hidden flex gap-3 overflow-x-auto pb-3 scrollbar-hide"
              style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
              {pillarList.map((p, i) => (
                <div key={p.key} className="shrink-0 w-[80vw] max-w-[320px]" style={{ scrollSnapAlign: "start" }}>
                  <PillarCard pillarKey={p.key} data={p} delay={0} />
                </div>
              ))}
            </div>

            {/* Desktop: grid */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pillarList.map((p, i) => (
                <PillarCard key={p.key} pillarKey={p.key} data={p} delay={150 + i * 60} />
              ))}
            </div>

            <p className="text-xs text-[#9CA3AF] text-center mt-3 hidden sm:block">
              Tap any card to expand the detailed checks
            </p>
          </motion.div>

          {/* ── Keywords ────────────────────────────────────────────────────── */}
          {keywords?.top?.length > 0 && (
            <motion.div className="mt-8"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">Keyword Analysis</p>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  keywords.coverageScore >= 60 ? "bg-green-50 text-green-600 border-green-100" :
                  keywords.coverageScore >= 30 ? "bg-amber-50 text-amber-600 border-amber-100" :
                  "bg-red-50 text-red-600 border-red-100"}`}>
                  {keywords.coverageScore}% coverage
                </span>
              </div>
              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                {/* Header */}
                <div className="grid grid-cols-5 px-4 py-2.5 bg-[#F9FAFB] border-b border-gray-100">
                  <div className="col-span-2 text-xs font-bold text-[#374151] uppercase tracking-wide">Keyword</div>
                  <div className="text-center text-xs font-bold text-[#374151] uppercase tracking-wide">Title</div>
                  <div className="text-center text-xs font-bold text-[#374151] uppercase tracking-wide">H1</div>
                  <div className="text-center text-xs font-bold text-[#374151] uppercase tracking-wide">Meta</div>
                </div>
                {keywords.top.slice(0, 8).map((kw, i) => (
                  <div key={kw.word} className="grid grid-cols-5 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-[#F9FAFB] transition-colors items-center">
                    <div className="col-span-2 flex items-center gap-2 min-w-0">
                      {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0" style={{ background: "rgba(124,58,237,0.08)", color: "#7C3AED", border: "1px solid rgba(124,58,237,0.15)" }}>Primary</span>}
                      <span className="text-sm font-semibold text-[#0F0A1E] truncate">{kw.word}</span>
                    </div>
                    {[kw.inTitle, kw.inH1, kw.inMetaDesc].map((v, j) => (
                      <div key={j} className="flex items-center justify-center"><KwDot present={v} /></div>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Recommendations ─────────────────────────────────────────────── */}
          <motion.div className="mt-8"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest mb-4">What to Fix First</p>
            <div className="space-y-4">
              {freeRecs.map((rec, i) => {
                const cfg = PRIORITY_CFG[rec.priority];
                const { Icon } = cfg;
                return (
                  <motion.div key={rec.id}
                    className="bg-white rounded-2xl overflow-hidden"
                    style={{ border: `1px solid ${cfg.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.07 }}>
                    {/* Priority strip */}
                    <div className="px-5 py-2.5 flex items-center gap-2.5" style={{ background: cfg.badge }}>
                      <Icon className="w-4 h-4 shrink-0" style={{ color: cfg.text }} />
                      <span className="text-xs font-bold" style={{ color: cfg.text }}>{cfg.label}</span>
                      <span className="text-xs font-medium" style={{ color: cfg.text, opacity: 0.7 }}>· {rec.category}</span>
                    </div>
                    {/* Body */}
                    <div className="px-5 py-4">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 mt-0.5"
                          style={{ background: cfg.text }}>{i + 1}</span>
                        <p className="font-bold text-sm text-[#0F0A1E] leading-snug">{rec.title}</p>
                      </div>
                      <p className="text-sm text-[#374151] leading-relaxed pl-7">{rec.description}</p>
                      {/* Gated fix */}
                      <div className="mt-3 ml-7 p-3 rounded-xl" style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.1)" }}>
                        <div className="flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />
                          <span className="text-xs font-semibold text-[#374151]">How to fix:</span>
                          <a href="#plans" className="text-xs font-bold text-[#7C3AED] hover:underline transition-colors">
                            Choose a plan to unlock →
                          </a>
                        </div>
                        <p className="text-xs text-[#9CA3AF] mt-1 blur-sm select-none pointer-events-none" aria-hidden="true">{rec.fix}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* ── Gated recs ──────────────────────────────────────────────────── */}
          {gatedRecs.length > 0 && (
            <motion.div className="mt-4 relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <div className="space-y-4 pointer-events-none select-none">
                {gatedRecs.slice(0, 2).map((rec, i) => {
                  const cfg = PRIORITY_CFG[rec.priority];
                  return (
                    <div key={i} className="bg-white rounded-2xl overflow-hidden opacity-30 blur-sm"
                      style={{ border: `1px solid ${cfg.border}` }}>
                      <div className="px-5 py-2.5" style={{ background: cfg.badge }}>
                        <div className="h-3 w-20 rounded" style={{ background: cfg.text, opacity: 0.3 }} />
                      </div>
                      <div className="px-5 py-4">
                        <div className="h-3 w-3/4 rounded bg-gray-200 mb-2" />
                        <div className="h-2.5 w-full rounded bg-gray-100 mb-1" />
                        <div className="h-2.5 w-2/3 rounded bg-gray-100" />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl px-6 py-8 text-center"
                style={{ background: "linear-gradient(to bottom, rgba(248,248,251,0) 0%, rgba(248,248,251,0.85) 35%, rgba(248,248,251,1) 70%)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <Lock className="w-6 h-6 text-[#7C3AED]" />
                </div>
                <p className="text-[#0F0A1E] font-bold text-lg mb-1">{gatedRecsCount} more issues found</p>
                <p className="text-[#6B7280] text-sm max-w-xs mb-5">Choose the Starter plan to unlock every issue and step-by-step how-to guides.</p>
                <a href="#plans" className="inline-flex items-center gap-2 px-7 py-3 text-sm font-bold text-white rounded-xl shadow-lg"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>
                  Choose a plan to unlock all <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          )}

          {/* ── ROI strip ───────────────────────────────────────────────────── */}
          <motion.div className="mt-8 bg-white rounded-2xl p-6"
            style={{ border: "1px solid rgba(124,58,237,0.12)", background: "linear-gradient(135deg, rgba(124,58,237,0.03), rgba(219,39,119,0.02))" }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest mb-4">Why fixing this matters</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: <TrendingUp className="w-5 h-5" />, stat: "2.3×",  desc: "more organic leads for sites scoring 90+", color: "#059669" },
                { icon: <Target     className="w-5 h-5" />, stat: "+7%",   desc: "conversion rate per 1-second load improvement", color: "#7C3AED" },
                { icon: <Award      className="w-5 h-5" />, stat: "30%",   desc: "more AI search citations with complete Schema", color: "#DB2777" },
              ].map(({ icon, stat, desc, color }, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15`, color }}>{icon}</div>
                  <div>
                    <p className="text-2xl font-black" style={{ color }}>{stat}</p>
                    <p className="text-xs text-[#6B7280] leading-snug">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Pricing ─────────────────────────────────────────────────────── */}
          <motion.div id="plans" className="mt-10"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full mb-4"
                style={{ background: "rgba(124,58,237,0.07)", color: "#7C3AED", border: "1px solid rgba(124,58,237,0.12)" }}>
                <Lightbulb className="w-3.5 h-3.5" />We fix everything — you see results in 7 days
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0F0A1E] mb-2">Choose your fix plan</h2>
              <p className="text-[#6B7280] text-sm max-w-md mx-auto">Our team handles the entire fix list. Sites we fix typically see a 15–30 point score increase within 2 weeks.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { slug: "starter" as const, name: "Starter", price: "£99", desc: "Unlock all details — you do it yourself", features: ["Full report & every recommendation", "Step-by-step how-to guides", "All issues + fix instructions", "Lifetime access to this report"], cta: "Unlock report — £99", highlight: false },
                { slug: "growth" as const, name: "Growth", price: "£999", desc: "We fix it for you", features: ["Everything in Starter", "We implement all fixes", "GEO & AEO Schema setup", "30-day check-in"], cta: "Fix my site — £999", highlight: true },
                { slug: "authority" as const, name: "Authority", price: "£1,999", desc: "Full service + strategy", features: ["Everything in Growth", "Content strategy brief", "Link building strategy", "90-day Slack support"], cta: "Get full service — £1,999", highlight: false },
              ].map((plan) => (
                <div key={plan.slug} className="relative rounded-2xl p-6 flex flex-col bg-white transition-all duration-200"
                  style={plan.highlight
                    ? { background: "linear-gradient(145deg, rgba(124,58,237,0.04), rgba(219,39,119,0.03))", border: "2px solid rgba(124,58,237,0.25)", boxShadow: "0 12px 40px rgba(124,58,237,0.12)" }
                    : { border: "1px solid #E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full text-white whitespace-nowrap shadow-md"
                      style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>Most Popular</div>
                  )}
                  <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest mb-1">{plan.name}</p>
                  <span className="text-3xl font-black text-[#0F0A1E] mb-0.5">{plan.price}</span>
                  <p className="text-xs font-semibold text-[#7C3AED] mb-4">{plan.desc}</p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-[#374151]">
                        <CheckCircle className="w-4 h-4 text-[#7C3AED] shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => handlePlanCheckout(plan.slug)} disabled={!!checkoutLoading}
                    className="w-full text-center text-sm font-bold py-3 rounded-xl transition-all disabled:opacity-70"
                    style={plan.highlight
                      ? { background: "linear-gradient(135deg, #7C3AED, #DB2777)", color: "white" }
                      : { background: "#F9FAFB", color: "#374151", border: "1px solid #E5E7EB" }}>
                    {checkoutLoading === plan.slug ? "Taking you to checkout…" : plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Final CTA ───────────────────────────────────────────────────── */}
          <motion.div className="rounded-3xl overflow-hidden mt-6 mb-8"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <div className="relative p-8 sm:p-12 text-center" style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 40%, #DB2777 100%)" }}>
              <div className="inline-flex items-center gap-2 bg-white/15 text-white/80 text-xs font-semibold px-4 py-2 rounded-full mb-5 border border-white/20">
                <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                We fix sites like {host} every week
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">Ready to fix this?</h3>
              <p className="text-white/70 text-base max-w-lg mx-auto mb-7 leading-relaxed">Choose a plan above — pay once, we deliver. Or unlock the full report yourself with Starter.</p>
              <a href="#plans" className="inline-flex items-center gap-2 bg-white text-[#6D28D9] font-bold px-8 py-4 rounded-2xl hover:bg-white/90 transition-colors text-base shadow-xl">
                Choose a plan <ArrowRight className="w-5 h-5" />
              </a>
              <a href="/" className="inline-flex items-center gap-1.5 mt-5 text-white/60 text-xs hover:text-white/80 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />Run another audit
              </a>
            </div>
          </motion.div>

        </div>
      </div>

      <footer className="border-t border-gray-100 bg-white py-5 px-6 text-center">
        <p className="text-xs text-[#9CA3AF]">
          Built by{" "}
          <a href="https://yoom.digital" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:underline">Yoom Digital</a>
          {" "}· Powered by Google PageSpeed Insights + HTML analysis ·{" "}
          <a href="/" className="text-[#7C3AED] hover:underline">Run another audit</a>
        </p>
      </footer>
    </div>
  );
}
