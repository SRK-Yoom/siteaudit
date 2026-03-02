import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_tokens")
    .select("audit_data, url, score")
    .eq("token", token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  return NextResponse.json({ auditData: data.audit_data });
}
