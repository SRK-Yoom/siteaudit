import { NextRequest, NextResponse } from "next/server";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { url?: unknown };
    const rawUrl = body?.url;

    if (!rawUrl || typeof rawUrl !== "string")
      return NextResponse.json({ error: "Please provide a valid URL." }, { status: 400 });

    let url = rawUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
    try { new URL(url); } catch {
      return NextResponse.json({ error: "That doesn't look like a valid URL. Try something like example.com" }, { status: 400 });
    }

    const origin = new URL(url).origin;
    const apiKey = process.env.PAGESPEED_API_KEY;

    // ── Parallel fetch PSI + HTML + robots + sitemap ──
    const psiParams = new URLSearchParams({ url, strategy: "mobile", ...(apiKey ? { key: apiKey } : {}) });
    ["performance", "seo", "accessibility", "best-practices"].forEach(c => psiParams.append("category", c));
    const PSI_URL = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${psiParams}`;

    const FETCH_OPTS = { headers: { "User-Agent": "Mozilla/5.0 (compatible; SiteScoreBot/1.0)" }, signal: AbortSignal.timeout(12000) };

    const [psiResult, htmlResult, robotsResult, sitemapResult] = await Promise.allSettled([
      fetch(PSI_URL, { signal: AbortSignal.timeout(45000) }).then(r => r.json() as Promise<PSIResponse>),
      fetch(url, FETCH_OPTS).then(r => r.text()),
      fetch(`${origin}/robots.txt`, FETCH_OPTS).then(r => r.ok ? r.text() : null),
      fetch(`${origin}/sitemap.xml`, FETCH_OPTS).then(r => r.ok ? r.text() : null),
    ]);

    // Handle PSI failure
    if (psiResult.status === "rejected") {
      return NextResponse.json({ error: "Analysis timed out. The site may be very slow or down." }, { status: 504 });
    }
    const psiData = psiResult.value as PSIResponse & { error?: { code: number; message: string } };
    if ((psiData as { error?: { code: number } }).error?.code === 429)
      return NextResponse.json({ error: "Rate limit reached. Please wait 30 seconds and try again." }, { status: 429 });
    if (!psiData.lighthouseResult)
      return NextResponse.json({ error: "Could not analyse this URL. Make sure it's publicly accessible." }, { status: 400 });

    // Parse HTML
    const htmlRaw = htmlResult.status === "fulfilled" ? htmlResult.value : null;
    const htmlAnalysis: HTMLAnalysis = htmlRaw
      ? parseHTML(htmlRaw, url)
      : { title: null, titleLength: 0, metaDescription: null, metaDescLength: 0, canonicalUrl: null, language: null, hasViewport: false, robotsMeta: null, h1Tags: [], h2Tags: [], h3Tags: [], totalImages: 0, imagesWithAlt: 0, internalLinks: 0, externalLinks: 0, wordCount: 0, bodyText: "", ogTitle: null, ogDescription: null, ogImage: null, ogType: null, twitterCard: null, schemaTypes: [], hasFAQSchema: false, hasHowToSchema: false, hasOrgSchema: false, hasLocalBizSchema: false, hasArticleSchema: false, hasBreadcrumbSchema: false, hasWebSiteSchema: false, questionH2Count: 0, hasOrderedLists: false, hasUnorderedLists: false, hasPhone: false, hasAddress: false, hasEmail: false, hasSocialLinks: false, hreflang: false, fetchError: true };

    // Parse robots + sitemap
    const robotsTxt = robotsResult.status === "fulfilled" ? robotsResult.value : null;
    const sitemapXml = sitemapResult.status === "fulfilled" ? sitemapResult.value : null;

    const blockedByCrawlers = robotsTxt ? /User-agent:\s*\*[\s\S]*?Disallow:\s*\/(?!\S)/i.test(robotsTxt) : false;
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

    // PSI scores
    const cats = psiData.lighthouseResult.categories;
    const audits = psiData.lighthouseResult.audits ?? {};
    const perf = cats.performance?.score ?? 0;
    const a11y = cats.accessibility?.score ?? 0;
    const bp = cats["best-practices"]?.score ?? 0;
    const lhSeo = cats.seo?.score ?? 0;

    // Keywords
    const keywords = extractKeywords(htmlAnalysis, url);

    // Score all pillars
    const perfPillar = scorePerformance(perf);
    const techSeoPillar = scoreTechnicalSEO(lhSeo, htmlAnalysis, url, siteInfo, audits);
    const contentPillar = scoreContentKeywords(htmlAnalysis, keywords);
    const geoPillar = scoreGEO(htmlAnalysis, url);
    const aeoPillar = scoreAEO(htmlAnalysis);
    const a11yPillar = scoreAccessibility(a11y, bp);

    const total = perfPillar.points + techSeoPillar.points + contentPillar.points +
      geoPillar.points + aeoPillar.points + a11yPillar.points;

    const recommendations = buildRecommendations(perf, lhSeo, a11y, bp, htmlAnalysis, siteInfo, keywords, url);

    // Critical/high counts for health banner
    const criticalCount = recommendations.filter(r => r.priority === "critical").length;
    const highCount = recommendations.filter(r => r.priority === "high").length;

    return NextResponse.json({
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
      pillars: {
        performance: { ...perfPillar, label: "Performance", description: "Page load speed & Core Web Vitals on mobile" },
        technicalSeo: { ...techSeoPillar, label: "Technical SEO", description: "Crawlability, meta tags, sitemap, HTTPS & alt text" },
        contentKeywords: { ...contentPillar, label: "Content & Keywords", description: "Keyword placement, heading structure & content depth" },
        geoReadiness: { ...geoPillar, label: "GEO Readiness", description: "Will AI systems cite you? Entity schema, NAP & authority" },
        aeoReadiness: { ...aeoPillar, label: "AEO Readiness", description: "Featured snippets, PAA boxes & voice search answers" },
        accessibility: { ...a11yPillar, label: "Accessibility & Tech", description: "WCAG compliance & modern web standards" },
      },
      keywords: {
        top: keywords,
        coverageScore: keywords.length > 0
          ? Math.round(keywords.slice(0, 5).reduce((acc, k) => acc + ([k.inTitle, k.inH1, k.inMetaDesc, k.inURL].filter(Boolean).length / 4), 0) / Math.min(keywords.length, 5) * 100)
          : 0,
      },
      recommendations: recommendations.slice(0, 8),
      gatedRecsCount: Math.max(0, recommendations.length - 3),
    });

  } catch (err) {
    const e = err as Error;
    if (e.name === "AbortError" || e.name === "TimeoutError")
      return NextResponse.json({ error: "Analysis timed out. The site may be very slow — try again in a moment." }, { status: 504 });
    console.error("Audit error:", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
