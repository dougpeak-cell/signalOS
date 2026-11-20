import { createHash } from "node:crypto";
import { sessionParts, type Firm, type Rating } from "@/lib/pullback/engine";
import type { EarlySignal } from "@/lib/pullback/types";
import type { InsiderTradeFeedRow } from "@/lib/experts/fmpInsiders";
import type { SenatePurchase } from "@/lib/experts/senatePurchases";
import type { InstitutionalActivity } from "@/lib/experts/institutionalActivity";
import { isDate } from "@/lib/experts/hedgeFundInvestments";

export function afterNotificationStart(publishedAt: string, dateOnly: boolean, since: string, now: Date): boolean {
  const start = Date.parse(since);
  if (!Number.isFinite(start) || start >= now.getTime()) return false;
  if (dateOnly) {
    return isDate(publishedAt) && publishedAt > sessionParts(start).date &&
      publishedAt <= sessionParts(now.getTime()).date;
  }
  const timestamp = Date.parse(publishedAt);
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(publishedAt) &&
    Number.isFinite(timestamp) && timestamp > start && timestamp <= now.getTime();
}

function signal(value: Omit<EarlySignal, "id">, identity: unknown[]): EarlySignal {
  return { ...value, id: createHash("sha256").update(JSON.stringify([value.kind, ...identity])).digest("hex") };
}

export function selectEarlySignals({
  symbol, trusted, since, now, ratings, insiders, senate, institutional,
}: {
  symbol: string; trusted: readonly Firm[]; since: string; now: Date;
  ratings: Rating[]; insiders: InsiderTradeFeedRow[]; senate: SenatePurchase[];
  institutional: InstitutionalActivity | null;
}): EarlySignal[] {
  const candidates: EarlySignal[] = [];
  for (const rating of ratings) {
    if (!trusted.includes(rating.firm) || !["upgrade", "upgraded"].includes(rating.action.toLowerCase()) ||
      !rating.originalRating.trim() ||
      rating.originalRating.trim().toLowerCase() === rating.previousRating.trim().toLowerCase()) continue;
    if (ratings.some((other) => other.firm === rating.firm && other.publishedAt === rating.publishedAt &&
      (other.originalRating !== rating.originalRating || other.previousRating !== rating.previousRating || other.action !== rating.action))) continue;
    candidates.push(signal({
      kind: "analyst-upgrade", title: "Analyst upgrade", source: rating.source,
      publishedAt: rating.publishedAt, dateOnly: rating.dateOnly, filingUrl: null,
      details: `${rating.firm}: ${rating.previousRating || "Previous rating unavailable"} to ${rating.originalRating}. Price target: ${
        rating.targetFrom != null && rating.targetTo != null ? `$${rating.targetFrom} to $${rating.targetTo}` : "change unavailable"}.`,
    }, [symbol, rating.firm, rating.publishedAt]));
  }
  for (const quarter of institutional?.quarters ?? []) {
    for (const fund of quarter.funds) {
      if (fund.change !== "New position" || !fund.filingDate || !fund.filingUrl) continue;
      candidates.push(signal({
        kind: "hedge-fund", title: "Newly reported hedge fund position", source: "FMP / SEC 13F",
        publishedAt: fund.filingDate, dateOnly: true, filingUrl: fund.filingUrl,
        details: `${fund.fund}: reporting period ended ${quarter.reportDate}, filed ${fund.filingDate}. Absent in the verified prior-quarter filing. This is not a verified first-ever purchase or purchase date.`,
      }, [symbol, fund.cik, quarter.reportDate, fund.filingUrl]));
    }
  }
  for (const purchase of senate) {
    if (purchase.symbol !== symbol || !purchase.disclosureDate || !purchase.purchaseDate ||
      !isDate(purchase.purchaseDate) || purchase.purchaseDate > purchase.disclosureDate || !purchase.filingUrl) continue;
    candidates.push(signal({
      kind: "senator", title: "Disclosed senator purchase", source: "FMP / Senate disclosure",
      publishedAt: purchase.disclosureDate, dateOnly: true, filingUrl: purchase.filingUrl,
      details: `${purchase.senator} (${purchase.owner}): purchase dated ${purchase.purchaseDate}, disclosed ${purchase.disclosureDate}. Reported amount: ${purchase.amountRange}.`,
    }, [symbol, purchase.senator, purchase.owner, purchase.purchaseDate, purchase.amountRange, purchase.filingUrl]));
  }
  for (const purchase of insiders) {
    if (purchase.symbol !== symbol || !purchase.filingDate || !purchase.transactionDate || !purchase.filingUrl ||
      !["P", "P-PURCHASE"].includes(purchase.transactionType.trim().toUpperCase()) ||
      !purchase.sharesPurchased || purchase.sharesPurchased <= 0 ||
      !purchase.securityName || /\b(options?|derivatives?|warrants?)\b/i.test(purchase.securityName) ||
      !isDate(purchase.transactionDate.slice(0, 10)) ||
      purchase.transactionDate.slice(0, 10) > purchase.filingDate.slice(0, 10)) continue;
    const dateOnly = isDate(purchase.filingDate);
    candidates.push(signal({
      kind: "insider", title: "Disclosed insider purchase", source: "FMP / SEC insider filing",
      publishedAt: purchase.filingDate, dateOnly, filingUrl: purchase.filingUrl,
      details: `${purchase.purchaserName} (${purchase.purchaserTitle}): purchase dated ${purchase.transactionDate}; ${purchase.sharesPurchased.toLocaleString("en-US")} securities${
        purchase.amountPurchased != null ? `, reported value $${purchase.amountPurchased.toLocaleString("en-US")}` : ", value unavailable"}. ${purchase.securityName ?? "Security class unavailable"}. Filing totals are not individual exchange prints.`,
    }, [symbol, purchase.purchaserName, purchase.transactionDate, purchase.sharesPurchased, purchase.pricePerShare,
      purchase.sharesOwnedAfter, purchase.securityName, purchase.ownershipType, purchase.filingUrl]));
  }
  const unique = new Map<string, EarlySignal>();
  for (const candidate of candidates) {
    if (afterNotificationStart(candidate.publishedAt, candidate.dateOnly, since, now)) unique.set(candidate.id, candidate);
  }
  return [...unique.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id));
}
