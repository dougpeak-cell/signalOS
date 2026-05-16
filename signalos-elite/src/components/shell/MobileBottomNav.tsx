"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useResponsiveMobilePreviewFrame } from "@/components/shell/useResponsiveMobilePreview";
import {
  getMobileSigiSheetDefaultContext,
  openMobileSigiSheet,
} from "@/components/shell/mobileSigiSheetEvents";
import { getSigiProfile } from "@/lib/sigi/sigiProfile";

const navItems = [
  { href: "/today", label: "Today" },
  { href: "/stocks", label: "Stocks" },
  { href: "/screener", label: "Screener" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/news", label: "News" },
  { href: "/experts", label: "Experts" },
  { href: "/education", label: "Education" },
  { href: "/crypto", label: "Crypto" },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/today") {
    return pathname === "/" || pathname === "/today";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileBottomNav({
  forceVisible = false,
}: {
  forceVisible?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobilePreviewEnabled = searchParams.get("mobilePreview") === "1";
  const mobilePreviewFrame = useResponsiveMobilePreviewFrame(forceVisible || isMobilePreviewEnabled);
  const lastScrollYRef = useRef(0);
  const showNavTimeoutRef = useRef<number | null>(null);
  const [isNavHidden, setIsNavHidden] = useState(false);

  useEffect(() => {
    const syncScrollState = () => {
      const nextScrollY = window.scrollY;
      const delta = nextScrollY - lastScrollYRef.current;

      if (showNavTimeoutRef.current !== null && delta !== 0) {
        window.clearTimeout(showNavTimeoutRef.current);
        showNavTimeoutRef.current = null;
      }

      if (nextScrollY <= 24) {
        setIsNavHidden(false);
      } else if (delta > 18) {
        setIsNavHidden(true);
      } else if (delta < -12) {
        showNavTimeoutRef.current = window.setTimeout(() => {
          setIsNavHidden(false);
          showNavTimeoutRef.current = null;
        }, 90);
      }

      lastScrollYRef.current = nextScrollY;
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", syncScrollState, { passive: true });

    return () => {
      if (showNavTimeoutRef.current !== null) {
        window.clearTimeout(showNavTimeoutRef.current);
        showNavTimeoutRef.current = null;
      }
      window.removeEventListener("scroll", syncScrollState);
    };
  }, []);

  function withPreviewParam(href: string) {
    if (!isMobilePreviewEnabled) {
      return href;
    }

    return href.includes("?") ? `${href}&mobilePreview=1` : `${href}?mobilePreview=1`;
  }

  function buildCurrentRoute() {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("returnTo");
    const nextQuery = nextParams.toString();

    return nextQuery ? `${pathname}?${nextQuery}` : pathname;
  }

  function buildNavHref(href: string) {
    const nextHref = withPreviewParam(href);

    if (href === "/watchlist" || href === "/portfolio") {
      const separator = nextHref.includes("?") ? "&" : "?";
      return `${nextHref}${separator}quickView=1`;
    }

    if (href !== "/education") {
      return nextHref;
    }

    const separator = nextHref.includes("?") ? "&" : "?";
    return `${nextHref}${separator}returnTo=${encodeURIComponent(buildCurrentRoute())}`;
  }

  function openSigi() {
    const sigiProfile = getSigiProfile();

    if (!sigiProfile?.name?.trim()) {
      router.push(`${withPreviewParam("/today")}#sigi-command-panel`);
      return;
    }

    openMobileSigiSheet({
      context: pathname === "/today" ? getMobileSigiSheetDefaultContext() : undefined,
    });
  }

  const navShellClass = forceVisible
    ? [
        "fixed left-1/2 z-50 -translate-x-1/2 will-change-transform transition-[transform,opacity] duration-150 ease-out",
        isNavHidden
          ? "translate-y-[calc(100%+1.5rem)] opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100",
      ].join(" ")
    : [
        "fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 md:hidden will-change-transform transition-[transform,opacity] duration-150 ease-out",
        isNavHidden
          ? "translate-y-[calc(100%+1.5rem)] opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100",
      ].join(" ");

  const navGridClass = forceVisible
    ? "grid min-h-[104px] grid-cols-5 items-center gap-1 overflow-hidden rounded-[24px] border border-cyan-300/15 bg-black/80 px-1.5 py-1.5 shadow-[0_0_12px_rgba(103,232,249,0.10),0_12px_24px_rgba(8,47,73,0.22)] backdrop-blur-2xl"
    : "grid min-h-[104px] grid-cols-5 items-center gap-1 rounded-[28px] border border-cyan-300/20 bg-black/88 px-2 py-2 shadow-[0_0_28px_rgba(103,232,249,0.18),0_20px_50px_rgba(8,47,73,0.38)] backdrop-blur-xl sm:min-h-[104px] sm:grid-cols-5 sm:gap-1";

  const navShellStyle = forceVisible
    ? {
        bottom: `calc(${mobilePreviewFrame.bottomGap}px + env(safe-area-inset-bottom) + 0.75rem)`,
        width: "calc(100% - 1rem)",
        maxWidth: `${Math.max(320, mobilePreviewFrame.width - 16)}px`,
      }
    : undefined;

  return (
    <nav className={navShellClass} style={navShellStyle}>
      {forceVisible ? (
        <div className="pointer-events-none absolute inset-x-5 -bottom-3 h-8 rounded-b-[22px] bg-linear-to-t from-black/70 via-black/28 to-transparent" />
      ) : null}
      <div className={navGridClass}>
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={buildNavHref(item.href)}
              className={[
                forceVisible
                  ? "flex min-h-9 flex-col items-center justify-center rounded-[18px] px-0.5 py-1 text-[8px] font-semibold text-center transition"
                  : "flex min-h-11 flex-col items-center justify-center rounded-2xl px-0.5 py-1 text-[8px] font-semibold text-center transition sm:text-[8px]",
                active
                  ? "bg-cyan-400/12 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.14)]"
                  : "text-white/56 hover:bg-white/6 hover:text-white",
              ].join(" ")}

            >
              <span
                className={[
                  forceVisible
                    ? "mb-0.5 h-1.5 w-1.5 rounded-full transition"
                    : "mb-1 h-1.5 w-1.5 rounded-full transition",
                  active ? "bg-cyan-300" : "bg-white/25",
                ].join(" ")}
              />
              <span className="block max-w-full text-balance text-center leading-tight whitespace-normal">
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={openSigi}
          className={[
            "col-span-1 flex flex-col items-center justify-center border border-cyan-400/20 bg-cyan-400/12 px-0.5 py-1 font-semibold text-cyan-100 text-center shadow-[0_0_18px_rgba(34,211,238,0.16)] transition hover:bg-cyan-400/18",
            forceVisible
              ? "min-h-9 rounded-[18px] text-[8px]"
              : "min-h-11 rounded-2xl text-[8px]",
          ].join(" ")}
        >
          <span className={[
            "h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]",
            forceVisible ? "mb-0.5" : "mb-1",
          ].join(" ")} />
          <span className="block max-w-full text-balance text-center leading-tight whitespace-normal">
            Sigi
          </span>
        </button>
      </div>
    </nav>
  );
}