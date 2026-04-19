"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2, Check } from "lucide-react";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    setLoading(false);
    if (error) {
      // Generic message — don't confirm whether email exists
      toast.error("Something went wrong. Try again in a moment.");
      return;
    }
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <span className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Career<span className="text-blue-500">Pilot</span>
          </span>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] p-7 space-y-5">
          {sent ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <p className="font-semibold text-white">Check your inbox</p>
              <p className="text-sm text-gray-400">
                If <span className="text-white">{email}</span> has an account, we sent a reset link.
              </p>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:underline mt-2">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to login
              </Link>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-lg font-bold text-white">Reset your password</h1>
                <p className="text-sm text-gray-400 mt-1">
                  Enter your email and we&apos;ll send a reset link.
                </p>
              </div>

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="auth-label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    className="auth-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Send reset link
                </button>
              </form>

              <Link
                href="/login"
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
