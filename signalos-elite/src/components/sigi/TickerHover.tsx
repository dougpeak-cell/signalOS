"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import CompanyHoverCard from "@/components/sigi/CompanyHoverCard";
import { useSigiPanel } from "@/components/sigi/SigiPanelContext";
import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";
import { prefetchCompanyProfile } from "@/lib/companyCache";

export default function TickerHover({
  ticker,
  children,
}: {
  ticker: string;
  children: ReactNode;
}) {
  const { setActiveTicker, setSigiAction } = useSelectedTicker();
  const { openPanel } = useSigiPanel();
  const [open, setOpen] = useState(false);
  const openTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (openTimerRef.current != null) {
        window.clearTimeout(openTimerRef.current);
      }
    };
  }, []);

  const scheduleOpen = () => {
    prefetchCompanyProfile(ticker);

    if (openTimerRef.current != null) {
      window.clearTimeout(openTimerRef.current);
    }

    openTimerRef.current = window.setTimeout(() => {
      setOpen(true);
      openTimerRef.current = null;
    }, 80);
  };

  const closeHover = () => {
    if (openTimerRef.current != null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }

    setOpen(false);
  };

  const handleClick = () => {
    const normalizedTicker = ticker.trim().toUpperCase();
    window.dispatchEvent(
      new CustomEvent("signalos:sigi-interaction", {
        detail: { source: "click" },
      })
    );
    setActiveTicker(normalizedTicker);
    setSigiAction("setup");
    openPanel(normalizedTicker);
  };

  return (
    <span
      className="relative inline-block cursor-pointer"
      onClick={handleClick}
      onMouseEnter={scheduleOpen}
      onFocus={scheduleOpen}
      onBlur={closeHover}
      onMouseLeave={closeHover}
    >
      {children}

      {open ? (
        <span className="fixed bottom-20 right-6 z-50 w-85 animate-in fade-in zoom-in-95 duration-150">
          <span
            className="block rounded-2xl border border-cyan-300/40 bg-slate-950/95 p-4 shadow-[0_0_35px_rgba(34,211,238,0.35)] backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <CompanyHoverCard
              ticker={ticker}
              onClose={closeHover}
              onAnalyze={handleClick}
            />
          </span>
        </span>
      ) : null}
    </span>
  );
}