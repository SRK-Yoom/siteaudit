import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { auditData } = body as { auditData: { url: string; score: number; [key: string]: unknown } };

  if (!auditData?.url) {
    return NextResponse.json({ error: "Missing audit data" }, { status: 400 });
  }

  let domain: string;
  try {
    domain = new URL(auditData.url).hostname;
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Upsert website record
  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .upsert({ user_id: user.id, url: auditData.url, domain }, { onConflict: "user_id,domain" })
    .select("id")
    .single();

  if (websiteError) {
    console.error("Website upsert error:", websiteError);
    return NextResponse.json({ error: "Failed to save website" }, { status: 500 });
  }

  // Insert audit record
  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .insert({
      user_id: user.id,
      website_id: website.id,
      url: auditData.url,
      overall_score: auditData.score,
      data: auditData,
    })
    .select("id")
    .single();

  if (auditError) {
    console.error("Audit insert error:", auditError);
    return NextResponse.json({ error: "Failed to save audit" }, { status: 500 });
  }

  return NextResponse.json({ success: true, auditId: audit.id });
}
