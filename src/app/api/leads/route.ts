import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { email, url, score } = await req.json() as { email: string; url?: string; score?: number };

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const { error } = await supabase.from("leads").upsert(
    { email: email.toLowerCase().trim(), url, score, updated_at: new Date().toISOString() },
    { onConflict: "email" }
  );

  if (error) {
    // If table doesn't exist yet, still succeed silently
    console.error("Lead save error:", error.message);
  }

  return NextResponse.json({ success: true });
}
