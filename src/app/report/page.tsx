import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportContent } from "./ReportContent";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ token?: string }> }): Promise<Metadata> {
  const { token } = await searchParams;
  if (!token) return { title: "Report not found — SiteScore" };
  return {
    title: "Your Website Audit Report — SiteScore",
    description: "View your full SEO, GEO & AEO audit report with score breakdown and prioritised fixes.",
    robots: { index: false, follow: false },
  };
}

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) return notFound();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("report_tokens")
    .select("token, email, url, domain, score, audit_data, created_at, expires_at, viewed_at")
    .eq("token", token)
    .single();

  if (error || !data) return notFound();

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-ink mb-2">This report link has expired</h1>
          <p className="text-ink-3 text-sm mb-6">Report links are valid for 7 days. Run a fresh audit to get a new report.</p>
          <a href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>
            Run a New Audit →
          </a>
        </div>
      </div>
    );
  }

  // Mark as viewed (fire-and-forget)
  if (!data.viewed_at) {
    supabase.from("report_tokens")
      .update({ viewed_at: new Date().toISOString() })
      .eq("token", token)
      .then(() => {});
  }

  return (
    <ReportContent
      auditData={data.audit_data}
      email={data.email}
      url={data.url ?? ""}
      token={token}
    />
  );
}
