import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/market/massiveFundamentals", () => ({
  getMassiveFundamentals: vi.fn(async () => ({
    name: "Digital Realty Trust, Inc.",
    sector: null,
    industry: "REAL ESTATE INVESTMENT TRUSTS",
  })),
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
});
