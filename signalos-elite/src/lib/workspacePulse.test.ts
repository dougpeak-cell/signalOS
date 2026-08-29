import { describe, expect, it } from "vitest";
import { getWorkspacePulseMeaning } from "./workspacePulse";

describe("getWorkspacePulseMeaning", () => {
  it.each([
    [90, "Elite"],
    [80, "Strong"],
    [68, "Constructive"],
    [48, "Balanced"],
    [30, "Weak"],
    [29.99, "Critical"],
  ])("maps Pulse %s to the canonical AMSA state %s", (pulse, label) => {
    expect(getWorkspacePulseMeaning(pulse).label).toBe(label);
  });

  it("keeps missing readings unavailable", () => {
    expect(getWorkspacePulseMeaning(null).label).toBe("Awaiting Pulse");
  });
});
