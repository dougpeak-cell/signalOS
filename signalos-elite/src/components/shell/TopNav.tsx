"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AccountMenu from "@/components/navigation/AccountMenu";
import DiscordInviteButton from "@/components/community/DiscordInviteButton";
import { MobileHealthyWealthButton } from "@/components/today/HealthyWealthButton";
import { features } from "@/lib/features";
import {
  createSupabaseBrowserClient,
  hasSupabaseBrowserEnv,
} from "@/lib/supabase/browser";

const MOBILE_PREVIEW_STORAGE_KEY = "signalos-dev-mobile-preview-today";

const baseNavItems = [
  { href: "/today", label: "Today" },
  { href: "/stocks", label: "Stocks" },
  { href: "/screener", label: "Screener" },
  { href: "/workspace", label: "Workspace" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/news", label: "News" },
  { href: "/experts", label: "Experts" },
  { href: "/education", label: "Education" },
];

const navItems = features.visionEnabled
  ? [baseNavItems[0], { href: "/vision", label: "Vision" }, ...baseNavItems.slice(1)]
  : baseNavItems;

function getMobileAuthCtaLabel(pathname: string): string {
  if (pathname === "/today" || pathname.startsWith("/today/")) {
    return "Account";
  }

  if (
    pathname === "/experts" ||
    pathname.startsWith("/experts/") ||
    pathname === "/settings/sigi" ||
    pathname.startsWith("/settings/sigi/")
  ) {
    return "Sign In";
  }

  return "Account";
}

export default function TopNav({
  forceMobilePreview = false,
  hasAccountSession = false,
}: {
  forceMobilePreview?: boolean;
  hasAccountSession?: boolean;
}) {
  const supabase = useMemo(
    () => (hasSupabaseBrowserEnv() ? createSupabaseBrowserClient() : null),
    []
  );
  const [contactOpen, setContactOpen] = useState(false);
  const [hasClientSession, setHasClientSession] = useState(hasAccountSession);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportUserEmail, setSupportUserEmail] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);
  const [supportStatus, setSupportStatus] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCryptoMode = pathname.startsWith("/crypto");
  const showMobileHealthyWealth = !forceMobilePreview && pathname === "/today";
  const showDevToggle = process.env.NODE_ENV !== "production" && !isCryptoMode;
  const isMobilePreviewEnabled = searchParams.get("mobilePreview") === "1";
  const mobileAuthCtaLabel = getMobileAuthCtaLabel(pathname);
  const activeLabel =
    navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      ?.label ?? (isCryptoMode ? "Crypto" : "Today");

  const navDefault =
    "rounded-full px-3 py-2 text-sm font-semibold text-white/65 transition hover:bg-white/10 hover:text-white";

  const cryptoActive =
    "rounded-full bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-200 ring-1 ring-cyan-400/30 shadow-[0_0_24px_rgba(34,211,238,0.18)] transition";

  useEffect(() => {
    setContactOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!supabase) {
      setHasClientSession(hasAccountSession);
      return;
    }

    let cancelled = false;

    const syncSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!cancelled) {
          setHasClientSession(Boolean(session));
        }
      } catch {
        if (!cancelled) {
          setHasClientSession(hasAccountSession);
        }
      }
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasClientSession(Boolean(session));
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [hasAccountSession, supabase]);

  const supportEmail = "support@sigios.com";

  function buildCurrentRoute() {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("returnTo");
    const nextQuery = nextParams.toString();

    return nextQuery ? `${pathname}?${nextQuery}` : pathname;
  }

  function buildAuthHref() {
    return `/auth?next=${encodeURIComponent(buildCurrentRoute())}`;
  }

  function withPreviewParam(href: string) {
    if (!isMobilePreviewEnabled) {
      return href;
    }

    return href.includes("?") ? `${href}&mobilePreview=1` : `${href}?mobilePreview=1`;
  }

  function buildNavHref(href: string) {
    const nextHref = withPreviewParam(href);

    if (href !== "/education") {
      return nextHref;
    }

    const separator = nextHref.includes("?") ? "&" : "?";
    return `${nextHref}${separator}returnTo=${encodeURIComponent(buildCurrentRoute())}`;
  }

  function handlePrimaryNavClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    window.location.assign(href);
  }

  function toggleMobilePreview() {
    const nextParams = new URLSearchParams(searchParams.toString());
    const nextEnabled = !isMobilePreviewEnabled;

    if (isMobilePreviewEnabled) {
      nextParams.delete("mobilePreview");
    } else {
      nextParams.set("mobilePreview", "1");
    }

    window.localStorage.setItem(MOBILE_PREVIEW_STORAGE_KEY, nextEnabled ? "1" : "0");

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }

  async function sendSupportMessage() {
    const message = supportMessage.trim();
    if (!message) {
      setSupportStatus("Please enter a message first.");
      return;
    }

    if (sendingSupport) {
      return;
    }

    setSendingSupport(true);
    setSupportStatus("");

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: supportMessage,
          page: typeof window !== "undefined" ? window.location.href : buildCurrentRoute(),
          email: supportUserEmail.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send support message.");
      }

      setSupportMessage("");
      setSupportUserEmail("");
      setSupportStatus("");
      setContactOpen(false);
    } catch {
      setSupportStatus("Could not send message. Please try again.");
    } finally {
      setSendingSupport(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-cyan-400/10 bg-black/84 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-12 w-full items-center justify-between max-w-430 px-3 sm:px-5 md:min-h-13 md:px-6 xl:px-6 2xl:px-7">
        <div className="flex items-center gap-4 md:gap-6">
          <Link
            href={buildNavHref("/today")}
            onClick={(event) => handlePrimaryNavClick(event, buildNavHref("/today"))}
            className="flex flex-col leading-none"
          >
            <span className="text-[13px] font-semibold tracking-[0.24em] text-white md:text-[15px] md:tracking-[0.32em]">
              SigiOS
            </span>
            <span className="mt-1 text-[9px] font-medium tracking-[0.18em] text-cyan-200/65 md:text-[10px]">
              Powered by Sigi
            </span>
          </Link>

          <nav className={forceMobilePreview ? "hidden" : "hidden sm:flex items-center gap-5"}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={buildNavHref(item.href)}
                onClick={(event) => handlePrimaryNavClick(event, buildNavHref(item.href))}
                className="text-[13px] font-medium text-white/72 transition hover:text-white"
              >
                {item.label}
              </Link>
            ))}

            <Link
              href={buildNavHref("/crypto")}
              onClick={(event) => handlePrimaryNavClick(event, buildNavHref("/crypto"))}
              className={isCryptoMode ? cryptoActive : navDefault}
            >
              Crypto
            </Link>

            <Link
              href={buildNavHref("/about")}
              onClick={(event) => handlePrimaryNavClick(event, buildNavHref("/about"))}
              className="text-sm text-slate-300 transition hover:text-white"
            >
              About SigiOS
            </Link>
          </nav>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
          {!hasClientSession && !forceMobilePreview ? (
            <>
              <Link
                href={buildAuthHref()}
                className="hidden min-h-9 items-center rounded-full border border-emerald-300/22 bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.1)] transition hover:border-emerald-300/36 hover:bg-emerald-400/16 sm:inline-flex"
              >
                Sign In
              </Link>
              <DiscordInviteButton
                label="Join Discord"
                className="hidden min-h-9 items-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 text-sm font-semibold text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.1)] transition hover:border-cyan-300/36 hover:bg-cyan-400/16 sm:inline-flex"
              />
            </>
          ) : null}

          {!forceMobilePreview ? (
            <div className="relative hidden sm:block">
              <button
                type="button"
                aria-expanded={contactOpen}
                aria-haspopup="dialog"
                onClick={() => setContactOpen((value) => !value)}
                className="inline-flex min-h-9 items-center rounded-full border border-cyan-400/20 bg-cyan-400/8 px-4 text-sm font-semibold text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.1)] transition hover:border-cyan-400/35 hover:bg-cyan-400/14"
              >
                Contact Us
              </button>

              {contactOpen ? (
                <div className="absolute right-0 top-full z-50 mt-3 w-82 rounded-3xl border border-cyan-400/16 bg-slate-950/96 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/78">
                      Client Support
                    </div>
                    <button
                      type="button"
                      aria-label="Close contact form"
                      title="Close"
                      onClick={() => setContactOpen(false)}
                      className="-mr-1 -mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    Contact SigiOS
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    For platform support, account questions, or product feedback, send the team a direct support note.
                  </p>
                  <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">
                    Reply Email (optional)
                  </label>
                  <input
                    type="email"
                    value={supportUserEmail}
                    onChange={(e) => setSupportUserEmail(e.target.value)}
                    placeholder="Add email if you want a response"
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-white outline-none"
                  />
                  <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">
                    Your Question
                  </label>
                  <textarea
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    rows={5}
                    placeholder="Tell us what you need help with..."
                    className="min-h-40 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={sendSupportMessage}
                    disabled={sendingSupport}
                    className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-400/15 text-sm font-bold text-cyan-100 transition hover:bg-cyan-400/25 disabled:opacity-50"
                  >
                    {sendingSupport ? "Sending..." : "Email Support"}
                  </button>
                  <a
                    href={`mailto:${supportEmail}`}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-white/16 hover:text-white"
                  >
                    {supportEmail}
                  </a>
                  {supportStatus ? (
                    <p className="mt-3 text-sm text-white/60">
                      {supportStatus}
                    </p>
                  ) : null}
                  <div className="mt-3 text-xs text-slate-500">
                    Institutional support channel for SignalOS clients. Your current page is included automatically when you send.
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {showDevToggle ? (
            <button
              type="button"
              onClick={toggleMobilePreview}
              className={[
                "inline-flex min-h-9 items-center rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
                isMobilePreviewEnabled
                  ? "border-cyan-400/30 bg-cyan-400/12 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.14)]"
                  : "border-white/10 bg-white/4 text-white/70 hover:bg-white/8 hover:text-white",
              ].join(" ")}
            >
              {isMobilePreviewEnabled ? "Mobile Preview On" : "Mobile Preview Off"}
            </button>
          ) : null}

          <AccountMenu hasAccountSession={hasAccountSession} />

          <div className={forceMobilePreview ? "hidden min-h-9 items-center rounded-full border border-white/10 bg-white/4 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 xs:inline-flex" : "hidden sm:hidden"}>
            {activeLabel}
          </div>

          {!forceMobilePreview ? (
            <div className="sm:hidden">
              <div className="flex items-center gap-1.5">
                {!hasClientSession ? (
                  <>
                    <Link
                      href={buildAuthHref()}
                      className="inline-flex min-h-9 items-center rounded-full border border-emerald-300/22 bg-emerald-400/10 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.1)] transition hover:border-emerald-300/36 hover:bg-emerald-400/16"
                    >
                      {mobileAuthCtaLabel}
                    </Link>
                    <DiscordInviteButton
                      label="Discord"
                      className="inline-flex min-h-9 items-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.1)] transition hover:border-cyan-300/36 hover:bg-cyan-400/16"
                    />
                  </>
                ) : null}

                {showMobileHealthyWealth ? <MobileHealthyWealthButton /> : null}

                {!showMobileHealthyWealth ? (
                  <div className="hidden min-h-9 items-center rounded-full border border-white/10 bg-white/4 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 min-[340px]:inline-flex">
                    {activeLabel}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}