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

// ─── Branded HTML confirmation email ──────────────────────────────────────────
const confirmationTemplate = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Confirm your SiteScore account</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f1fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1fb;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(124,58,237,0.12);">

  <!-- Purple gradient header -->
  <tr><td style="background:linear-gradient(135deg,#7C3AED 0%,#A855F7 55%,#DB2777 100%);padding:36px 32px 28px;text-align:center;">
    <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Site<span style="opacity:0.9;">Score</span></div>
    <div style="margin-top:8px;font-size:13px;color:rgba(255,255,255,0.8);letter-spacing:0.5px;">AI-POWERED WEBSITE AUDIT</div>
  </td></tr>

  <!-- Score hero (only if audit data present) -->
  {{ if .Data.audit_score }}
  <tr><td style="padding:32px 32px 0;text-align:center;">
    <div style="font-size:15px;color:#6B7280;margin-bottom:8px;">Your audit for</div>
    <div style="font-size:20px;font-weight:700;color:#1F2937;margin-bottom:20px;">{{ .Data.audit_domain }}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr><td style="width:100px;height:100px;border-radius:50%;border:6px solid #7C3AED;text-align:center;vertical-align:middle;">
      <div style="font-size:36px;font-weight:900;color:#7C3AED;line-height:1;">{{ .Data.audit_score }}</div>
      <div style="font-size:11px;color:#6B7280;margin-top:2px;">out of 100</div>
    </td></tr></table>
    <div style="margin-top:16px;padding:12px 20px;background:#F3F0FF;border-radius:12px;display:inline-block;">
      <span style="font-size:13px;color:#7C3AED;font-weight:600;">Your full report is ready to view</span>
    </div>
  </td></tr>

  <!-- Pillar summary -->
  {{ if .Data.audit_pillar_summary }}
  <tr><td style="padding:20px 32px 0;">
    <div style="font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Pillar Scores</div>
    <div style="font-size:13px;color:#4B5563;line-height:1.7;background:#F9FAFB;border-radius:10px;padding:12px 16px;border:1px solid #F3F4F6;">{{ .Data.audit_pillar_summary }}</div>
  </td></tr>
  {{ end }}

  <!-- What's inside teaser -->
  <tr><td style="padding:20px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#374151;">
          <span style="color:#059669;font-weight:700;">&#10003;</span>&nbsp;&nbsp;8-pillar score breakdown
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#374151;">
          <span style="color:#059669;font-weight:700;">&#10003;</span>&nbsp;&nbsp;Keyword coverage analysis
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#374151;">
          <span style="color:#059669;font-weight:700;">&#10003;</span>&nbsp;&nbsp;Prioritised recommendations
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#374151;">
          <span style="color:#059669;font-weight:700;">&#10003;</span>&nbsp;&nbsp;Actionable fix list
        </td>
      </tr>
    </table>
  </td></tr>
  {{ end }}

  <!-- Main CTA -->
  <tr><td style="padding:28px 32px 0;text-align:center;">
    {{ if .Data.audit_score }}
    <div style="font-size:16px;font-weight:700;color:#1F2937;margin-bottom:6px;">Confirm your email to unlock your report</div>
    <div style="font-size:13px;color:#6B7280;margin-bottom:20px;">Click the button below to activate your account and access your dashboard.</div>
    {{ else }}
    <div style="font-size:16px;font-weight:700;color:#1F2937;margin-bottom:6px;">Confirm your email</div>
    <div style="font-size:13px;color:#6B7280;margin-bottom:20px;">Click below to activate your SiteScore account.</div>
    {{ end }}
    <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#7C3AED 0%,#A855F7 50%,#DB2777 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:14px;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(124,58,237,0.3);">
      View My Full Report &rarr;
    </a>
  </td></tr>

  <!-- Secondary note -->
  <tr><td style="padding:24px 32px 0;text-align:center;">
    <div style="font-size:12px;color:#9CA3AF;line-height:1.6;">
      This link expires in 24 hours. If you didn't create a SiteScore account, you can safely ignore this email.
    </div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 32px 32px;text-align:center;border-top:1px solid #F3F4F6;margin-top:24px;">
    <div style="font-size:18px;font-weight:800;color:#7C3AED;margin-bottom:4px;">SiteScore</div>
    <div style="font-size:11px;color:#9CA3AF;">by Yoom Digital Agency</div>
    <div style="font-size:11px;color:#D1D5DB;margin-top:8px;">
      <a href="{{ .SiteURL }}" style="color:#7C3AED;text-decoration:none;">Visit SiteScore</a>
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
    mailer_subjects_confirmation: "Your SiteScore report is ready — confirm your email",
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
