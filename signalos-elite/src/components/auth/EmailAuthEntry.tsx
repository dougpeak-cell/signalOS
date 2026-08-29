"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import {
  createSupabaseBrowserClient,
  hasSupabaseBrowserEnv,
} from "@/lib/supabase/browser";

type EmailAuthEntryProps = {
  badgeLabel: string;
  title: string;
  description: string;
  successMessage: string;
  footerMessage: string;
  backHref: string;
  backLabel: string;
  defaultNextPath: string;
};

type EmailAuthShellProps = EmailAuthEntryProps & {
  callbackError: string | null;
  email: string;
  error: string | null;
  isCheckingSession: boolean;
  isSubmitting: boolean;
  message: string | null;
  onEmailChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

type UpgradePlan = "smart" | "pro";

const SESSION_CHECK_TIMEOUT_MS = 8_000;

function getSafePlan(value: string | null): UpgradePlan | null {
  return value === "smart" || value === "pro" ? value : null;
}

function getSafeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

function getCheckoutPathForPlan(plan: UpgradePlan, returnTo: string | null): string {
  const checkoutParams = new URLSearchParams({ plan });

  if (returnTo) {
    checkoutParams.set("returnTo", returnTo);
  }

  return `/api/stripe/checkout?${checkoutParams.toString()}`;
}

function getSafeNextPath(value: string | null, fallbackPath: string): string {
  if (!value || !value.startsWith("/")) {
    return fallbackPath;
  }

  return value;
}

function EmailAuthContent(props: EmailAuthEntryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(
    () => (hasSupabaseBrowserEnv() ? createSupabaseBrowserClient() : null),
    []
  );
  const plan = getSafePlan(searchParams.get("plan"));
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
  const callbackError = searchParams.get("error_description") ?? searchParams.get("error");
  const nextPath = getSafeNextPath(
    searchParams.get("next"),
    plan ? getCheckoutPathForPlan(plan, returnTo) : props.defaultNextPath
  );

  const [email, setEmail] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setIsCheckingSession(false);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setIsCheckingSession(false);
      }
    }, SESSION_CHECK_TIMEOUT_MS);

    const syncSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) {
          return;
        }

        if (session) {
          router.replace(nextPath);
          router.refresh();
        }
      } catch {
        if (!cancelled) {
          setError("Account status could not be checked. You can still continue with email.");
        }
      } finally {
        window.clearTimeout(timeout);
        if (!cancelled) {
          setIsCheckingSession(false);
        }
      }
    };

    void syncSession();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [nextPath, router, supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter your email to continue.");
      return;
    }

    if (!supabase) {
      setError("Sign-in is temporarily unavailable right now.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const redirectTarget = new URL(nextPath, window.location.origin);

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: redirectTarget.toString(),
        },
      });

      if (signInError) {
        throw signInError;
      }

      setMessage(props.successMessage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start sign-in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <EmailAuthShell
      {...props}
      callbackError={callbackError}
      email={email}
      error={error}
      isCheckingSession={isCheckingSession}
      isSubmitting={isSubmitting}
      message={message}
      onEmailChange={setEmail}
      onSubmit={handleSubmit}
    />
  );
}

function EmailAuthShell({
  badgeLabel,
  title,
  description,
  successMessage,
  footerMessage,
  backHref,
  backLabel,
  callbackError,
  email,
  error,
  isCheckingSession,
  isSubmitting,
  message,
  onEmailChange,
  onSubmit,
}: EmailAuthShellProps) {
  void successMessage;

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-xl rounded-4xl border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(8,15,24,0.99),rgba(5,8,14,0.99))] p-6 shadow-[0_0_0_1px_rgba(34,211,238,0.06),0_20px_48px_rgba(0,0,0,0.28)] md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-400/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/78">
          <Lock className="h-3.5 w-3.5 text-cyan-200" />
          <span>{badgeLabel}</span>
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-[0.01em] text-white md:text-4xl">
          {title}
        </h1>

        <p className="mt-4 text-base leading-7 text-white/72">{description}</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <div className="mb-2 text-sm font-medium text-cyan-100/82">Email address</div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <Mail className="h-4 w-4 text-cyan-300" />
              <input
                type="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                disabled={isSubmitting || isCheckingSession}
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={isSubmitting || isCheckingSession}
            className="w-full rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCheckingSession
              ? "Checking account"
              : isSubmitting
                ? "Sending secure link"
                : "Continue with Email"}
          </button>
        </form>

        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            {message}
          </div>
        ) : null}

        {error ?? callbackError ? (
          <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error ?? callbackError}
          </div>
        ) : null}

        <div className="mt-6 text-sm text-white/58">{footerMessage}</div>

        <div className="mt-8">
          <Link
            href={backHref}
            className="inline-flex rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function EmailAuthEntry(props: EmailAuthEntryProps) {
  return (
    <Suspense
      fallback={
        <EmailAuthShell
          {...props}
          callbackError={null}
          email=""
          error={null}
          isCheckingSession={true}
          isSubmitting={false}
          message={null}
          onEmailChange={() => undefined}
          onSubmit={(event) => event.preventDefault()}
        />
      }
    >
      <EmailAuthContent {...props} />
    </Suspense>
  );
}