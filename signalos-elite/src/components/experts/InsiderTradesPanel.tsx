"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { SigiAnalystLeader } from "@/components/experts/SigiTopAnalystPick";
import type { InsiderTradeFeedRow as InsiderTradeRow, InsiderTradesFeed } from "@/lib/experts/fmpInsiders";

type SigiFlag = {
  label: string;
  detail: string;
  tone: "cyan" | "emerald" | "amber";
};

function buildSigiSummary(rows: InsiderTradeRow[]) {
  if (rows.length === 0) {
    return "Sigi is waiting for fresh insider purchase filings before ranking the most meaningful recent activity.";
  }

  const highestConvictionRow = [...rows].sort(
    (left, right) => (right.amountPurchased ?? -1) - (left.amountPurchased ?? -1)
  )[0];
  const mostRecentDate = rows.map((row) => row.transactionDate ?? row.filingDate)
    .filter((date): date is string => date != null).sort().at(-1) ?? null;
  const uniqueSymbols = [...new Set(rows.map((row) => row.symbol).filter(Boolean))];

  const leadingBuyer = `${highestConvictionRow.purchaserName} (${highestConvictionRow.purchaserTitle})`;
  const leadingAmount = formatCurrency(highestConvictionRow.amountPurchased);
  const leadingDate = formatDate(highestConvictionRow.transactionDate ?? highestConvictionRow.filingDate);

  const largestPurchase = highestConvictionRow.amountPurchased != null
    ? `The largest disclosed dollar purchase shown is ${highestConvictionRow.companyName} (${highestConvictionRow.symbol}) by ${leadingBuyer} on ${leadingDate} at approximately ${leadingAmount}.`
    : "Purchase dollar amounts are unavailable in these filings.";
  return `Sigi is showing ${rows.length} reported purchases from the scanned FMP filing sample. ${largestPurchase} These rows cover ${uniqueSymbols.length} company${uniqueSymbols.length === 1 ? "" : "ies"}, with the latest reported trade dated ${formatDate(mostRecentDate)}. Dollar size alone is not a confidence rating or a buy recommendation.`;
}

function buildSigiFlags(rows: InsiderTradeRow[]) {
  const flags: SigiFlag[] = [];

  const companyCounts = new Map<string, number>();
  const buyerCounts = new Map<string, number>();

  for (const row of rows) {
    companyCounts.set(row.symbol, (companyCounts.get(row.symbol) ?? 0) + 1);
    buyerCounts.set(row.purchaserName, (buyerCounts.get(row.purchaserName) ?? 0) + 1);
  }

  const clusterEntry = [...companyCounts.entries()].find(([, count]) => count > 1);
  if (clusterEntry) {
    flags.push({
      label: "Cluster Buying",
      detail: `${clusterEntry[1]} recent insider purchases were filed in ${clusterEntry[0]}.`,
      tone: "cyan",
    });
  }

  const repeatBuyerEntry = [...buyerCounts.entries()].find(([, count]) => count > 1);
  if (repeatBuyerEntry) {
    flags.push({
      label: "Repeat Buyer",
      detail: `${repeatBuyerEntry[0]} appears ${repeatBuyerEntry[1]} times in the current window.`,
      tone: "emerald",
    });
  }

  const largePurchase = [...rows].sort(
    (left, right) => (right.amountPurchased ?? -1) - (left.amountPurchased ?? -1)
  )[0];
  if (largePurchase?.amountPurchased != null && largePurchase.amountPurchased >= 1_000_000) {
    flags.push({
      label: "Large Purchase",
      detail: `${largePurchase.symbol} shows the largest disclosed buy at ${formatCurrency(largePurchase.amountPurchased)}.`,
      tone: "amber",
    });
  }

  return flags;
}

function flagClasses(tone: SigiFlag["tone"]) {
  if (tone === "emerald") {
    return "border-emerald-400/20 bg-emerald-400/8 text-emerald-100";
  }

  if (tone === "amber") {
    return "border-amber-300/20 bg-amber-300/8 text-amber-100";
  }

  return "border-cyan-400/20 bg-cyan-400/8 text-cyan-100";
}

