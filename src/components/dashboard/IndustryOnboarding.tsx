"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2, ArrowRight } from "lucide-react";

export const INDUSTRIES = [
  { key: "ecommerce",              label: "E-commerce",             emoji: "🛒" },
  { key: "saas",                   label: "SaaS / Software",        emoji: "💻" },
  { key: "real_estate",            label: "Real Estate",            emoji: "🏠" },
  { key: "professional_services",  label: "Professional Services",  emoji: "💼" },
  { key: "healthcare",             label: "Healthcare",             emoji: "🏥" },
  { key: "financial",              label: "Financial Services",     emoji: "💰" },
  { key: "hospitality",            label: "Hospitality",            emoji: "🏨" },
  { key: "education",              label: "Education",              emoji: "🎓" },
  { key: "media",                  label: "Media / Publishing",     emoji: "📰" },
  { key: "local_business",         label: "Local Business",         emoji: "📍" },
  { key: "nonprofit",              label: "Non-Profit",             emoji: "❤️" },
  { key: "recruitment",            label: "Recruitment",            emoji: "👥" },
  { key: "legal",                  label: "Legal",                  emoji: "⚖️" },
  { key: "fitness",                label: "Fitness & Wellness",     emoji: "💪" },
  { key: "manufacturing",          label: "B2B Manufacturing",      emoji: "🏭" },
] as const;

export type IndustryKey = typeof INDUSTRIES[number]["key"];

interface Props {
  isOpen: boolean;
  onComplete: (industry: IndustryKey) => void;
}

export function IndustryOnboarding({ isOpen, onComplete }: Props) {
  const [selected, setSelected] = useState<IndustryKey | null>(null);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry: selected }),
      });
      onComplete(selected);
    } catch {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: 32, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-6" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(219,39,119,0.04))", borderBottom: "1px solid rgba(124,58,237,0.1)" }}>
              <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-4"
                style={{ background: "rgba(124,58,237,0.08)", color: "#7C3AED", border: "1px solid rgba(124,58,237,0.15)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                One quick question
              </div>
              <h2 className="text-2xl font-black text-ink">What type of business is your site?</h2>
              <p className="text-ink-3 text-sm mt-1.5">
                This unlocks industry-specific benchmarks, competitor comparisons, and conversion scoring tailored to your vertical.
              </p>
            </div>

            {/* Industry grid */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {INDUSTRIES.map(({ key, label, emoji }) => (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                      selected === key
                        ? "border-brand bg-brand/5 shadow-sm"
                        : "border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white"
                    }`}
                  >
                    {selected === key && (
                      <div className="absolute top-1.5 right-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-brand" />
                      </div>
                    )}
                    <span className="text-2xl">{emoji}</span>
                    <span className={`text-xs font-semibold leading-tight ${selected === key ? "text-brand" : "text-ink-2"}`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-between gap-4">
              <p className="text-xs text-ink-4">You can change this anytime in Settings.</p>
              <button
                onClick={handleConfirm}
                disabled={!selected || saving}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
