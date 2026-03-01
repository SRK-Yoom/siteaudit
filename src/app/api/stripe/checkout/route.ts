import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

const PRICE_MAP: Record<string, number> = {
  sitemap:       29,
  "meta-desc":   49,
  "org-schema":  79,
  "faq-schema":  99,
  "full-tech-seo": 299,
  "full-geo-aeo":  349,
};

const TITLE_MAP: Record<string, string> = {
  sitemap:         "Add XML Sitemap",
  "meta-desc":     "Write 5 Meta Descriptions",
  "org-schema":    "Organization Schema Setup",
  "faq-schema":    "FAQPage Schema (10 questions)",
  "full-tech-seo": "Full Technical SEO Fix",
  "full-geo-aeo":  "Full GEO + AEO Setup",
};

interface CartItem {
  id: string;
  quantity?: number;
}

export async function POST(req: NextRequest) {
  try {
    const { items, email, domain } = await req.json() as {
      items: CartItem[];
      email: string;
      domain: string;
    };

    if (!items?.length) {
      return NextResponse.json({ error: "No items in cart" }, { status: 400 });
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
      const price = PRICE_MAP[item.id];
      const title = TITLE_MAP[item.id];
      if (!price || !title) throw new Error(`Unknown item: ${item.id}`);
      return {
        price_data: {
          currency: "gbp",
          product_data: {
            name: title,
            metadata: { item_id: item.id, domain },
          },
          unit_amount: price * 100,
        },
        quantity: item.quantity ?? 1,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: email || undefined,
      metadata: { domain, email },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
