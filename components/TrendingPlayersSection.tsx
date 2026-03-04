import Link from "next/link";

type Row = {
  playerId: number;
  playerName: string;
  teamName: string | null;
  watchers: number;
};

export default function TrendingPlayersSection({
  rows,
}: {
  rows: Row[];
}) {
  const visible = rows.slice(0, 8);

  return (
    <section className="mx-auto max-w-5xl px-6 pb-10">
      <div>
        <div className="text-xl font-bold">Trending Players</div>
        <div className="text-sm text-slate-600 mt-1">
          Most-starred players across users.
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {visible.map((r) => (
          <Link
            key={r.playerId}
            href={`/players/${r.playerId}`}
            className="rounded-2xl border bg-white p-4 shadow-sm hover:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{r.playerName}</div>
                <div className="text-sm text-slate-600">{r.teamName ?? "—"}</div>
              </div>
              <div className="text-xs px-2 py-1 rounded-full border bg-slate-50 shrink-0">
                ⭐ <span className="font-semibold">{r.watchers}</span>
              </div>
            </div>
          </Link>
        ))}

        {visible.length === 0 ? (
          <div className="rounded-2xl border bg-white p-5 text-sm text-slate-500 sm:col-span-2">
            No trending players yet.
          </div>
        ) : null}
      </div>
    </section>
  );
}
