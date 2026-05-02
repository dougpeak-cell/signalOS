"use client";

import { RefObject, useEffect } from "react";
import { useMarketData } from "@/components/providers/MarketDataProvider";

type Options = {
  rootMargin?: string;
  threshold?: number;
  enabled?: boolean;
};

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

export function useVisibleTickerRegistration(
  ref: RefObject<Element | null>,
  tickers: string[],
  options?: Options
) {
  const { registerTickers, unregisterTickers } = useMarketData();

  useEffect(() => {
    const element = ref.current;
    const normalized = [...new Set(tickers.map(normalizeTicker).filter(Boolean))];

    if (!element || !normalized.length || options?.enabled === false) return;

    let active = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = Boolean(entry?.isIntersecting);

        if (isVisible && !active) {
          registerTickers(normalized, "visible");
          active = true;
        } else if (!isVisible && active) {
          unregisterTickers(normalized, "visible");
          active = false;
        }
      },
      {
        root: null,
        rootMargin: options?.rootMargin ?? "300px 0px",
        threshold: options?.threshold ?? 0.01,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (active) {
        unregisterTickers(normalized, "visible");
      }
    };
  }, [
    ref,
    tickers,
    registerTickers,
    unregisterTickers,
    options?.enabled,
    options?.rootMargin,
    options?.threshold,
  ]);
}