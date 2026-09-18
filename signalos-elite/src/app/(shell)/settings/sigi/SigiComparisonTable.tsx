import { Check, Minus } from "lucide-react";
import { SIGI_PRICING } from "@/lib/billing/pricing";
import { getSigiComparisonRows } from "@/lib/sigi/plans";
import type { SigiTier } from "@/lib/sigi/gates";

type Props = {
  currentTier: SigiTier;
};

function Cell({ value }: { value: string }) {
  const isEmpty = value === "Not included" || value === "Reactive only" || value === "Basic guidance";

  return (
    <div className="flex items-start gap-2 text-sm text-white/78">
      {isEmpty ? (
        <Minus className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
      ) : (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300/80" />
      )}
      <span>{value}</span>
    </div>
  );
}

export default function SigiComparisonTable({ currentTier }: Props) {
  const rows = getSigiComparisonRows();

  const columns: { tier: SigiTier; name: string; price: string }[] = [
    { tier: "free", name: "Sigi", price: "$0" },
    { tier: "smart", name: SIGI_PRICING.smart.name, price: `$${SIGI_PRICING.smart.priceMonthly}/mo` },
    { tier: "pro", name: SIGI_PRICING.pro.name, price: `$${SIGI_PRICING.pro.priceMonthly}/mo` },
  ];

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,13,21,0.98),rgba(5,9,16,0.98))] p-5 md:p-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/75">
        Compare plans
      </div>
      <h2 className="mt-2 text-xl font-semibold text-white">See exactly what each tier unlocks</h2>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-160 border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="w-1/4 pb-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                Feature
              </th>
              {columns.map((column) => (
                <th
                  key={column.tier}
                  className={[
                    "pb-4 text-left align-bottom",
                    column.tier === currentTier ? "text-cyan-200" : "text-white",
                  ].join(" ")}
                >
                  <div className="text-sm font-bold">{column.name}</div>
                  <div className="mt-1 text-xs font-medium text-white/56">{column.price}</div>
                  {column.tier === currentTier ? (
                    <div className="mt-1 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
                      Current
                    </div>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.label}>
                <td
                  className={[
                    "py-3 pr-4 text-sm font-medium text-white/84",
                    index !== 0 ? "border-t border-white/6" : "",
                  ].join(" ")}
                >
                  {row.label}
                </td>
                <td className={["py-3 pr-4", index !== 0 ? "border-t border-white/6" : ""].join(" ")}>
                  <Cell value={row.free} />
                </td>
                <td className={["py-3 pr-4", index !== 0 ? "border-t border-white/6" : ""].join(" ")}>
                  <Cell value={row.smart} />
                </td>
                <td className={["py-3", index !== 0 ? "border-t border-white/6" : ""].join(" ")}>
                  <Cell value={row.pro} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
