import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

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

// Subscription plans — direct checkout
const PLANS: Record<string, { amount: number; name: string; description: string }> = {
  starter:   { amount: 99,  name: "Starter — Unlock all report details", description: "Full how-to guides; you implement yourself." },
  growth:    { amount: 999, name: "Growth — We fix it for you",         description: "Full technical + GEO/AEO fix, 30-day check-in." },
  authority: { amount: 1999, name: "Authority — Full service",         description: "Strategy, content brief, link building, 90-day support." },
};

interface CartItem {
  id: string;
  quantity?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      plan?: keyof typeof PLANS;
      items?: CartItem[];
      email?: string;
      domain?: string;
    };

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://siteaudit-rho.vercel.app";

    // Plan checkout (single payment)
    if (body.plan && PLANS[body.plan]) {
      const plan = PLANS[body.plan];
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "gbp",
            product_data: {
              name: plan.name,
              description: plan.description,
              metadata: { plan: body.plan },
            },
            unit_amount: plan.amount * 100,
          },
          quantity: 1,
        }],
        mode: "payment",
        customer_email: body.email || undefined,
        metadata: { plan: body.plan, domain: body.domain || "", email: body.email || "" },
        success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/dashboard`,
      });
      return NextResponse.json({ url: session.url });
    }

    // Cart (legacy fix-cart items)
    const { items, email, domain } = body;
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
            metadata: { item_id: item.id, domain: domain || "" },
          },
          unit_amount: price * 100,
        },
        quantity: item.quantity ?? 1,
      };
    });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: email || undefined,
      metadata: { domain: domain || "", email: email || "" },
      success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
