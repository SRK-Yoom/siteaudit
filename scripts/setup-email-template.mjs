#!/usr/bin/env node
/**
 * Push branded email templates + optional custom SMTP to Supabase.
 * Uses .env.setup for credentials.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  for (const name of [".env.setup", ".env.local"]) {
    const p = resolve(root, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*$/);
      if (m) {
        const val = m[2].replace(/^["']|["']$/g, "").trim();
        if (!process.env[m[1]]) process.env[m[1]] = val;
      }
    }
  }
}
loadEnv();

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
const RESEND_KEY = process.env.RESEND_API_KEY;
const BASE = `https://api.supabase.com/v1/projects/${REF}`;

if (!TOKEN || !REF) { console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF"); process.exit(1); }

const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

// ─── Branded HTML confirmation email with OTP code ───────────────────────────
const confirmationTemplate = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your SiteScore verification code</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f1fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1fb;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(124,58,237,0.12);">

  <!-- Purple gradient header -->
  <tr><td style="background:linear-gradient(135deg,#7C3AED 0%,#A855F7 55%,#DB2777 100%);padding:28px 32px 24px;text-align:center;">
    <div style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">SiteScore</div>
    <div style="margin-top:6px;font-size:12px;color:rgba(255,255,255,0.75);letter-spacing:0.5px;">AI-POWERED WEBSITE AUDIT</div>
  </td></tr>

  <!-- OTP Code — the star of the email -->
  <tr><td style="padding:32px 32px 16px;text-align:center;">
    <div style="font-size:18px;font-weight:700;color:#1F2937;margin-bottom:6px;">Your verification code</div>
    <div style="font-size:13px;color:#6B7280;margin-bottom:24px;">Enter this code on the SiteScore website to verify your email.</div>
    <div style="display:inline-block;background:#F8F5FF;border:2px solid #E0D4F7;border-radius:16px;padding:20px 36px;">
      <div style="font-size:40px;font-weight:900;letter-spacing:10px;color:#7C3AED;font-family:monospace;">{{ .Token }}</div>
    </div>
    <div style="margin-top:16px;font-size:12px;color:#9CA3AF;">This code expires in 24 hours.</div>
  </td></tr>

  {{ if .Data.audit_score }}
  <!-- Report teaser -->
  <tr><td style="padding:8px 32px 0;text-align:center;">
    <div style="background:#F9FAFB;border:1px solid #F3F4F6;border-radius:12px;padding:16px;">
      <div style="font-size:12px;color:#6B7280;margin-bottom:6px;">Your audit for <strong style="color:#1F2937;">{{ .Data.audit_domain }}</strong></div>
      <div style="font-size:32px;font-weight:900;color:#7C3AED;">{{ .Data.audit_score }}<span style="font-size:16px;color:#9CA3AF;font-weight:400;"> / 100</span></div>
      <div style="margin-top:8px;font-size:12px;color:#6B7280;">Full breakdown with 8 pillar scores, keyword analysis &amp; fix list waiting for you.</div>
    </div>
  </td></tr>
  {{ end }}

  <!-- Fallback link -->
  <tr><td style="padding:24px 32px 0;text-align:center;">
    <div style="font-size:12px;color:#9CA3AF;margin-bottom:12px;">Or click this link to verify automatically:</div>
    <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#7C3AED 0%,#A855F7 50%,#DB2777 100%);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:12px;box-shadow:0 4px 16px rgba(124,58,237,0.25);">
      Verify &amp; View Report &rarr;
    </a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 32px 28px;text-align:center;">
    <div style="border-top:1px solid #F3F4F6;padding-top:20px;">
      <div style="font-size:16px;font-weight:800;color:#7C3AED;margin-bottom:2px;">SiteScore</div>
      <div style="font-size:11px;color:#9CA3AF;">by Yoom Digital Agency</div>
    </div>
  </td></tr>

</table>
</td></tr></table>
</body>
</html>
`.trim();

async function main() {
  console.log("Pushing branded email template to Supabase...\n");

  const patch = {
    mailer_subjects_confirmation: "Your SiteScore verification code",
    mailer_templates_confirmation_content: confirmationTemplate,
  };

  // Custom SMTP via Resend if key available
  if (RESEND_KEY && RESEND_KEY.startsWith("re_")) {
    console.log("Resend API key found — configuring custom SMTP...");
    patch.smtp_admin_email = "hello@sitescore.ai";
    patch.smtp_sender_name = "SiteScore";
    patch.smtp_host = "smtp.resend.com";
    patch.smtp_port = "465";
    patch.smtp_user = "resend";
    patch.smtp_pass = RESEND_KEY;
  } else {
    console.log("No Resend API key — skipping custom SMTP (email sender will remain Supabase default).");
    console.log("To brand the sender, add RESEND_API_KEY to .env.local and re-run.\n");
  }

  const res = await fetch(`${BASE}/config/auth`, { method: "PATCH", headers, body: JSON.stringify(patch) });
  if (!res.ok) {
    const t = await res.text();
    console.error("PATCH failed:", res.status, t);
    process.exit(1);
  }

  console.log("Email template updated.");
  console.log("Subject: \"Your SiteScore report is ready — confirm your email\"");
  if (RESEND_KEY && RESEND_KEY.startsWith("re_")) {
    console.log("SMTP sender: SiteScore <hello@sitescore.ai>");
  }
  console.log("\nDone.");
}

main();
