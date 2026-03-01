"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle, Clock, Mail, ArrowRight, Home, LayoutDashboard } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 py-16">
      <div className="orb w-96 h-96 opacity-15 fixed top-0 left-1/2 -translate-x-1/2"
        style={{ background: "radial-gradient(circle, #7C3AED, transparent)" }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={visible ? { opacity: 1, scale: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md text-center">

        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={visible ? { scale: 1 } : {}}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
          className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>
          <CheckCircle className="w-10 h-10 text-white" />
        </motion.div>

        <h1 className="text-3xl font-black text-ink mb-2">Order Confirmed!</h1>
        <p className="text-base text-ink-3 mb-8">
          Thank you for your order. We have received your payment and will get to work right away.
        </p>

        {/* Info cards */}
        <div className="space-y-3 mb-8">
          <div className="card rounded-2xl p-4 flex items-start gap-4 text-left">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.1),rgba(219,39,119,0.06))" }}>
              <Clock className="w-5 h-5 text-brand" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Delivery within 7 business days</p>
              <p className="text-xs text-ink-3 mt-0.5">
                Our team will complete your order and deliver it via email. Most orders are done faster.
              </p>
            </div>
          </div>

          <div className="card rounded-2xl p-4 flex items-start gap-4 text-left">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.1),rgba(219,39,119,0.06))" }}>
              <Mail className="w-5 h-5 text-brand" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Check your inbox</p>
              <p className="text-xs text-ink-3 mt-0.5">
                A confirmation has been sent to your email address. We will be in touch with your deliverables.
              </p>
            </div>
          </div>
        </div>

        {sessionId && (
          <p className="text-xs text-ink-4 mb-6 font-mono">
            Order ref: {sessionId.slice(0, 24)}...
          </p>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 btn-gradient px-5 py-3 text-sm">
            <LayoutDashboard className="w-4 h-4" />Go to Dashboard
          </Link>
          <Link href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-ink-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors">
            <Home className="w-4 h-4" />Back to Home
          </Link>
        </div>

        {/* What happens next */}
        <div className="mt-8 card rounded-2xl p-5 text-left">
          <h3 className="text-xs font-bold text-ink uppercase tracking-widest mb-3">What happens next</h3>
          <ol className="space-y-2">
            {[
              "Our team reviews your order and domain",
              "We implement the changes on your site or send files",
              "You receive an email with everything completed",
              "We validate in Google Search Console where applicable",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-ink-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                  style={{ background: "linear-gradient(135deg,#7C3AED,#DB2777)" }}>{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-6 text-xs text-ink-4">
          Questions? Email us at{" "}
          <a href="mailto:rohit@yoom.digital" className="text-brand hover:text-brand-dark transition-colors underline underline-offset-2">
            rohit@yoom.digital
          </a>
        </p>
      </motion.div>

      <Link href="/"
        className="relative z-10 mt-8 inline-flex items-center gap-1.5 text-xs text-ink-4 hover:text-ink-3 transition-colors">
        <ArrowRight className="w-3.5 h-3.5 rotate-180" />Back to SiteScore
      </Link>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-brand animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
