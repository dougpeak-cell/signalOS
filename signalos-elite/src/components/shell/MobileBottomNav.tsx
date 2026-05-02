"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  getMobileSigiSheetDefaultContext,
  openMobileSigiSheet,
} from "@/components/shell/mobileSigiSheetEvents";
import { getSigiProfile } from "@/lib/sigi/sigiProfile";

const navItems = [
  { href: "/today", label: "Today" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/stocks", label: "Stocks" },
  { href: "/education", label: "Education" },
  { href: "/news", label: "News" },
  { href: "/experts", label: "Experts" },
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
  const navPositionClass = "bottom-3";
  const isMobilePreviewEnabled = searchParams.get("mobilePreview") === "1";
  const lastScrollYRef = useRef(0);
  const showNavTimeoutRef = useRef<number | null>(null);
  const [isPreviewNavHidden, setIsPreviewNavHidden] = useState(false);

  useEffect(() => {
    if (!forceVisible) {
      setIsPreviewNavHidden(false);
      if (showNavTimeoutRef.current !== null) {
        window.clearTimeout(showNavTimeoutRef.current);
        showNavTimeoutRef.current = null;
      }
      return;
    }

    const syncScrollState = () => {
      const nextScrollY = window.scrollY;
      const delta = nextScrollY - lastScrollYRef.current;

      if (showNavTimeoutRef.current !== null && delta !== 0) {
        window.clearTimeout(showNavTimeoutRef.current);
        showNavTimeoutRef.current = null;
      }

      if (nextScrollY <= 24) {
        setIsPreviewNavHidden(false);
      } else if (delta > 18) {
        setIsPreviewNavHidden(true);
      } else if (delta < -12) {
        showNavTimeoutRef.current = window.setTimeout(() => {
          setIsPreviewNavHidden(false);
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
  }, [forceVisible]);

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
        "fixed bottom-2 left-1/2 z-50 w-[min(calc(100%-1rem),392px)] -translate-x-1/2 will-change-transform transition-[transform,opacity] duration-150 ease-out",
        isPreviewNavHidden
          ? "translate-y-[calc(100%+1.5rem)] opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100",
      ].join(" ")
    : `fixed inset-x-3 z-50 md:hidden ${navPositionClass}`;

  const navGridClass = forceVisible
    ? "grid min-h-[88px] grid-cols-4 items-center gap-1 overflow-hidden rounded-[24px] border border-cyan-300/15 bg-black/80 px-1.5 py-1.5 shadow-[0_0_12px_rgba(103,232,249,0.10),0_12px_24px_rgba(8,47,73,0.22)] backdrop-blur-2xl"
    : "grid min-h-[104px] grid-cols-4 items-center gap-1 rounded-[28px] border border-cyan-300/20 bg-black/88 px-2 py-2 shadow-[0_0_28px_rgba(103,232,249,0.18),0_20px_50px_rgba(8,47,73,0.38)] backdrop-blur-xl sm:min-h-16 sm:grid-cols-8 sm:gap-0";

  return (
    <nav className={navShellClass}>
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
                  ? "flex min-h-9 flex-col items-center justify-center rounded-[18px] px-1 text-[8px] font-semibold uppercase tracking-widest transition"
                  : "flex min-h-11 flex-col items-center justify-center rounded-2xl px-1 text-[9px] font-semibold uppercase tracking-[0.12em] transition sm:text-[9px]",
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
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={openSigi}
          className={[
            "col-span-2 flex flex-col items-center justify-center border border-cyan-400/20 bg-cyan-400/12 px-1 font-semibold uppercase text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.16)] transition hover:bg-cyan-400/18 sm:col-span-1",
            forceVisible
              ? "min-h-9 rounded-[18px] text-[8px] tracking-widest"
              : "min-h-11 rounded-2xl text-[9px] tracking-[0.12em]",
          ].join(" ")}
        >
          <span className={[
            "h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]",
            forceVisible ? "mb-0.5" : "mb-1",
          ].join(" ")} />
          Sigi
        </button>
      </div>
    </nav>
  );
}