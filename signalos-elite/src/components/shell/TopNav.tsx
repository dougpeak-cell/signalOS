"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const MOBILE_PREVIEW_STORAGE_KEY = "signalos-dev-mobile-preview-today";

const navItems = [
  { href: "/today", label: "Today" },
  { href: "/stocks", label: "Stocks" },
  { href: "/screener", label: "Screener" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/news", label: "News" },
  { href: "/experts", label: "Experts" },
  { href: "/education", label: "Education" },
];

export default function TopNav({
  forceMobilePreview = false,
}: {
  forceMobilePreview?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCryptoMode = pathname.startsWith("/crypto");
  const showDevToggle = process.env.NODE_ENV !== "production" && !isCryptoMode;
  const isMobilePreviewEnabled = searchParams.get("mobilePreview") === "1";
  const activeLabel =
    navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      ?.label ?? (isCryptoMode ? "Crypto" : "Today");

  const navDefault =
    "rounded-full px-3 py-2 text-sm font-semibold text-white/65 transition hover:bg-white/10 hover:text-white";

  const navActive =
    "rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white transition";

  const cryptoActive =
    "rounded-full bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-200 ring-1 ring-cyan-400/30 shadow-[0_0_24px_rgba(34,211,238,0.18)] transition";

  function buildCurrentRoute() {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("returnTo");
    const nextQuery = nextParams.toString();

    return nextQuery ? `${pathname}?${nextQuery}` : pathname;
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

  return (
    <header className="sticky top-0 z-40 h-12 border-b border-cyan-400/10 bg-black/84 backdrop-blur-xl md:h-13">
      <div className="mx-auto flex h-full w-full items-center justify-between max-w-430 px-3 sm:px-5 md:px-6 xl:px-6 2xl:px-7">
        <div className="flex items-center gap-4 md:gap-6">
          <Link
            href={buildNavHref("/today")}
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
                className="text-[13px] font-medium text-white/72 transition hover:text-white"
              >
                {item.label}
              </Link>
            ))}

            <Link
              href={buildNavHref("/crypto")}
              className={isCryptoMode ? cryptoActive : navDefault}
            >
              Crypto
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
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
              {isMobilePreviewEnabled ? "Desktop Preview" : "Mobile Preview"}
            </button>
          ) : null}

          <div className={forceMobilePreview ? "inline-flex min-h-9 items-center rounded-full border border-white/10 bg-white/4 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70" : "hidden sm:hidden"}>
            {activeLabel}
          </div>

          {!forceMobilePreview ? (
            <div className="sm:hidden">
              <div className="inline-flex min-h-9 items-center rounded-full border border-white/10 bg-white/4 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                {activeLabel}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}