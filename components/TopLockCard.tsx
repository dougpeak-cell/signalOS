import Link from "next/link";
import type { ReactNode } from "react";

type TopLockCardProps = {
  isPro: boolean;
  gameId: number;
  title: string;
  startText: string;
  teamName?: string | null;
  playerName?: string | null;
  lockPct?: number | null;   // 0..100
  value?: number | null;     // hybrid score
  reasons?: string[];
  rank?: number;
};

function BlurLine({ isPro, children }: { isPro: boolean; children: ReactNode }) {
  if (isPro) return <>{children}</>;
  return <span className="blur-sm opacity-60 select-none">{children}</span>;
}

export default function TopLockCard({
  isPro,
  gameId,
  title,
  startText,
  teamName,
  playerName,
  lockPct,
  value,
  reasons = [],
}: TopLockCardProps) {
  const hasPick = !!playerName;

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-slate-500">Top Lock</div>
          <div className="text-lg font-semibold truncate">{title}</div>
          <div className="text-sm text-slate-600 mt-1">Start: {startText}</div>
        </div>

        <Link
          href={`/games/${gameId}`}
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          View →
        </Link>
      </div>

      <div className="mt-4 rounded-xl border bg-slate-50 p-4">
        {hasPick ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm text-slate-600">Pick:</div>

              <div className="font-semibold">
                <BlurLine isPro={isPro}>
                  {playerName}
                </BlurLine>
              </div>

              {teamName ? (
                <div className="text-sm text-slate-500">
                  <BlurLine isPro={isPro}>· {teamName}</BlurLine>
                </div>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm">
                <span className="font-semibold text-slate-700">🔒 Lock</span>
                <span className="font-semibold">
                  <BlurLine isPro={isPro}>
                    {lockPct != null ? `${lockPct}%` : "—"}
                  </BlurLine>
                </span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm">
                <span className="font-semibold text-slate-700">⭐ Value</span>
                <span className="font-semibold">
                  <BlurLine isPro={isPro}>
                    {value != null && Number.isFinite(value) ? value.toFixed(1) : "—"}
                  </BlurLine>
                </span>
              </div>

              {reasons.length ? (
                <div className="text-sm text-slate-600">
                  <BlurLine isPro={isPro}>
                    {reasons.slice(0, 2).join(" · ")}
                  </BlurLine>
                </div>
              ) : null}
            </div>

            {!isPro ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3">
                <div className="text-sm text-slate-700">
                  Unlock player names, Value, Lock %, and reasons.
                </div>
                <Link
                  href="/pricing"
                  className="rounded-lg bg-black px-3 py-2 text-sm text-white"
                >
                  Upgrade
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <div className="text-sm text-slate-500">No predictions yet.</div>
        )}
      </div>
    </div>
  );
}
