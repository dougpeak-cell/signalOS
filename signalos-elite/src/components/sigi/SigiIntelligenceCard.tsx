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
        <Metric label="Trend" value={card.trendDirection} variant="signal" />
        <Metric label="Momentum" value={card.momentumStatus} variant="signal" />
        <Metric label="Sector" value={card.sectorStrength} variant="signal" />
        <Metric label="Risk" value={card.riskMeter} variant="signal" />
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
  variant = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "cyan" | "emerald";
  variant?: "default" | "signal";
}) {
  const signalDisplay = variant === "signal" ? getSignalDisplay(label, value) : null;
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

  if (signalDisplay) {
    return (
      <div className="min-w-0 rounded-2xl border border-white/10 bg-white/4 px-3 py-3">
        <div className="text-[10px] uppercase tracking-[0.16em] text-white/36">{label}</div>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={[
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
              signalDisplay.iconClass,
            ].join(" ")}
            aria-hidden="true"
          >
            {signalDisplay.icon}
          </span>
          <div className="min-w-0">
            <div className={["text-sm font-semibold leading-5", signalDisplay.valueClass].join(" ")}>
              {signalDisplay.shortLabel}
            </div>
            <div className="text-[11px] leading-4 text-white/42">{signalDisplay.caption}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-w-0 rounded-2xl border px-3 py-3 ${accentClass}`}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/36">{label}</div>
      <div className={`mt-2 wrap-break-word text-sm leading-6 font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
}

function getSignalDisplay(label: string, value: string) {
  const normalizedLabel = label.trim().toLowerCase();
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedLabel === "trend") {
    if (normalizedValue === "bullish") {
      return buildSignalDisplay("▲", "Bull", "Rising", "text-emerald-100", "bg-emerald-400/14 text-emerald-300");
    }

    if (normalizedValue === "bearish") {
      return buildSignalDisplay("▼", "Bear", "Falling", "text-rose-100", "bg-rose-400/14 text-rose-300");
    }

    return buildSignalDisplay("•", "Neutral", "Balanced", "text-amber-100", "bg-amber-400/14 text-amber-300");
  }

  if (normalizedLabel === "momentum") {
    if (normalizedValue === "strong") {
      return buildSignalDisplay("▲", "Strong", "Accelerating", "text-emerald-100", "bg-emerald-400/14 text-emerald-300");
    }

    if (normalizedValue === "improving") {
      return buildSignalDisplay("↗", "Up", "Improving", "text-emerald-100", "bg-emerald-400/14 text-emerald-300");
    }

    if (normalizedValue === "weakening") {
      return buildSignalDisplay("↘", "Weak", "Slowing", "text-rose-100", "bg-rose-400/14 text-rose-300");
    }

    return buildSignalDisplay("•", "Mixed", "Uneven", "text-amber-100", "bg-amber-400/14 text-amber-300");
  }

  if (normalizedLabel === "sector") {
    if (normalizedValue === "strong") {
      return buildSignalDisplay("▲", "Strong", "Leading", "text-emerald-100", "bg-emerald-400/14 text-emerald-300");
    }

    if (normalizedValue === "weak") {
      return buildSignalDisplay("▼", "Weak", "Lagging", "text-rose-100", "bg-rose-400/14 text-rose-300");
    }

    return buildSignalDisplay("•", "Moderate", "Neutral", "text-amber-100", "bg-amber-400/14 text-amber-300");
  }

  if (normalizedLabel === "risk") {
    if (normalizedValue === "low") {
      return buildSignalDisplay("✓", "Low", "Contained", "text-emerald-100", "bg-emerald-400/14 text-emerald-300");
    }

    if (normalizedValue === "high") {
      return buildSignalDisplay("!", "High", "Elevated", "text-rose-100", "bg-rose-400/14 text-rose-300");
    }

    return buildSignalDisplay("•", "Med", "Watch", "text-amber-100", "bg-amber-400/14 text-amber-300");
  }

  return null;
}

function buildSignalDisplay(
  icon: string,
  shortLabel: string,
  caption: string,
  valueClass: string,
  iconClass: string
) {
  return {
    icon,
    shortLabel,
    caption,
    valueClass,
    iconClass,
  };
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