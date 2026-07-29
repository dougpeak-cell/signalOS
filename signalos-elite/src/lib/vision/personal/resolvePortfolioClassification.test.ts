import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/market/massiveFundamentals", () => ({
  getMassiveFundamentals: vi.fn(async (symbol: string) =>
    symbol === "DLR"
      ? {
          name: "Digital Realty Trust, Inc.",
          sector: null,
          industry: "REAL ESTATE INVESTMENT TRUSTS",
        }
      : {
          name: null,
          sector: null,
          industry: null,
        }),
}));

import { resolvePortfolioClassification } from "./resolvePortfolioClassification";

describe("resolvePortfolioClassification", () => {
  it("fills missing DLR provider fields from the shared fallback", async () => {
    await expect(resolvePortfolioClassification("dlr")).resolves.toEqual({
      symbol: "DLR",
      companyName: "Digital Realty Trust, Inc.",
      sector: "Real Estate",
      industry: "Data Center REITs",
      source: "provider",
    });
  });

  it.each([
    ["ORCL", "Oracle Corp", "SERVICES-PREPACKAGED SOFTWARE", "Technology"],
    ["ACHR", "Archer Aviation, Inc.", "AIRCRAFT", "Industrials"],
  ])("fills the missing %s sector without replacing existing identity fields", async (
    symbol,
    companyName,
    industry,
    sector,
  ) => {
    await expect(resolvePortfolioClassification(symbol, {
      companyName,
      industry,
    })).resolves.toEqual({
      symbol,
      companyName,
      sector,
      industry,
      source: "existing",
    });
  });
});
