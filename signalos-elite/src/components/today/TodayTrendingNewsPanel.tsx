import Link from "next/link";
import { SectionHeader } from "@/components/today/SectionHeader";
import {
  internalCardStackClass,
  rowListItemClass,
  supportSectionClass,
} from "@/components/today/TodayLayoutPrimitives";
import type { TodayCommandCenterNewsRow } from "@/lib/today/pageData";

export default function TodayTrendingNewsPanel({
  items,
}: {
  items: TodayCommandCenterNewsRow[];
}) {
  const news = items;

  return (
    <section className={supportSectionClass}>
      <SectionHeader
        eyebrow="Trending News"
        title="Headlines in play"
        subtitle="The market stories most likely to shift positioning today."
        action={
          <Link href="/news" className="text-xs text-white/70 hover:text-white">
            View News
          </Link>
        }
      />

      <div className={internalCardStackClass}>
        {news.length ? (
          news.slice(0, 4).map((item, index) => (
            <Link
              key={`${item.href ?? item.id}-${index}`}
              href={item.href || "/news"}
              className={`flex items-start gap-3 rounded-2xl border border-white/10 bg-white/3 transition hover:border-cyan-400/25 hover:bg-cyan-400/5 ${rowListItemClass}`}
            >
              <div className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/3 text-[11px] font-semibold text-cyan-200">
                {index + 1}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium leading-6 text-white/82">{item.headline}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/40">
                  {item.source}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 px-3 py-5 text-sm text-white/50">
            No trending market news is available yet.
          </div>
        )}
      </div>
    </section>
  );
}