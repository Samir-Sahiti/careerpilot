"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Check your email to confirm your account!");
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div 
        className="w-full max-w-md p-8 rounded-xl"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            Create an Account
          </h1>
          <p className="text-sm mt-2" style={{ color: "#94A3B8" }}>
            Start your journey with CareerPilot
          </p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-5">
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
            <label className="auth-label" htmlFor="password">Password</label>
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

          <div>
            <label className="auth-label" htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              required
              className="auth-input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn-primary mt-2"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm" style={{ color: "#94A3B8" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--accent)" }} className="hover:underline transition-colors">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
