"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";

interface PillarData {
  score: number;
  label: string;
  points: number;
  maxPoints: number;
}

interface AuditRecord {
  id: string;
  url: string;
  overall_score: number;
  created_at: string;
  data: {
    health?: {
      domain: string;
      isHTTPS?: boolean;
      hasRobots?: boolean;
      hasSitemap?: boolean;
      schemaTypesFound?: string[];
      criticalIssues?: number;
      highIssues?: number;
    };
    pillars?: Record<string, PillarData>;
    recommendations?: {
      id: string;
      title: string;
      description: string;
      priority: string;
      category: string;
      fix: string;
    }[];
    keywords?: { top: { word: string }[]; coverageScore: number };
  };
}

function scoreRgb(s: number): [number, number, number] {
  if (s >= 80) return [16, 185, 129];
  if (s >= 60) return [124, 58, 237];
  if (s >= 40) return [245, 158, 11];
  return [220, 38, 38];
}

function scoreLabel(s: number): string {
  if (s >= 80) return "Excellent";
  if (s >= 60) return "Good";
  if (s >= 40) return "Needs Work";
  return "Poor";
}

async function generatePDF(audit: AuditRecord): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210;
  const MARGIN = 18;
  const CONTENT_W = W - MARGIN * 2;
  const PURPLE: [number, number, number] = [124, 58, 237];
  const PINK: [number, number, number] = [219, 39, 119];
  const DARK: [number, number, number] = [15, 15, 25];
  const GRAY3: [number, number, number] = [100, 100, 120];
  const GRAY5: [number, number, number] = [230, 230, 240];

  const domain =
    audit.data?.health?.domain ??
    (() => {
      try {
        return new URL(audit.url).hostname;
      } catch {
        return audit.url;
      }
    })();
  const score = audit.overall_score;
  const scoreRgbVal = scoreRgb(score);
  const dateStr = new Date(audit.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function gradientRect(x: number, y: number, w: number, h: number, steps = 20) {
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.round(PURPLE[0] + (PINK[0] - PURPLE[0]) * t);
      const g = Math.round(PURPLE[1] + (PINK[1] - PURPLE[1]) * t);
      const b = Math.round(PURPLE[2] + (PINK[2] - PURPLE[2]) * t);
      doc.setFillColor(r, g, b);
      doc.rect(x + (w * i) / steps, y, w / steps + 0.5, h, "F");
    }
  }

  function drawProgressBar(
    x: number,
    y: number,
    w: number,
    h: number,
    pct: number,
    color: [number, number, number]
  ) {
    doc.setFillColor(...GRAY5);
    doc.roundedRect(x, y, w, h, h / 2, h / 2, "F");
    if (pct > 0) {
      doc.setFillColor(...color);
      doc.roundedRect(x, y, Math.max(w * (pct / 100), h), h, h / 2, h / 2, "F");
    }
  }

  function addPageFooter(pageNum: number, totalPages: number) {
    doc.setFontSize(7);
    doc.setTextColor(...GRAY3);
    doc.setFont("helvetica", "normal");
    doc.text("SiteScore · sitescore.app", MARGIN, 290);
    doc.text(`${domain} · ${dateStr}`, W / 2, 290, { align: "center" });
    doc.text(`${pageNum} / ${totalPages}`, W - MARGIN, 290, { align: "right" });
    doc.setDrawColor(...GRAY5);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, 286, W - MARGIN, 286);
  }

  function addSectionLabel(text: string, y: number) {
    doc.setFontSize(7);
    doc.setTextColor(...GRAY3);
    doc.setFont("helvetica", "bold");
    doc.text(text.toUpperCase(), MARGIN, y);
    doc.setFont("helvetica", "normal");
  }

  // PAGE 1 — COVER
  gradientRect(0, 0, W, 72);

  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("SiteScore", MARGIN, 16);

  const circleCx = W - MARGIN - 22;
  const circleCy = 36;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(3);
  doc.circle(circleCx, circleCy, 18, "S");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(String(score), circleCx, circleCy + 3, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("/ 100", circleCx, circleCy + 10, { align: "center" });

  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Site Audit Report", MARGIN, 40);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.text(domain, MARGIN, 53);

  doc.setFontSize(9);
  doc.setTextColor(220, 200, 255);
  doc.text(`Generated ${dateStr}`, MARGIN, 63);

  doc.setFillColor(...scoreRgbVal);
  doc.roundedRect(MARGIN, 77, 38, 8, 2, 2, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(scoreLabel(score), MARGIN + 19, 82, { align: "center" });

  const tagline =
    score >= 80
      ? "Your site is performing well. Keep up the momentum."
      : score >= 60
      ? "Solid foundation — a few focused fixes will push your score higher."
      : score >= 40
      ? "Significant gaps are holding your site back from peak performance."
      : "Critical issues need attention to improve search and AI visibility.";
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  const tagLines = doc.splitTextToSize(tagline, CONTENT_W - 40) as string[];
  doc.text(tagLines, MARGIN, 97);

  const statsY = 114;
  addSectionLabel("QUICK STATS", statsY);

  const stats = [
    { label: "Overall Score", value: `${score}/100` },
    { label: "Pillars Analysed", value: String(Object.keys(audit.data?.pillars ?? {}).length) },
    { label: "Issues Found", value: String(audit.data?.recommendations?.length ?? 0) },
    { label: "Critical Issues", value: String(audit.data?.health?.criticalIssues ?? 0) },
  ];

  const cardW = (CONTENT_W - 9) / 4;
  stats.forEach((stat, i) => {
    const cx = MARGIN + i * (cardW + 3);
    doc.setFillColor(248, 247, 252);
    doc.roundedRect(cx, statsY + 3, cardW, 20, 2, 2, "F");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PURPLE);
    doc.text(stat.value, cx + cardW / 2, statsY + 14, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY3);
    doc.text(stat.label, cx + cardW / 2, statsY + 20, { align: "center" });
  });

  const health = audit.data?.health;
  if (health) {
    const hY = statsY + 32;
    addSectionLabel("SITE HEALTH", hY);
    const healthItems = [
      { label: "HTTPS", ok: !!health.isHTTPS },
      { label: "Robots.txt", ok: !!health.hasRobots },
      { label: "Sitemap", ok: !!health.hasSitemap },
      { label: "Schema", ok: (health.schemaTypesFound?.length ?? 0) > 0 },
    ];
    healthItems.forEach((item, i) => {
      const hx = MARGIN + i * 44;
      const hy = hY + 4;
      const rgb: [number, number, number] = item.ok ? [16, 185, 129] : [220, 38, 38];
      doc.setFillColor(...rgb);
      doc.circle(hx + 3, hy + 2, 2, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK);
      doc.text(item.label, hx + 7, hy + 3.5);
      doc.setFontSize(7);
      doc.setTextColor(...rgb);
      doc.text(item.ok ? "Pass" : "Fail", hx + 7, hy + 9);
    });
    if ((health.schemaTypesFound?.length ?? 0) > 0) {
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY3);
      doc.text(
        `Schema types: ${(health.schemaTypesFound ?? []).slice(0, 4).join(", ")}`,
        MARGIN,
        hY + 22
      );
    }
  }

  addPageFooter(1, 4);

  // PAGE 2 — SCORE BREAKDOWN
  doc.addPage();
  gradientRect(0, 0, W, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Score Breakdown", MARGIN, 12);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(domain, W - MARGIN, 12, { align: "right" });

  const pillars = audit.data?.pillars ?? {};
  const pillarOrder = [
    "performance",
    "technicalSeo",
    "contentKeywords",
    "geoReadiness",
    "aeoReadiness",
    "accessibility",
    "cro",
    "analytics",
  ];
  const pillarEntries = pillarOrder
    .map((k) => ({ key: k, ...(pillars[k] ?? null) }))
    .filter((p) => p && (p as unknown as PillarData).label) as Array<{
    key: string;
    score: number;
    label: string;
    points: number;
    maxPoints: number;
  }>;

  let py = 28;
  doc.setFillColor(248, 247, 252);
  doc.rect(MARGIN, py, CONTENT_W, 7, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY3);
  doc.text("PILLAR", MARGIN + 3, py + 5);
  doc.text("SCORE", MARGIN + 80, py + 5);
  doc.text("PTS", MARGIN + 106, py + 5);
  doc.text("MAX", MARGIN + 122, py + 5);
  doc.text("VISUAL", MARGIN + 140, py + 5);
  py += 7;

  pillarEntries.forEach((p, i) => {
    const rowY = py + i * 16;
    if (i % 2 === 0) {
      doc.setFillColor(252, 251, 255);
      doc.rect(MARGIN, rowY, CONTENT_W, 16, "F");
    }
    const rgb = scoreRgb(p.score);
    doc.setFillColor(...rgb);
    doc.roundedRect(MARGIN + 78, rowY + 3, 18, 9, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(String(p.score), MARGIN + 87, rowY + 9, { align: "center" });
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(p.label, MARGIN + 3, rowY + 7);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY3);
    doc.text(String(p.points), MARGIN + 106, rowY + 7);
    doc.text(String(p.maxPoints), MARGIN + 122, rowY + 7);
    doc.setFontSize(7);
    doc.setTextColor(...rgb);
    doc.text(scoreLabel(p.score), MARGIN + 3, rowY + 13);
    drawProgressBar(MARGIN + 138, rowY + 5, 46, 4, p.score, rgb);
  });

  py = py + pillarEntries.length * 16 + 8;
  doc.setFillColor(...PURPLE);
  doc.roundedRect(MARGIN, py, CONTENT_W, 12, 2, 2, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("OVERALL SCORE", MARGIN + 3, py + 8);
  doc.text(`${score} / 100`, W - MARGIN - 3, py + 8, { align: "right" });

  addPageFooter(2, 4);

  // PAGE 3 — TOP ISSUES
  doc.addPage();
  gradientRect(0, 0, W, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Top Issues & Recommendations", MARGIN, 12);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(domain, W - MARGIN, 12, { align: "right" });

  const recs = audit.data?.recommendations ?? [];
  let ry = 26;

  const PRIORITY_COLORS: Record<
    string,
    { bg: [number, number, number]; text: [number, number, number]; border: [number, number, number] }
  > = {
    critical: { bg: [255, 240, 240], text: [185, 28, 28], border: [252, 165, 165] },
    high: { bg: [255, 247, 231], text: [180, 83, 9], border: [252, 211, 77] },
    medium: { bg: [245, 243, 255], text: [109, 40, 217], border: [196, 181, 253] },
  };

  recs.slice(0, 8).forEach((rec, i) => {
    if (ry > 260) return;
    const cfg = PRIORITY_COLORS[rec.priority] ?? PRIORITY_COLORS.medium;
    const cardH = 26;
    doc.setFillColor(...cfg.bg);
    doc.setDrawColor(...cfg.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, ry, CONTENT_W, cardH, 2, 2, "FD");
    doc.setFillColor(...cfg.text);
    doc.roundedRect(MARGIN + 3, ry + 4, 22, 6, 1, 1, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(rec.priority.toUpperCase(), MARGIN + 14, ry + 8.5, { align: "center" });
    doc.setFontSize(7);
    doc.setTextColor(...GRAY3);
    doc.text(`#${i + 1}`, W - MARGIN - 3, ry + 8.5, { align: "right" });
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(rec.title, MARGIN + 28, ry + 8.5);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...cfg.text);
    doc.text(rec.category, MARGIN + 28, ry + 15);
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY3);
    const descLines = doc.splitTextToSize(rec.description, CONTENT_W - 32) as string[];
    doc.text(descLines[0] ?? "", MARGIN + 3, ry + 21);
    ry += cardH + 3;
  });

  if (recs.length > 8) {
    doc.setFontSize(8);
    doc.setTextColor(...GRAY3);
    doc.setFont("helvetica", "italic");
    doc.text(`+ ${recs.length - 8} more issues in your full dashboard report.`, MARGIN, ry + 4);
  }

  addPageFooter(3, 4);

  // PAGE 4 — HEALTH CHECK SUMMARY
  doc.addPage();
  gradientRect(0, 0, W, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Health Check Summary", MARGIN, 12);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(domain, W - MARGIN, 12, { align: "right" });

  const hData = audit.data?.health;
  let hY = 26;

  addSectionLabel("TECHNICAL CHECKS", hY);
  hY += 6;

  const techChecks = [
    {
      label: "HTTPS / SSL Certificate",
      ok: !!hData?.isHTTPS,
      detail: hData?.isHTTPS
        ? "Site is served over HTTPS"
        : "Site is not using HTTPS — critical for SEO and trust",
    },
    {
      label: "Robots.txt Present",
      ok: !!hData?.hasRobots,
      detail: hData?.hasRobots
        ? "robots.txt file found"
        : "No robots.txt found — search engines may have issues",
    },
    {
      label: "XML Sitemap",
      ok: !!hData?.hasSitemap,
      detail: hData?.hasSitemap
        ? "Sitemap found and accessible"
        : "No sitemap detected — submit one to Google Search Console",
    },
    {
      label: "Schema Markup",
      ok: (hData?.schemaTypesFound?.length ?? 0) > 0,
      detail:
        (hData?.schemaTypesFound?.length ?? 0) > 0
          ? `Types: ${(hData?.schemaTypesFound ?? []).join(", ")}`
          : "No structured data found — add Schema to boost AI visibility",
    },
  ];

  techChecks.forEach((check) => {
    const rgb: [number, number, number] = check.ok ? [16, 185, 129] : [220, 38, 38];
    const bgR = check.ok ? 240 : 255;
    const bgG = check.ok ? 253 : 240;
    const bgB = check.ok ? 244 : 240;
    const bdR = check.ok ? 167 : 252;
    const bdG = check.ok ? 243 : 165;
    const bdB = check.ok ? 208 : 165;
    doc.setFillColor(bgR, bgG, bgB);
    doc.setDrawColor(bdR, bdG, bdB);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, hY, CONTENT_W, 14, 2, 2, "FD");
    doc.setFillColor(...rgb);
    doc.circle(MARGIN + 6, hY + 7, 3, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(check.label, MARGIN + 13, hY + 6);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY3);
    doc.text(check.detail, MARGIN + 13, hY + 11);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb);
    doc.text(check.ok ? "PASS" : "FAIL", W - MARGIN - 3, hY + 7.5, { align: "right" });
    hY += 17;
  });

  hY += 6;
  addSectionLabel("SCORE CONTEXT", hY);
  hY += 7;

  const contextItems: Array<{ label: string; desc: string; color: [number, number, number] }> = [
    { label: "90–100", desc: "Excellent — top 5% of sites", color: [16, 185, 129] },
    { label: "70–89", desc: "Good — above average performance", color: [124, 58, 237] },
    { label: "50–69", desc: "Needs work — common SEO issues", color: [245, 158, 11] },
    { label: "0–49", desc: "Poor — critical issues present", color: [220, 38, 38] },
  ];

  contextItems.forEach((item, i) => {
    const cx2 = MARGIN + i * 44;
    doc.setFillColor(...item.color);
    doc.roundedRect(cx2, hY, 40, 12, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(item.label, cx2 + 20, hY + 7, { align: "center" });
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY3);
    const dlines = doc.splitTextToSize(item.desc, 40) as string[];
    doc.text(dlines, cx2, hY + 17);
  });

  hY += 30;
  doc.setFillColor(248, 247, 252);
  doc.roundedRect(MARGIN, hY, CONTENT_W, 28, 3, 3, "F");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PURPLE);
  doc.text("About SiteScore", MARGIN + 5, hY + 8);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY3);
  const aboutText =
    "SiteScore analyses your website across 8 SEO pillars: Performance, Technical SEO, Content & Keywords, GEO Readiness, AEO Readiness, Accessibility, CRO, and Analytics. Each pillar contributes to your overall score out of 100.";
  const aboutLines = doc.splitTextToSize(aboutText, CONTENT_W - 10) as string[];
  doc.text(aboutLines, MARGIN + 5, hY + 16);

  hY += 36;
  gradientRect(MARGIN, hY, CONTENT_W, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Ready to fix these issues?", MARGIN + 5, hY + 9);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Visit sitescore.app to track improvements and get expert help.", MARGIN + 5, hY + 16);

  addPageFooter(4, 4);

  const safeDomain = domain.replace(/[^a-z0-9.-]/gi, "-");
  const safeDate = new Date(audit.created_at).toISOString().slice(0, 10);
  doc.save(`sitescore-${safeDomain}-${safeDate}.pdf`);
}

interface ExportPDFProps {
  audit: AuditRecord;
  variant?: "primary" | "secondary";
}

export function ExportPDF({ audit, variant = "secondary" }: ExportPDFProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      await generatePDF(audit);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (variant === "primary") {
    return (
      <button
        onClick={handleExport}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-colors font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-ink-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <FileDown className="w-3.5 h-3.5" />
            Export PDF
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Generating…
        </>
      ) : (
        <>
          <FileDown className="w-3.5 h-3.5" />
          Export PDF
        </>
      )}
    </button>
  );
}
