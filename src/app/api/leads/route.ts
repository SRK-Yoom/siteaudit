import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json() as {
    email: string;
    url?: string;
    score?: number;
    auditData?: Record<string, unknown>;
  };

  const { email, url, score, auditData } = body;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const cleanEmail = email.toLowerCase().trim();
  let domain = url ?? "";
  try { domain = new URL(url ?? "").hostname; } catch {}

  // Generate a unique token
  const token = crypto.randomUUID();

  // Save to report_tokens (stores full audit payload)
  const { error: saveError } = await supabase.from("report_tokens").insert({
    token,
    email: cleanEmail,
    url,
    domain,
    score,
    audit_data: auditData ?? {},
  });

  if (saveError) {
    console.error("Token save error:", saveError.message);
    // Still proceed — email will link to an error page
  }

  // Also upsert into leads table for email list
  await supabase.from("leads").upsert(
    { email: cleanEmail, url, score, updated_at: new Date().toISOString() },
    { onConflict: "email" }
  ).then(({ error }) => { if (error) console.error("Lead upsert:", error.message); });

  // Build the magic link
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://siteaudit-rho.vercel.app";
  const reportUrl = `${baseUrl}/report?token=${token}`;

  // Send email via Resend (graceful skip if key not configured)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "SiteScore <onboarding@resend.dev>";

    const scoreLabel = (score ?? 0) >= 90 ? "Excellent" : (score ?? 0) >= 70 ? "Good" : (score ?? 0) >= 50 ? "Needs Work" : "Critical Issues";
    const scoreColor = (score ?? 0) >= 90 ? "#059669" : (score ?? 0) >= 70 ? "#7C3AED" : (score ?? 0) >= 50 ? "#D97706" : "#DC2626";

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your SiteScore Report is Ready</title></head>
<body style="margin:0;padding:0;background:#F3F0FF;font-family:Inter,system-ui,-apple-system,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px">

    <!-- Card -->
    <div style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(124,58,237,0.1)">

      <!-- Gradient header -->
      <div style="background:linear-gradient(135deg,#7C3AED 0%,#A855F7 50%,#DB2777 100%);padding:36px 40px;text-align:center">
        <p style="color:rgba(255,255,255,0.7);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px">Website Audit Complete</p>
        <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:900;line-height:1.2">Your report is ready!</h1>
      </div>

      <!-- Body -->
      <div style="padding:36px 40px">
        <p style="color:#374151;margin:0 0 4px;font-size:15px">We finished analysing <strong>${domain}</strong>.</p>
        <p style="color:#6B7280;margin:0 0 28px;font-size:14px">Here&apos;s a quick summary of what we found:</p>

        <!-- Score block -->
        <div style="text-align:center;margin-bottom:28px;padding:24px;background:#F9F8FF;border-radius:16px;border:1px solid rgba(124,58,237,0.1)">
          <div style="display:inline-block;width:80px;height:80px;border-radius:50%;background:${scoreColor}15;border:3px solid ${scoreColor}30;line-height:74px;font-size:30px;font-weight:900;color:${scoreColor};margin-bottom:8px">${score ?? 0}</div>
          <p style="margin:0;color:${scoreColor};font-size:14px;font-weight:700">${scoreLabel}</p>
          <p style="margin:4px 0 0;color:#9CA3AF;font-size:12px">Overall score out of 100</p>
        </div>

        <!-- What's inside -->
        <p style="color:#374151;font-size:14px;font-weight:600;margin:0 0 12px">Your report includes:</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
          ${["6-pillar score breakdown (SEO, GEO, AEO, Performance & more)", "Keyword coverage analysis", "Health check (HTTPS, sitemap, robots.txt, Schema types)", "Prioritised list of issues to fix"].map(item => `
          <tr>
            <td style="padding:6px 0;vertical-align:top;width:20px">
              <div style="width:18px;height:18px;background:#7C3AED15;border-radius:50%;text-align:center;line-height:18px;font-size:11px;color:#7C3AED;font-weight:700">✓</div>
            </td>
            <td style="padding:6px 0 6px 8px;color:#374151;font-size:13px;line-height:1.5">${item}</td>
          </tr>`).join("")}
        </table>

        <!-- CTA Button -->
        <div style="text-align:center;margin-bottom:24px">
          <a href="${reportUrl}" style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#DB2777);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:14px;font-size:16px;font-weight:700;letter-spacing:0.01em;box-shadow:0 8px 24px rgba(124,58,237,0.3)">
            View My Full Report →
          </a>
        </div>

        <p style="text-align:center;color:#9CA3AF;font-size:12px;margin:0">
          This link expires in 7 days &nbsp;·&nbsp; <a href="${baseUrl}" style="color:#7C3AED;text-decoration:none">Run another audit</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background:#F9F8FF;padding:20px 40px;border-top:1px solid rgba(124,58,237,0.08);text-align:center">
        <p style="margin:0;color:#9CA3AF;font-size:12px">
          Sent by <strong style="color:#7C3AED">SiteScore</strong> by Yoom Digital &nbsp;·&nbsp;
          <a href="${baseUrl}" style="color:#9CA3AF;text-decoration:none">sitescore.app</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: cleanEmail,
      subject: `Your SiteScore report for ${domain} is ready`,
      html,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return NextResponse.json({ error: "Failed to send email. Please try again." }, { status: 500 });
    }
  } else {
    // Development fallback: log the link
    console.log(`[DEV] Report link for ${cleanEmail}: ${reportUrl}`);
  }

  return NextResponse.json({ success: true, email: cleanEmail });
}
