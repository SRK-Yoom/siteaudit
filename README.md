# SiteScore — Free SEO & GEO Readiness Audit Tool

A standalone web app that takes any URL and generates a composite 0–100 audit score across 5 pillars, powered by Google PageSpeed Insights.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Set up API key for higher rate limits
cp .env.example .env.local
# Edit .env.local and add your PAGESPEED_API_KEY

# 3. Run locally
npm run dev
# → http://localhost:3001
```

## The Score (0–100)

| Pillar | Weight | What it measures |
|---|---|---|
| Performance | 30 pts | Load speed, LCP, FCP, CLS on mobile |
| SEO | 25 pts | Titles, meta tags, crawlability |
| GEO Readiness | 20 pts | HTTPS, Schema.org, meta desc, viewport, canonical |
| Accessibility | 15 pts | Alt text, colour contrast, aria labels |
| Best Practices | 10 pts | Security headers, JS errors, modern APIs |

**Score tiers:** Excellent (90+) · Good (70+) · Needs Work (50+) · Critical (<50)

## API Key (Optional)

Without a key the PageSpeed API still works — no key needed for development or low-traffic use.

Once you start seeing rate limit errors (HTTP 429), get a free key:
1. [Google Cloud Console](https://console.cloud.google.com/) → Enable **PageSpeed Insights API**
2. Credentials → Create API Key
3. Add to `.env.local`: `PAGESPEED_API_KEY=your_key`
4. Add to Vercel environment variables for production

## Deployment (Vercel)

```bash
# Push to GitHub, then:
# 1. Import the repo on vercel.com
# 2. Add PAGESPEED_API_KEY as an environment variable (optional)
# 3. Deploy — done
```

## Customisation

- **Brand name / colours** → `tailwind.config.ts` (edit `brand` colours) + `src/app/layout.tsx` (metadata)
- **CTA links** → `src/app/page.tsx` → search for `clearsight.agency` and replace with your links
- **Scoring weights** → `src/app/api/audit/route.ts` → `toPoints()` calls
