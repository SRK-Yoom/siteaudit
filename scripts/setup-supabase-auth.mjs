#!/usr/bin/env node
/**
 * One-time setup: enable Google (and optionally Apple) OAuth in Supabase and set redirect URLs.
 * Run once after creating Google OAuth credentials.
 *
 * Required env vars (or from .env.setup):
 *   SUPABASE_ACCESS_TOKEN   - from https://supabase.com/dashboard/account/tokens
 *   SUPABASE_PROJECT_REF    - from your project URL, e.g. xyz from https://xyz.supabase.co
 *   SITE_URL                - e.g. https://siteaudit-rho.vercel.app (no trailing slash)
 *   GOOGLE_CLIENT_ID        - from Google Cloud Console OAuth 2.0 Client
 *   GOOGLE_CLIENT_SECRET    - from same
 *
 * Optional for Apple:
 *   APPLE_CLIENT_ID
 *   APPLE_SECRET (private key content or key id + team id + etc - Supabase docs)
 *
 * Usage:
 *   cp .env.setup.example .env.setup
 *   # Edit .env.setup with your values
 *   node scripts/setup-supabase-auth.mjs
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const envPath = resolve(root, ".env.setup");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*$/);
      if (m) {
        const val = m[2].replace(/^["']|["']$/g, "").trim();
        if (!process.env[m[1]]) process.env[m[1]] = val;
      }
    }
  }
}

loadEnv();

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const SITE_URL = (process.env.SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
const APPLE_SECRET = process.env.APPLE_SECRET;

const BASE = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}`;

function required(name, value) {
  if (!value || value.trim() === "") {
    console.error(`Missing required env: ${name}. Set it in .env.setup or the environment.`);
    process.exit(1);
  }
  return value.trim();
}

async function main() {
  required("SUPABASE_ACCESS_TOKEN", SUPABASE_ACCESS_TOKEN);
  required("SUPABASE_PROJECT_REF", SUPABASE_PROJECT_REF);
  required("SITE_URL", SITE_URL);

  const callbackUrl = `${SITE_URL}/auth/callback`;
  const headers = {
    Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };

  console.log("Supabase Auth setup");
  console.log("  Project ref:", SUPABASE_PROJECT_REF);
  console.log("  Site URL:", SITE_URL);
  console.log("  Callback URL:", callbackUrl);
  console.log("");

  // 1) Get current auth config so we can merge
  let current = {};
  try {
    const r = await fetch(`${BASE}/config/auth`, { headers });
    if (r.ok) current = await r.json();
  } catch (e) {
    console.error("Failed to fetch current auth config:", e.message);
    process.exit(1);
  }

  // 2) Set redirect allowlist and site URL
  const uriAllowList = current.uri_allow_list || [];
  if (!uriAllowList.includes(callbackUrl)) {
    const nextList = [...uriAllowList, callbackUrl];
    const localCallback = "http://localhost:3000/auth/callback";
    if (!nextList.includes(localCallback)) nextList.push(localCallback);
    console.log("Setting redirect URLs:", nextList);
    const patchRes = await fetch(`${BASE}/config/auth`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        site_url: SITE_URL,
        uri_allow_list: nextList,
      }),
    });
    if (!patchRes.ok) {
      const t = await patchRes.text();
      console.error("PATCH auth (redirects) failed:", patchRes.status, t);
      process.exit(1);
    }
    console.log("  Redirect URLs updated.");
  } else {
    console.log("  Redirect URLs already include callback.");
  }

  // 3) Enable Google OAuth if credentials provided
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    console.log("Enabling Google OAuth...");
    const patchRes = await fetch(`${BASE}/config/auth`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        external_google_enabled: true,
        external_google_client_id: GOOGLE_CLIENT_ID.trim(),
        external_google_secret: GOOGLE_CLIENT_SECRET.trim(),
      }),
    });
    if (!patchRes.ok) {
      const t = await patchRes.text();
      console.error("PATCH auth (Google) failed:", patchRes.status, t);
      process.exit(1);
    }
    console.log("  Google OAuth enabled.");
  } else {
    console.log("  Skipping Google (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.setup to enable).");
  }

  // 4) Apple optional
  if (APPLE_CLIENT_ID && APPLE_SECRET) {
    console.log("Enabling Apple OAuth...");
    const patchRes = await fetch(`${BASE}/config/auth`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        external_apple_enabled: true,
        external_apple_client_id: APPLE_CLIENT_ID.trim(),
        external_apple_secret: APPLE_SECRET.trim(),
      }),
    });
    if (!patchRes.ok) {
      const t = await patchRes.text();
      console.error("PATCH auth (Apple) failed:", patchRes.status, t);
      process.exit(1);
    }
    console.log("  Apple OAuth enabled.");
  } else {
    console.log("  Skipping Apple (set APPLE_CLIENT_ID and APPLE_SECRET in .env.setup to enable).");
  }

  console.log("");
  console.log("Done. If you enabled Google, add this redirect URI in Google Cloud Console:");
  console.log("  ", callbackUrl);
  console.log("  (APIs & Services → Credentials → your OAuth 2.0 Client → Authorized redirect URIs)");
}

main();
