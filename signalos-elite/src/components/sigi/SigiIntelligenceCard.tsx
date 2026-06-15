import type { SigiIntelligenceCard } from "@/types/sigiIntelligence";

export default function SigiIntelligenceCardView({
  card,
}: {
  card: SigiIntelligenceCard;
}) {
  return (
    <div className="rounded-[28px] border border-cyan-400/14 bg-[linear-gradient(180deg,rgba(10,18,34,0.92),rgba(7,12,24,0.9))] p-4 shadow-[0_0_0_1px_rgba(34,211,238,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/76">
            Sigi Intelligence
          </div>
          <div className="mt-2 text-sm text-white/52">
            {card.ticker} • {card.companyName}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-right">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
            SignalOS Score
          </div>
          <div className="mt-1 text-2xl font-black text-cyan-100">
            {card.signalOSScore}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <Metric label="Trend" value={card.trendDirection} />
        <Metric label="Momentum" value={card.momentumStatus} />
        <Metric label="Sector" value={card.sectorStrength} />
        <Metric label="Risk" value={card.riskMeter} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        <Metric label="Analyst Confidence" value={card.analystConfidence} accent="emerald" />
        <Metric label="Suggested Action" value={card.suggestedAction} accent="cyan" />
        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/4 px-3 py-3 sm:col-span-2 2xl:col-span-1">
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/36">Key Levels</div>
          <div className="mt-2 space-y-1 text-sm text-white/78">
            <div>Support: {card.keyLevels.support}</div>
            <div>Resistance: {card.keyLevels.resistance}</div>
            <div>Breakout: {card.keyLevels.breakout}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <CaseBlock title="Bull Case" items={card.bullCase} accent="emerald" />
        <CaseBlock title="Bear Case" items={card.bearCase} accent="rose" />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm leading-6 text-white/72">
        {card.summary}
      </div>

      <div className="mt-4 text-xs leading-6 text-white/46">{card.disclaimer}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "cyan" | "emerald";
}) {
  const accentClass =
    accent === "cyan"
      ? "border-cyan-400/14 bg-cyan-400/6"
      : accent === "emerald"
        ? "border-emerald-400/14 bg-emerald-400/6"
        : "border-white/10 bg-white/4";

  const valueClass =
    accent === "cyan"
      ? "text-cyan-100"
      : accent === "emerald"
        ? "text-emerald-100"
        : "text-white";

  return (
    <div className={`min-w-0 rounded-2xl border px-3 py-3 ${accentClass}`}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/36">{label}</div>
      <div className={`mt-2 wrap-break-word text-sm leading-6 font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
}

function CaseBlock({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: "emerald" | "rose";
}) {
  const accentClass =
    accent === "emerald"
      ? "border-emerald-400/14 bg-emerald-400/6"
      : "border-rose-400/14 bg-rose-400/6";
  const labelClass =
    accent === "emerald"
      ? "text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-200/78"
      : "text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-200/78";

  return (
    <div className={`rounded-2xl border p-4 ${accentClass}`}>
      <div className={labelClass}>{title}</div>
      <div className="mt-3 space-y-2 text-sm leading-6 text-white/74">
        {items.map((item, index) => (
          <div key={`${title}-${index}-${item}`}>• {item}</div>
        ))}
      </div>
    </div>
  );
}