function getRowToneChips(row: InsiderTradeRow) {
  const chips: Array<{ label: string; className: string }> = [];

  if (row.sector) {
    chips.push({
      label: row.sector,
      className: "border-cyan-400/20 bg-cyan-400/8 text-cyan-100",
    });
  }

  if (row.amountPurchased != null && row.amountPurchased >= 1_000_000) {
    chips.push({
      label: "Large Buy",
      className: "border-amber-300/20 bg-amber-300/8 text-amber-100",
    });
  }

  if ((row.purchaserTitle ?? "").toLowerCase().includes("director")) {
    chips.push({
      label: "Director",
      className: "border-emerald-400/20 bg-emerald-400/8 text-emerald-100",
    });
  } else if ((row.purchaserTitle ?? "").toLowerCase().includes("officer")) {
    chips.push({
      label: "Officer",
      className: "border-fuchsia-400/20 bg-fuchsia-400/8 text-fuchsia-100",
    });
  } else if ((row.purchaserTitle ?? "").toLowerCase().includes("10 percent owner")) {
    chips.push({
      label: "10% Owner",
      className: "border-orange-300/20 bg-orange-300/8 text-orange-100",
    });
  }

  return chips;
}

function normalizeSymbol(value: string) {
  const match = value.toUpperCase().match(/[A-Z]{1,5}/);
  return match ? match[0] : value.trim().toUpperCase();
}

function buildLeaderMatchSet(leader: SigiAnalystLeader | null) {
  if (!leader) return new Set<string>();

  const values = [leader.strongestCall, leader.mostRecentPick, ...(leader.coveredNames ?? [])]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map(normalizeSymbol);

  return new Set(values);
}

function getAnalystLeaderMatchLabel(row: InsiderTradeRow, leader: SigiAnalystLeader | null) {
  if (!leader) return null;

  const matches = buildLeaderMatchSet(leader);
  if (!matches.has(row.symbol)) return null;

  const strongestCall = normalizeSymbol(leader.strongestCall);
  if (row.symbol === strongestCall) {
    return "Strongest Call Match";
  }

  return "Leader Coverage Match";
}

function compareRowsByLeaderCorrelation(
  left: InsiderTradeRow,
  right: InsiderTradeRow,
  leader: SigiAnalystLeader | null
) {
  const matches = buildLeaderMatchSet(leader);
  const leftMatch = Number(matches.has(left.symbol));
  const rightMatch = Number(matches.has(right.symbol));

  if (rightMatch !== leftMatch) {
    return rightMatch - leftMatch;
  }

  const rightDate = Date.parse(right.transactionDate ?? right.filingDate ?? "") || 0;
  const leftDate = Date.parse(left.transactionDate ?? left.filingDate ?? "") || 0;
  if (rightDate !== leftDate) {
    return rightDate - leftDate;
  }

  return (right.amountPurchased ?? -1) - (left.amountPurchased ?? -1);
}

function formatCurrency(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value);
}

function formatShares(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 100 ? 2 : 0,
  }).format(value);
}

function formatPrice(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(parsed));
}

