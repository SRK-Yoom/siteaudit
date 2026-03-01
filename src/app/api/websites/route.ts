import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RawAudit {
  overall_score: number;
  created_at: string;
}

interface RawWebsite {
  id: string;
  url: string;
  domain: string;
  created_at: string;
  audits: RawAudit[];
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: websitesRaw, error } = await supabase
    .from("websites")
    .select("id, url, domain, created_at, audits(overall_score, created_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Websites fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch websites" }, { status: 500 });
  }

  const websites = (websitesRaw as RawWebsite[] ?? []).map((w) => {
    const audits = w.audits ?? [];
    const sorted = [...audits].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const latest = sorted[0];
    return {
      id: w.id,
      url: w.url,
      domain: w.domain,
      created_at: w.created_at,
      latest_score: latest?.overall_score ?? null,
      latest_audit_at: latest?.created_at ?? null,
      audit_count: audits.length,
    };
  });

  return NextResponse.json({ websites });
}
