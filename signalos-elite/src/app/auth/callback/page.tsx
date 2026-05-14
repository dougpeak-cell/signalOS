"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const DEFAULT_AUTH_REDIRECT = "/settings/sigi#profile";

function getSafeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return value;
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const finishAuth = async () => {
      const code = searchParams.get("code");
      const nextPath = getSafeNextPath(searchParams.get("next"));
      const returnedError = searchParams.get("error_description") ?? searchParams.get("error");

      if (returnedError) {
        if (!cancelled) {
          setError(returnedError);
        }
        return;
      }

      if (!code) {
        if (!cancelled) {
          setError("Missing sign-in code.");
        }
        return;
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (cancelled) {
        return;
      }

      if (exchangeError) {
        setError(exchangeError.message);
        return;
      }

      router.replace(nextPath);
      router.refresh();
    };

    void finishAuth();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams, supabase.auth]);

  return (
    <CallbackShell error={error} />
  );
}

function CallbackShell({ error = null }: { error?: string | null }) {
  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-xl rounded-4xl border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(8,15,24,0.99),rgba(5,8,14,0.99))] p-6 shadow-[0_0_0_1px_rgba(34,211,238,0.06),0_20px_48px_rgba(0,0,0,0.28)] md:p-8">
        <h1 className="text-3xl font-semibold tracking-[0.01em] text-white md:text-4xl">
          Finishing secure sign-in.
        </h1>

        <p className="mt-4 text-base leading-7 text-white/72">
          We are connecting your SignalOS account and sending you back to checkout.
        </p>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
            Redirecting you now.
          </div>
        )}
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackShell />}>
      <AuthCallbackContent />
    </Suspense>
  );
}