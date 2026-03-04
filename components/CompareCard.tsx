type PredRow = {
  player_id: number;
  predicted_points: number | null;
  predicted_rebounds: number | null;
  predicted_assists: number | null;
  confidence: number | null;
};

function fmt(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined) return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

function isLock(conf: number | null | undefined) {
  const v = Number(conf);
  return Number.isFinite(v) && v >= 85;
}

function projFantasy(pred?: PredRow) {
  const pts = pred?.predicted_points ?? 0;
  const reb = pred?.predicted_rebounds ?? 0;
  const ast = pred?.predicted_assists ?? 0;
  const score = pts + 1.2 * reb + 1.5 * ast;
  return Number.isFinite(score) ? score : null;
}

function confBadge(v?: number | null) {
  if (v == null) return { text: "—", cls: "bg-slate-100 text-slate-500" };
  const pctText = `${Math.round(v)}%`;
  if (v >= 85) return { text: pctText, cls: "bg-emerald-50 text-emerald-800" };
  if (v >= 70) return { text: pctText, cls: "bg-amber-50 text-amber-800" };
  return { text: pctText, cls: "bg-rose-50 text-rose-800" };
}

export default function CompareCard(props: {
  cmpIds: number[];
  homePlayers: any[];
  awayPlayers: any[];
  predByPlayer: Map<number, PredRow>;
  clearHref: string;
}) {
  const { cmpIds, homePlayers, awayPlayers, predByPlayer, clearHref } = props;

  const all = [...homePlayers, ...awayPlayers];
  const byId = new Map<number, any>();
  all.forEach((p) => {
    const id = Number(p?.id);
    if (Number.isFinite(id)) byId.set(id, p);
  });

  const players = cmpIds.map((id) => byId.get(id)).filter(Boolean);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-md p-4 transition-shadow hover:shadow-lg">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">Compare</div>
        <a href={clearHref} className="text-xs text-slate-600 hover:text-slate-900">
          Clear
        </a>
      </div>

      {players.length === 0 ? (
        <div className="text-sm text-slate-500 mt-2">Select up to 2 players.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          {players.map((p: any) => {
            const pid = Number(p.id);
            const pred = predByPlayer.get(pid);
            const proj = projFantasy(pred);
            const badge = confBadge(pred?.confidence);

            return (
              <div key={pid} className="rounded-lg border border-slate-200 p-3">
                <div className="font-semibold text-slate-900">{p.name}</div>

                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-[11px] uppercase text-slate-500">Proj</div>
                    <div className="font-semibold tabular-nums">{fmt(proj, 1)}</div>
                  </div>

                  <div>
                    <div className="text-[11px] uppercase text-slate-500">Conf</div>
                    <div
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}
                      title={pred?.confidence != null ? `Confidence ${Math.round(pred.confidence)}%` : "No confidence"}
                    >
                      {badge.text}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] uppercase text-slate-500">P/R/A</div>
                    <div className="tabular-nums">
                      {pred ? (
                        <>
                          {fmt(pred.predicted_points)} / {fmt(pred.predicted_rebounds)} /{" "}
                          {fmt(pred.predicted_assists)}
                        </>
                      ) : (
                        <span className="text-slate-400">— / — / —</span>
                      )}
                    </div>
                  </div>
                </div>

                {isLock(pred?.confidence) ? (
                  <div className="mt-2 text-xs text-orange-700">🔥 Lock</div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}