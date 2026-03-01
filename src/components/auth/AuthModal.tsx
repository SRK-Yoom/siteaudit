"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, ArrowRight, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: Mode;
  onSuccess?: () => void;
  headline?: string;
  subheadline?: string;
}

export function AuthModal({ isOpen, onClose, initialMode = "signup", onSuccess, headline, subheadline }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const supabase = createClient();

  const reset = () => { setEmail(""); setPassword(""); setFullName(""); setError(null); setDone(false); setLoading(false); };
  const switchMode = (m: Mode) => { setMode(m); reset(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (err) { setError(err.message); setLoading(false); return; }
      setDone(true); setLoading(false); onSuccess?.();
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      setLoading(false); onSuccess?.(); onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />

          <motion.div
            className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl"
            style={{ boxShadow: "0 24px 80px rgba(124,58,237,0.18), 0 4px 16px rgba(0,0,0,0.08)" }}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25 }}
          >
            <button onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-ink-3" />
            </button>

            {done ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-ink mb-2">Check your inbox</h3>
                <p className="text-ink-3 text-sm leading-relaxed">
                  Confirmation link sent to <span className="text-ink font-medium">{email}</span>.
                  Click it to activate your account.
                </p>
                <p className="text-ink-4 text-xs mt-4">
                  Already confirmed?{" "}
                  <button className="text-brand hover:text-brand-dark underline" onClick={() => switchMode("signin")}>Sign in</button>
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  {/* Gradient pill */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-3"
                    style={{ background: "rgba(124,58,237,0.08)", color: "#7C3AED", border: "1px solid rgba(124,58,237,0.15)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                    {mode === "signup" ? "Free account — no credit card" : "Welcome back"}
                  </div>
                  <h2 className="text-xl font-bold text-ink">
                    {headline ?? (mode === "signup" ? "Create your free account" : "Sign in to your account")}
                  </h2>
                  {(subheadline || mode === "signup") && (
                    <p className="text-ink-3 text-sm mt-1">
                      {subheadline ?? "Track your score, see full recommendations & monitor progress."}
                    </p>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                  {(["signup", "signin"] as Mode[]).map(m => (
                    <button key={m} onClick={() => switchMode(m)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === m ? "bg-white text-ink shadow-sm" : "text-ink-3 hover:text-ink-2"}`}>
                      {m === "signup" ? "Sign Up" : "Sign In"}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "signup" && (
                    <div>
                      <label className="block text-xs font-semibold text-ink-3 mb-1.5">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4" />
                        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                          placeholder="Your name" required
                          className="input-field w-full pl-10 pr-4 py-3 text-sm" />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-ink-3 mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4" />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="you@company.com" required
                        className="input-field w-full pl-10 pr-4 py-3 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-3 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4" />
                      <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                        placeholder={mode === "signup" ? "Min 8 characters" : "Your password"}
                        required minLength={mode === "signup" ? 8 : 1}
                        className="input-field w-full pl-10 pr-11 py-3 text-sm" />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-3 transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-xs text-red-600">{error}</p>
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="btn-gradient w-full flex items-center justify-center gap-2 py-3.5 text-sm">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" />
                      : mode === "signup"
                        ? <><span>Create Free Account</span><ArrowRight className="w-4 h-4" /></>
                        : <span>Sign In</span>}
                  </button>
                </form>

                {mode === "signin" && (
                  <p className="text-center text-xs text-ink-4 mt-4">
                    Don&apos;t have an account?{" "}
                    <button onClick={() => switchMode("signup")} className="text-brand hover:text-brand-dark underline underline-offset-2">Sign up free</button>
                  </p>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
