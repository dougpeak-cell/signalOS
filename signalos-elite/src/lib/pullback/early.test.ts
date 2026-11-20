import { describe, expect, it } from "vitest";
import { afterNotificationStart, selectEarlySignals } from "./early";
import { normalizeRating } from "./provider";
import { ratings } from "../../../tests/pullback/fixtures";
import type { InsiderTradeFeedRow } from "@/lib/experts/fmpInsiders";
import type { SenatePurchase } from "@/lib/experts/senatePurchases";
import type { InstitutionalActivity } from "@/lib/experts/institutionalActivity";

const now = new Date("2026-11-20T19:00:00Z");
const since = "2026-11-19T16:00:00Z";
const upgrade = { ...ratings[0], publishedAt: "2026-11-20", previousRating: "Hold", action: "upgrade" };
const insider: InsiderTradeFeedRow = {
  symbol: "TEST", companyName: "Test", sector: null, amountPurchased: 1000, sharesPurchased: 10,
  transactionDate: "2026-11-18", filingDate: "2026-11-20", purchaserName: "Test Officer", purchaserTitle: "CEO",
  transactionType: "P-Purchase", securityName: "Common Stock", filingUrl: "https://www.sec.gov/Archives/test",
  pricePerShare: 100, sharesOwnedAfter: 100, ownershipType: "Direct", formType: "4",
};
const senator: SenatePurchase = {
  symbol: "TEST", company: "Test", senator: "Test Senator", state: null, owner: "Self",
  amountRange: "$15,001 - $50,000", purchaseDate: "2026-11-18", disclosureDate: "2026-11-20",
  filingUrl: "https://efdsearch.senate.gov/search/view/ptr/test",
};
const institutional: InstitutionalActivity = {
  symbol: "TEST", through: "2026-11-20", funds: [], warnings: [], quarters: [{
    label: "Q3 2026", reportDate: "2026-09-30", previousReportDate: "2026-06-30", priceDate: null,
    estimatedAdditions: null, estimatedReductions: null, estimatedNet: null, comparedFunds: 1, valuedFunds: 0,
    funds: [{
      fund: "Test Fund", cik: "123", change: "New position", sharesDelta: 100, estimatedNetDollars: null,
      reportedValue: 10000, filingDate: "2026-11-20", filingUrl: "https://www.sec.gov/Archives/fund",
      unavailableReason: "Quarter-end valuation price unavailable.",
    }],
  }],
};
const input = { symbol: "TEST", trusted: ["CFRA"] as const, since, now, ratings: [upgrade], insiders: [insider], senate: [senator], institutional };

describe("opt-in-only early evidence", () => {
  it("accepts independent dated sources without a pullback and deduplicates originating research and filings", () => {
    const syndicated = normalizeRating({
      symbol: "TEST", date: "2026-11-20", originalResearchFirm: "CFRA", gradingCompany: "Schwab",
      newGrade: "Buy", previousGrade: "Hold", action: "upgrade",
    }, "TEST")!;
    const signals = selectEarlySignals({ ...input, ratings: [upgrade, syndicated], insiders: [insider, insider], senate: [senator, senator] });
    expect(signals).toHaveLength(4);
    expect(new Set(signals.map((entry) => entry.kind))).toEqual(new Set(["analyst-upgrade", "hedge-fund", "senator", "insider"]));
    expect(signals.find((entry) => entry.kind === "hedge-fund")?.details).toContain("not a verified first-ever purchase or purchase date");
    expect(signals.find((entry) => entry.kind === "senator")?.details).toContain("$15,001 - $50,000");
    expect(signals.some((entry) => entry.title.includes("$50,000"))).toBe(false);
  });

  it("excludes pre-opt-in, unprovable same-day, future, conflicted or untrusted research", () => {
    expect(afterNotificationStart("2026-11-19", true, since, now)).toBe(false);
    expect(afterNotificationStart("2026-11-20T18:00:00Z", false, since, now)).toBe(true);
    expect(afterNotificationStart("2026-11-21", true, since, now)).toBe(false);
    expect(afterNotificationStart("2026-11-20 12:00:00", false, since, now)).toBe(false);
    expect(selectEarlySignals({ ...input, since: now.toISOString() })).toEqual([]);
    expect(selectEarlySignals({ ...input, insiders: [], senate: [], institutional: null, ratings: [
      upgrade, { ...upgrade, originalRating: "Sell", action: "downgrade" },
      { ...upgrade, firm: "Argus" },
    ] })).toEqual([]);
  });

  it("accepts a single filed 13F increase once without other evidence or a valuation", () => {
    const report = structuredClone(institutional);
    const fund = { ...report.quarters[0].funds[0], change: "Increased" as const };
    report.quarters[0].funds = [fund, fund];
    const only13F = { ...input, ratings: [], insiders: [], senate: [], institutional: report };
    const signals = selectEarlySignals(only13F);
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({ kind: "hedge-fund", publishedAt: fund.filingDate,
      filingUrl: fund.filingUrl, details: expect.stringContaining("100 shares") });
    expect(selectEarlySignals({ ...only13F, since: "2026-11-20T14:00:00Z" })).toEqual([]);
    expect(selectEarlySignals({ ...only13F, symbol: "OTHER" })).toEqual([]);
  });

  it("does not mistake sells, option transactions, valuation gains or missing evidence for a purchase", () => {
    const incomplete = structuredClone(institutional);
    const [fund] = incomplete.quarters[0].funds;
    incomplete.quarters[0].funds = [
      { ...fund, change: "Increased", sharesDelta: null }, { ...fund, change: "Increased", filingUrl: null },
      { ...fund, change: "Unchanged", sharesDelta: 0 }, { ...fund, change: "Increased", sharesDelta: 0 },
    ];
    expect(selectEarlySignals({
      ...input, ratings: [], institutional: incomplete,
      insiders: [{ ...insider, transactionType: "S-Sale" }, { ...insider, securityName: "Stock Option" }, { ...insider, filingDate: null }],
      senate: [{ ...senator, filingUrl: null }, { ...senator, purchaseDate: "2026-11-21" }],
    })).toEqual([]);
  });
});
