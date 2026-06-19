import assert from "node:assert/strict";
import test from "node:test";
import {
  clearPortfolioHoldings,
  hasInitializedPortfolioHoldings,
  readPortfolioHoldings,
} from "@/lib/portfolio/localPortfolio";

function createWindowMock() {
  const store = new Map<string, string>();

  return {
    store,
    window: {
      localStorage: {
        getItem(key: string) {
          return store.has(key) ? store.get(key)! : null;
        },
        setItem(key: string, value: string) {
          store.set(key, String(value));
        },
        removeItem(key: string) {
          store.delete(key);
        },
      },
      dispatchEvent() {
        return true;
      },
    },
  };
}

test("first-time portfolio storage seeds a default MSFT holding once", () => {
  const originalWindow = globalThis.window;
  const { window } = createWindowMock();

  Object.defineProperty(globalThis, "window", {
    value: window,
    configurable: true,
  });

  try {
    const firstRead = readPortfolioHoldings();

    assert.equal(firstRead.length, 1);
    assert.equal(firstRead[0]?.ticker, "MSFT");
    assert.equal(firstRead[0]?.name, "Microsoft");
    assert.equal(firstRead[0]?.shares, 1);
    assert.equal(hasInitializedPortfolioHoldings(), true);

    clearPortfolioHoldings({ dispatchEvent: false });

    assert.deepEqual(readPortfolioHoldings(), []);
    assert.equal(hasInitializedPortfolioHoldings(), true);
  } finally {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
  }
});