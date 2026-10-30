import { fetchFmpRows, type FmpRow } from "@/lib/experts/fmpClient";
import { selectSenatePurchases, type SenateDateBasis, type SenatePeriod, type SenatePurchasesFeed } from "@/lib/experts/senatePurchases";

export async function loadSenatePurchases(
  period: SenatePeriod,
  basis: SenateDateBasis,
  now: Date = new Date()
): Promise<SenatePurchasesFeed> {
  const raw: FmpRow[] = [];
  let exhausted = false;
  // Never assume provider ordering or that disclosure-date pagination gives
  // complete transaction-date coverage.
  for (let page = 0; page < 10; page++) {
    const rows = await fetchFmpRows("senate-latest", { page: String(page), limit: "100" }, 900);
    raw.push(...rows);
    if (rows.length < 100) {
      exhausted = true;
      break;
    }
  }
  return selectSenatePurchases(raw, period, basis, exhausted, now);
}
