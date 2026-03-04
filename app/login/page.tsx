"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signInError) setError(signInError.message);
    else setSent(true);
    
    setLoading(false);
  }

  return (
    <main className="grid" style={{ maxWidth: 480 }}>
      <h1>Log in</h1>

      <div className="card grid">
        <form onSubmit={handleLogin} className="grid">
          <label htmlFor="email" className="muted2">Email address</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />
          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send magic link"}
          </button>
        </form>

        {sent && (
          <div className="muted">
            Check your email and click the link to finish logging in.
          </div>
        )}

        {error && <div style={{ color: "crimson" }}>{error}</div>}
      </div>

      <div className="muted2" style={{ fontSize: 12 }}>
        Make sure Supabase → Authentication → URL Configuration includes
        <br />
        <code>http://localhost:3000</code>
      </div>
    </main>
  );
}
