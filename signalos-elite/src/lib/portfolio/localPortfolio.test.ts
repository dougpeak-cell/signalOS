import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  hidePortfolioTicker,
  readHiddenPortfolioTickers,
  unhidePortfolioTicker,
} from "./localPortfolio";

describe("portfolio hidden tickers", () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps a closed ticker hidden until it is intentionally re-added", () => {
    hidePortfolioTicker(" rxt ");
    hidePortfolioTicker("RXT");

    expect(readHiddenPortfolioTickers()).toEqual(["RXT"]);

    unhidePortfolioTicker("rxt");
    expect(readHiddenPortfolioTickers()).toEqual([]);
  });
});