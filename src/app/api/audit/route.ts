import { NextRequest, NextResponse } from "next/server";

// Allow up to 60s for the PageSpeed Insights API call (requires Vercel Pro+)
export const maxDuration = 60;

interface PSICategory {
  score: number | null;
}

interface PSIAudit {
  score: number | null | undefined;
  displayValue?: string;
  numericValue?: number;
}

interface PSIResponse {
  lighthouseResult?: {
    categories: {
      performance?: PSICategory;
      accessibility?: PSICategory;
      "best-practices"?: PSICategory;
      seo?: PSICategory;
    };
    audits: Record<string, PSIAudit>;
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toPoints(score: number | null | undefined, max: number): number {
  if (score === null || score === undefined) return 0;
  return Math.round(clamp(score, 0, 1) * max);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { url?: unknown };
    const rawUrl = body?.url;

    if (!rawUrl || typeof rawUrl !== "string") {
      return NextResponse.json({ error: "Please provide a valid URL." }, { status: 400 });
    }

    let url = rawUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "That doesn't look like a valid URL. Try something like example.com" },
        { status: 400 }
      );
    }

    const apiKey = process.env.PAGESPEED_API_KEY;
    const params = new URLSearchParams({
      url,
      strategy: "mobile",
      ...(apiKey ? { key: apiKey } : {}),
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    let psiRes: Response;
    try {
      psiRes = await fetch(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`,
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!psiRes.ok) {
      const errBody = await psiRes.json().catch(() => ({})) as { error?: { message?: string } };
      const msg = errBody?.error?.message ?? "";
      if (psiRes.status === 429) {
        return NextResponse.json(
          { error: "Rate limit reached. Please wait 30 seconds and try again." },
          { status: 429 }
        );
      }
      if (psiRes.status === 400 || msg.toLowerCase().includes("invalid")) {
        return NextResponse.json(
          { error: "Couldn't reach that website. Make sure it's publicly accessible." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `Analysis failed (status ${psiRes.status}). Please try again in a moment.` },
        { status: 502 }
      );
    }

    const data: PSIResponse = await psiRes.json();
    const cats = data.lighthouseResult?.categories;
    const audits = data.lighthouseResult?.audits ?? {};

    // Raw lighthouse 0–1 scores
    const perf = cats?.performance?.score ?? 0;
    const a11y = cats?.accessibility?.score ?? 0;
    const bp = cats?.["best-practices"]?.score ?? 0;
    const seo = cats?.seo?.score ?? 0;

    // GEO readiness (custom signals from audits)
    const hasHTTPS = url.startsWith("https://");
    const hasMetaDesc = (audits["meta-description"]?.score ?? 0) >= 1;
    const hasSchema =
      (audits["structured-data"]?.score ?? 0) >= 1 ||
      (audits["schema-org"]?.score ?? 0) >= 1;
    const hasViewport = (audits["viewport"]?.score ?? 0) >= 1;
    const hasTitle = (audits["document-title"]?.score ?? 0) >= 1;
    const hasCanonical = (audits["canonical"]?.score ?? 0) >= 1;

    const geoRaw =
      (hasHTTPS ? 5 : 0) +
      (hasMetaDesc ? 4 : 0) +
      (hasSchema ? 5 : 0) +
      (hasViewport ? 3 : 0) +
      (hasTitle ? 2 : 0) +
      (hasCanonical ? 1 : 0); // max 20

    const geoNorm = geoRaw / 20; // 0–1

    // Composite 0–100
    const perfPts = toPoints(perf, 30);
    const seoPts = toPoints(seo, 25);
    const geoPts = toPoints(geoNorm, 20);
    const a11yPts = toPoints(a11y, 15);
    const bpPts = toPoints(bp, 10);
    const total = perfPts + seoPts + geoPts + a11yPts + bpPts;

    // Recommendations
    type Priority = "critical" | "high" | "medium";
    const recs: Array<{
      id: string;
      title: string;
      description: string;
      priority: Priority;
      category: string;
      fix: string;
    }> = [];

    if (!hasHTTPS) {
      recs.push({
        id: "https",
        title: "Your site has no HTTPS",
        description:
          "Google demotes non-HTTPS sites in rankings and AI systems refuse to cite insecure sources. This is your most urgent fix.",
        priority: "critical",
        category: "Security",
        fix: "Install a free SSL certificate via Let's Encrypt. Most web hosts offer this in one click.",
      });
    }

    if (perf < 0.5) {
      recs.push({
        id: "perf-critical",
        title: "Site loads dangerously slowly",
        description: `Performance: ${Math.round(perf * 100)}/100. Over half of mobile users leave if a page takes more than 3 seconds. You're losing customers before they even read a word.`,
        priority: "critical",
        category: "Performance",
        fix: "Compress images (use WebP), remove unused JavaScript, and enable browser caching.",
      });
    } else if (perf < 0.75) {
      recs.push({
        id: "perf-high",
        title: "Page speed needs improvement",
        description: `Performance: ${Math.round(perf * 100)}/100. Improving load time lifts your Google ranking and reduces bounce rate — both have a direct impact on revenue.`,
        priority: "high",
        category: "Performance",
        fix: "Convert images to WebP, defer non-critical scripts, and use a CDN.",
      });
    }

    if (seo < 0.7) {
      recs.push({
        id: "seo",
        title: "Critical SEO gaps detected",
        description: `SEO score: ${Math.round(seo * 100)}/100. Missing headings, broken links, or a misconfigured robots.txt could be preventing Google from indexing key pages.`,
        priority: seo < 0.5 ? "critical" : "high",
        category: "SEO",
        fix: "Check robots.txt, fix broken links, and ensure every page has a unique title and description.",
      });
    }

    if (!hasMetaDesc) {
      recs.push({
        id: "meta-desc",
        title: "No meta description",
        description:
          "Your page is missing a meta description — the snippet AI and search engines show in results. Without it you get random, unhelpful previews that crush click-through rates.",
        priority: "high",
        category: "GEO Readiness",
        fix: "Write a 140–160 character meta description for each key page summarising exactly what you offer.",
      });
    }

    if (!hasSchema) {
      recs.push({
        id: "schema",
        title: "Missing Schema.org structured data",
        description:
          "ChatGPT, Perplexity, and Google's AI Overviews rely on Schema.org markup to understand your business. Without it you're essentially invisible in AI-driven search.",
        priority: "high",
        category: "GEO Readiness",
        fix: "Add LocalBusiness, Organization, and Service schema markup — this is the highest-ROI GEO task.",
      });
    }

    if (a11y < 0.7) {
      recs.push({
        id: "a11y",
        title: "Accessibility issues found",
        description: `Accessibility: ${Math.round(a11y * 100)}/100. Common issues: missing image alt text, low colour contrast, unlabelled form fields. Accessible sites rank higher.`,
        priority: "medium",
        category: "Accessibility",
        fix: "Add alt text to all images, ensure 4.5:1 colour contrast ratios, and label all form inputs.",
      });
    }

    if (bp < 0.8) {
      recs.push({
        id: "bp",
        title: "Technical best practices not met",
        description: `Best practices: ${Math.round(bp * 100)}/100. Issues may include JavaScript errors, deprecated APIs, or missing security headers that reduce trust signals.`,
        priority: "medium",
        category: "Technical",
        fix: "Fix JavaScript console errors, update deprecated browser APIs, and add HTTP security headers.",
      });
    }

    const priorityOrder: Record<Priority, number> = { critical: 0, high: 1, medium: 2 };
    recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return NextResponse.json({
      score: total,
      url,
      pillars: {
        performance: { score: Math.round(perf * 100), label: "Performance", description: "Page load speed on mobile", points: perfPts, maxPoints: 30 },
        seo: { score: Math.round(seo * 100), label: "SEO", description: "Search engine fundamentals", points: seoPts, maxPoints: 25 },
        geo: { score: Math.round(geoNorm * 100), label: "GEO Readiness", description: "Visibility in AI search engines", points: geoPts, maxPoints: 20 },
        accessibility: { score: Math.round(a11y * 100), label: "Accessibility", description: "Usability for all users", points: a11yPts, maxPoints: 15 },
        bestPractices: { score: Math.round(bp * 100), label: "Best Practices", description: "Modern web standards & security", points: bpPts, maxPoints: 10 },
      },
      recommendations: recs.slice(0, 5),
    });
  } catch (err) {
    const e = err as Error;
    if (e.name === "AbortError") {
      return NextResponse.json(
        { error: "Analysis timed out. The site may be very slow, or try again in a moment." },
        { status: 504 }
      );
    }
    console.error("Audit error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
