import Link from "next/link";
import type { ReactElement } from "react";

import SetupsSessionAutoSync from "@/components/screener/SetupsSessionAutoSync";
import PageHeaderBlock from "@/components/shell/PageHeaderBlock";
import { getSetupDiscoveryData } from "@/lib/today/setupDiscoveryData";
import {
  buildRenderablePreMarketEmergingSetups,
  countPreMarketEmergingCandidates,
  type TodaySetupSession,
} from "@/lib/today/pageData";
import { isPreMarketNow } from "@/lib/today/marketPhase";
import type { RankedSetupItem } from "@/lib/today/setupDiscovery";

type SetupsPageProps = {
  searchParams?: Promise<{
    view?: string;
    session?: string;
    direction?: string;
    minPrice?: string;
    minVolume?: string;
    catalyst?: string;
    rvol?: string;
    mobilePreview?: string;
  }>;
};

type PriceRangeKey = "2-5" | "5-10" | "10-25" | "25-100" | "100+";

const MIN_VOLUME_PRESETS = [
  { label: "Any", value: null },
  { label: "500K+", value: 500_000 },
  { label: "1M+", value: 1_000_000 },
  { label: "5M+", value: 5_000_000 },
] as const;

const MIN_PRICE_PRESETS = [
  { label: "Any", value: null },
  { label: "$2-$5", value: "2-5" },
  { label: "$5-$10", value: "5-10" },
  { label: "$10-$25", value: "10-25" },
  { label: "$25-$100", value: "25-100" },
  { label: "$100+", value: "100+" },
] as const;

const DIRECTION_PRESETS = [
  { label: "Any", value: "both" },
  { label: "Bullish", value: "bullish" },
  { label: "Bearish", value: "bearish" },
] as const;

const RVOL_PRESETS = [
  { label: "Any", value: "0" },
  { label: "2x+", value: "1" },
] as const;

const CATALYST_PRESETS = [
  { label: "Any", value: "0" },
  { label: "Catalyst Only", value: "1" },
] as const;

function normalizePriceRange(value?: string): PriceRangeKey | null {
  if (!value) return null;

  if (value === "2" || value === "2-5") return "2-5";
  if (value === "5" || value === "5-10") return "5-10";
  if (value === "10" || value === "10-25") return "10-25";
  if (value === "25" || value === "25-100") return "25-100";
  if (value === "100" || value === "100+") return "100+";

  return null;
}

