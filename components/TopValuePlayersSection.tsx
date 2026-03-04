import Link from "next/link";

type Row = {
  playerId: number;
  playerName: string;
  teamName: string | null;
  opponentName: string | null;
  gameId: number | null;
  startText: string | null;
  lockPct: number | null;
  value: number | null;
  edge: number | null;
};

function pillClass(edge: number | null) {
  if (edge == null) return "bg-slate-100 text-slate-700 border-slate-200";
  if (edge >= 8) return "bg-green-50 text-green-700 border-green-200";
  if (edge >= 3) return "bg-lime-50 text-lime-700 border-lime-200";
  if (edge >= 0) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

export default function TopValuePlayersSection({
  isPro,
  rows,
}: {
  isPro: boolean;
  rows: Row[];
}) {
  const visible = isPro ? rows : rows.slice(0, 5);

  return (
    <section className="mx-auto max-w-5xl px-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-bold">Top Value Players</div>
          <div className="text-sm text-slate-600 mt-1">
            Best “edge” plays ranked by value + confidence.
          </div>
        </div>
        {!isPro ? (
          <Link href="/pricing" className="text-sm underline">
            Unlock all
          </Link>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3">
        {visible.map((r) => (
          <div key={r.playerId} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{r.playerName}</div>
                <div className="text-sm text-slate-600">
                  {r.teamName ?? "—"}
                  {r.opponentName ? <span className="text-slate-400"> · vs {r.opponentName}</span> : null}
                </div>
                {r.startText ? (
                  <div className="text-xs text-slate-500 mt-1">{r.startText}</div>
                ) : null}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-1 rounded-full border ${pillClass(r.edge)}`}>
                  EDGE <span className="font-semibold">{r.edge != null ? r.edge.toFixed(1) : "—"}</span>
                </span>
                <span className="text-xs px-2 py-1 rounded-full border bg-slate-50">
                  🔒 <span className="font-semibold">{r.lockPct != null ? `${r.lockPct}%` : "—"}</span>
                </span>
                <span className="text-xs px-2 py-1 rounded-full border bg-slate-50">
                  ⭐ <span className="font-semibold">{r.value != null ? r.value.toFixed(1) : "—"}</span>
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              {r.gameId ? (
                <Link href={`/games/${r.gameId}`} className="text-sm underline">
                  Game →
                </Link>
              ) : null}
              <Link href={`/players/${r.playerId}`} className="text-sm underline">
                Player →
              </Link>
            </div>
          </div>
        ))}

        {visible.length === 0 ? (
          <div className="rounded-2xl border bg-white p-5 text-sm text-slate-500">
            No value plays found yet.
          </div>
        ) : null}
      </div>
    </section>
  );
}
