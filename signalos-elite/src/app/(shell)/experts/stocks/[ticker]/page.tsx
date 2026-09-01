import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Clock3 } from "lucide-react";
import { redirect } from "next/navigation";
import {
  loadFmpExpertHistory,
  type FmpExpertHistoryRow,
} from "@/lib/experts/fmpLeaders";
import { getSigiSettingsViewForCurrentUser } from "@/lib/sigi/settings";

type PageProps = {
  params: Promise<{ ticker: string }>;
};

const HISTORY_DISPLAY_LIMIT = 100;

function transitionClasses(transition: FmpExpertHistoryRow["ratingTransition"]) {
  if (transition === "upgrade") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  }
  if (transition === "downgrade") {
    return "border-rose-400/25 bg-rose-400/10 text-rose-300";
  }
  return "border-cyan-400/20 bg-cyan-400/8 text-cyan-200";
}

function transitionLabel(row: FmpExpertHistoryRow) {
  if (row.ratingTransition === "upgrade") return "Upgrade";
  if (row.ratingTransition === "downgrade") return "Downgrade";
  if (row.ratingTransition === "reiterate") return "Reiterated";
  return row.action ?? "Rating action";
}

export default async function ExpertStockHistoryPage({ params }: PageProps) {
  const settings = await getSigiSettingsViewForCurrentUser();
  if (!settings.hasProFeatures) redirect("/experts");

  const { ticker: tickerParam } = await params;
  const ticker = decodeURIComponent(tickerParam).trim().toUpperCase();
  const history = await loadFmpExpertHistory(ticker);
  const visibleHistory = history.slice(0, HISTORY_DISPLAY_LIMIT);
  const latest = history[0] ?? null;

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/experts"
          className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Experts
        </Link>

        <header className="mt-6 border-b border-white/10 pb-7">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Analyst Pick History
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-4xl font-semibold text-white md:text-5xl">{ticker}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
                Published analyst rating actions from the live FMP feed, ordered newest first.
                Firms publish on their own schedules, so a stock may not receive a new call every day.
              </p>
            </div>
            <Link
              href={`/stocks/${encodeURIComponent(ticker)}`}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15"
            >
              Open stock
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {latest ? (
          <section className="grid gap-4 border-b border-white/10 py-6 sm:grid-cols-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Latest action</div>
              <div className="mt-2 text-lg font-semibold text-white">{transitionLabel(latest)}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Current rating</div>
              <div className="mt-2 text-lg font-semibold text-white">{latest.currentGrade ?? "Not reported"}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Published</div>
              <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-white">
                <Clock3 className="h-4 w-4 text-cyan-300" />
                {latest.publishedDate}
              </div>
            </div>
          </section>
        ) : null}

        <section className="py-7">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-white">Published calls</h2>
            <span className="text-sm text-white/45">
              {history.length > HISTORY_DISPLAY_LIMIT
                ? `Latest ${HISTORY_DISPLAY_LIMIT} of ${history.length} records`
                : `${history.length} records`}
            </span>
          </div>

          {history.length ? (
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-900 text-[11px] uppercase tracking-[0.14em] text-white/45">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Firm</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Previous</th>
                    <th className="px-4 py-3">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8 bg-slate-950/70">
                  {visibleHistory.map((row, index) => (
                    <tr key={`${row.publishedDate}-${row.firm ?? "firm"}-${index}`}>
                      <td className="whitespace-nowrap px-4 py-4 text-white/65">{row.publishedDate}</td>
                      <td className="px-4 py-4 font-medium text-white">{row.firm ?? "Not reported"}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${transitionClasses(row.ratingTransition)}`}>
                          {transitionLabel(row)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-white/55">{row.previousGrade ?? "-"}</td>
                      <td className="px-4 py-4 font-semibold text-cyan-100">{row.currentGrade ?? "Not reported"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-slate-950/70 px-5 py-8 text-sm text-white/55">
              No published analyst rating history is available for {ticker}.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}