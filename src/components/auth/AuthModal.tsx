"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: Mode;
  /** Called after successful auth, with pending audit data if any */
  onSuccess?: () => void;
  /** Message shown above the form — e.g. "Save your audit report" */
  headline?: string;
  subheadline?: string;
}

export function AuthModal({
  isOpen,
  onClose,
  initialMode = "signup",
  onSuccess,
  headline,
  subheadline,
}: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const supabase = createClient();

  const reset = () => {
    setEmail(""); setPassword(""); setFullName("");
    setError(null); setDone(false); setLoading(false);
  };

  const switchMode = (m: Mode) => { setMode(m); reset(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (err) { setError(err.message); setLoading(false); return; }
      setDone(true);
      setLoading(false);
      onSuccess?.();
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      setLoading(false);
      onSuccess?.();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md glass-card rounded-3xl p-8 border border-white/10 shadow-2xl"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25 }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>

            {done ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Check your inbox</h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  We sent a confirmation link to <span className="text-white/80 font-medium">{email}</span>.
                  Click it to activate your account and access your dashboard.
                </p>
                <p className="text-white/30 text-xs mt-4">Already confirmed? <button className="text-brand-light hover:text-white transition-colors underline" onClick={() => switchMode("signin")}>Sign in</button></p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="mb-6">
                  {headline ? (
                    <>
                      <div className="inline-flex items-center gap-2 bg-brand/15 border border-brand/25 text-brand-light text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
                        <span className="w-1.5 h-1.5 bg-brand-light rounded-full" />
                        {mode === "signup" ? "Create free account" : "Welcome back"}
                      </div>
                      <h2 className="text-xl font-bold text-white">{headline}</h2>
                      {subheadline && <p className="text-white/40 text-sm mt-1">{subheadline}</p>}
                    </>
                  ) : (
                    <h2 className="text-xl font-bold text-white">
                      {mode === "signup" ? "Create your free account" : "Welcome back"}
                    </h2>
                  )}
                </div>

                {/* Mode tabs */}
                <div className="flex bg-white/5 rounded-xl p-1 mb-6">
                  {(["signup", "signin"] as Mode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => switchMode(m)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === m ? "bg-brand text-white" : "text-white/40 hover:text-white/70"}`}
                    >
                      {m === "signup" ? "Sign Up" : "Sign In"}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "signup" && (
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Your name"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/30 transition-colors"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/30 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={mode === "signup" ? "Min 8 characters" : "Your password"}
                        required
                        minLength={mode === "signup" ? 8 : 1}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/30 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-xs text-red-300">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
                  >
                    {loading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : mode === "signup"
                        ? <><span>Create Free Account</span><ArrowRight className="w-4 h-4" /></>
                        : <span>Sign In</span>
                    }
                  </button>
                </form>

                {mode === "signin" && (
                  <p className="text-center text-xs text-white/30 mt-4">
                    Don&apos;t have an account?{" "}
                    <button onClick={() => switchMode("signup")} className="text-brand-light hover:text-white transition-colors underline underline-offset-2">
                      Sign up free
                    </button>
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
