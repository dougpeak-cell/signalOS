import Link from "next/link";
import {
  internalCardStackClass,
  majorSectionClass,
  rowListItemClass,
  SectionHeader,
} from "@/components/today/TodayLayoutPrimitives";
import type { TodayRiskItem } from "@/lib/today/pageData";

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

export default function TodayRiskDashboardPanel({
  risks,
}: {
  risks: TodayRiskItem[];
}) {
  return (
    <article className={majorSectionClass}>
      <SectionHeader
        eyebrow="Risk"
        title="Damage control"
        subtitle="Highest-priority bearish pressure and invalidation names from the same shared load."
        action={
          <Link
            href="/portfolio?view=risk&source=%2Ftoday"
            className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-xs text-white/70"
          >
            Open Portfolio
          </Link>
        }
      />

      <div className={internalCardStackClass}>
        {risks.length ? (
          risks.map((item) => (
            <Link
              key={item.ticker}
              href={`/stocks/${item.ticker}?source=%2Ftoday&focus=risk`}
              className={`flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/3 transition hover:border-rose-400/20 hover:bg-rose-400/5 ${rowListItemClass}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-white">{item.ticker}</span>
                  <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-rose-200">
                    {item.riskLabel}
                  </span>
                </div>
                <div className="mt-1 text-xs text-white/45">{item.name}</div>
                <div className="mt-2 text-sm text-white/62">{item.whyThisSetup}</div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-white">{item.score}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">score</div>
                <div className={`mt-2 text-sm ${percentClass(item.changePercent)}`}>
                  {formatPercent(item.changePercent)}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 px-4 py-6 text-sm text-white/55">
            No risk names are in focus yet.
          </div>
        )}
      </div>
    </article>
  );
}