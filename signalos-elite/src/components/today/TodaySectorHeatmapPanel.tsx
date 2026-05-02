import Link from "next/link";
import { SectionHeader } from "@/components/today/SectionHeader";
import type { TodaySectorHeatmapItem } from "@/lib/today/pageData";

function percentClass(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "text-white/45";
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-white/45";
}

function formatPercent(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function tileTone(value?: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return "border-white/10 bg-white/[0.05]";
  }

  if (value >= 3) {
    return "border-cyan-300/10 bg-cyan-400/10";
  }

  if (value > 0) {
    return "border-emerald-300/10 bg-emerald-400/10";
  }

  if (value <= -1.5) {
    return "border-fuchsia-300/10 bg-fuchsia-400/10";
  }

  if (value < 0) {
    return "border-violet-300/10 bg-violet-400/10";
  }

  return "border-white/10 bg-white/[0.05]";
}

function buildSummary(items: TodaySectorHeatmapItem[]) {
  if (!items.length) return "Sector leadership is not available yet.";

  const sorted = [...items].sort(
    (left, right) => (right.averageChangePercent ?? 0) - (left.averageChangePercent ?? 0)
  );

  const leaders = sorted.filter((item) => (item.averageChangePercent ?? 0) > 0).slice(0, 2);
  const laggards = [...sorted]
    .reverse()
    .filter((item) => (item.averageChangePercent ?? 0) < 0)
    .slice(0, 2);

  if (!leaders.length && !laggards.length) {
    return "Sector participation is mixed with no clear leadership split yet.";
  }

  const leaderText = leaders.map((item) => item.sector).join(" and ");
  const laggardText = laggards.map((item) => item.sector).join(" and ");

  if (leaderText && laggardText) {
    return `Leadership is concentrated in ${leaderText} while ${laggardText} lag.`;
  }

  if (leaderText) {
    return `Leadership is concentrated in ${leaderText}.`;
  }

  return `${laggardText} are lagging the broader sector tape.`;
}

export default function TodaySectorHeatmapPanel({
  items,
}: {
  items: TodaySectorHeatmapItem[];
}) {
  const sortedItems = [...items].sort(
    (left, right) => (right.averageChangePercent ?? 0) - (left.averageChangePercent ?? 0)
  );
  const primaryItems = sortedItems.slice(0, 3);
  const secondaryItems = sortedItems.slice(3, 6);

  return (
    <section
      id="sector-heatmap"
      className="rounded-2xl border border-cyan-500/20 bg-[linear-gradient(180deg,rgba(2,6,23,0.96),rgba(3,18,36,0.96))] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
    >
      <SectionHeader
        eyebrow="Sector Heatmap"
        title="Sector Heatmap"
        subtitle="See where money flows while sectors develop the bigger-picture move."
        action={
          <Link
            href="/screener?view=leadership&source=%2Ftoday"
            className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs text-white/70"
          >
            Open Screener
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        {items.length ? (
          <>
            <div className="grid min-h-55 grid-cols-1 gap-3 sm:grid-cols-2">
              {primaryItems.map((item, index) => (
                <div
                  key={item.sector}
                  className={`rounded-2xl p-4 ${tileTone(item.averageChangePercent)} ${
                    index === 0 ? "sm:col-span-2" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-white">{item.sector}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/50">
                        Avg setup score {Math.round(item.averageScore)}
                      </div>
                    </div>
                    <div className={`text-2xl font-semibold ${percentClass(item.averageChangePercent)}`}>
                      {formatPercent(item.averageChangePercent)}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.members.map((member) => (
                      <Link
                        key={`${item.sector}-${member.ticker}`}
                        href={`/stocks/${member.ticker}`}
                        className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/78 transition hover:border-cyan-300/20 hover:bg-cyan-400/5"
                      >
                        {member.ticker}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid min-h-55 grid-cols-1 gap-3">
              {secondaryItems.map((item) => (
                <div
                  key={item.sector}
                  className={`rounded-2xl p-4 ${tileTone(item.averageChangePercent)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-white">{item.sector}</div>
                      <div className="mt-1 text-sm text-white/52">
                        {item.members.map((member) => member.ticker).join(" • ") || "Monitoring"}
                      </div>
                    </div>
                    <div className={`text-xl font-semibold ${percentClass(item.averageChangePercent)}`}>
                      {formatPercent(item.averageChangePercent)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 px-4 py-6 text-sm text-white/55 xl:col-span-2">
            Sector leadership is not available yet.
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/3 px-4 py-3 text-sm text-white/65">
        {buildSummary(sortedItems)}
      </div>
    </section>
  );
}