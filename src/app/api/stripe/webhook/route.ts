import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";

export const runtime = "nodejs";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const { domain, email } = session.metadata ?? {};
    const customerEmail = session.customer_email ?? email ?? "unknown";
    const amountPaid = session.amount_total ? (session.amount_total / 100).toFixed(2) : "0.00";
    const currency = (session.currency ?? "gbp").toUpperCase();

    // Retrieve line items for the notification email
    let lineItemsSummary = "";
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      lineItemsSummary = lineItems.data
        .map(item => `• ${item.description ?? item.price?.product ?? "Item"} x${item.quantity}`)
        .join("\n");
    } catch {
      lineItemsSummary = "Could not retrieve line items";
    }

    // Send notification email
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "SiteScore <onboarding@resend.dev>",
        to: "rohit@yoom.digital",
        subject: `New Fix Cart Order - ${domain ?? "Unknown site"} - ${currency} ${amountPaid}`,
        text: [
          "NEW FIX CART ORDER",
          "",
          `Session ID: ${session.id}`,
          `Customer: ${customerEmail}`,
          `Domain: ${domain ?? "N/A"}`,
          `Amount: ${currency} ${amountPaid}`,
          "",
          "Items ordered:",
          lineItemsSummary,
          "",
          "Log in to Stripe to view the full order.",
        ].join("\n"),
      });
    } catch (emailErr) {
      console.error("Failed to send order notification email:", emailErr);
    }

    console.log(`Order completed: session=${session.id} domain=${domain} amount=${amountPaid}`);
  }

  return NextResponse.json({ received: true });
}
