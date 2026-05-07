import Link from "next/link";
import { SectionHeader } from "@/components/today/SectionHeader";
import type { RankedSetupItem } from "@/lib/today/setupDiscovery";

type CatalystPanelItem = RankedSetupItem & {
  pulse?: {
    topLabel?: string | null;
  } | null;
};

function catalystBadgeLabel(item: CatalystPanelItem) {
  if (item.hasEarnings) return "Earnings catalyst";
  if (item.hasAnalystAction) return "Analyst action";
  if (item.hasMajorNews) return "News catalyst";
  if (item.hasSectorTailwind) return item.catalystLabel;

  const pulseLabel = String(item.pulse?.topLabel ?? "").trim();
  if (pulseLabel) return pulseLabel;

  const fallbackLabel = String(item.catalystLabel ?? "").trim();
  if (fallbackLabel && fallbackLabel !== "Flow setup") return fallbackLabel;

  const structureLabel = String(item.structureLabel ?? "").trim();
  if (structureLabel) return structureLabel;

  const setupLabel = String(item.setupLabel ?? "").trim();
  if (setupLabel && setupLabel !== "Flow setup") return setupLabel;

  if (item.score >= 85) return "High-conviction setup";
  if (item.score >= 72) return "Active setup";

  return item.bias === "bearish" ? "Risk watch" : "Tape watch";
}

function catalystTone(label?: string | null) {
  const normalized = String(label ?? "").toLowerCase();

  if (normalized.includes("earnings")) {
    return "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-300";
  }

  if (normalized.includes("news") || normalized.includes("analyst")) {
    return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
  }

  return "border-white/10 bg-white/3 text-white/70";
}

export default function TodayUpcomingCatalystsPanel({
  items,
}: {
  items: CatalystPanelItem[];
}) {
  const rows = items
    .map((item) => ({
      item,
      badgeLabel: catalystBadgeLabel(item),
    }))
    .filter((row) => Boolean(row.badgeLabel))
    .filter(
      (row, index, collection) =>
        collection.findIndex((candidate) => candidate.item.ticker === row.item.ticker) === index
    )
    .slice(0, 4);

  return (
    <section className="rounded-2xl border border-cyan-500/15 bg-slate-950/78 p-4 shadow-[0_8px_22px_rgba(0,0,0,0.28)]">
      <SectionHeader
        eyebrow="Upcoming Catalysts"
        title="Names with triggers"
        subtitle="Catalyst-backed setups worth keeping on the front burner."
      />

      <div className="space-y-3">
        {rows.length ? (
          rows.map(({ item, badgeLabel }) => (
            <Link
              key={item.ticker}
              href={`/stocks/${item.ticker}`}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/3 px-3 py-3 transition hover:border-cyan-400/25 hover:bg-cyan-400/5"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">{item.ticker}</div>
                <div className="truncate text-xs text-white/50">{item.name}</div>
              </div>
              <div
                className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${catalystTone(
                  badgeLabel
                )}`}
              >
                {badgeLabel}
              </div>
            </Link>
          ))
        ) : (
          <Link
            href="/screener/setups"
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/3 px-3 py-4 transition hover:border-cyan-400/25 hover:bg-cyan-400/5"
          >
            <div>
              <div className="text-sm font-semibold text-white">Scan active setups</div>
              <div className="mt-1 text-xs text-white/50">
                The board is selective right now. Open the setup grid for the freshest names.
              </div>
            </div>
            <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
              Open grid
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}