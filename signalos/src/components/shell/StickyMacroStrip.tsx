type MacroItem = {
  label: string;
  value: string;
  change?: string;
  tone?: "bullish" | "bearish" | "neutral";
};

function toneClasses(tone: MacroItem["tone"]) {
  switch (tone) {
    case "bullish":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
    case "bearish":
      return "border-rose-500/25 bg-rose-500/10 text-rose-300";
    default:
      return "border-white/10 bg-white/[0.04] text-white/75";
  }
}

const macroTape: MacroItem[] = [
  { label: "SPY", value: "598.42", change: "+0.82%", tone: "bullish" },
  { label: "QQQ", value: "521.18", change: "+1.21%", tone: "bullish" },
  { label: "VIX", value: "14.92", change: "-4.20%", tone: "bearish" },
  { label: "DXY", value: "103.84", change: "-0.31%", tone: "bullish" },
  { label: "TNX", value: "4.11%", change: "+0.06", tone: "neutral" },
];

export default function StickyMacroStrip() {
  return (
    <div className="sticky top-13 z-30 border-b border-cyan-400/10 bg-black/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-430 items-center gap-3 overflow-x-auto px-5 py-2.5">
        <div className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/70">
          Macro
        </div>

        <div className="flex min-w-0 items-center gap-2">
          {macroTape.map((item) => (
            <div
              key={item.label}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-[11px] ${toneClasses(item.tone)}`}
            >
              <span className="font-semibold tracking-[0.16em] text-white/55">
                {item.label}
              </span>
              <span className="font-semibold text-white">{item.value}</span>
              {item.change ? (
                <span className="text-[10px] font-semibold">{item.change}</span>
              ) : null}
            </div>
          ))}
        </div>

        {/* Regime/Risk block removed as requested */}
      </div>
    </div>
  );
}