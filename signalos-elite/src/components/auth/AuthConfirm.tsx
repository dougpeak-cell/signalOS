"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { LoaderCircle } from "lucide-react";
import {
  createSupabaseBrowserClient,
  hasSupabaseBrowserEnv,
} from "@/lib/supabase/browser";

const AUTH_CONFIRM_TIMEOUT_MS = 15_000;
const DEFAULT_AUTH_REDIRECT = "/settings/sigi#profile";

function getSafeNextPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : DEFAULT_AUTH_REDIRECT;
}

function getSafeOtpType(value: string | null): EmailOtpType | null {
  switch (value) {
    case "signup":
    case "invite":
    case "magiclink":
    case "recovery":
    case "email_change":
    case "email":
      return value;
    default:
      return null;
  }
}

function getRetryPath(nextPath: string, message: string): string {
  const params = new URLSearchParams({ next: nextPath, error: message });
  return `/auth?${params.toString()}`;
}

export default function AuthConfirm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(
    () => (hasSupabaseBrowserEnv() ? createSupabaseBrowserClient() : null),
    []
  );

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function confirmSignIn() {
      const nextPath = getSafeNextPath(searchParams.get("next"));
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const otpType = getSafeOtpType(searchParams.get("type"));

      if (!supabase) {
        router.replace(getRetryPath(nextPath, "Sign-in is temporarily unavailable."));
        return;
      }

      const operation = tokenHash && otpType
        ? supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType })
        : code
          ? supabase.auth.exchangeCodeForSession(code)
          : null;

      if (!operation) {
        router.replace(getRetryPath(nextPath, "Missing sign-in token."));
        return;
      }

      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("Sign-in verification timed out. Please request a new email and try again.")),
          AUTH_CONFIRM_TIMEOUT_MS
        );
      });

      try {
        const result = await Promise.race([operation, timeout]);

        if (cancelled) {
          return;
        }

        if (result.error) {
          throw result.error;
        }

        router.replace(nextPath);
        router.refresh();
      } catch (cause) {
        if (!cancelled) {
          const message = cause instanceof Error ? cause.message : "Unable to verify sign-in.";
          router.replace(getRetryPath(nextPath, message));
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    void confirmSignIn();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [router, searchParams, supabase]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="flex items-center gap-3 text-sm text-cyan-100/80" role="status">
        <LoaderCircle className="h-5 w-5 animate-spin text-cyan-300" />
        <span>Restoring your SigiOS membership</span>
      </div>
    </main>
  );
}