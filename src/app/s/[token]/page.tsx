import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScoreCircle } from "@/components/audit/ScoreCircle";
import type { Metadata } from "next";

interface PillarData {
  score: number;
  label: string;
  points: number;
  maxPoints: number;
}

interface ShareTokenRow {
  token: string;
  url: string;
  score: number;
  audit_data: {
    pillars?: Record<string, PillarData>;
    recommendations?: { id: string; title: string; description: string; priority: string }[];
    health?: { domain: string };
  };
  created_at: string;
}

function pillarBarColor(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#7C3AED";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

function scoreGrade(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs Work";
  return "Critical";
}

function priorityLabel(p: string): { label: string; cls: string } {
  if (p === "critical") return { label: "Critical", cls: "bg-red-100 text-red-600 border border-red-200" };
  if (p === "high")     return { label: "High", cls: "bg-amber-100 text-amber-600 border border-amber-200" };
  return { label: "Medium", cls: "bg-violet-100 text-violet-600 border border-violet-200" };
}

export async function generateMetadata(
  { params }: { params: Promise<{ token: string }> }
): Promise<Metadata> {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("share_tokens")
    .select("score, url, audit_data")
    .eq("token", token)
    .single();

  if (!data) return { title: "SiteScore — Shared Score Card" };
  const row = data as ShareTokenRow;
  const domain = row.audit_data?.health?.domain ?? row.url;
  return {
    title: `${domain} scored ${row.score}/100 on SiteScore`,
    description: `See how ${domain} performs across SEO, performance, accessibility, and more.`,
    openGraph: {
      title: `${domain} — SiteScore Report`,
      description: `Score: ${row.score}/100 · ${scoreGrade(row.score)}`,
    },
  };
}

const PILLAR_ORDER = [
  "performance", "technicalSeo", "contentKeywords", "geoReadiness",
  "aeoReadiness", "accessibility", "cro", "analytics",
];

export default async function ShareTokenPage(
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("share_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !data) notFound();

  const row = data as ShareTokenRow;
  const domain = row.audit_data?.health?.domain ?? (() => {
    try { return new URL(row.url).hostname; } catch { return row.url; }
  })();

  const pillars = row.audit_data?.pillars ?? {};
  const pillarEntries = PILLAR_ORDER
    .map(key => ({ key, ...(pillars[key] ?? null) }))
    .filter((p): p is typeof p & PillarData => p !== null && (p as unknown as PillarData).score != null);

  const recs = (row.audit_data?.recommendations ?? []).slice(0, 3);
  const auditDate = new Date(row.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #0F0A1E 0%, #1A0F35 50%, #0F0A1E 100%)" }}>
      <header className="border-b border-white/8 px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
              <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" fill="none" strokeDasharray="28 16" strokeLinecap="round" transform="rotate(-90 10 10)" />
              <text x="10" y="14" textAnchor="middle" fontSize="8" fontWeight="800" fill="white" fontFamily="system-ui">S</text>
            </svg>
          </div>
          <span className="font-bold text-white text-base tracking-tight">SiteScore</span>
        </a>
        <span className="text-xs text-white/40">Audited {auditDate}</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div className="rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(219,39,119,0.08))", border: "1px solid rgba(124,58,237,0.2)" }}>
          <div className="px-8 pt-8 pb-6 text-center">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-1">Score Card</p>
            <h1 className="text-2xl font-bold text-white mb-1">{domain}</h1>
            <p className="text-sm text-white/50 mb-6">{row.url}</p>
            <div className="flex justify-center">
              <ScoreCircle score={row.score} size={180} />
            </div>
            <p className="text-sm text-white/40 mt-4">{scoreGrade(row.score)} · {row.score}/100</p>
          </div>
        </div>

        {pillarEntries.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="px-5 py-4 border-b border-white/8">
              <h2 className="text-sm font-semibold text-white">Score Breakdown</h2>
              <p className="text-xs text-white/40 mt-0.5">Performance across 8 pillars</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pillarEntries.map(p => (
                <div key={p.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/70">{p.label}</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: pillarBarColor(p.score) }}>{p.score}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: `${p.score}%`, background: pillarBarColor(p.score) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {recs.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="px-5 py-4 border-b border-white/8">
              <h2 className="text-sm font-semibold text-white">Top Issues Found</h2>
              <p className="text-xs text-white/40 mt-0.5">Most impactful improvements</p>
            </div>
            <div className="divide-y divide-white/6">
              {recs.map(rec => {
                const { label: plabel, cls } = priorityLabel(rec.priority);
                return (
                  <div key={rec.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${cls}`}>{plabel}</span>
                      <div>
                        <p className="text-xs font-semibold text-white">{rec.title}</p>
                        <p className="text-xs text-white/40 mt-0.5 leading-snug">{rec.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-3xl overflow-hidden text-center py-10 px-6" style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #DB2777 100%)" }}>
          <p className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-2">Free Audit Tool</p>
          <h2 className="text-2xl font-black text-white mb-2">How does your site score?</h2>
          <p className="text-white/70 text-sm max-w-sm mx-auto mb-6">
            Get your full SEO, performance, AEO &amp; accessibility score in under 60 seconds — no account needed.
          </p>
          <a href="/" className="inline-flex items-center gap-2 bg-white font-bold px-7 py-3.5 rounded-2xl hover:bg-white/90 transition-colors text-sm shadow-xl" style={{ color: "#7C3AED" }}>
            Get Your Free Audit →
          </a>
        </div>

        <p className="text-center text-xs text-white/25 pb-4">
          Score card generated by{" "}
          <a href="/" className="text-white/40 hover:text-white/60 transition-colors underline underline-offset-2">SiteScore</a>
          {" "}· built by{" "}
          <a href="https://yoom.digital" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/60 transition-colors underline underline-offset-2">Yoom Digital</a>
        </p>
      </main>
    </div>
  );
}
