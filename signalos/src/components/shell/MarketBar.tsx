import Link from "next/link";
import ConfidenceBar from "@/components/ui/ConfidenceBar";

type MarketItem = {
  symbol: string;
  value: string;
  change: string;
  tone: "up" | "down" | "neutral";
  href?: string;
  confidence?: number; // 0-100
};

const marketItems: MarketItem[] = [
  { symbol: "SPY", value: "598.42", change: "+0.82%", tone: "up", href: "/stocks/SPY/live", confidence: 80 },
  { symbol: "QQQ", value: "521.18", change: "+1.21%", tone: "up", href: "/stocks/QQQ/live", confidence: 70 },
  { symbol: "VIX", value: "14.92", change: "-4.20%", tone: "down", href: "/stocks/VIX/live", confidence: 40 },
  { symbol: "SMH", value: "273.44", change: "+1.88%", tone: "up", href: "/stocks/SMH/live", confidence: 90 },
];

function toneClasses(tone: MarketItem["tone"]) {
  if (tone === "up") {
    return "text-emerald-400";
  }

  if (tone === "down") {
    return "text-rose-400";
  }

  return "text-white/60";
}

export default function MarketBar() {
  const selectedSignalInfo = { tone: "bullish" };

  const signalTone =
    selectedSignalInfo?.tone === "bullish"
      ? "bullish"
      : selectedSignalInfo?.tone === "bearish"
        ? "bearish"
        : "neutral";

  return (
    <div className="border-b border-white/10 bg-black/70 backdrop-blur supports-backdrop-filter:bg-black/55">
      <div className="mx-auto flex max-w-350 flex-col gap-3 px-4 py-3 lg:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
            <div className="mr-3 shrink-0 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
              Market Pulse
            </div>

            {marketItems.map((item) => {
              const content = (
                <div className="group flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-1.5 transition hover:border-white/15 hover:bg-white/5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    {item.symbol}
                  </span>
                  <span className="text-sm font-semibold text-white tabular-nums">{item.value}</span>
                  <span className={`text-xs font-semibold tabular-nums ${toneClasses(item.tone)}`}>{item.change}</span>
                  {typeof item.confidence === "number" && (
                    <span className="ml-2 flex items-center">
                      <ConfidenceBar value={item.confidence} tone={item.tone === "up" ? "bullish" : item.tone === "down" ? "bearish" : "neutral"} size="sm" />
                    </span>
                  )}
                </div>
              );

              return item.href ? (
                <Link key={item.symbol} href={item.href} className="shrink-0">
                  {content}
                </Link>
              ) : (
                <div key={item.symbol} className="shrink-0">
                  {content}
                </div>
              );
            })}
          </div>

          <div className="min-w-0 truncate text-xs text-white/50">
            <span className="mr-2 uppercase tracking-[0.18em] text-white/35">Macro</span>
            Semis leading • Breadth positive • Risk appetite improving
          </div>
        </div>
      </div>
    </div>
  );
}
