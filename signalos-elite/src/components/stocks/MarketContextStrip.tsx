type ContextTone = "bullish" | "bearish" | "neutral";

export type Item = {
  label: string;
  value: string;
  tone?: ContextTone;
};

function toneClasses(tone: ContextTone = "neutral") {
  if (tone === "bullish") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.12)]";
  }

  if (tone === "bearish") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.10)]";
  }

  return "border-cyan-500/20 bg-cyan-500/10 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.08)]";
}

export default function MarketContextStrip({
  items,
}: {
  items: Item[];
}) {
  return (
    <div className="sticky top-0 z-20 -mx-1 mb-2 rounded-[22px] border border-white/10 bg-black/70 px-2 py-2 backdrop-blur-md">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {items.map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border px-3 py-3 ${toneClasses(item.tone)}`}
          >
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              {item.label}
            </div>
            <div className="mt-1 text-sm font-semibold tracking-tight">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
