import MostTradedPanel from "@/components/today/MostTradedPanel";
import type { TodayMostTradedRow } from "@/lib/today/pageData";

export default function TodayMostTradedPanel({
  regularRows,
  preMarketRows,
}: {
  regularRows: TodayMostTradedRow[];
  preMarketRows: TodayMostTradedRow[];
}) {
  return <MostTradedPanel regularRows={regularRows} preMarketRows={preMarketRows} />;
}