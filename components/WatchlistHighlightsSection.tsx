import Link from "next/link";

type Row = {
  playerId: number;
  playerName: string;
  teamName: string | null;
  gameId: number | null;
  startText: string | null;
  lockPct: number | null;
  value: number | null;
  reasons: string[];
};

export default function WatchlistHighlightsSection({
  isPro,
  isLoggedIn,
  rows,
}: {
  isPro: boolean;
  isLoggedIn: boolean;
  rows: Row[];
}) {
  const visible = isPro ? rows : rows.slice(0, 3);

  return (
    <section className="mx-auto max-w-5xl px-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-bold">Watchlist Highlights</div>
          <div className="text-sm text-slate-600 mt-1">
            Your starred players, ranked by today’s best projections.
          </div>
        </div>

        {!isLoggedIn ? (
          <Link href="/login" className="text-sm underline">
            Log in to see yours
          </Link>
        ) : (
          <Link href="/watchlist" className="text-sm underline">
            View watchlist →
          </Link>
        )}
      </div>

      <div className="mt-4 grid gap-3">
        {visible.map((r) => (
          <div key={r.playerId} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{r.playerName}</div>
                <div className="text-sm text-slate-600">{r.teamName ?? "—"}</div>
                {r.startText ? <div className="text-xs text-slate-500 mt-1">{r.startText}</div> : null}
                {isPro && r.reasons.length ? (
                  <div className="text-sm text-slate-600 mt-2">{r.reasons.slice(0, 2).join(" · ")}</div>
                ) : null}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs px-2 py-1 rounded-full border bg-slate-50">
                  🔒 <span className="font-semibold">{r.lockPct != null ? `${r.lockPct}%` : "—"}</span>
                </span>
                {isPro ? (
                  <span className="text-xs px-2 py-1 rounded-full border bg-slate-50">
                    ⭐ <span className="font-semibold">{r.value != null ? r.value.toFixed(1) : "—"}</span>
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <Link href={`/players/${r.playerId}`} className="text-sm underline">
                Player →
              </Link>
              {r.gameId ? (
                <Link href={`/games/${r.gameId}`} className="text-sm underline">
                  Game →
                </Link>
              ) : null}
              {!isPro ? (
                <Link href="/pricing" className="text-sm underline">
                  Unlock reasons/value
                </Link>
              ) : null}
            </div>
          </div>
        ))}

        {rows.length === 0 ? (
          <div className="rounded-2xl border bg-white p-5 text-sm text-slate-500">
            {isLoggedIn ? "No watchlist highlights yet." : "Log in to see your watchlist highlights."}
          </div>
        ) : null}
      </div>
    </section>
  );
}
