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

describe("TE sector classification", () => {
  it("classifies TE as Energy for Vision when provider sector is missing", () => {
    expect(resolveSector({ symbol: "TE", sector: null })).toBe("Energy");
  });

  it("classifies TE as Energy for Screener", () => {
    expect(getDisplaySectorForTicker("TE", "Unclassified")).toBe("Energy");
  });
});
