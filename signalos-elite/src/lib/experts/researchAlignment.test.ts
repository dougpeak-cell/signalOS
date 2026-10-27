import { describe, expect, it } from "vitest";
import { classifyHoldingChange } from "./researchAlignment";

describe("reported holding changes", () => {
  it("distinguishes new, increased, reduced, unchanged and closed positions", () => {
    expect(classifyHoldingChange(10, 0, 1)).toBe("New position");
    expect(classifyHoldingChange(12, 10, 1)).toBe("Increased");
    expect(classifyHoldingChange(8, 10, 1)).toBe("Reduced");
    expect(classifyHoldingChange(10, 10, 1)).toBe("Unchanged");
    expect(classifyHoldingChange(0, 10, 1)).toBe("Closed position");
  });

  it("does not mistake stock splits for accumulation", () => {
    expect(classifyHoldingChange(40, 10, 4)).toBe("Unchanged");
    expect(classifyHoldingChange(35, 10, 4)).toBe("Reduced");
    expect(classifyHoldingChange(5, 10, 0.5)).toBe("Unchanged");
  });

  it("does not infer changes from missing or invalid evidence", () => {
    expect(classifyHoldingChange(10, null, 1)).toBe("Unavailable");
    expect(classifyHoldingChange(10, 10, null)).toBe("Unavailable");
    expect(classifyHoldingChange(10, 10, 0)).toBe("Unavailable");
    expect(classifyHoldingChange(NaN, 10, 1)).toBe("Unavailable");
  });
});