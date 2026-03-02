"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, ArrowRight, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

interface AuditMeta {
  score?: number;
  domain?: string;
  pillarSummary?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: Mode;
  onSuccess?: () => void;
  onBeforeOAuth?: () => void;
  onCloseAfterEmailSent?: (email: string) => void;
  /** Audit metadata to embed in user_metadata so the confirmation email template can show a report teaser */
  auditMeta?: AuditMeta;
  /** Report token for the pending audit — used to redirect confirmation to dashboard with the report */
  reportToken?: string | null;
  headline?: string;
  subheadline?: string;
}

export function AuthModal({ isOpen, onClose, initialMode = "signup", onSuccess, onBeforeOAuth, onCloseAfterEmailSent, auditMeta, reportToken, headline, subheadline }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const supabase = createClient();

  const reset = () => { setEmail(""); setPassword(""); setFullName(""); setError(null); setDone(false); setLoading(false); setOauthLoading(null); };
  const switchMode = (m: Mode) => { setMode(m); reset(); };

  const handleOAuth = async (provider: "google" | "apple") => {
    setError(null);
    setOauthLoading(provider);
    onBeforeOAuth?.();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectNext = reportToken ? `/dashboard?report_token=${reportToken}` : "/dashboard";
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectNext)}` },
    });
    if (err) {
      setError(err.message);
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    if (mode === "signup") {
      const redirectNext = reportToken ? `/dashboard?report_token=${reportToken}` : "/dashboard";
      const { error: err } = await supabase.auth.signUp({
        email, password,
        options: {
          data: {
            full_name: fullName,
            ...(auditMeta?.score != null && { audit_score: auditMeta.score }),
            ...(auditMeta?.domain && { audit_domain: auditMeta.domain }),
            ...(auditMeta?.pillarSummary && { audit_pillar_summary: auditMeta.pillarSummary }),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectNext)}`,
        },
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
          <motion.div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => { if (done) onCloseAfterEmailSent?.(email); onClose(); }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />

          <motion.div
            className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl"
            style={{ boxShadow: "0 24px 80px rgba(124,58,237,0.18), 0 4px 16px rgba(0,0,0,0.08)" }}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25 }}
          >
            <button onClick={() => { if (done) onCloseAfterEmailSent?.(email); onClose(); }}
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
                <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
                  {(["signup", "signin"] as Mode[]).map(m => (
                    <button key={m} onClick={() => switchMode(m)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === m ? "bg-white text-ink shadow-sm" : "text-ink-3 hover:text-ink-2"}`}>
                      {m === "signup" ? "Sign Up" : "Sign In"}
                    </button>
                  ))}
                </div>

                {/* Social login */}
                <div className="flex gap-2 mb-4">
                  <button type="button" onClick={() => handleOAuth("google")} disabled={!!oauthLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-ink-2 transition-colors disabled:opacity-50">
                    {oauthLoading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    )}
                    Google
                  </button>
                  <button type="button" onClick={() => handleOAuth("apple")} disabled={!!oauthLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-ink-2 transition-colors disabled:opacity-50">
                    {oauthLoading === "apple" ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c1.32-1.58 1.14-3.94-.08-5.31-1.36-1.46-3.52-1.76-5.27-1.04 0 0-1.46.6-3.76 2.02 0 0 2.14 2.87 4.11 4.33z"/></svg>
                    )}
                    Apple
                  </button>
                </div>
                <p className="text-center text-xs text-ink-4 mb-4">Or continue with email</p>

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
