import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AlertGroups } from "@/lib/watchlist/alerts";
import StockAlertButton from "./StockAlertButton";
import StockAlerts from "./StockAlerts";

const state = vi.hoisted(() => ({
  groups: { red: [], green: [], yellow: [] } as AlertGroups,
  loading: false, error: null as string | null, updatedAt: null,
  enabled: true, watchlistCount: 3,
}));
vi.mock("@/context/StockAlertsContext", () => ({ useStockAlerts: () => state }));

describe("grouped Sigi Alerts interface", () => {
  beforeEach(() => {
    state.groups = { red: [], green: [], yellow: [] };
    state.error = null;
    state.loading = false;
  });

  it("colors the header by highest priority and always opens the grouped page", () => {
    const stock = { ticker: "NVDA", score: 70, changePercent: 2 };
    state.groups.yellow = [{ ...stock, ticker: "MSFT", score: 55 }];
    expect(renderToStaticMarkup(<StockAlertButton />)).toContain("bg-yellow-400");
    state.groups.green = [stock];
    expect(renderToStaticMarkup(<StockAlertButton />)).toContain("bg-green-500");
    state.groups.red = [{ ...stock, ticker: "AAPL", changePercent: -7 }];
    const markup = renderToStaticMarkup(<StockAlertButton />);
    expect(markup).toContain("bg-red-700");
    expect(markup).toContain('href="/alerts"');
    expect(markup).toContain("3 stocks.");
    expect(markup).not.toContain("/vision");
  });

  it("renders distinct color groups with scores and signed daily moves, not the retired controls", () => {
    state.groups.red = [{ ticker: "AMD", score: 34, changePercent: -7 }];
    state.groups.green = [{ ticker: "NVDA", score: 70, changePercent: 2 }];
    state.groups.yellow = [{ ticker: "MSFT", score: 55, changePercent: 0 }];
    const markup = renderToStaticMarkup(<StockAlerts full defaultOpen />);
    expect(markup).toContain('id="red"');
    expect(markup).toContain('id="green"');
    expect(markup).toContain('id="yellow"');
    expect(markup).toContain('href="/screener?q=AMD"');
    expect(markup).toContain("-7.00% today");
    expect(markup).toContain("70/100 points");
    expect(markup).not.toContain("Pullback Watch");
    expect(markup).not.toContain("Trusted research firms");
  });

  it("surfaces quote errors without claiming there are no qualifying stocks", () => {
    state.error = "Quotes unavailable.";
    const markup = renderToStaticMarkup(<StockAlerts full />);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Quotes unavailable.");
    expect(markup).not.toContain("No watchlist stocks in this group.");
    const header = renderToStaticMarkup(<StockAlertButton />);
    expect(header).toContain("Quotes incomplete:");
    expect(header).not.toContain("No qualifying watchlist stocks.");
  });
});
