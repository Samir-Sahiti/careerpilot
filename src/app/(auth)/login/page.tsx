"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Always show generic error for security
      toast.error("Invalid email or password");
      setLoading(false);
      return;
    }

    toast.success("Welcome back!");
    router.push("/dashboard");
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
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Welcome Back
          </h1>
          <p className="text-sm mt-2" style={{ color: "#94A3B8" }}>
            Log in to CareerPilot to continue
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="auth-label" htmlFor="email">
              Email
            </label>
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
            <label className="auth-label" htmlFor="password">
              Password
            </label>
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

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm" style={{ color: "#94A3B8" }}>
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            style={{ color: "var(--accent)" }}
            className="hover:underline transition-colors"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
