"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useResponsiveMobilePreviewFrame } from "@/components/shell/useResponsiveMobilePreview";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  activePaths: string[];
  featured?: boolean;
};

function TodayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MarketsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M4 18V9m5 9V5m5 13v-7m5 7V3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WatchlistIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="m12 3 2.65 5.36 5.92.86-4.29 4.18 1.01 5.9L12 16.52 6.71 19.3l1.01-5.9-4.29-4.18 5.92-.86L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PortfolioIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2m-12 0h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M3 12h18M10 12v2h4v-2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function VisionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <path
        d="M2.5 12s3.4-5.5 9.5-5.5S21.5 12 21.5 12 18.1 17.5 12 17.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.5v2M12 19.5v2M3.5 5l1.5 1.5M19 17.5l1.5 1.5M20.5 5 19 6.5M5 17.5 3.5 19"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const navItems: NavItem[] = [
  {
    label: "Today",
    href: "/today",
    activePaths: ["/", "/today"],
    icon: <TodayIcon />,
  },
  {
    label: "Markets",
    href: "/markets",
    activePaths: ["/markets", "/stocks", "/screener", "/news", "/crypto"],
    icon: <MarketsIcon />,
  },
  {
    label: "Watchlist",
    href: "/watchlist?quickView=1",
    activePaths: ["/watchlist"],
    icon: <WatchlistIcon />,
  },
  {
    label: "Portfolio",
    href: "/portfolio?quickView=1",
    activePaths: ["/portfolio"],
    icon: <PortfolioIcon />,
  },
  {
    label: "Vision",
    href: "/vision",
    activePaths: ["/vision"],
    icon: <VisionIcon />,
    featured: true,
  },
];

export default function MobileBottomNav({
  forceVisible = false,
}: {
  forceVisible?: boolean;
}) {
  const pathname = usePathname();
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

  function isActive(item: NavItem) {
    return item.activePaths.some((path) => {
      if (path === "/") return pathname === "/";
      return pathname === path || pathname.startsWith(`${path}/`);
    });
  }

  const navShellClass = forceVisible
    ? [
        "fixed left-1/2 z-50 -translate-x-1/2 will-change-transform transition-[transform,opacity] duration-150 ease-out lg:hidden",
        isNavHidden
          ? "translate-y-[calc(100%+1.5rem)] opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100",
      ].join(" ")
    : [
        "fixed inset-x-2 bottom-2 z-50 will-change-transform transition-[transform,opacity] duration-150 ease-out lg:hidden",
        isNavHidden
          ? "translate-y-[calc(100%+1.5rem)] opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100",
      ].join(" ");

  const navShellStyle = forceVisible
    ? {
        bottom: `calc(${mobilePreviewFrame.bottomGap}px + env(safe-area-inset-bottom) + 0.5rem)`,
        width: "calc(100% - 1rem)",
        maxWidth: `${Math.max(320, mobilePreviewFrame.width - 16)}px`,
      }
    : undefined;

  return (
    <nav className={navShellClass} style={navShellStyle}>
      <div className="mx-auto grid max-w-xl grid-cols-5 rounded-[28px] border border-cyan-400/15 bg-black/95 p-1.5 shadow-[0_18px_70px_rgba(0,0,0,0.72)] backdrop-blur-xl">
        {navItems.map((item) => {
          const active = isActive(item);

          return (
            <Link
              key={item.label}
              href={withPreviewParam(item.href)}
              aria-label={item.label}
              className={[
                "relative flex min-h-14.5 flex-col items-center justify-center gap-1 rounded-[20px] px-1 text-[9px] font-semibold transition",
                active ? "bg-cyan-400/10 text-cyan-200" : "text-slate-500 hover:text-slate-200",
                item.featured ? "border border-cyan-400/20 bg-cyan-400/5.5" : "",
              ].join(" ")}
            >
              {item.featured ? (
                <>
                  <span className="absolute inset-1 rounded-[17px] bg-cyan-300/3.5 shadow-[0_0_28px_rgba(34,211,238,0.12)]" />
                  <span className="absolute top-2 h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.95)]" />
                </>
              ) : active ? (
                <span className="absolute top-2 h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]" />
              ) : null}

              <span className="relative mt-1">{item.icon}</span>
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}