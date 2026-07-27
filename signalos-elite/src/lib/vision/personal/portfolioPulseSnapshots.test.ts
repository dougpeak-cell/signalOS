import { describe, expect, it } from "vitest";
import {
  resolvePortfolioHoldingPulses,
  type PortfolioPulseSnapshotRow,
} from "./portfolioPulseSnapshots";

const NOW = new Date("2026-07-27T18:00:00.000Z");
const SYMBOLS = [" xom ", "PEP", "mo", "NVDA", "MSFT"];

function snapshot(
  entityKey: string,
  score: number,
  calculatedAt: string,
): PortfolioPulseSnapshotRow {
  return {
    entity_key: entityKey,
    score,
    state: "Constructive",
    direction: "stable",
    status: "ready",
    calculated_at: calculatedAt,
  };
}

describe("resolvePortfolioHoldingPulses", () => {
  it("maps newest verified snapshots across the complete portfolio universe", () => {
    const result = resolvePortfolioHoldingPulses(
      SYMBOLS,
      [
        snapshot("XOM", 68, "2026-07-25T15:00:00.000Z"),
        snapshot("XOM", 72, "2026-07-27T15:00:00.000Z"),
        snapshot("PEP", 64, "2026-07-26T15:00:00.000Z"),
        snapshot("MO", 59, "2026-07-20T15:00:00.000Z"),
        snapshot("NVDA", 81, "2026-07-27T16:00:00.000Z"),
      ],
      NOW,
    );

    expect(result.get("XOM")).toMatchObject({
      pulseScore: 72,
      pulseDelta: 4,
      pulseDirection: "improving",
      pulseStatus: "ready",
    });
    expect(result.get("PEP")).toMatchObject({
      pulseStatus: "ready",
      pulseDirection: "stable",
    });
    expect(result.get("MO")?.pulseStatus).toBe("stale");
    expect(result.get("NVDA")?.pulseScore).toBe(81);
    expect(result.get("MSFT")?.pulseStatus).toBe("awaiting_first_snapshot");
  });

  it("marks invalid symbols unsupported and query failures as errors", () => {
    const unsupported = resolvePortfolioHoldingPulses(["???"], [], NOW);
    const failed = resolvePortfolioHoldingPulses(SYMBOLS, [], NOW, true);

    expect(unsupported.get("???")?.pulseStatus).toBe("unsupported");
    expect(failed.get("XOM")?.pulseStatus).toBe("error");
  });
});