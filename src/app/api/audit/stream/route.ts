import { NextRequest } from "next/server";

export const maxDuration = 60;

// ── PSI Types ──────────────────────────────────────────────────────────────

interface PSICategory { score: number | null }
interface PSIAudit { score: number | null | undefined; displayValue?: string; numericValue?: number }
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

// ── HTML Analysis Types ────────────────────────────────────────────────────

interface HTMLAnalysis {
  // Meta
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescLength: number;
  canonicalUrl: string | null;
  language: string | null;
  hasViewport: boolean;
  robotsMeta: string | null;
  // Headings
  h1Tags: string[];
  h2Tags: string[];
  h3Tags: string[];
  // Images
  totalImages: number;
  imagesWithAlt: number;
  // Links
  internalLinks: number;
  externalLinks: number;
  // Content
  wordCount: number;
  bodyText: string;
  // Social
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogType: string | null;
  twitterCard: string | null;
  // Schema
  schemaTypes: string[];
  hasFAQSchema: boolean;
  hasHowToSchema: boolean;
  hasOrgSchema: boolean;
  hasLocalBizSchema: boolean;
  hasArticleSchema: boolean;
  hasBreadcrumbSchema: boolean;
  hasWebSiteSchema: boolean;
  // AEO
  questionH2Count: number;
  hasOrderedLists: boolean;
  hasUnorderedLists: boolean;
  // Entity
  hasPhone: boolean;
  hasAddress: boolean;
  hasEmail: boolean;
  hasSocialLinks: boolean;
  // Technical
  hreflang: boolean;
  fetchError: boolean;
  // Analytics & Tracking
  hasGA4: boolean;
  hasUniversalAnalytics: boolean;
  hasGTM: boolean;
  hasMetaPixel: boolean;
  hasTikTokPixel: boolean;
  hasLinkedInInsight: boolean;
  hasHotjar: boolean;
  hasClarity: boolean;
  hasCookieConsent: boolean;
  // CRO
  hasCTAAboveFold: boolean;
  ctaText: string | null;
  socialProofScore: number;
  hasTrustBadges: boolean;
  formFieldCount: number;
  hasChatWidget: boolean;
  hasFreeTrialMention: boolean;
  hasTestimonials: boolean;
  hasReviewMentions: boolean;
  h1HasBenefit: boolean;
  hasPhoneInHeader: boolean;
}

interface SiteInfo {
  pageCount: number | null;
  hasRobots: boolean;
  hasSitemap: boolean;
  blockedByCrawlers: boolean;
  sitemapUrl: string | null;
}

// ── HTML Parser ────────────────────────────────────────────────────────────

