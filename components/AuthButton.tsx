"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthButton() {
  const supabase = createSupabaseBrowserClient();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <span className="muted2">…</span>;
  if (!signedIn) return <Link href="/login">Log in</Link>;

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
      }}
    >
      Log out
    </button>
  );
}
