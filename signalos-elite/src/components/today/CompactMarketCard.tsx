type SimpleQuote = {
  ticker: string;
  label: string;
  price?: number | null;
  changePct?: number | null;
};

function pctClass(v?: number | null) {
  if (v == null) return "text-white/45";
  if (v > 0) return "text-emerald-400";
  if (v < 0) return "text-rose-400";
  return "text-white/45";
}

export default function CompactMarketCard({
  item,
}: {
  item: SimpleQuote;
}) {
  return (
    <div className="rounded-3xl border border-cyan-400/10 bg-linear-to-br from-[#040b12] via-[#05121b] to-[#020910] p-4 shadow-[0_0_0_1px_rgba(0,255,255,0.05),0_0_24px_rgba(0,255,255,0.06)]">
      <div className="text-[10px] uppercase tracking-[0.24em] text-white/40">
        {item.label}
      </div>

      <div className="mt-3 text-2xl font-semibold text-white">
        {item.price != null ? item.price.toFixed(2) : "--"}
      </div>

      <div className={`mt-1 text-sm ${pctClass(item.changePct)}`}>
        {item.changePct != null
          ? `${item.changePct >= 0 ? "+" : ""}${item.changePct.toFixed(2)}%`
          : "--"}
      </div>
    </div>
  );
}