import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { email, auditData } = body as {
    email?: string;
    auditData: { url: string; score: number; [key: string]: unknown };
  };

  if (!auditData?.url) {
    return NextResponse.json({ error: "Missing audit data" }, { status: 400 });
  }

  let domain: string;
  try {
    domain = new URL(auditData.url).hostname;
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const token = crypto.randomUUID();

  const { error } = await supabase.from("report_tokens").insert({
    token,
    email: email || "pending@signup",
    url: auditData.url,
    domain,
    score: auditData.score,
    audit_data: auditData,
  });

  if (error) {
    console.error("report_tokens insert error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ token });
}
