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
const DEFAULT_AUTH_REDIRECT = "/today";

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

function getAuthParamsFromUrl(url: URL): URLSearchParams {
  if (url.searchParams.has("code") || url.searchParams.has("token_hash")) {
    return url.searchParams;
  }

  const entries = Array.from(url.searchParams.entries());
  if (entries.length === 1 && entries[0][1] === "") {
    return new URLSearchParams(entries[0][0]);
  }

  return url.searchParams;
}

function getReferrerAuthParams(referrer: string, currentOrigin: string): URLSearchParams {
  try {
    const referrerUrl = new URL(referrer);
    const wrappedTarget = referrerUrl.searchParams.get("q") ?? referrerUrl.searchParams.get("url");
    const callbackUrl = wrappedTarget ? new URL(wrappedTarget) : referrerUrl;

    if (callbackUrl.origin !== currentOrigin) {
      return new URLSearchParams();
    }

    return getAuthParamsFromUrl(callbackUrl);
  } catch {
    return new URLSearchParams();
  }
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
      const referrerParams = getReferrerAuthParams(document.referrer, window.location.origin);
      const code = searchParams.get("code") ?? referrerParams.get("code");
      const tokenHash = searchParams.get("token_hash") ?? referrerParams.get("token_hash");
      const otpType = getSafeOtpType(searchParams.get("type") ?? referrerParams.get("type"));

      if (!supabase) {
        router.replace(getRetryPath(nextPath, "Sign-in is temporarily unavailable."));
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      const operation = async () => {
        if (tokenHash && otpType) {
          return supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
        }

        if (code) {
          return supabase.auth.exchangeCodeForSession(code);
        }

        if (accessToken && refreshToken) {
          return supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }

        const sessionResult = await supabase.auth.getSession();
        if (!sessionResult.error && !sessionResult.data.session) {
          return {
            ...sessionResult,
            error: new Error("Missing sign-in token."),
          };
        }

        return sessionResult;
      };

      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("Sign-in verification timed out. Please request a new email and try again.")),
          AUTH_CONFIRM_TIMEOUT_MS
        );
      });

      try {
        const result = await Promise.race([operation(), timeout]);

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