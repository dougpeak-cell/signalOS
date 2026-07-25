type ScenarioType = "bull" | "base" | "bear";

type FutureScenarioCardProps = {
  type: ScenarioType;
  probability: number;
  title: string;
  zone?: string | null;
  conditions: string[];
};

const scenarioStyles: Record<
  ScenarioType,
  {
    border: string;
    background: string;
    accent: string;
  }
> = {
  bull: {
    border: "border-emerald-400/25",
    background: "bg-emerald-400/[0.035]",
    accent: "text-emerald-300",
  },
  base: {
    border: "border-cyan-400/25",
    background: "bg-cyan-400/[0.035]",
    accent: "text-cyan-200",
  },
  bear: {
    border: "border-rose-400/25",
    background: "bg-rose-400/[0.035]",
    accent: "text-rose-300",
  },
};

export function FutureScenarioCard({
  type,
  probability,
  title,
  zone,
  conditions,
}: FutureScenarioCardProps) {
  const style = scenarioStyles[type];

  return (
    <article
      className={`rounded-3xl border ${style.border} ${style.background} p-5`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Scenario
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">
            {title}
          </h3>
        </div>

        <div className="text-right">
          <p className={`text-3xl font-semibold ${style.accent}`}>
            {Math.round(probability)}%
          </p>
          <p className="text-[9px] uppercase tracking-[0.2em] text-slate-600">
            Probability
          </p>
        </div>
      </div>

      {zone ? (
        <p className="mt-5 text-sm text-slate-300">
          Possible zone:{" "}
          <span className="font-semibold text-white">{zone}</span>
        </p>
      ) : null}

      <ul className="mt-5 space-y-3">
        {conditions.map((condition) => (
          <li
            key={condition}
            className="flex gap-2 text-sm leading-6 text-slate-300"
          >
            <span className={style.accent}>•</span>
            <span>{condition}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}