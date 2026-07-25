import {
  getMarketSessionState,
  type MarketSessionState,
} from "@/lib/vision/sessionState";

const labels: Record<MarketSessionState, string> = {
  premarket: "Premarket intelligence",
  open: "Live intelligence",
  "after-hours": "After-hours intelligence",
  closed: "Latest market intelligence",
};

export function VisionTimestamp({
  updatedAt,
}: {
  updatedAt: string | Date;
}) {
  const date =
    updatedAt instanceof Date ? updatedAt : new Date(updatedAt);

  const session = getMarketSessionState();

  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <span className="rounded-full border border-cyan-400/25 bg-cyan-400/6 px-3 py-1.5 font-semibold uppercase tracking-[0.16em] text-cyan-200">
        {labels[session]}
      </span>

      <span className="text-slate-500">
        Updated {formatted} ET
      </span>
    </div>
  );
}
