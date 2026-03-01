import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const FETCH_OPTS = {
  headers: { "User-Agent": "Mozilla/5.0 (compatible; SiteScoreBot/1.0)" },
  signal: AbortSignal.timeout(10000),
};

function strip(s: string) { return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }

function analyzeCompetitor(html: string, url: string) {
  const get = (p: RegExp) => { const m = html.match(p); return m?.[1]?.trim() ?? null; };

  const title = get(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription =
    get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,300})["']/i) ??
    get(/<meta[^>]+content=["']([^"']{0,300})["'][^>]+name=["']description["']/i);

  const h1Tags = Array.from(html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)).map(m => strip(m[1]));
  const h2Tags = Array.from(html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)).map(m => strip(m[1]));

  // Schema detection
  const schemaBlocks = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  const schemaTypes: string[] = [];
  let hasFAQSchema = false, hasOrgSchema = false, hasLocalBizSchema = false;
  for (const block of schemaBlocks) {
    try {
      const parsed = JSON.parse(block[1]) as Record<string, unknown> | unknown[];
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const t = (item as Record<string, unknown>)["@type"];
        const types = (Array.isArray(t) ? t : [t]).filter((x): x is string => typeof x === "string");
        schemaTypes.push(...types);
        if (types.includes("FAQPage")) hasFAQSchema = true;
        if (types.includes("Organization")) hasOrgSchema = true;
        if (types.some(x => x === "LocalBusiness" || x.endsWith("Store"))) hasLocalBizSchema = true;
      }
    } catch { /* skip */ }
  }

  // Analytics
  const hasGA4 = /gtag\/js\?id=G-/i.test(html) || /gtag\(['"](config|js)['"],\s*['"]G-/i.test(html);
  const hasGTM = /googletagmanager\.com\/gtm\.js/i.test(html) || /GTM-[A-Z0-9]+/.test(html);
  const hasMetaPixel = /connect\.facebook\.net\/[^"']*fbevents\.js/i.test(html) || /fbq\(['"]init['"]/i.test(html);

  // CRO
  const ctaRegex = /\b(get started|buy now|sign up|free trial|book|schedule|get (?:a )?(?:quote|demo)|try (?:it )?free|start free|contact us|apply now)\b/i;
  const hasCTA = ctaRegex.test(html.slice(0, 5000));
  const hasPhone = /(\+?\d[\d\s\-.\(\)]{7,}\d)/.test(html.slice(0, 3000));
  const hasReviewMentions = /(?:\d[\d,.]+\s*(?:\/\s*5|\s*stars?|\s*★)|trustpilot|google reviews?)/i.test(html);
  const hasFreeTrialMention = /free trial|try free|free plan|no credit card/i.test(html);
  const hasSocialLinks = /(linkedin\.com|twitter\.com|x\.com|facebook\.com|instagram\.com)/i.test(html);

  // Content
  const textHtml = html.replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/(script|style|noscript)>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = textHtml.split(/\s+/).filter(w => w.length > 1).length;

  // Top keywords
  const STOP = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","is","it","this","that","are","was","were","be","been","have","has","had","we","you","your","our","my","their","from","as","if","all","any","so","just","not","no","get","also","new","use","page","site","web","click","here","read","more","home","menu"]);
  const freq = new Map<string, number>();
  for (const text of [title ?? "", h1Tags.join(" "), h2Tags.slice(0,6).join(" "), textHtml.slice(0,3000)]) {
    const weight = text === title ? 4 : text === h1Tags.join(" ") ? 3 : 1;
    for (const w of text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3 && !STOP.has(w))) {
      freq.set(w, (freq.get(w) ?? 0) + weight);
    }
  }
  const topKeywords = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);

  let domain = url;
  try { domain = new URL(url).hostname; } catch {}

  return {
    url, domain,
    title, metaDescription,
    h1: h1Tags[0] ?? null,
    wordCount,
    schemaTypes: [...new Set(schemaTypes)],
    hasFAQSchema, hasOrgSchema, hasLocalBizSchema,
    hasGA4, hasGTM, hasMetaPixel,
    hasCTA, hasPhone, hasReviewMentions, hasFreeTrialMention, hasSocialLinks,
    topKeywords,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { urls?: unknown[] };
    const rawUrls = body?.urls;

    if (!Array.isArray(rawUrls) || rawUrls.length === 0) {
      return NextResponse.json({ error: "Provide an array of URLs." }, { status: 400 });
    }

    const urls = rawUrls.slice(0, 3).map(u => {
      if (typeof u !== "string") return null;
      let url = u.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
      try { new URL(url); return url; } catch { return null; }
    }).filter((u): u is string => !!u);

    if (urls.length === 0) return NextResponse.json({ error: "No valid URLs provided." }, { status: 400 });

    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(url, FETCH_OPTS);
          if (!res.ok) return { url, domain: new URL(url).hostname, error: `HTTP ${res.status}` };
          const html = await res.text();
          return analyzeCompetitor(html, url);
        } catch {
          let domain = url;
          try { domain = new URL(url).hostname; } catch {}
          return { url, domain, error: "Could not reach this URL" };
        }
      })
    );

    return NextResponse.json({ competitors: results });
  } catch (err) {
    console.error("Competitor API error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