function parseHTML(html: string, pageUrl: string): HTMLAnalysis {
  const origin = (() => { try { return new URL(pageUrl).origin; } catch { return ""; } })();

  const get = (pattern: RegExp) => { const m = html.match(pattern); return m?.[1]?.trim() ?? null; };
  const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  // Meta
  const title = get(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription =
    get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,500})["']/i) ??
    get(/<meta[^>]+content=["']([^"']{0,500})["'][^>]+name=["']description["']/i);
  const canonicalUrl = get(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  const language = get(/<html[^>]+lang=["']([^"']+)["']/i);
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const robotsMeta =
    get(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i) ??
    get(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["']/i);

  // Headings
  const h1Tags = Array.from(html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)).map(m => strip(m[1]));
  const h2Tags = Array.from(html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)).map(m => strip(m[1]));
  const h3Tags = Array.from(html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)).map(m => strip(m[1]));

  // Images
  const imgTags = Array.from(html.matchAll(/<img([^>]*)>/gi)).map(m => m[1]);
  const totalImages = imgTags.length;
  const imagesWithAlt = imgTags.filter(attrs => /alt=["'][^"']+["']/i.test(attrs)).length;

  // Links
  const hrefs = Array.from(html.matchAll(/href=["']([^"'#][^"']*)["']/gi)).map(m => m[1]);
  let internalLinks = 0, externalLinks = 0;
  for (const href of hrefs) {
    if (href.startsWith("/") || href.includes(origin)) internalLinks++;
    else if (href.startsWith("http")) externalLinks++;
  }

  // Content text (strip scripts/styles first)
  const textHtml = html
    .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/(script|style|noscript|svg)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = textHtml.split(/\s+/).filter(w => w.length > 1).length;
  const bodyText = textHtml.slice(0, 5000); // cap for keyword analysis

  // Open Graph
  const ogMeta: Record<string, string> = {};
  for (const m of Array.from(html.matchAll(/<meta[^>]+property=["']og:([^"']+)["'][^>]+content=["']([^"']*)["']/gi))) {
    ogMeta[m[1]] = m[2];
  }
  const twitterCard =
    get(/<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']*)["']/i) ??
    get(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']twitter:card["']/i);

  // Schema.org
  const schemaBlocks = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  const schemaTypes: string[] = [];
  let hasFAQSchema = false, hasHowToSchema = false, hasOrgSchema = false;
  let hasLocalBizSchema = false, hasArticleSchema = false, hasBreadcrumbSchema = false;
  let hasWebSiteSchema = false;

  for (const block of schemaBlocks) {
    try {
      const parsed = JSON.parse(block[1]) as Record<string, unknown> | unknown[];
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const t = (item as Record<string, unknown>)["@type"];
        const types = Array.isArray(t) ? t : [t];
        for (const type of types) {
          if (typeof type === "string") {
            schemaTypes.push(type);
            if (type === "FAQPage") hasFAQSchema = true;
            if (type === "HowTo") hasHowToSchema = true;
            if (type === "Organization") hasOrgSchema = true;
            if (type === "LocalBusiness" || type.endsWith("Store") || type.endsWith("Restaurant")) hasLocalBizSchema = true;
            if (type === "Article" || type === "BlogPosting" || type === "NewsArticle") hasArticleSchema = true;
            if (type === "BreadcrumbList") hasBreadcrumbSchema = true;
            if (type === "WebSite") hasWebSiteSchema = true;
          }
        }
      }
    } catch { /* skip malformed JSON-LD */ }
  }

  // AEO signals
  const questionWords = /^(how|what|why|when|where|who|which|can|does|is|are|do|will|should)/i;
  const questionH2Count = h2Tags.filter(h => questionWords.test(h.trim())).length;
  const hasOrderedLists = /<ol[^>]*>/i.test(html);
  const hasUnorderedLists = /<ul[^>]*>/i.test(html);

  // Entity signals
  const hasPhone = /(\+?\d[\d\s\-\.\(\)]{7,}\d)/.test(textHtml);
  const hasEmail = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(textHtml);
  const hasAddress = /(street|avenue|boulevard|road|lane|drive|suite|floor|\d{5}|\bst\b|\bave\b|\bblvd\b)/i.test(textHtml);
  const hasSocialLinks = /(linkedin\.com|twitter\.com|x\.com|facebook\.com|instagram\.com|youtube\.com)/i.test(html);

  const hreflang = /<link[^>]+rel=["']alternate["'][^>]+hreflang/i.test(html);

  // ── Analytics & Tracking detection ───────────────────────────────────────
  const hasGA4 = /gtag\/js\?id=G-/i.test(html) || /gtag\(['"](config|js)['"],\s*['"]G-/i.test(html);
  const hasUniversalAnalytics = /analytics\.js['"]/.test(html) || /\?id=UA-/i.test(html);
  const hasGTM = /googletagmanager\.com\/gtm\.js/i.test(html) || /GTM-[A-Z0-9]+/.test(html);
  const hasMetaPixel = /connect\.facebook\.net\/[^"']*fbevents\.js/i.test(html) || /fbq\(['"]init['"]/i.test(html);
  const hasTikTokPixel = /analytics\.tiktok\.com/i.test(html);
  const hasLinkedInInsight = /snap\.licdn\.com/i.test(html);
  const hasHotjar = /static\.hotjar\.com/i.test(html);
  const hasClarity = /clarity\.ms/i.test(html);
  const hasCookieConsent = /cookiebot|onetrust|cookieyes|cookielawinfo/i.test(html);

  // ── CRO detection ─────────────────────────────────────────────────────────
  const earlyHtml = html.slice(0, 5000);
  const ctaRegex = /\b(get started|buy now|sign up|free trial|book (?:a |your |now)|schedule|get (?:a |your )?(?:quote|demo|consultation)|try (?:it )?free|start (?:for )?free|order now|shop now|claim (?:your |free |now)?|request (?:a )?demo|contact us|apply now|get (?:in )?touch)\b/i;
  const ctaMatch = earlyHtml.match(ctaRegex);
  const hasCTAAboveFold = !!ctaMatch;
  const ctaText = ctaMatch ? ctaMatch[0] : null;

  let socialProofScore = 0;
  if (/\d[\d,]+\+?\s*(?:customers?|clients?|users?|companies|businesses)/i.test(html)) socialProofScore++;
  if (/(?:\d[\d,.]+\s*(?:reviews?|ratings?|stars?)|\d+\s*(?:★|⭐))/i.test(html)) socialProofScore++;
  if (/testimonial|what (?:our )?(?:clients?|customers?) (?:say|think)/i.test(html)) socialProofScore++;
  if (/trusted by|as (?:seen|featured) in|works with|our (?:clients?|partners?)/i.test(html)) socialProofScore++;
  if (/case stud(?:y|ies)/i.test(html)) socialProofScore++;

  const hasTrustBadges = /money.?back\s+guarantee|no\s+(?:credit\s+card|contracts?)|ssl\s+secure|secure\s+(?:checkout|payment)|certified|accredited|gdpr\s+compliant/i.test(html);

  const visibleInputTypes = /(type=["'](?!hidden|submit|reset|image|button|checkbox|radio))/gi;
  const formFieldCount = (html.match(visibleInputTypes) ?? []).length +
    (html.match(/<textarea[^>]*>/gi) ?? []).length +
    (html.match(/<select[^>]*>/gi) ?? []).length;

  const hasChatWidget = /tawk\.to|intercom\.io|drift\.com|\.zendesk\.com|crisp\.chat|tidio\.co|hubspot.*chat|lc\.chat|freshchat|gorgias/i.test(html);
  const hasFreeTrialMention = /free\s+trial|try\s+free|free\s+plan|no\s+credit\s+card\s+required|freemium/i.test(html);
  const hasTestimonials = /testimonial|what (?:clients?|customers?|people) say|reviews? from/i.test(html);
  const hasReviewMentions = /(?:\d[\d,.]+\s*(?:\/\s*5|\s*stars?|\s*★)|google\s+reviews?|trustpilot|g2\.com)/i.test(html);

  const benefitWords = /\b(faster|better|easier|save|grow|increase|improve|boost|free|instant|unlimited|powerful|simple|smart|effortless|transform|automate|scale|results?|proven|guaranteed)\b/i;
  const h1HasBenefit = h1Tags.some(h => benefitWords.test(h));

  const hasPhoneInHeader = /(\+?\d[\d\s\-.\(\)]{7,}\d)/.test(html.slice(0, 2500));

  return {
    title, titleLength: title?.length ?? 0,
    metaDescription, metaDescLength: metaDescription?.length ?? 0,
    canonicalUrl, language, hasViewport, robotsMeta,
    h1Tags, h2Tags, h3Tags,
    totalImages, imagesWithAlt,
    internalLinks, externalLinks,
    wordCount, bodyText,
    ogTitle: ogMeta.title ?? null, ogDescription: ogMeta.description ?? null,
    ogImage: ogMeta.image ?? null, ogType: ogMeta.type ?? null,
    twitterCard,
    schemaTypes, hasFAQSchema, hasHowToSchema, hasOrgSchema, hasLocalBizSchema,
    hasArticleSchema, hasBreadcrumbSchema, hasWebSiteSchema,
    questionH2Count, hasOrderedLists, hasUnorderedLists,
    hasPhone, hasAddress, hasEmail, hasSocialLinks, hreflang,
    fetchError: false,
    hasGA4, hasUniversalAnalytics, hasGTM, hasMetaPixel, hasTikTokPixel,
    hasLinkedInInsight, hasHotjar, hasClarity, hasCookieConsent,
    hasCTAAboveFold, ctaText, socialProofScore, hasTrustBadges, formFieldCount,
    hasChatWidget, hasFreeTrialMention, hasTestimonials, hasReviewMentions,
    h1HasBenefit, hasPhoneInHeader,
  };
}

// ── Keyword Extractor ──────────────────────────────────────────────────────

const STOP_WORDS = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by",
  "is","it","this","that","are","was","were","be","been","have","has","had","do","does","did",
  "will","would","could","should","may","might","can","not","no","we","you","your","our","my",
  "their","its","from","up","about","into","as","if","when","than","so","all","any","both",
  "each","more","most","other","some","such","only","own","same","too","very","just","how",
  "what","which","who","where","why","get","also","new","use","used","page","site","web","com",
  "http","https","click","here","read","more","view","learn","contact","home","menu","search",
  "privacy","terms","cookie","cookies","copyright","all","rights","reserved"]);

function extractKeywords(analysis: HTMLAnalysis, pageUrl: string) {
  // Weight different zones
  const zones = [
    { text: analysis.title ?? "", weight: 5 },
    { text: analysis.h1Tags.join(" "), weight: 4 },
    { text: analysis.metaDescription ?? "", weight: 3 },
    { text: analysis.h2Tags.slice(0, 8).join(" "), weight: 2 },
    { text: analysis.bodyText, weight: 1 },
  ];

  const freq = new Map<string, number>();
  for (const { text, weight } of zones) {
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w));
    for (const w of words) freq.set(w, (freq.get(w) ?? 0) + weight);
  }

  const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const urlPath = (() => { try { return new URL(pageUrl).pathname.toLowerCase(); } catch { return ""; } })();
  const titleLower = (analysis.title ?? "").toLowerCase();
  const h1Lower = analysis.h1Tags.join(" ").toLowerCase();
  const metaLower = (analysis.metaDescription ?? "").toLowerCase();

  return sorted.map(([word, count]) => ({
    word,
    count,
    inTitle: titleLower.includes(word),
    inH1: h1Lower.includes(word),
    inMetaDesc: metaLower.includes(word),
    inURL: urlPath.includes(word),
  }));
}

// ── Scoring Functions ──────────────────────────────────────────────────────

type Check = { label: string; passed: boolean; detail: string };

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

function scorePerformance(perf: number): { score: number; points: number; maxPoints: number; checks: Check[] } {
  const score = Math.round(perf * 100);
  const points = Math.round(clamp(perf, 0, 1) * 15);
  return {
    score, points, maxPoints: 15,
    checks: [
      { label: "Performance score", passed: perf >= 0.7, detail: `${score}/100 — ${perf >= 0.9 ? "Excellent" : perf >= 0.7 ? "Good" : perf >= 0.5 ? "Needs improvement" : "Poor"}` },
      { label: "Core Web Vitals tier", passed: perf >= 0.75, detail: perf >= 0.9 ? "All green" : perf >= 0.75 ? "Most passing" : "Several failing — impacts rankings" },
      { label: "Mobile-optimised speed", passed: perf >= 0.6, detail: perf >= 0.6 ? "Acceptable for mobile" : "Slow on mobile — 53% of users bounce after 3s" },
    ],
  };
}

function scoreTechnicalSEO(
  lhSeo: number,
  html: HTMLAnalysis,
  pageUrl: string,
  siteInfo: SiteInfo,
  audits: Record<string, PSIAudit>
): { score: number; points: number; maxPoints: number; checks: Check[] } {
  const checks: Check[] = [];
  let pts = 0;
  const max = 25;

  // Lighthouse SEO foundation (8 pts)
  const lhPts = Math.round(lhSeo * 8);
  pts += lhPts;
  checks.push({ label: "Lighthouse SEO foundation", passed: lhSeo >= 0.7, detail: `${Math.round(lhSeo * 100)}/100 — covers crawlability, link text, font sizes` });

  // Title tag (3 pts)
  const hasTitle = !!html.title;
  const goodTitleLen = html.titleLength >= 30 && html.titleLength <= 65;
  const titlePts = (hasTitle ? 1 : 0) + (goodTitleLen ? 1 : 0) + (hasTitle && html.titleLength > 10 ? 1 : 0);
  pts += titlePts;
  checks.push({ label: "Title tag", passed: hasTitle && goodTitleLen, detail: hasTitle ? `"${html.title?.slice(0, 60)}${(html.title?.length ?? 0) > 60 ? "…" : ""}" (${html.titleLength} chars${goodTitleLen ? " ✓" : " — ideal: 30–65"})` : "Missing title tag" });

  // Meta description (3 pts)
  const hasDesc = !!html.metaDescription;
  const goodDescLen = html.metaDescLength >= 120 && html.metaDescLength <= 165;
  const descPts = (hasDesc ? 1 : 0) + (goodDescLen ? 1 : 0) + (hasDesc ? 1 : 0);
  pts += descPts;
  checks.push({ label: "Meta description", passed: hasDesc && goodDescLen, detail: hasDesc ? `${html.metaDescLength} chars${goodDescLen ? " ✓" : " — ideal: 120–165"}` : "Missing — search engines generate random snippets" });

  // URL structure (2 pts)
  let urlScore = 0;
  try {
    const u = new URL(pageUrl);
    const path = u.pathname;
    if (!path.includes("_")) urlScore++;
    if (path.length < 100) urlScore++;
  } catch { /* ignore */ }
  pts += urlScore;
  checks.push({ label: "URL structure", passed: urlScore === 2, detail: urlScore === 2 ? "Clean URL with hyphens, good length" : "Uses underscores or very long URL path" });

  // Sitemap + Robots (3 pts)
  const crawlPts = (siteInfo.hasRobots ? 1 : 0) + (siteInfo.hasSitemap ? 2 : 0);
  pts += crawlPts;
  checks.push({ label: "Robots.txt", passed: siteInfo.hasRobots, detail: siteInfo.hasRobots ? (siteInfo.blockedByCrawlers ? "⚠️ Exists but blocks crawlers!" : "Accessible and valid") : "Missing — search engines won't know crawl rules" });
  checks.push({ label: "XML Sitemap", passed: siteInfo.hasSitemap, detail: siteInfo.hasSitemap ? `Found — ${siteInfo.pageCount ? `~${siteInfo.pageCount} pages indexed` : "present"}` : "Missing — Google can't discover all your pages" });

  // Canonical + indexability (2 pts)
  const hasCanonical = !!html.canonicalUrl || (audits["canonical"]?.score ?? 0) >= 1;
  const isIndexable = !html.robotsMeta?.toLowerCase().includes("noindex");
  pts += (hasCanonical ? 1 : 0) + (isIndexable ? 1 : 0);
  checks.push({ label: "Canonical URL", passed: hasCanonical, detail: hasCanonical ? (html.canonicalUrl ?? "Declared via HTTP header") : "Missing — risks duplicate content penalties" });

  // Image alt text (4 pts)
  let altPts = 0;
  if (html.totalImages === 0) { altPts = 4; }
  else {
    const pct = html.imagesWithAlt / html.totalImages;
    altPts = pct >= 1 ? 4 : pct >= 0.75 ? 3 : pct >= 0.5 ? 2 : pct > 0 ? 1 : 0;
  }
  pts += altPts;
  checks.push({ label: "Image alt text", passed: altPts >= 3, detail: html.totalImages === 0 ? "No images found" : `${html.imagesWithAlt}/${html.totalImages} images have alt text (${Math.round((html.imagesWithAlt / html.totalImages) * 100)}%)` });

  const finalPts = Math.min(pts, max);
  return { score: Math.round((finalPts / max) * 100), points: finalPts, maxPoints: max, checks };
}

function scoreContentKeywords(
  html: HTMLAnalysis,
  keywords: ReturnType<typeof extractKeywords>
): { score: number; points: number; maxPoints: number; checks: Check[] } {
  const checks: Check[] = [];
  let pts = 0;
  const max = 20;

  // Heading structure (4 pts)
  const hasH1 = html.h1Tags.length > 0;
  const singleH1 = html.h1Tags.length === 1;
  const hasH2s = html.h2Tags.length >= 2;
  const headingPts = (hasH1 ? 2 : 0) + (singleH1 ? 1 : 0) + (hasH2s ? 1 : 0);
  pts += headingPts;
  checks.push({ label: "H1 tag", passed: hasH1 && singleH1, detail: html.h1Tags.length === 0 ? "No H1 found — critical for SEO" : html.h1Tags.length > 1 ? `Multiple H1s found (${html.h1Tags.length}) — use only one` : `"${html.h1Tags[0]?.slice(0, 60)}"` });
  checks.push({ label: "Heading hierarchy (H2s)", passed: hasH2s, detail: `${html.h2Tags.length} H2 tags found${hasH2s ? " ✓" : " — add H2s to structure content for readers and crawlers"}` });

  // Keyword coverage (8 pts)
  if (keywords.length > 0) {
    const topKw = keywords[0];
    const covered = [topKw.inTitle, topKw.inH1, topKw.inMetaDesc, topKw.inURL].filter(Boolean).length;
    const kwPts = Math.min(covered * 2, 8);
    pts += kwPts;
    checks.push({ label: "Primary keyword coverage", passed: covered >= 3, detail: `"${topKw.word}" found in: ${[topKw.inTitle && "title", topKw.inH1 && "H1", topKw.inMetaDesc && "meta desc", topKw.inURL && "URL"].filter(Boolean).join(", ") || "none of the key locations"}` });
    // Second keyword bonus
    if (keywords.length > 1) {
      const kw2 = keywords[1];
      const cov2 = [kw2.inTitle, kw2.inH1, kw2.inMetaDesc].filter(Boolean).length;
      checks.push({ label: "Secondary keyword signals", passed: cov2 >= 2, detail: `"${kw2.word}" present in ${cov2}/3 key locations` });
    }
  } else {
    checks.push({ label: "Keyword signals", passed: false, detail: "Unable to extract keywords — page may be JavaScript-rendered" });
  }

  // Content depth (4 pts)
  const contentPts = html.wordCount >= 2000 ? 4 : html.wordCount >= 1000 ? 3 : html.wordCount >= 500 ? 2 : html.wordCount >= 200 ? 1 : 0;
  pts += contentPts;
  checks.push({ label: "Content depth", passed: contentPts >= 2, detail: `~${html.wordCount.toLocaleString()} words${html.wordCount >= 1000 ? " — good depth" : html.wordCount >= 500 ? " — adequate" : " — thin content, consider expanding"}` });

  // Open Graph (4 pts)
  const ogComplete = [html.ogTitle, html.ogDescription, html.ogImage].filter(Boolean).length;
  const ogPts = ogComplete >= 3 ? 4 : ogComplete === 2 ? 2 : ogComplete === 1 ? 1 : 0;
  pts += ogPts;
  checks.push({ label: "Open Graph tags", passed: ogComplete >= 3, detail: `${ogComplete}/3 OG tags present (title, description, image)${ogComplete < 3 ? " — affects how links appear on social media and AI crawlers" : ""}` });

  const finalPts = Math.min(pts, max);
  return { score: Math.round((finalPts / max) * 100), points: finalPts, maxPoints: max, checks };
}

// GEO = "Will AI systems (ChatGPT, Perplexity, Google SGE) cite and recommend you?"
// Focuses on: entity identification, structured data richness, AI-parseable content signals
function scoreGEO(html: HTMLAnalysis, pageUrl: string): { score: number; points: number; maxPoints: number; checks: Check[] } {
  const checks: Check[] = [];
  let pts = 0;
  const max = 20;

  // 1. Entity schema — the #1 GEO signal (8 pts)
  // AI needs to know WHO you are before it can cite you
  const hasAnySchema = html.schemaTypes.length > 0;
  const hasEntitySchema = html.hasOrgSchema || html.hasLocalBizSchema;
  const schemaVariety = new Set(html.schemaTypes).size;
  const schemaPts =
    (hasEntitySchema ? 5 : hasAnySchema ? 2 : 0) +       // entity identity
    (schemaVariety >= 3 ? 2 : schemaVariety >= 2 ? 1 : 0) + // schema breadth
    (html.hasWebSiteSchema ? 1 : 0);                        // site-level signal
  pts += Math.min(schemaPts, 8);
  checks.push({
    label: "Entity schema (Org / LocalBusiness)",
    passed: hasEntitySchema,
    detail: hasEntitySchema
      ? `${html.hasOrgSchema ? "Organization" : "LocalBusiness"} schema present ✓ — AI systems can now identify your business`
      : hasAnySchema
        ? `Schema found but no entity type — add Organization or LocalBusiness so AI knows who you are`
        : "No Schema.org at all — ChatGPT, Perplexity, and Google SGE rely on this to identify and cite businesses",
  });
  checks.push({
    label: "Schema variety & coverage",
    passed: schemaVariety >= 2,
    detail: schemaVariety >= 3
      ? `${schemaVariety} schema types: ${Array.from(new Set(html.schemaTypes)).join(", ")} ✓`
      : schemaVariety >= 1
        ? `Only ${schemaVariety} schema type(s). Add more (e.g. Service, Product, Review) to help AI understand your full offering`
        : "No structured data — AI systems are guessing what your site is about",
  });

  // 2. NAP consistency — Name, Address, Phone (5 pts)
  // AI uses these to verify you're a real, legitimate entity
  const napSignals = (html.hasPhone ? 2 : 0) + (html.hasAddress ? 2 : 0) + (html.hasEmail ? 1 : 0);
  pts += Math.min(napSignals, 5);
  checks.push({
    label: "NAP signals (Name, Address, Phone)",
    passed: napSignals >= 3,
    detail: `Found: ${[html.hasPhone && "phone", html.hasEmail && "email", html.hasAddress && "address"].filter(Boolean).join(", ") || "none"} — AI systems cross-reference contact info to validate business legitimacy`,
  });

  // 3. Social & authority signals (4 pts)
  // AI citations favour entities with a consistent web presence
  const socialPts =
    (html.hasSocialLinks ? 2 : 0) +
    (html.ogTitle && html.ogDescription && html.ogImage ? 2 : html.ogTitle ? 1 : 0);
  pts += Math.min(socialPts, 4);
  checks.push({
    label: "Social profiles & OG completeness",
    passed: socialPts >= 3,
    detail: `Social links: ${html.hasSocialLinks ? "found ✓" : "none"} · OG tags: ${[html.ogTitle && "title", html.ogDescription && "desc", html.ogImage && "image"].filter(Boolean).join(", ") || "missing"} — entities with consistent cross-platform presence rank higher in AI recall`,
  });

  // 4. Content clarity for AI extraction (3 pts)
  // AI needs language signals and clear content to summarise accurately
  const clarityPts =
    (html.language ? 1 : 0) +
    (html.wordCount >= 300 ? 1 : 0) +                    // enough content to cite
    (html.h2Tags.length >= 3 ? 1 : 0);                   // structured content sections
  pts += Math.min(clarityPts, 3);
  checks.push({
    label: "Content clarity & extractability",
    passed: clarityPts >= 2,
    detail: `Language: ${html.language ?? "not declared"} · Word count: ~${html.wordCount} · Sections (H2s): ${html.h2Tags.length} — AI models extract summaries from well-structured, language-declared content`,
  });

  const finalPts = Math.min(pts, max);
  return { score: Math.round((finalPts / max) * 100), points: finalPts, maxPoints: max, checks };
}

// AEO = "Will you appear as a direct answer — featured snippets, PAA boxes, voice results?"
// Focuses on: FAQ/HowTo schema, question-based structure, direct answer formatting
function scoreAEO(html: HTMLAnalysis): { score: number; points: number; maxPoints: number; checks: Check[] } {
  const checks: Check[] = [];
  let pts = 0;
  const max = 20;

  // 1. Answer-trigger schema (7 pts)
  // FAQPage and HowTo are the direct triggers for Google rich results
  const faqPts = html.hasFAQSchema ? 5 : 0;
  const howtoPts = html.hasHowToSchema ? 3 : 0; // can't double-count with FAQ max
  pts += Math.min(faqPts + howtoPts, 7);
  checks.push({
    label: "FAQPage schema",
    passed: html.hasFAQSchema,
    detail: html.hasFAQSchema
      ? "FAQPage schema present ✓ — Google surfaces these as accordion answers; AI models use them as direct citation sources"
      : "Missing — FAQPage schema is the single highest-impact AEO action. Add Q&A pairs and mark them up with schema",
  });
  checks.push({
    label: "HowTo schema",
    passed: html.hasHowToSchema,
    detail: html.hasHowToSchema
      ? "HowTo schema present ✓ — triggers step-by-step rich results in Google Search and voice assistants"
      : "Missing — if any page explains a process, mark it up with HowTo schema for featured snippet eligibility",
  });

  // 2. Question-based heading structure (5 pts)
  // Google's featured snippet algorithm heavily favours H2/H3 questions followed by concise answers
  const questionPts = html.questionH2Count >= 4 ? 5
    : html.questionH2Count >= 2 ? 3
    : html.questionH2Count === 1 ? 2 : 0;
  pts += questionPts;
  checks.push({
    label: "Question-style headings",
    passed: html.questionH2Count >= 2,
    detail: `${html.questionH2Count} question-based H2s found (How/What/Why/Where/When/Can).${html.questionH2Count >= 2 ? " ✓ These directly attract featured snippets and PAA boxes." : " Add H2s phrased as questions your customers actually search — each one is a featured snippet opportunity"}`,
  });

  // 3. Structured answer content (5 pts)
  // Lists and tables are Google's preferred extraction format for snippets
  const listPts = (html.hasOrderedLists ? 2 : 0) + (html.hasUnorderedLists ? 2 : 0);
  pts += Math.min(listPts, 4);
  checks.push({
    label: "List & structured answers (UL/OL)",
    passed: html.hasOrderedLists || html.hasUnorderedLists,
    detail: [
      html.hasOrderedLists && "Numbered lists ✓ (ideal for step-by-step answers)",
      html.hasUnorderedLists && "Bullet lists ✓ (ideal for comparison/feature answers)",
    ].filter(Boolean).join(" · ") || "No lists found — Google extracts ~40% of featured snippets from bullet or numbered lists",
  });

  // 4. Supporting schema signals (3 pts)
  const supportPts =
    (html.hasArticleSchema ? 1 : 0) +
    (html.hasBreadcrumbSchema ? 1 : 0) +
    (html.hasWebSiteSchema ? 1 : 0);
  pts += Math.min(supportPts, 3);
  checks.push({
    label: "Supporting schema (Article, Breadcrumb)",
    passed: supportPts >= 1,
    detail: supportPts >= 2
      ? `${[html.hasArticleSchema && "Article", html.hasBreadcrumbSchema && "Breadcrumb", html.hasWebSiteSchema && "WebSite"].filter(Boolean).join(", ")} ✓ — helps search engines understand content hierarchy`
      : supportPts === 1
        ? `One of three present — add Article and BreadcrumbList schema for full AEO coverage`
        : "None found — Article and Breadcrumb schema help AI understand your content structure and authority",
  });

  const finalPts = Math.min(pts, max);
  return { score: Math.round((finalPts / max) * 100), points: finalPts, maxPoints: max, checks };
}

function scoreAccessibility(a11y: number, bp: number): { score: number; points: number; maxPoints: number; checks: Check[] } {
  const a11yPts = Math.round(clamp(a11y, 0, 1) * 5);
  const bpPts = Math.round(clamp(bp, 0, 1) * 3);
  const pts = a11yPts + bpPts;
  return {
    score: Math.round((pts / 8) * 100), // maxPoints: 8 — kept smaller intentionally; SEO/GEO/AEO are the core focus
    points: pts,
    maxPoints: 8,
    checks: [
      { label: "Accessibility (Lighthouse)", passed: a11y >= 0.7, detail: `${Math.round(a11y * 100)}/100 — covers alt text, colour contrast, aria labels, keyboard navigation` },
      { label: "Best practices (Lighthouse)", passed: bp >= 0.8, detail: `${Math.round(bp * 100)}/100 — covers security headers, JS errors, deprecated APIs` },
    ],
  };
}

// CRO = "Does this page guide a visitor to take action?"
// Industry-aware: expectations differ by vertical
function scoreCRO(html: HTMLAnalysis, industry?: string): { score: number; points: number; maxPoints: number; checks: Check[] } {
  const checks: Check[] = [];
  let pts = 0;
  const max = 15;

  // 1. CTA above fold (4 pts) — required for most industries
  const ctaPts = html.hasCTAAboveFold ? 4 : 0;
  pts += ctaPts;
  checks.push({
    label: "CTA visible above fold",
    passed: html.hasCTAAboveFold,
    detail: html.hasCTAAboveFold
      ? `"${html.ctaText}" detected in the first viewport — visitors immediately know what to do ✓`
      : "No clear call-to-action detected near the top of the page — visitors don't know what to do next",
  });

  // 2. Social proof (3 pts)
  const socialPts = html.socialProofScore >= 3 ? 3 : html.socialProofScore >= 2 ? 2 : html.socialProofScore >= 1 ? 1 : 0;
  pts += socialPts;
  checks.push({
    label: "Social proof signals",
    passed: html.socialProofScore >= 2,
    detail: html.socialProofScore >= 3
      ? `Strong social proof: testimonials, reviews, and customer counts detected ✓`
      : html.socialProofScore >= 1
        ? `Some social proof detected (${html.socialProofScore}/5 signals). Add customer counts, star ratings, or testimonials.`
        : "No social proof found — visitor trust is the #1 conversion factor. Add testimonials, review counts, or customer logos",
  });

  // 3. Value proposition in H1 (2 pts)
  const h1Pts = html.h1HasBenefit ? 2 : html.h1Tags.length > 0 ? 1 : 0;
  pts += h1Pts;
  checks.push({
    label: "Value proposition clarity",
    passed: html.h1HasBenefit,
    detail: html.h1HasBenefit
      ? `H1 communicates a clear benefit ✓ — visitors know within 5 seconds what they gain`
      : html.h1Tags.length > 0
        ? `H1 exists but focuses on features not benefits. Rewrite to include outcome words (save, grow, improve, results)`
        : "No H1 found — visitors can't understand your value proposition",
  });

  // 4. Trust signals (2 pts)
  const trustSignals = (html.hasTrustBadges ? 1 : 0) + (html.hasPhone || html.hasEmail ? 1 : 0);
  pts += Math.min(trustSignals, 2);
  checks.push({
    label: "Trust signals",
    passed: trustSignals >= 2,
    detail: [
      html.hasTrustBadges && "Trust badges/guarantee ✓",
      (html.hasPhone || html.hasEmail) && "Contact info visible ✓",
    ].filter(Boolean).join(" · ") || "No trust signals detected — add a guarantee, contact info, or security badges",
  });

  // 5. Form friction (2 pts) — fewer fields = less friction
  const formPts = html.formFieldCount === 0 ? 2 :
    html.formFieldCount <= (industry === "real_estate" ? 5 : industry === "saas" ? 3 : 4) ? 2 : 1;
  pts += formPts;
  const idealFields = industry === "saas" ? 3 : industry === "real_estate" ? 5 : 4;
  checks.push({
    label: "Form friction",
    passed: formPts === 2,
    detail: html.formFieldCount === 0
      ? "No form detected on this page"
      : html.formFieldCount <= idealFields
        ? `${html.formFieldCount} form fields — low friction ✓ (ideal: ≤${idealFields} for this type of site)`
        : `${html.formFieldCount} form fields detected — high friction. Reduce to ≤${idealFields} to improve conversion rate`,
  });

  // 6. Engagement tools (2 pts) — chat or free trial = lower barrier
  const engagePts = (html.hasChatWidget ? 1 : 0) + (html.hasFreeTrialMention ? 1 : 0);
  pts += Math.min(engagePts, 2);
  checks.push({
    label: "Engagement tools",
    passed: engagePts >= 1,
    detail: [
      html.hasChatWidget && "Chat widget ✓",
      html.hasFreeTrialMention && "Free trial / no credit card ✓",
    ].filter(Boolean).join(" · ") || "No chat or low-barrier offer detected — consider adding live chat or a free trial to reduce conversion friction",
  });

  const finalPts = Math.min(pts, max);
  return { score: Math.round((finalPts / max) * 100), points: finalPts, maxPoints: max, checks };
}

// Analytics = "Are you measuring what matters?"
function scoreAnalytics(html: HTMLAnalysis): { score: number; points: number; maxPoints: number; checks: Check[] } {
  const checks: Check[] = [];
  let pts = 0;
  const max = 10;

  // 1. Primary measurement (GA4) — 4 pts
  const ga4Pts = html.hasGA4 ? 4 : html.hasUniversalAnalytics ? 2 : 0;
  pts += ga4Pts;
  checks.push({
    label: "Google Analytics 4",
    passed: html.hasGA4,
    detail: html.hasGA4
      ? "GA4 detected ✓ — you have a solid traffic measurement foundation"
      : html.hasUniversalAnalytics
        ? "Universal Analytics (UA) detected — upgrade to GA4 immediately. UA stopped processing data in July 2023."
        : "No Google Analytics found — you cannot measure traffic, conversions, or which pages generate leads",
  });

  // 2. Tag management (GTM) — 2 pts
  pts += html.hasGTM ? 2 : 0;
  checks.push({
    label: "Google Tag Manager",
    passed: html.hasGTM,
    detail: html.hasGTM
      ? "GTM detected ✓ — flexible tag management without code deploys"
      : "GTM not found — without it, adding new tracking requires a developer for every change",
  });

  // 3. Paid/retargeting pixels — 2 pts max
  const pixelCount = [html.hasMetaPixel, html.hasTikTokPixel, html.hasLinkedInInsight].filter(Boolean).length;
  const pixelPts = Math.min(pixelCount, 2);
  pts += pixelPts;
  checks.push({
    label: "Retargeting pixels",
    passed: pixelCount >= 1,
    detail: pixelCount >= 1
      ? [
          html.hasMetaPixel && "Meta Pixel ✓",
          html.hasTikTokPixel && "TikTok Pixel ✓",
          html.hasLinkedInInsight && "LinkedIn Insight ✓",
        ].filter(Boolean).join(" · ")
      : "No retargeting pixels found — you cannot run retargeting ads or track paid campaign conversions",
  });

  // 4. Behaviour analytics — 1 pt
  const hasHeatmap = html.hasHotjar || html.hasClarity;
  pts += hasHeatmap ? 1 : 0;
  checks.push({
    label: "Behaviour analytics (Hotjar / Clarity)",
    passed: hasHeatmap,
    detail: hasHeatmap
      ? `${html.hasHotjar ? "Hotjar" : "Microsoft Clarity"} detected ✓ — you can see heatmaps and session recordings`
      : "No heatmap or session recording tool found — you cannot see how visitors interact with your pages",
  });

  // 5. Cookie consent — 1 pt
  pts += html.hasCookieConsent ? 1 : 0;
  checks.push({
    label: "Cookie consent / GDPR compliance",
    passed: html.hasCookieConsent,
    detail: html.hasCookieConsent
      ? "Cookie consent detected ✓ — GDPR/CCPA compliant tracking setup"
      : "No cookie consent tool found — collecting analytics without consent may violate GDPR if you have EU visitors",
  });

  const finalPts = Math.min(pts, max);
  return { score: Math.round((finalPts / max) * 100), points: finalPts, maxPoints: max, checks };
}

// ── Recommendations Builder ────────────────────────────────────────────────

function buildRecommendations(
  perf: number, lhSeo: number, a11y: number, bp: number,
  html: HTMLAnalysis, siteInfo: SiteInfo, keywords: ReturnType<typeof extractKeywords>,
  pageUrl: string
) {
  type Priority = "critical" | "high" | "medium";
  const recs: Array<{ id: string; title: string; description: string; priority: Priority; category: string; fix: string }> = [];

  if (!pageUrl.startsWith("https://"))
    recs.push({ id: "https", title: "No HTTPS — site is not secure", description: "Google demotes non-HTTPS sites in rankings. AI systems like ChatGPT and Perplexity avoid citing insecure sources.", priority: "critical", category: "Security", fix: "Install a free SSL certificate via Let's Encrypt. Most hosts offer this in one click." });

  if (perf < 0.5)
    recs.push({ id: "perf", title: "Site loads dangerously slowly", description: `Performance score: ${Math.round(perf * 100)}/100. Over half of mobile users leave if a page takes more than 3 seconds. This is costing you customers daily.`, priority: "critical", category: "Performance", fix: "Compress images to WebP, remove unused JavaScript, enable browser caching, and use a CDN." });
  else if (perf < 0.75)
    recs.push({ id: "perf-med", title: "Page speed needs improvement", description: `Performance score: ${Math.round(perf * 100)}/100. Faster pages rank higher and convert better.`, priority: "high", category: "Performance", fix: "Optimise images, defer non-critical scripts, and consider a CDN." });

  if (html.h1Tags.length === 0)
    recs.push({ id: "h1", title: "Missing H1 tag", description: "Every page needs exactly one H1 — it tells search engines and AI what the page is about. Without it you're invisible for the topic.", priority: "critical", category: "Content SEO", fix: "Add one clear H1 that contains your primary keyword. It should match the intent of the page." });

  if (!html.metaDescription)
    recs.push({ id: "meta-desc", title: "No meta description", description: "Missing meta descriptions result in random, unhelpful previews in search results and AI citations, hurting click-through rates.", priority: "high", category: "Technical SEO", fix: "Write a 120–165 character meta description for each key page. Include your primary keyword and a clear value proposition." });

  if (!html.hasFAQSchema && !html.hasHowToSchema)
    recs.push({ id: "faq-schema", title: "Missing FAQ / HowTo schema", description: "FAQ and HowTo schema enable Google rich results (accordion answers in search) and dramatically improve chances of being cited by AI systems.", priority: "high", category: "AEO Readiness", fix: "Add FAQPage schema to any page with Q&A content. This is one of the highest-impact AEO changes you can make." });

  if (!html.hasOrgSchema && !html.hasLocalBizSchema)
    recs.push({ id: "org-schema", title: "No Organization or LocalBusiness schema", description: "ChatGPT, Perplexity, and Google's AI Overviews use this schema to identify who you are. Without it, you're essentially unknown to AI search.", priority: "high", category: "GEO Readiness", fix: "Add Organization schema with your business name, URL, logo, social profiles, and contact details." });

  if (!siteInfo.hasSitemap)
    recs.push({ id: "sitemap", title: "No XML sitemap found", description: "Without a sitemap, Google has to discover your pages by crawling links. You may have pages that are never indexed.", priority: "high", category: "Technical SEO", fix: "Generate an XML sitemap and submit it to Google Search Console. Most CMS platforms do this automatically." });

  if (keywords.length > 0 && !keywords[0].inTitle && !keywords[0].inH1)
    recs.push({ id: "kw-coverage", title: `Primary keyword "${keywords[0].word}" not in title or H1`, description: "Your most frequent keyword isn't appearing in your title tag or H1 — the two most important on-page SEO signals.", priority: "high", category: "Content SEO", fix: `Include "${keywords[0].word}" naturally in your page title and H1 heading.` });

  if (html.totalImages > 0 && html.imagesWithAlt / html.totalImages < 0.5)
    recs.push({ id: "alt-text", title: `${html.totalImages - html.imagesWithAlt} images missing alt text`, description: "Alt text helps Google understand your images, improves accessibility, and is an SEO ranking signal.", priority: "medium", category: "Technical SEO", fix: "Add descriptive alt text to every image. Include keywords where natural, but be accurate." });

  if (lhSeo < 0.7)
    recs.push({ id: "lh-seo", title: "Basic SEO fundamentals failing", description: `Lighthouse SEO: ${Math.round(lhSeo * 100)}/100. Issues may include non-descriptive link text, missing viewport, or crawl blocks.`, priority: lhSeo < 0.5 ? "critical" : "high", category: "Technical SEO", fix: "Run a Lighthouse audit in Chrome DevTools for the exact list of failing checks." });

  if (html.questionH2Count === 0 && !html.hasFAQSchema)
    recs.push({ id: "aeo-content", title: "Content not structured for AI answers", description: "AI search engines prefer content with clear question/answer formatting. None of your headings are questions.", priority: "medium", category: "AEO Readiness", fix: "Rewrite H2 headings as questions (e.g. 'How does X work?' 'What is Y?') and answer them concisely in the following paragraph." });

  if (a11y < 0.7)
    recs.push({ id: "a11y", title: "Accessibility issues found", description: `Accessibility score: ${Math.round(a11y * 100)}/100. Accessible sites rank higher. Common issues: missing alt text, low colour contrast, unlabelled forms.`, priority: "medium", category: "Accessibility", fix: "Run axe DevTools on your pages. Fix missing alt text, contrast issues, and aria labels." });

  const priorityOrder: Record<Priority, number> = { critical: 0, high: 1, medium: 2 };
  recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  return recs;
}

// ── Main Handler ───────────────────────────────────────────────────────────


// ── Streaming Handler ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch { /* controller may already be closed */ }
      };

      try {
        const body = await req.json() as { url?: unknown; industry?: string };
        const rawUrl = body?.url;

        if (!rawUrl || typeof rawUrl !== "string") {
          send("error", { message: "Please provide a valid URL." });
          controller.close();
          return;
        }

        const industry = typeof body.industry === "string" ? body.industry : undefined;
        let url = rawUrl.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
        try { new URL(url); } catch {
          send("error", { message: "That doesn't look like a valid URL. Try something like example.com" });
          controller.close();
          return;
        }

        const origin = new URL(url).origin;
        const apiKey = process.env.PAGESPEED_API_KEY;

        send("status", { message: "Reaching your website\u2026" });

        const psiParams = new URLSearchParams({ url, strategy: "mobile", ...(apiKey ? { key: apiKey } : {}) });
        ["performance", "seo", "accessibility", "best-practices"].forEach(c => psiParams.append("category", c));
        const PSI_URL = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${psiParams}`;

        const FETCH_OPTS = {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; SiteScoreBot/1.0)" },
          signal: AbortSignal.timeout(12000),
        };

        // Start PSI and HTML fetches in parallel
        const psiPromise = fetch(PSI_URL, { signal: AbortSignal.timeout(45000) })
          .then(r => r.json() as Promise<PSIResponse & { error?: { code: number; message: string } }>)
          .catch(() => null);

        const htmlFetch = fetch(url, FETCH_OPTS).then(r => r.text()).catch(() => null);
        const robotsFetch = fetch(`${origin}/robots.txt`, FETCH_OPTS).then(r => r.ok ? r.text() : null).catch(() => null);
        const sitemapFetch = fetch(`${origin}/sitemap.xml`, FETCH_OPTS).then(r => r.ok ? r.text() : null).catch(() => null);

        // Await HTML group — PSI continues in background
        const [htmlRaw, robotsTxt, sitemapXml] = await Promise.all([htmlFetch, robotsFetch, sitemapFetch]);

        const htmlAnalysis: HTMLAnalysis = htmlRaw ? parseHTML(htmlRaw, url)
          : { title: null, titleLength: 0, metaDescription: null, metaDescLength: 0, canonicalUrl: null, language: null, hasViewport: false, robotsMeta: null, h1Tags: [], h2Tags: [], h3Tags: [], totalImages: 0, imagesWithAlt: 0, internalLinks: 0, externalLinks: 0, wordCount: 0, bodyText: "", ogTitle: null, ogDescription: null, ogImage: null, ogType: null, twitterCard: null, schemaTypes: [], hasFAQSchema: false, hasHowToSchema: false, hasOrgSchema: false, hasLocalBizSchema: false, hasArticleSchema: false, hasBreadcrumbSchema: false, hasWebSiteSchema: false, questionH2Count: 0, hasOrderedLists: false, hasUnorderedLists: false, hasPhone: false, hasAddress: false, hasEmail: false, hasSocialLinks: false, hreflang: false, fetchError: true, hasGA4: false, hasUniversalAnalytics: false, hasGTM: false, hasMetaPixel: false, hasTikTokPixel: false, hasLinkedInInsight: false, hasHotjar: false, hasClarity: false, hasCookieConsent: false, hasCTAAboveFold: false, ctaText: null, socialProofScore: 0, hasTrustBadges: false, formFieldCount: 0, hasChatWidget: false, hasFreeTrialMention: false, hasTestimonials: false, hasReviewMentions: false, h1HasBenefit: false, hasPhoneInHeader: false };

        const blockedByCrawlers = robotsTxt
          ? /User-agent:\s*\*[\s\S]*?Disallow:\s*\/(?!\S)/i.test(robotsTxt) : false;
        const sitemapFromRobots = robotsTxt ? robotsTxt.match(/Sitemap:\s*(\S+)/i)?.[1] ?? null : null;
        let pageCount: number | null = null;
        if (sitemapXml) {
          const locMatches = sitemapXml.match(/<loc>/g);
          pageCount = locMatches ? locMatches.length : null;
        }

        const siteInfo: SiteInfo = {
          hasRobots: !!robotsTxt,
          hasSitemap: !!sitemapXml,
          blockedByCrawlers,
          sitemapUrl: sitemapFromRobots ?? (sitemapXml ? `${origin}/sitemap.xml` : null),
          pageCount,
        };

        const keywords = extractKeywords(htmlAnalysis, url);

        send("health", {
          domain: new URL(url).hostname,
          isHTTPS: url.startsWith("https://"),
          hasRobots: siteInfo.hasRobots,
          hasSitemap: siteInfo.hasSitemap,
          pageCount,
          schemaTypesFound: Array.from(new Set(htmlAnalysis.schemaTypes)),
          htmlFetchError: htmlAnalysis.fetchError,
          blockedByCrawlers,
        });

        send("status", { message: "Analysing content signals\u2026" });

        const safe = (fn: () => ReturnType<typeof scorePerformance>, fallbackMax: number) => {
          try { return fn(); }
          catch (e) { console.error("Pillar error:", e); return { score: 0, points: 0, maxPoints: fallbackMax, checks: [] }; }
        };

        // HTML pillars — send immediately
        const contentPillar = safe(() => scoreContentKeywords(htmlAnalysis, keywords), 20);
        send("pillar", { key: "contentKeywords", label: "Content & Keywords", description: "Keyword placement, heading structure & content depth", ...contentPillar });

        const geoPillar = safe(() => scoreGEO(htmlAnalysis, url), 20);
        send("pillar", { key: "geoReadiness", label: "GEO Readiness", description: "Will AI systems cite you? Entity schema, NAP & authority", ...geoPillar });

        const aeoPillar = safe(() => scoreAEO(htmlAnalysis), 20);
        send("pillar", { key: "aeoReadiness", label: "AEO Readiness", description: "Featured snippets, PAA boxes & voice search answers", ...aeoPillar });

        const croPillar = safe(() => scoreCRO(htmlAnalysis, industry), 15);
        send("pillar", { key: "cro", label: "Conversion", description: "CTA clarity, social proof, trust signals & form friction", ...croPillar });

        const analyticsPillar = safe(() => scoreAnalytics(htmlAnalysis), 10);
        send("pillar", { key: "analytics", label: "Analytics Health", description: "GA4, GTM, pixels & measurement completeness", ...analyticsPillar });

        const coverageScore = keywords.length > 0
          ? Math.round(keywords.slice(0, 5).reduce((acc, k) =>
              acc + ([k.inTitle, k.inH1, k.inMetaDesc, k.inURL].filter(Boolean).length / 4), 0)
              / Math.min(keywords.length, 5) * 100) : 0;
        send("keywords", { top: keywords, coverageScore });

        // Wait for PSI, then stream PSI pillars
        send("status", { message: "Processing performance data\u2026" });
        const psiData = await psiPromise;

        let perf = 0, a11y = 0, bp = 0, lhSeo = 0;
        let audits: Record<string, PSIAudit> = {};

        if (psiData?.lighthouseResult) {
          const cats = psiData.lighthouseResult.categories;
          audits = psiData.lighthouseResult.audits ?? {};
          perf = cats.performance?.score ?? 0;
          a11y = cats.accessibility?.score ?? 0;
          bp = cats["best-practices"]?.score ?? 0;
          lhSeo = cats.seo?.score ?? 0;
        }

        send("status", { message: "Calculating your score\u2026" });

        const perfPillar = safe(() => scorePerformance(perf), 15);
        send("pillar", { key: "performance", label: "Performance", description: "Page load speed & Core Web Vitals on mobile", ...perfPillar });

        const techSeoPillar = safe(() => scoreTechnicalSEO(lhSeo, htmlAnalysis, url, siteInfo, audits), 25);
        send("pillar", { key: "technicalSeo", label: "Technical SEO", description: "Crawlability, meta tags, sitemap, HTTPS & alt text", ...techSeoPillar });

        const a11yPillar = safe(() => scoreAccessibility(a11y, bp), 8);
        send("pillar", { key: "accessibility", label: "Accessibility & Tech", description: "WCAG compliance & modern web standards", ...a11yPillar });

        const allPillars = [perfPillar, techSeoPillar, contentPillar, geoPillar, aeoPillar, a11yPillar, croPillar, analyticsPillar];
        const totalPoints = allPillars.reduce((s, p) => s + p.points, 0);
        const maxPoints = allPillars.reduce((s, p) => s + p.maxPoints, 0);
        const total = Math.round((totalPoints / maxPoints) * 100);

        const recommendations = buildRecommendations(perf, lhSeo, a11y, bp, htmlAnalysis, siteInfo, keywords, url);
        const criticalCount = recommendations.filter(r => r.priority === "critical").length;
        const highCount = recommendations.filter(r => r.priority === "high").length;

        send("complete", {
          score: total,
          url,
          health: {
            domain: new URL(url).hostname,
            isHTTPS: url.startsWith("https://"),
            pageCount,
            hasRobots: siteInfo.hasRobots,
            hasSitemap: siteInfo.hasSitemap,
            blockedByCrawlers,
            criticalIssues: criticalCount,
            highIssues: highCount,
            totalIssues: recommendations.length,
            schemaTypesFound: Array.from(new Set(htmlAnalysis.schemaTypes)),
            htmlFetchError: htmlAnalysis.fetchError,
          },
          recommendations: recommendations.slice(0, 8),
          gatedRecsCount: Math.max(0, recommendations.length - 3),
        });

      } catch (err) {
        const e = err as Error;
        if (e.name === "AbortError" || e.name === "TimeoutError") {
          send("error", { message: "Analysis timed out. The site may be very slow \u2014 try again in a moment." });
        } else {
          console.error("Stream audit error:", e);
          send("error", { message: "Something went wrong. Please try again." });
        }
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
