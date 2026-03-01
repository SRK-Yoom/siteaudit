"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, X, Plus, Minus, CheckCircle, Loader2,
  ChevronRight, Zap, FileText, Code, MessageSquare, Globe, Brain,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

// ── Item definitions ────────────────────────────────────────────────────────

export interface FixItem {
  id: string;
  title: string;
  price: number;
  description: string;
  icon: React.ElementType;
}

export const FIX_ITEMS: FixItem[] = [
  { id: "sitemap",        title: "Add XML Sitemap",              price: 29,  description: "We create and submit your sitemap to Google",        icon: Globe },
  { id: "meta-desc",      title: "Write 5 Meta Descriptions",    price: 49,  description: "Compelling meta descriptions for 5 key pages",       icon: FileText },
  { id: "org-schema",     title: "Organization Schema Setup",     price: 79,  description: "Complete Organization JSON-LD markup",               icon: Code },
  { id: "faq-schema",     title: "FAQPage Schema (10 questions)", price: 99,  description: "FAQ schema + question heading restructure",          icon: MessageSquare },
  { id: "full-tech-seo",  title: "Full Technical SEO Fix",        price: 299, description: "Fix all technical SEO issues in your audit",         icon: Zap },
  { id: "full-geo-aeo",   title: "Full GEO + AEO Setup",          price: 349, description: "Complete schema library + AEO content structure",   icon: Brain },
];

// ── Cart types ──────────────────────────────────────────────────────────────

type CartState = Record<string, number>;

// ── FixCart drawer component ────────────────────────────────────────────────

interface FixCartProps {
  domain?: string;
}

export function FixCart({ domain = "" }: FixCartProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [cart, setCart] = useState<CartState>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartItems = FIX_ITEMS.filter(item => (cart[item.id] ?? 0) > 0);
  const total = cartItems.reduce((sum, item) => sum + item.price * (cart[item.id] ?? 0), 0);

  const add = useCallback((id: string) => {
    setCart(prev => ({ ...prev, [id]: Math.min((prev[id] ?? 0) + 1, 10) }));
  }, []);

  const remove = useCallback((id: string) => {
    setCart(prev => {
      const next = { ...prev };
      if ((next[id] ?? 0) <= 1) delete next[id];
      else next[id]--;
      return next;
    });
  }, []);

  const handleCheckout = async () => {
    if (!cartItems.length) return;
    setLoading(true);
    setError(null);
    try {
      const items = cartItems.map(item => ({ id: item.id, quantity: cart[item.id] ?? 1 }));
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          email: user?.email ?? "",
          domain,
        }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Checkout failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative inline-flex items-center gap-2 bg-ai-gradient text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-glow-brand">
        <ShoppingCart className="w-4 h-4" />
        Fix Cart
        {cartCount > 0 && (
          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white text-brand text-xs font-black flex items-center justify-center shadow-sm">
            {cartCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            key="drawer"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] z-50 bg-white shadow-2xl flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#7C3AED,#DB2777)" }}>
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-ink">Fix Cart</h2>
                  <p className="text-xs text-ink-4">
                    {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? "s" : ""}` : "Pick what to fix"}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-ink-4 hover:text-ink-2 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest mb-2">
                Available Fixes
              </p>
              {FIX_ITEMS.map((item) => {
                const qty = cart[item.id] ?? 0;
                const Icon = item.icon;
                return (
                  <div key={item.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      qty > 0
                        ? "border-brand/30 bg-brand/5 shadow-sm"
                        : "border-gray-100 bg-white hover:border-brand/20"
                    }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        qty > 0 ? "bg-brand text-white" : "bg-gray-100 text-ink-3"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-ink leading-tight">{item.title}</p>
                            <p className="text-xs text-ink-3 mt-0.5 leading-snug">{item.description}</p>
                          </div>
                          <span className="text-sm font-black text-brand whitespace-nowrap shrink-0">
                            £{item.price}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          {qty === 0 ? (
                            <button onClick={() => add(item.id)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                              style={{ background: "linear-gradient(135deg,#7C3AED,#DB2777)", color: "white" }}>
                              <Plus className="w-3 h-3" />Add to Cart
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button onClick={() => remove(item.id)}
                                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                                <Minus className="w-3.5 h-3.5 text-ink-2" />
                              </button>
                              <span className="text-sm font-bold text-ink w-4 text-center">{qty}</span>
                              <button onClick={() => add(item.id)}
                                className="w-7 h-7 rounded-lg bg-brand hover:bg-brand-dark flex items-center justify-center transition-colors">
                                <Plus className="w-3.5 h-3.5 text-white" />
                              </button>
                              <span className="text-xs text-ink-4 ml-1">in cart</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer — summary + checkout */}
            <div className="border-t border-gray-100 px-6 py-5 space-y-4 bg-white">
              {cartItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest">Order Summary</p>
                  {cartItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-ink-2 truncate mr-4">
                        {item.title}
                        {(cart[item.id] ?? 0) > 1 && <span className="text-ink-4"> x{cart[item.id]}</span>}
                      </span>
                      <span className="font-semibold text-ink shrink-0">
                        £{item.price * (cart[item.id] ?? 0)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-sm font-bold text-ink">Total</span>
                    <span className="text-lg font-black text-brand">£{total}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                  {error}
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={cartItems.length === 0 || loading}
                className="w-full inline-flex items-center justify-center gap-2 btn-gradient py-3.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Redirecting to checkout…</>
                ) : (
                  <>
                    {cartItems.length === 0 ? (
                      "Add items to checkout"
                    ) : (
                      <><CheckCircle className="w-4 h-4" />Checkout — £{total} <ChevronRight className="w-4 h-4" /></>
                    )}
                  </>
                )}
              </button>

              <p className="text-xs text-center text-ink-4">
                Secure payment via Stripe. Delivery within 7 business days.
              </p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
