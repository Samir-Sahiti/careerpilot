"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

// ── OAuth provider SVGs ───────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}


export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"oauth" | "magic" | "password">("oauth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const handleOAuth = async (provider: "google") => {
    setLoading(provider);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("magic");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(null);
    if (error) { toast.error("Couldn't send link — check the email address."); return; }
    setMagicSent(true);
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("password");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(null);
    if (error) { toast.error("Invalid email or password"); return; }
    toast.success("Welcome back!");
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <span className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Career<span className="text-amber-500">OS</span>
          </span>
          <p className="text-sm text-gray-400 mt-2">Welcome back</p>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] p-7 space-y-5">
          {/* OAuth buttons */}
          <button
            onClick={() => handleOAuth("google")}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border-subtle)] bg-white/5 hover:bg-white/10 text-sm font-medium text-gray-200 transition-colors disabled:opacity-50"
          >
            {loading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border-subtle)]" />
            <span className="text-xs text-gray-500">or</span>
            <div className="flex-1 h-px bg-[var(--border-subtle)]" />
          </div>

          {/* Magic link */}
          {mode !== "password" && (
            <>
              {magicSent ? (
                <div className="text-center py-4 space-y-2">
                  <p className="text-sm font-medium text-white">Check your inbox</p>
                  <p className="text-xs text-gray-400">We sent a sign-in link to <span className="text-white">{email}</span>.</p>
                  <button onClick={() => { setMagicSent(false); setEmail(""); }} className="text-xs text-amber-400 hover:underline mt-2">
                    Use a different email
                  </button>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-3">
                  <input
                    type="email"
                    required
                    className="auth-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={loading !== null}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {loading === "magic" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Send sign-in link
                  </button>
                </form>
              )}

              <button
                onClick={() => setMode("password")}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Use a password instead →
              </button>
            </>
          )}

          {/* Password fallback */}
          {mode === "password" && (
            <form onSubmit={handlePassword} className="space-y-4">
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
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="auth-label" htmlFor="password">Password</label>
                  <Link href="/forgot-password" className="text-xs text-amber-400 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  className="auth-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading !== null}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
              >
                {loading === "password" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Log In
              </button>
              <button
                type="button"
                onClick={() => setMode("oauth")}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                ← Back to sign-in options
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500">
          No account?{" "}
          <Link href="/signup" className="text-amber-400 hover:underline">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
