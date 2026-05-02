import Link from "next/link";

type NewsRow = {
  id: string;
  headline: string;
  source?: string;
  href?: string;
};

export default function TrendingNewsList({
  rows,
}: {
  rows: NewsRow[];
}) {
  return (
    <div className="rounded-3xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] p-4 shadow-[0_0_0_1px_rgba(0,255,255,0.05),0_0_24px_rgba(0,255,255,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
          Trending News
        </div>
        <Link href="/news" className="text-xs text-white/45 hover:text-white">
          View news
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {rows.slice(0, 4).map((row, index) => (
          <Link
            key={row.id}
            href={row.href || "/news"}
            className="flex items-start gap-3 rounded-2xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] px-3 py-3 transition hover:border-cyan-400/25 hover:bg-cyan-400/6"
          >
            <div className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-400/10 bg-cyan-400/6 text-[11px] font-semibold text-cyan-100/60">
              {index + 1}
            </div>

            <div className="min-w-0">
              <div className="text-sm font-medium leading-6 text-white/85">
                {row.headline}
              </div>
              {row.source ? (
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-white/40">
                  {row.source}
                </div>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}