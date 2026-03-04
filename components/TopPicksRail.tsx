import Link from "next/link";

type Pick = {
  label: string;          // e.g. "LOCK #1"
  title: string;          // e.g. "Gonzaga vs Kansas"
  sub: string | null;     // e.g. "Ryan Nembhard"
  href: string;           // e.g. "/games/123"
  lockPct: number | null; // 0..100
  value: number | null;
};

function pct(x: number | null) {
  return x == null ? "—" : `${Math.round(x)}%`;
}
function num(x: number | null) {
  return x == null || !Number.isFinite(x) ? "—" : x.toFixed(1);
}

export default function TopPicksRail({
  isPro,
  picks,
}: {
  isPro: boolean;
  picks: Pick[];
}) {
  const visible = isPro ? picks : picks.slice(0, 3);

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Top Picks</div>
            {!isPro ? (
              <Link href="/pricing" className="text-xs underline text-slate-600">
                Unlock
              </Link>
            ) : (
              <span className="text-xs text-slate-500">Pro</span>
            )}
          </div>

          <div className="mt-3 space-y-3">
            {visible.map((p, i) => (
              <Link
                key={i}
                href={p.href}
                className="block rounded-xl border bg-slate-50 p-3 hover:bg-slate-100"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-500">{p.label}</div>
                    <div className="text-sm font-semibold truncate">{p.title}</div>
                    {p.sub ? (
                      <div className="text-xs text-slate-600 truncate">{p.sub}</div>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-[11px] text-slate-500">Lock</div>
                    <div className="text-sm font-semibold">{pct(p.lockPct)}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Value</div>
                    <div className="text-sm font-semibold">{num(p.value)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {!isPro ? (
            <div className="mt-3 rounded-xl border bg-white p-3 text-xs text-slate-600">
              Pro unlocks full picks, reasons, edge, and rankings.
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