export default function InsiderTradesPanel({
  selectedSector = "All",
  analystLeader,
}: {
  selectedSector?: string;
  analystLeader?: SigiAnalystLeader | null;
}) {
  const [rows, setRows] = useState<InsiderTradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<Omit<InsiderTradesFeed, "rows"> | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    async function loadRows() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (selectedSector && selectedSector !== "All") {
          params.set("sector", selectedSector);
        }

        const response = await fetch(
          `/api/experts/insiders${params.toString() ? `?${params.toString()}` : ""}`,
          { cache: "no-store", signal: controller.signal }
        );
        const data = (await response.json()) as Partial<InsiderTradesFeed> & {
          ok?: boolean;
          error?: string;
          rows?: InsiderTradeRow[];
        };

        if (!response.ok || data.ok === false) {
          throw new Error(data.error || "Failed to load insider trades");
        }
        if (!Array.isArray(data.rows) || !Array.isArray(data.warnings) ||
            typeof data.scannedFilings !== "number" || typeof data.matchedPurchases !== "number" ||
            typeof data.source !== "string" || typeof data.updatedAt !== "string") {
          throw new Error("FMP insider feed returned an unexpected format.");
        }

        if (!alive) return;
        setRows(Array.isArray(data.rows) ? data.rows : []);
        setCoverage({
          source: data.source, updatedAt: data.updatedAt, scannedFilings: data.scannedFilings,
          matchedPurchases: data.matchedPurchases, warnings: data.warnings,
        });
      } catch (nextError) {
        if (!alive) return;
        setRows([]);
        setCoverage(null);
        setError(nextError instanceof Error ? nextError.message : "Failed to load insider trades");
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadRows();
    const timer = window.setInterval(loadRows, 1000 * 60 * 15);

    return () => {
      alive = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [selectedSector, attempt]);

  const orderedRows = useMemo(
    () => [...rows].sort((left, right) => compareRowsByLeaderCorrelation(left, right, analystLeader ?? null)),
    [analystLeader, rows]
  );
  const leaderOverlapCount = useMemo(() => {
    const matches = buildLeaderMatchSet(analystLeader ?? null);
    return orderedRows.filter((row) => matches.has(row.symbol)).length;
  }, [analystLeader, orderedRows]);
  const flags = useMemo(() => {
    const nextFlags = buildSigiFlags(orderedRows);

    if (analystLeader && leaderOverlapCount > 0) {
      nextFlags.unshift({
        label: "Analyst Alignment",
        detail: `${leaderOverlapCount} insider row${leaderOverlapCount === 1 ? " aligns" : "s align"} with ${analystLeader.analyst}'s current leadership basket.`,
        tone: "cyan",
      });
    }

    return nextFlags;
  }, [analystLeader, leaderOverlapCount, orderedRows]);

  return (
    <section className="rounded-[28px] border border-white/10 bg-black/30 p-5 shadow-[0_0_28px_rgba(255,255,255,0.03)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300/90">
            Insider Trading
          </div>
          <p className="mt-1 max-w-2xl text-[14px] leading-6 text-white/48">
            {selectedSector === "All"
              ? "Up to 20 recent reported insider purchases from FMP Form 4 filings, including transaction prices, dollar values, and ownership details."
              : `Up to 20 recent reported insider purchases aligned to ${selectedSector}, from FMP Form 4 filings.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100">
            FMP · Form 4
          </span>
          <button type="button" disabled={loading} onClick={() => setAttempt((value) => value + 1)}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5 disabled:opacity-50">
            Refresh
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-white/45">
        Purchases only (code P: open-market or private purchases), not sales, grants, gifts, or option exercises.
        Dollar amounts are reported shares × transaction price, not current market value.
        Filings can report older trades; neither filing date nor trade date implies real-time activity.
        {analystLeader ? " Analyst-basket matches appear first; remaining rows are ordered by trade date." : " Rows are ordered by trade date."}
      </p>
      {coverage && !loading && !error && (
        <div className="mt-3 space-y-2 text-xs leading-5 text-white/50">
          <p>
            Scanned {coverage.scannedFilings} latest filing rows; {coverage.matchedPurchases} matching purchases before the 20-row cap.
            {" "}Feed retrieved {new Date(coverage.updatedAt).toLocaleString()}.
            {" "}FMP responses cache for 15 minutes; refresh does not bypass the provider cache.
            {" "}Coverage is limited to this filing sample, not all insider activity.
          </p>
          {coverage.warnings.length > 0 && (
            <details className="text-amber-200">
              <summary className="cursor-pointer">Company data coverage warnings ({coverage.warnings.length})</summary>
              <ul className="mt-1 list-inside list-disc">
                {coverage.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
              {selectedSector !== "All" && <p>Rows without a sector cannot be included in the sector-filtered results.</p>}
            </details>
          )}
        </div>
      )}
      {loading ? (
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-6 text-sm text-white/55">
          Loading latest insider purchases...
        </div>
      ) : error ? (
        <div role="alert" className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/8 px-4 py-6 text-sm text-rose-100/80">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-6 text-sm text-white/55">
          {selectedSector === "All"
            ? "No insider purchases were found in the scanned filing sample."
            : `No insider purchases matching ${selectedSector} were found in the scanned filing sample.`}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/8 px-4 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
              SIGI Summary
            </div>
            <p className="mt-2 text-sm leading-6 text-white/80">{buildSigiSummary(orderedRows)}</p>
          </div>

          {flags.length > 0 ? (
            <div className="grid gap-3 xl:grid-cols-3">
              {flags.map((flag) => (
                <div
                  key={`${flag.label}-${flag.detail}`}
                  className={`rounded-2xl border px-4 py-3 ${flagClasses(flag.tone)}`}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-current/80">
                    {flag.label}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-current">{flag.detail}</div>
                </div>
              ))}
            </div>
          ) : null}

          {orderedRows.map((row, index) => {
            const leaderMatchLabel = getAnalystLeaderMatchLabel(row, analystLeader ?? null);

            return (
            <article
              key={`${row.symbol}-${row.purchaserName}-${row.transactionDate}-${row.filingUrl}-${index}`}
              className="rounded-2xl border border-white/10 bg-white/3 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/stocks/${encodeURIComponent(row.symbol)}`}
                    className="block transition hover:text-cyan-200"
                  >
                    <div className="wrap-break-word text-base font-semibold text-white">
                      {row.companyName}
                    </div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">
                      {row.symbol}
                    </div>
                  </Link>

                  {getRowToneChips(row).length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {leaderMatchLabel ? (
                        <span className="rounded-full border border-cyan-300/30 bg-cyan-300/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
                          {leaderMatchLabel}
                        </span>
                      ) : null}
                      {getRowToneChips(row).map((chip) => (
                        <span
                          key={`${row.symbol}-${chip.label}`}
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${chip.className}`}
                        >
                          {chip.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  {formatCurrency(row.amountPurchased)}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetaStat label="Reported purchase value" value={formatCurrency(row.amountPurchased)} />
                <MetaStat label="Shares" value={formatShares(row.sharesPurchased)} />
                <MetaStat label="Trade Date" value={formatDate(row.transactionDate)} />
                <MetaStat label="Buyer" value={`${row.purchaserName} · ${row.purchaserTitle}`} />
                <MetaStat label="Price per share" value={formatPrice(row.pricePerShare)} />
                <MetaStat label="Reported shares owned after" value={formatShares(row.sharesOwnedAfter)} />
                <MetaStat label="Ownership" value={row.ownershipType ?? "Not disclosed"} />
                <MetaStat label="Security" value={row.securityName ?? "Not disclosed"} />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/45">
                <span>{row.transactionType}{row.formType ? ` · Form ${row.formType}` : ""}</span>
                <div className="flex flex-wrap items-center gap-3">
                  <span>Filed {formatDate(row.filingDate)}</span>
                  <Link
                    href={`/today?ticker=${encodeURIComponent(row.symbol)}`}
                    className="font-semibold text-emerald-200 transition hover:text-emerald-100"
                  >
                    Analyze with SIGI →
                  </Link>
                </div>
                {row.filingUrl ? (
                  <a
                    href={row.filingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-cyan-200 transition hover:text-cyan-100"
                  >
                    SEC filing ↗
                  </a>
                ) : null}
              </div>
            </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MetaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/8 bg-black/25 px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {label}
      </div>
      <div className="mt-2 wrap-break-word text-sm font-semibold leading-6 text-white/88">
        {value}
      </div>
    </div>
  );
}