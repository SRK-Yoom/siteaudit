import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json() as { auditData: unknown; url: string; score: number };
    const { auditData, url, score } = body;

    if (!auditData || !url || score === undefined) {
      return NextResponse.json({ error: "Missing required fields: auditData, url, score" }, { status: 400 });
    }

    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

    const { error: insertError } = await supabase
      .from("share_tokens")
      .insert({
        token,
        url,
        score,
        audit_data: auditData,
        user_id: user.id,
      });

    if (insertError) {
      console.error("share_tokens insert error:", insertError);
      return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
    }

    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://sitescore.app";
    const shareUrl = `${origin}/s/${token}`;

    return NextResponse.json({ token, shareUrl });
  } catch (err) {
    console.error("share route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
