import { describe, expect, it } from "vitest";

import { getDisplaySectorForTicker } from "../screenerSectorUniverse";
import { resolveSector } from "./resolve-sector";

describe("CRWV sector classification", () => {
  it("classifies CRWV as Technology for Vision when provider sector is missing", () => {
    expect(resolveSector({ symbol: "CRWV", sector: null })).toBe("Technology");
  });

  it("classifies CRWV as Technology for Screener", () => {
    expect(getDisplaySectorForTicker("CRWV", "Unclassified")).toBe("Technology");
  });
});