function toNumber(value?: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSession(value?: string): TodaySetupSession {
  if (value === "pre") return "pre";
  if (value === "regular") return "regular";
  return isPreMarketNow() ? "pre" : "regular";
}

function normalizeDirection(value?: string): "both" | "bullish" | "bearish" {
  if (value === "bullish" || value === "bearish") return value;
  return "both";
}

function formatNumber(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return value.toLocaleString();
}

function formatPrice(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `$${value.toFixed(2)}`;
}

function formatPercent(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function matchesPriceRange(price: number | null | undefined, priceRange: PriceRangeKey | null) {
  if (priceRange == null) return true;

  const value = Number(price ?? 0);
  if (!Number.isFinite(value) || value <= 0) return false;

  if (priceRange === "2-5") return value >= 2 && value < 5;
  if (priceRange === "5-10") return value >= 5 && value < 10;
  if (priceRange === "10-25") return value >= 10 && value < 25;
  if (priceRange === "25-100") return value >= 25 && value < 100;
  return value >= 100;
}

function filterRows(
  rows: RankedSetupItem[],
  {
    direction,
    minPrice,
    minVolume,
    catalystOnly,
    highRvol,
  }: {
    direction: "both" | "bullish" | "bearish";
    minPrice: PriceRangeKey | null;
    minVolume: number | null;
    catalystOnly: boolean;
    highRvol: boolean;
  }
) {
  return rows.filter((row) => {
    if (direction !== "both" && row.bias !== direction) return false;
    if (!matchesPriceRange(row.price, minPrice)) return false;
    if (minVolume != null && (row.volume ?? 0) < minVolume) return false;
    if (catalystOnly && !(row.hasMajorNews || row.hasEarnings || row.hasAnalystAction)) {
      return false;
    }
    if (highRvol && (row.rvol ?? 0) < 2) return false;
    return true;
  });
}

function filterLink(params: {
  session: TodaySetupSession;
  direction: "both" | "bullish" | "bearish";
  minPrice: PriceRangeKey | null;
  minVolume: number | null;
  catalystOnly: boolean;
  highRvol: boolean;
  mobilePreview?: boolean;
}) {
  const search = new URLSearchParams();
  search.set("session", params.session);
  if (params.direction !== "both") search.set("direction", params.direction);
  if (params.minPrice != null) search.set("minPrice", String(params.minPrice));
  if (params.minVolume != null) search.set("minVolume", String(params.minVolume));
  if (params.catalystOnly) search.set("catalyst", "1");
  if (params.highRvol) search.set("rvol", "1");
  if (params.mobilePreview) search.set("mobilePreview", "1");
  return `/screener/setups?${search.toString()}`;
}

function filterPillClass(isActive: boolean): string {
  return isActive
    ? "inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/14 px-3.5 py-1.5 text-xs font-medium text-cyan-200 transition"
    : "inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3.5 py-1.5 text-xs font-medium text-white/60 transition hover:border-cyan-400/20 hover:text-cyan-100";
}

function renderFilterControls({
  session,
  direction,
  minPrice,
  minVolume,
  catalystOnly,
  highRvol,
  isMobilePreview,
  filterCardClass,
  filterPillRowClass,
}: {
  session: TodaySetupSession;
  direction: "both" | "bullish" | "bearish";
  minPrice: PriceRangeKey | null;
  minVolume: number | null;
  catalystOnly: boolean;
  highRvol: boolean;
  isMobilePreview: boolean;
  filterCardClass: string;
  filterPillRowClass: string;
}) {
  return (
    <div className={`grid ${isMobilePreview ? "grid-cols-2 gap-3.5" : "gap-3 md:grid-cols-5"}`}>
      <fieldset className={filterCardClass}>
        <legend className="px-1 text-[10px] uppercase tracking-[0.18em] text-white/35">
          Direction
        </legend>
        <div className={filterPillRowClass}>
          {DIRECTION_PRESETS.map((preset) => {
            const isChecked = direction === preset.value;

            return (
              <Link
                key={preset.value}
                href={filterLink({
                  session,
                  direction: preset.value,
                  minPrice,
                  minVolume,
                  catalystOnly,
                  highRvol,
                  mobilePreview: isMobilePreview,
                })}
                className={filterPillClass(isChecked)}
              >
                {preset.label}
              </Link>
            );
          })}
        </div>
      </fieldset>
      <fieldset className={`${filterCardClass} ${isMobilePreview ? "col-span-2" : ""}`}>
        <legend className="px-1 text-[10px] uppercase tracking-[0.18em] text-white/35">
          Min Price
        </legend>
        <div className={filterPillRowClass}>
          {MIN_PRICE_PRESETS.map((preset) => {
            const isChecked = preset.value === minPrice;

            return (
              <Link
                key={preset.label}
                href={filterLink({
                  session,
                  direction,
                  minPrice: preset.value,
                  minVolume,
                  catalystOnly,
                  highRvol,
                  mobilePreview: isMobilePreview,
                })}
                className={filterPillClass(isChecked)}
              >
                {preset.label}
              </Link>
            );
          })}
        </div>
      </fieldset>
      <fieldset className={`${filterCardClass} ${isMobilePreview ? "col-span-2" : ""}`}>
        <legend className="px-1 text-[10px] uppercase tracking-[0.18em] text-white/35">
          Min Volume
        </legend>
        <div className={filterPillRowClass}>
          {MIN_VOLUME_PRESETS.map((preset) => {
            const isChecked = preset.value === minVolume;

            return (
              <Link
                key={preset.label}
                href={filterLink({
                  session,
                  direction,
                  minPrice,
                  minVolume: preset.value,
                  catalystOnly,
                  highRvol,
                  mobilePreview: isMobilePreview,
                })}
                className={filterPillClass(isChecked)}
              >
                {preset.label}
              </Link>
            );
          })}
        </div>
      </fieldset>
      <fieldset className={filterCardClass}>
        <legend className="px-1 text-[10px] uppercase tracking-[0.18em] text-white/35">
          Catalyst
        </legend>
        <div className={filterPillRowClass}>
          {CATALYST_PRESETS.map((preset) => {
            const isChecked = catalystOnly ? preset.value === "1" : preset.value === "0";

            return (
              <Link
                key={preset.value}
                href={filterLink({
                  session,
                  direction,
                  minPrice,
                  minVolume,
                  catalystOnly: preset.value === "1",
                  highRvol,
                  mobilePreview: isMobilePreview,
                })}
                className={filterPillClass(isChecked)}
              >
                {preset.label}
              </Link>
            );
          })}
        </div>
      </fieldset>
      <fieldset className={filterCardClass}>
        <legend className="px-1 text-[10px] uppercase tracking-[0.18em] text-white/35">
          RVOL
        </legend>
        <div className={filterPillRowClass}>
          {RVOL_PRESETS.map((preset) => {
            const isChecked = highRvol ? preset.value === "1" : preset.value === "0";

            return (
              <Link
                key={preset.value}
                href={filterLink({
                  session,
                  direction,
                  minPrice,
                  minVolume,
                  catalystOnly,
                  highRvol: preset.value === "1",
                  mobilePreview: isMobilePreview,
                })}
                className={filterPillClass(isChecked)}
              >
                {preset.label}
              </Link>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

export default async function SetupsPage({
  searchParams,
}: SetupsPageProps): Promise<ReactElement> {
  const params = (await searchParams) ?? {};
  const session = normalizeSession(params.session);
  const direction = normalizeDirection(params.direction);
  const minPrice = normalizePriceRange(params.minPrice);
  const minVolume = toNumber(params.minVolume);
  const catalystOnly = params.catalyst === "1";
  const highRvol = params.rvol === "1";
  const isMobilePreview = params.mobilePreview === "1";
  const filterCardClass = `min-w-0 rounded-2xl border border-white/10 bg-black/20 text-sm text-white/80 ${isMobilePreview ? "px-3.5 py-3.5" : "px-4 py-3"}`;
  const filterPillRowClass = `mt-2 flex flex-wrap ${isMobilePreview ? "gap-2.5" : "gap-2"}`;

  const setupDiscovery = await getSetupDiscoveryData({
    signalLimit: 80,
    setupUniverseLimit: 40,
  });

  const sourceRows =
    session === "pre"
      ? buildRenderablePreMarketEmergingSetups(setupDiscovery)
      : setupDiscovery.emerging;
  const preMarketRawCandidateCount = countPreMarketEmergingCandidates(setupDiscovery);
  const filteredRows = filterRows(sourceRows, {
    direction,
    minPrice,
    minVolume,
    catalystOnly,
    highRvol,
  });
  const preMarketFilteredCount = Math.max(0, sourceRows.length - filteredRows.length);

  return (
    <div className="space-y-6">
      <SetupsSessionAutoSync initialSession={session} />

      <PageHeaderBlock
        eyebrow="Sigi Market Setup Rankings"
        title="Setups"
        description="Emerging setups powered by Sigi Intelligence."
      />

      <section className="rounded-[28px] border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] p-5 shadow-[0_0_0_1px_rgba(0,255,255,0.05),0_0_30px_rgba(0,255,255,0.08)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/14 px-4 py-2 text-sm text-cyan-200">
            Emerging Setups
          </span>
          <Link
            href={filterLink({
              session: "regular",
              direction,
              minPrice,
              minVolume,
              catalystOnly,
              highRvol,
              mobilePreview: isMobilePreview,
            })}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              session === "regular"
                ? "border-cyan-400/30 bg-cyan-400/14 text-cyan-200"
                : "border-cyan-400/10 bg-black/20 text-cyan-100/70 hover:border-cyan-400/25 hover:text-cyan-50"
            }`}
          >
            Regular Session
          </Link>
          <Link
            href={filterLink({
              session: "pre",
              direction,
              minPrice,
              minVolume,
              catalystOnly,
              highRvol,
              mobilePreview: isMobilePreview,
            })}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              session === "pre"
                ? "border-cyan-400/30 bg-cyan-400/14 text-cyan-200"
                : "border-cyan-400/10 bg-black/20 text-cyan-100/70 hover:border-cyan-400/25 hover:text-cyan-50"
            }`}
          >
            Pre-Market
          </Link>
          <Link
            href={isMobilePreview ? "/watchlist?mobilePreview=1" : "/watchlist"}
            className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/60 transition hover:border-white/20 hover:text-white"
          >
            Watchlist Setups
          </Link>
        </div>

        {isMobilePreview ? (
          <details className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-white/80">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-cyan-100 marker:hidden">
              <span>Filters</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-white/50">
                {filteredRows.length} visible
              </span>
            </summary>
            <div className="mt-3">
              {renderFilterControls({
                session,
                direction,
                minPrice,
                minVolume,
                catalystOnly,
                highRvol,
                isMobilePreview,
                filterCardClass,
                filterPillRowClass,
              })}
            </div>
          </details>
        ) : (
          <div className="mt-4">
            {renderFilterControls({
              session,
              direction,
              minPrice,
              minVolume,
              catalystOnly,
              highRvol,
              isMobilePreview,
              filterCardClass,
              filterPillRowClass,
            })}
          </div>
        )}

        {session === "pre" ? (
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-white/40">
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
              Raw: {preMarketRawCandidateCount}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
              Displayed: {filteredRows.length}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
              Filtered Out: {preMarketFilteredCount}
            </span>
          </div>
        ) : null}

        <div className={`overflow-hidden rounded-3xl border border-white/8 bg-black/20 ${isMobilePreview ? "mt-4" : "mt-5"}`}>
          {isMobilePreview ? (
            <div className="divide-y divide-white/6">
              {filteredRows.map((row, index) => (
                <div key={row.ticker} className="space-y-3 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">#{index + 1}</div>
                      <Link href={`/stocks/${row.ticker}${isMobilePreview ? "?mobilePreview=1" : ""}`} className="mt-1 block text-2xl font-semibold text-cyan-200 hover:text-cyan-100">
                        {row.ticker}
                      </Link>
                      <div className="mt-1 text-sm leading-6 text-white/70">{row.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">Price</div>
                      <div className="mt-1 text-xl font-semibold text-white">{formatPrice(row.price)}</div>
                      <div className="mt-1 text-sm font-medium text-cyan-200">{formatPercent(row.changePercent)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-white/80">
                    <div className="rounded-2xl border border-white/8 bg-white/3 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">RVOL</div>
                      <div className="mt-1 font-medium">{row.rvol != null ? `${row.rvol.toFixed(1)}x` : "--"}</div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/3 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Volume</div>
                      <div className="mt-1 font-medium">{formatNumber(row.volume)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/3 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Setup Score</div>
                      <div className="mt-1 font-medium">{row.score.toFixed(1)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/3 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Bias</div>
                      <div className="mt-1 font-medium">{row.setupBiasLabel}</div>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm text-white/75">
                    <div className="rounded-2xl border border-white/8 bg-white/3 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Catalyst</div>
                      <div className="mt-1">{row.catalystLabel}</div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/3 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Structure</div>
                      <div className="mt-1">{row.structureLabel}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <table className="min-w-full divide-y divide-white/8 text-left text-sm text-white/80">
            <thead className="bg-white/4 text-[11px] uppercase tracking-[0.2em] text-white/45">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Ticker</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">% Change</th>
                <th className="px-4 py-3">RVOL</th>
                <th className="px-4 py-3">Volume</th>
                <th className="px-4 py-3">Setup Score</th>
                <th className="px-4 py-3">Bias</th>
                <th className="px-4 py-3">Catalyst</th>
                <th className="px-4 py-3">Structure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {filteredRows.map((row, index) => (
                <tr key={row.ticker} className="transition hover:bg-white/4">
                  <td className="px-4 py-3">#{index + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/stocks/${row.ticker}`} className="font-semibold text-cyan-200 hover:text-cyan-100">
                      {row.ticker}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">{formatPrice(row.price)}</td>
                  <td className="px-4 py-3">{formatPercent(row.changePercent)}</td>
                  <td className="px-4 py-3">{row.rvol != null ? `${row.rvol.toFixed(1)}x` : "--"}</td>
                  <td className="px-4 py-3">{formatNumber(row.volume)}</td>
                  <td className="px-4 py-3">{row.score.toFixed(1)}</td>
                  <td className="px-4 py-3">{row.setupBiasLabel}</td>
                  <td className="px-4 py-3">{row.catalystLabel}</td>
                  <td className="px-4 py-3">{row.structureLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
          )}

          {!filteredRows.length ? (
            <div className="px-4 py-8 text-sm text-white/45">
              {session === "pre"
                ? "Pre-market is active. Signals are limited right now — try lowering filters or check Top Movers."
                : "No setups matched the current filters."}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}