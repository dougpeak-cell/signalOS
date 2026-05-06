"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useDebounce } from "@/hooks/useDebounce";

type Props = {
  initialQuery: string;
  initialSector: string;
};

const sectorAliases: Record<string, string> = {
  ai: "AI",
  consumer: "Consumer Discretionary",
  "consumer discretionary": "Consumer Discretionary",
  "consumer staples": "Consumer Staples",
  crypto: "Crypto",
  dividend: "Dividends",
  dividends: "Dividends",
  etf: "ETFs",
  etfs: "ETFs",
  options: "Options",
  "small cap": "Small Caps",
  "small caps": "Small Caps",
  "space and satellite": "Space & Satellite",
  "space & satellite": "Space & Satellite",
  "long term investing": "Long-term Investing",
  "long-term investing": "Long-term Investing",
  "short term trading": "Short-term Trading",
  "short-term trading": "Short-term Trading",
};

const sectorFilters = [
  "All",
  "Technology",
  "AI",
  "Semiconductors",
  "Software",
  "Healthcare",
  "Energy",
  "Communication Services",
  "Financials",
  "Consumer Discretionary",
  "Consumer Staples",
  "Industrials",
  "Utilities",
  "Materials",
  "Real Estate",
  "Small Caps",
  "Dividends",
  "Crypto",
  "ETFs",
  "Options",
  "Space & Satellite",
  "Long-term Investing",
  "Short-term Trading",
] as const;

function normalizeSectorFilterValue(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return "";
  }

  return sectorAliases[normalizedValue.toLowerCase()] ?? normalizedValue;
}

export default function ScreenerFilterBar({
  initialQuery,
  initialSector,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? initialQuery;
  const currentSector = normalizeSectorFilterValue(
    searchParams.get("sector") ?? initialSector
  );
  const [query, setQuery] = useState(initialQuery);
  const [sectorFilter, setSectorFilter] = useState(
    normalizeSectorFilterValue(initialSector)
  );
  const debouncedQuery = useDebounce(query, 350);

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    setSectorFilter(currentSector);
  }, [currentSector]);

  useEffect(() => {
    const trimmedDebouncedQuery = debouncedQuery.trim();
    const trimmedCurrentQuery = currentQuery.trim();

    if (trimmedDebouncedQuery === trimmedCurrentQuery) {
      return;
    }

    router.replace(buildHref({ query: debouncedQuery }));
  }, [currentQuery, debouncedQuery, router]);

  function buildHref(next: {
    query?: string;
    sector?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmedQuery = (next.query ?? query).trim();
    const nextSector = normalizeSectorFilterValue(next.sector ?? sectorFilter);

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    } else {
      params.delete("q");
    }

    if (nextSector) {
      params.set("sector", nextSector);
    } else {
      params.delete("sector");
    }

    return params.toString() ? `${pathname}?${params.toString()}` : pathname;
  }

  function applySectorFilter(nextSector: string) {
    setSectorFilter(nextSector);
    router.replace(buildHref({ sector: nextSector }));
  }

  function applySearch(nextQuery: string) {
    setQuery(nextQuery);
  }

  function submitSearch() {
    router.replace(buildHref({ query }));
  }

  return (
    <div className="space-y-4 rounded-[26px] border border-cyan-400/16 bg-[linear-gradient(180deg,rgba(7,12,24,0.9),rgba(4,8,18,0.96))] p-4 shadow-[0_0_0_1px_rgba(34,211,238,0.04),0_20px_50px_rgba(0,0,0,0.24)] sm:p-5">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_110px] xl:items-center">
        <input
          type="text"
          value={query}
          onChange={(event) => applySearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submitSearch();
            }
          }}
          placeholder="Search ticker or company..."
          className="rounded-2xl border border-cyan-500/20 bg-cyan-500/4 px-4 py-3 text-sm font-medium text-white placeholder:text-white/35 outline-none shadow-[0_0_18px_rgba(0,255,200,0.08)] transition focus:border-cyan-400/40"
        />

        <button
          type="button"
          onClick={submitSearch}
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/4 px-5 py-3 text-sm font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/6"
        >
          Enter
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
          Sector
        </div>
        <div className="flex flex-wrap gap-2">
          {sectorFilters.map((sector) => (
            <button
              key={sector}
              type="button"
              onClick={() => applySectorFilter(sector === "All" ? "" : sector)}
              className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                sectorFilter === sector || (!sectorFilter && sector === "All")
                  ? "border-cyan-400/35 bg-cyan-400/12 text-cyan-100"
                  : "border-white/10 bg-white/3 text-white/50 hover:text-white"
              }`}
            >
              {sector}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}