"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { features } from "@/lib/features";
import { useResponsiveMobilePreviewFrame } from "@/components/shell/useResponsiveMobilePreview";
import { Activity, ChartNoAxesCombined, House, Star, Wallet } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  activePaths: string[];
  featured?: boolean;
};

const baseNavItems: NavItem[] = [
  {
    label: "Today",
    href: "/today",
    activePaths: ["/today"],
    icon: <House className="size-5" />,
  },
  {
    label: "Markets",
    href: "/markets",
    activePaths: ["/markets", "/stocks", "/screener", "/news", "/crypto"],
    icon: <ChartNoAxesCombined className="size-5" />,
  },
  {
    label: "Watchlist",
    href: "/watchlist?quickView=1",
    activePaths: ["/watchlist"],
    icon: <Star className="size-5" />,
  },
  {
    label: "Portfolio",
    href: "/portfolio?quickView=1",
    activePaths: ["/portfolio"],
    icon: <Wallet className="size-5" />,
  },
];

const visionNavItem: NavItem = {
  label: "Pulse",
  href: "/pulse",
  activePaths: ["/", "/pulse", "/vision"],
  icon: <Activity className="h-6 w-6" />,
  featured: true,
};

const navItems = features.visionEnabled
  ? [...baseNavItems.slice(0, 2), visionNavItem, ...baseNavItems.slice(2)]
  : baseNavItems;

export default function MobileBottomNav({
  forceVisible = false,
}: {
  forceVisible?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobilePreviewEnabled = searchParams.get("mobilePreview") === "1";
  const mobilePreviewFrame = useResponsiveMobilePreviewFrame(forceVisible || isMobilePreviewEnabled);

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
    ? "fixed left-1/2 z-50 -translate-x-1/2 lg:hidden"
    : "fixed inset-x-2 z-50 lg:hidden";

  const navShellStyle = forceVisible
    ? {
        bottom: `calc(${mobilePreviewFrame.bottomGap}px + env(safe-area-inset-bottom) + 0.5rem)`,
        width: "calc(100% - 1rem)",
        maxWidth: `${Math.max(320, mobilePreviewFrame.width - 16)}px`,
      }
    : { bottom: "calc(0.5rem + env(safe-area-inset-bottom))" };

  return (
    <nav aria-label="Mobile navigation" className={navShellClass} style={navShellStyle}>
      <div
        className={[
          "mx-auto grid max-w-xl gap-1 rounded-lg border border-white/10 bg-[#050d10]/95 p-1.5 shadow-xl backdrop-blur-xl",
          features.visionEnabled ? "grid-cols-5" : "grid-cols-4",
        ].join(" ")}
      >
        {navItems.map((item) => {
          const active = isActive(item);

          return (
            <Link
              key={item.label}
              href={withPreviewParam(item.href)}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={[
                "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] font-semibold transition-colors",
                active ? "bg-teal-300/15 text-teal-200" : "text-white/50 hover:text-white",
                item.featured ? "border border-teal-300/25" : "",
              ].join(" ")}
            >
              <span className="relative">{item.icon}</span>
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}