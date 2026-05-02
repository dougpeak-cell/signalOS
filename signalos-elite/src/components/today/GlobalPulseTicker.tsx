import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelectedTicker } from "@/components/sigi/SelectedTickerContext";

export type GlobalPulseTickerItem = {
  id: string;
  category: string;
  headline: string;
  tone: "bullish" | "neutral" | "bearish";
  tickers: string[];
  tags: string[];
  href: string;
  breaking?: boolean;
};

function pulseToneClasses(tone: GlobalPulseTickerItem["tone"]) {
  if (tone === "bullish") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  }

  if (tone === "bearish") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-300";
  }

  return "border-cyan-500/25 bg-cyan-500/10 text-cyan-300";
}

export default function GlobalPulseTicker({
  items,
}: {
  items: GlobalPulseTickerItem[];
}) {
  const router = useRouter();
  const { setActiveTicker } = useSelectedTicker();
  const loopItems = [...items, ...items];

  function openTicker(ticker: string) {
    const cleanTicker = ticker.trim().toUpperCase();
    if (!cleanTicker) return;

    setActiveTicker(cleanTicker);
    router.push(`/stocks/${cleanTicker}`);
  }

  return (
    <section className="overflow-hidden rounded-[22px] border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(7,12,24,0.96),rgba(5,8,18,0.98))] shadow-[0_0_0_1px_rgba(0,255,200,0.03),0_0_18px_rgba(0,255,200,0.05)]">
      <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
        <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-300/85">
            Global Pulse
          </div>
          <div className="mt-1 text-xs text-white/45">
            Live macro and company news flow.
          </div>
        </div>
        <span className="text-[10px] text-white/40">LIVE</span>
      </div>

      <div className="relative overflow-hidden">
        <div className="global-pulse-marquee flex w-max items-center gap-4 px-4 py-3">
          {loopItems.map((item, index) => (
            <Link
              href={item.href}
              key={`${item.id}-${index}`}
              className="flex items-center gap-3 rounded-full border border-white/8 bg-white/3 px-4 py-2 hover:border-cyan-400/30"
              target={item.href.startsWith("http") ? "_blank" : undefined}
              rel={item.href.startsWith("http") ? "noreferrer" : undefined}
            >
              <span
                className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                  item.breaking
                    ? "animate-pulse border-red-500/30 bg-red-500/20 text-red-300"
                    : pulseToneClasses(item.tone)
                }`}
              >
                {item.breaking ? "BREAKING" : item.category}
              </span>

              <span className="text-sm text-white/82">{item.headline}</span>

              <div className="flex gap-1">
                {item.tags?.map((tag) => (
                  <span key={tag} className="text-[10px] text-white/40">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/2 p-3">
                <div className="flex items-center gap-1">
                  {item.tickers.map((ticker) => (
                    <button
                      type="button"
                      key={`${item.id}-${ticker}-${index}`}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        openTicker(ticker);
                      }}
                      className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300"
                    >
                      {ticker}
                    </button>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
