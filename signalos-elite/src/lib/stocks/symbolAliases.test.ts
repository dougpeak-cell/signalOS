import { describe, expect, it } from "vitest";
import { resolveStockTickerAlias } from "./symbolAliases";

describe("resolveStockTickerAlias", () => {
  it("maps the Lam Research company alias to LRCX", () => {
    expect(resolveStockTickerAlias("LAMRESEARCH")).toBe("LRCX");
    expect(resolveStockTickerAlias("Lam Research")).toBe("LRCX");
  });

  it("maps the Oracle company alias to ORCL", () => {
    expect(resolveStockTickerAlias("ORACLE")).toBe("ORCL");
    expect(resolveStockTickerAlias("Oracle")).toBe("ORCL");
  });
});