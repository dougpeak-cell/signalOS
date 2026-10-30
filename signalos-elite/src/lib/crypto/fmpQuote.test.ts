import { describe, expect, it, vi } from "vitest";
import { cryptoQuoteSymbol, loadCryptoQuote, normalizeCryptoQuote } from "./fmpQuote";
import { fetchFmpRows } from "@/lib/experts/fmpClient";

vi.mock("@/lib/experts/fmpClient", async () => ({
  ...await vi.importActual<typeof import("@/lib/experts/fmpClient")>("../experts/fmpClient"), fetchFmpRows: vi.fn(),
}));

describe("FMP selected crypto quote", () => {
  it("normalizes base, USD pair and Polygon symbols without altering embedded USD", () => {
    for (const symbol of [" btc ", "BTCUSD", "X:BTCUSD"]) expect(cryptoQuoteSymbol(symbol)).toBe("BTCUSD");
    expect(cryptoQuoteSymbol("1INCH")).toBe("1INCHUSD");
    expect(cryptoQuoteSymbol("USDC")).toBe("USDCUSD");
    expect(cryptoQuoteSymbol("BTC/USDT")).toBeNull();
    expect(cryptoQuoteSymbol("../BTC")).toBeNull();
    expect(cryptoQuoteSymbol("")).toBeNull();
  });

  it("preserves signed changes and provider timestamps, leaving missing data null", () => {
    const quote = normalizeCryptoQuote({
      symbol: "BTCUSD", exchange: "CRYPTO", name: "Bitcoin USD", price: 64756.84,
      changePercentage: -1.33631, change: -853.94, volume: "32030003200",
      marketCap: 1293361815015, timestamp: 1785430805, priceAvg50: -1, dayHigh: Infinity,
    }, "BTCUSD");
    expect(quote).toMatchObject({ price: 64756.84, change: -853.94, changePercentage: -1.33631,
      volume: 32030003200, marketCap: 1293361815015, timestamp: 1785430805,
      priceAvg50: null, dayHigh: null, yearHigh: null, previousClose: null });
  });

  it("rejects other coins and non-crypto instruments", () => {
    expect(normalizeCryptoQuote({ symbol: "ETHUSD", exchange: "CRYPTO" }, "BTCUSD")).toBeNull();
    expect(normalizeCryptoQuote({ symbol: "BTCUSD", exchange: "NASDAQ" }, "BTCUSD")).toBeNull();
  });

  it("retains every supplied FMP quote field", () => {
    const row = {
      symbol: "BTCUSD", name: "Bitcoin USD", price: 64756.84,
      changePercentage: 1.33631, change: 853.94, volume: 32030003200,
      dayLow: 63547.793, dayHigh: 65038.38, yearHigh: 126198.07, yearLow: 57747.766,
      marketCap: 1293361815015, priceAvg50: 63335.02, priceAvg200: 71727.62,
      exchange: "CRYPTO", open: 63902.9, previousClose: 63902.9, timestamp: 1785430805,
    };
    expect(normalizeCryptoQuote(row, "BTCUSD")).toEqual(row);
  });

  it("requests the selected pair only and does not invent unsupported coins", async () => {
    vi.mocked(fetchFmpRows).mockResolvedValueOnce([{ symbol: "ETHUSD", exchange: "CRYPTO", price: 2500 }]);
    await expect(loadCryptoQuote("ETH")).resolves.toMatchObject({ symbol: "ETHUSD", price: 2500 });
    expect(fetchFmpRows).toHaveBeenLastCalledWith("quote", { symbol: "ETHUSD" }, 30);
    vi.mocked(fetchFmpRows).mockResolvedValueOnce([]);
    await expect(loadCryptoQuote("BONK")).rejects.toThrow("no USD crypto quote");
  });
});