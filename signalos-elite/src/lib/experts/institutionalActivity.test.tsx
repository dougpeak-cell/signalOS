import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import InstitutionalActivityPanel from "@/components/experts/InstitutionalActivityPanel";
import ResearchAlignmentPanel from "@/components/experts/ResearchAlignmentPanel";
import {
  buildInstitutionalActivity, institutionalQuarters, type InstitutionalReport,
} from "./institutionalActivity";
import { loadInstitutionalActivity, readInstitutionalSnapshot } from "./fmpInstitutionalActivity";
import type { FmpRow } from "./fmpClient";
import type { ResearchAlignmentFeed } from "./researchAlignment";

const today = "2026-11-16";
const funds = [{ cik: "0000000001", name: "Fund A" }, { cik: "0000000002", name: "Fund B" }];
const prices = [{ date: "2026-09-30", close: 100 }];

function report(cik: string, reportDate: string, shares: number): InstitutionalReport {
  return {
    cik, reportDate, error: null,
    snapshot: { shares, reportedValue: shares * 100, filingDate: "2026-11-13", filingUrl: null },
  };
}

function filing(overrides: FmpRow = {}): FmpRow {
  return {
    cik: funds[0].cik, date: "2026-09-30", symbol: "AAPL", shares: 10, value: 1000,
    sharesType: "SH", filingDate: "2026-11-13", link: "https://www.sec.gov/Archives/edgar/data/1/filing.htm",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("quarterly institutional activity", () => {
  it("uses eight completed calendar quarters and the consecutive baseline across year boundaries", () => {
    const quarters = institutionalQuarters(today);
    expect(quarters).toHaveLength(8);
    expect(quarters[0]).toEqual({ label: "Q3 2026", reportDate: "2026-09-30", previousReportDate: "2026-06-30" });
    expect(quarters[7]).toEqual({ label: "Q4 2024", reportDate: "2024-12-31", previousReportDate: "2024-09-30" });
    expect(institutionalQuarters("2026-01-01")[0]).toEqual({
      label: "Q4 2025", reportDate: "2025-12-31", previousReportDate: "2025-09-30",
    });
  });

  it("separates estimated additions, reductions and net activity from full holding values", () => {
    const activity = buildInstitutionalActivity({
      symbol: "AAPL", today, funds, splits: [], prices,
      reports: [
        report(funds[0].cik, "2026-06-30", 100), report(funds[0].cik, "2026-09-30", 150),
        report(funds[1].cik, "2026-06-30", 100), report(funds[1].cik, "2026-09-30", 60),
      ],
    });
    expect(activity.quarters[0]).toMatchObject({
      estimatedAdditions: 5000, estimatedReductions: 4000, estimatedNet: 1000, comparedFunds: 2, valuedFunds: 2,
    });
    expect(activity.quarters[0].funds).toMatchObject([
      { change: "Increased", sharesDelta: 50, estimatedNetDollars: 5000, reportedValue: 15_000 },
      { change: "Reduced", sharesDelta: -40, estimatedNetDollars: -4000, reportedValue: 6000 },
    ]);
    expect(activity.quarters[1]).toMatchObject({ estimatedNet: null, valuedFunds: 0 });
    const html = renderToStaticMarkup(<InstitutionalActivityPanel activity={activity} loading={false} error={null} retry={() => {}} />);
    expect(html).toContain("Fund details");
    expect(html).toContain("Reported quarter-end holding");
    expect(html).toContain("0/2 funds valued");
    expect(html).toContain("not actual cash traded");
    const props = {
      symbol: "AAPL", feed: null, loading: false, error: "Snapshot source unavailable",
      hasAccess: true, searchable: false, input: "AAPL", inputError: null,
      onInput: () => {}, onSubmit: () => {}, onRetry: () => {},
      institutionalActivity: { activity, loading: false, error: null, retry: () => {} },
    };
    expect(renderToStaticMarkup(<ResearchAlignmentPanel {...props} />)).toContain("last 8 quarters");
    expect(renderToStaticMarkup(<ResearchAlignmentPanel {...props} hasAccess={false} />)).not.toContain("last 8 quarters");
  });

  it("shows hedge-fund activity outside collapsed phone evidence and removes the legacy disclosure area", () => {
    const activity = buildInstitutionalActivity({ symbol: "AAPL", today, funds, splits: [], prices, reports: [] });
    const feed: ResearchAlignmentFeed = {
      symbol: "AAPL", retrievedAt: `${today}T18:00:00Z`,
      analysts: { status: "unavailable", error: "Analyst source unavailable" },
      amsa: { status: "unavailable", error: "Pulse unavailable" },
      institutions: {
        status: "available", warnings: ["Legacy report warning"],
        data: {
          funds: [{ name: "Legacy snapshot fund", reportDate: "2023-12-31", olderReport: true }],
          positions: [],
        },
      },
      alignment: { label: "Insufficient evidence", explanation: "Independent research." },
    };
    for (const compact of [false, true]) {
      const html = renderToStaticMarkup(<ResearchAlignmentPanel
        symbol="AAPL" feed={feed} loading={false} error={null} hasAccess searchable={false}
        input="AAPL" inputError={null} onInput={() => {}} onSubmit={() => {}} onRetry={() => {}}
        compact={compact} institutionalActivity={{ activity, loading: false, error: null, retry: () => {} }}
      />);
      expect(html).not.toMatch(/Institutional disclosures|Legacy snapshot fund|Legacy report warning/);
      expect(html.match(/aria-label="Quarterly hedge-fund activity"/g)).toHaveLength(1);
      if (compact) {
        const evidenceToggle = html.indexOf('<details class="mt-4">');
        expect(evidenceToggle).toBeGreaterThan(html.indexOf('aria-label="Quarterly hedge-fund activity"'));
        expect(html).not.toContain(">Institutions</dt>");
      }
    }
  });

  it("adjusts share comparisons for splits and restores historical closes to each quarter's basis", () => {
    const activity = buildInstitutionalActivity({
      symbol: "AAPL", today, funds: [funds[0]],
      reports: [report(funds[0].cik, "2026-06-30", 100), report(funds[0].cik, "2026-09-30", 220)],
      prices: [{ date: "2026-09-30", close: 10 }],
      splits: [
        { date: "2026-07-01", numerator: 2, denominator: 1 },
        { date: "2026-11-01", numerator: 5, denominator: 1 },
      ],
    });
    expect(activity.quarters[0].funds[0]).toMatchObject({
      change: "Increased", sharesDelta: 20, estimatedNetDollars: 1000,
    });
    const unchanged = buildInstitutionalActivity({
      symbol: "AAPL", today, funds: [funds[0]], prices, splits: [{ date: "2026-07-01", numerator: 2, denominator: 1 }],
      reports: [report(funds[0].cik, "2026-06-30", 100), report(funds[0].cik, "2026-09-30", 200)],
    });
    expect(unchanged.quarters[0].funds[0]).toMatchObject({ change: "Unchanged", estimatedNetDollars: 0 });
  });

  it("does not turn a missing baseline, split history, or valuation price into zero activity", () => {
    const reports = [report(funds[0].cik, "2026-06-30", 100), report(funds[0].cik, "2026-09-30", 0)];
    for (const [splits, history] of [[null, prices], [[], []]] as const) {
      const activity = buildInstitutionalActivity({
        symbol: "AAPL", today, funds, reports, splits: splits == null ? null : [...splits], prices: [...history],
      });
      expect(activity.quarters[0]).toMatchObject({ estimatedNet: null, valuedFunds: 0 });
    }
    const activity = buildInstitutionalActivity({ symbol: "AAPL", today, funds, reports, splits: [], prices });
    expect(activity.quarters[0]).toMatchObject({ estimatedReductions: 10_000, estimatedNet: -10_000, valuedFunds: 1 });
    expect(activity.quarters[0].funds[0].change).toBe("Closed position");
    expect(activity.quarters[0].funds[1].change).toBe("Unavailable");
  });
});

describe("verified complete filing snapshots", () => {
  it("aggregates long shares and reported dollars, excluding option positions", () => {
    const snapshot = readInstitutionalSnapshot([
      filing(), filing({ shares: 20, value: 2000 }), filing({ putCallShare: "Call", shares: 9999 }),
    ], funds[0], "AAPL", "2026-09-30", today);
    expect(snapshot).toMatchObject({ shares: 30, reportedValue: 3000, filingDate: "2026-11-13" });
    expect(readInstitutionalSnapshot([filing({ symbol: "MSFT" })], funds[0], "AAPL", "2026-09-30", today))
      .toMatchObject({ shares: 0, reportedValue: 0 });
  });

  it("rejects empty, mismatched, unsafe and unidentifiable reports instead of inferring buys or exits", () => {
    for (const rows of [
      [], [filing({ date: "2026-06-30" })], [filing({ cik: "999" })], [filing({ shares: null })],
      [filing({ symbol: "" })], [filing({ link: "https://example.com/filing" })],
      [filing(), filing({ link: "https://www.sec.gov/Archives/edgar/data/1/amendment.htm" })],
      [filing(), filing()],
    ]) {
      expect(() => readInstitutionalSnapshot(rows, funds[0], "AAPL", "2026-09-30", today)).toThrow();
    }
  });
});

describe("historical FMP loading", () => {
  it.each([false, true])("loads consecutive quarters and keeps missing current reports incomplete (empty=%s)", async (empty) => {
    vi.stubEnv("FMP_API_KEY", "activity-test-key");
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      expect(url.hostname).toBe("financialmodelingprep.com");
      if (url.pathname.endsWith("/splits")) return Response.json([]);
      if (url.pathname.endsWith("/full")) return Response.json([{ symbol: "AAPL", date: "2026-09-30", close: 100 }]);
      if (url.pathname.endsWith("/dates")) return Response.json([{ date: "2026-09-30" }, { date: "2026-06-30" }]);
      const date = url.searchParams.get("quarter") === "3" ? "2026-09-30" : "2026-06-30";
      if (empty && date === "2026-09-30") return Response.json([]);
      return Response.json([filing({ date, shares: date === "2026-09-30" ? 150 : 100 })]);
    }));
    const activity = await loadInstitutionalActivity(" aapl ", { now: new Date(`${today}T18:00:00Z`), funds: [funds[0]] });
    expect(activity.quarters[0]).toMatchObject({
      estimatedNet: empty ? null : 5000, valuedFunds: empty ? 0 : 1,
    });
    expect(activity.quarters[1].estimatedNet).toBeNull();
    expect(activity.warnings.length).toBeGreaterThan(0);
  });

  it("surfaces entitlement failures without fabricating a zero-flow history or exposing credentials", async () => {
    vi.stubEnv("FMP_API_KEY", "activity-test-key");
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => new Response(null, { status: 402 })));
    const activity = await loadInstitutionalActivity("AAPL", { now: new Date(`${today}T18:00:00Z`), funds: [funds[0]] });
    expect(activity.quarters.every((quarter) => quarter.estimatedNet === null && quarter.comparedFunds === 0)).toBe(true);
    expect(activity.warnings.join(" ")).toContain("subscription");
    expect(JSON.stringify(activity)).not.toContain("activity-test-key");
  });
});
