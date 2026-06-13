import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFallbackSigiIntelligenceCard,
  normalizeSigiIntelligenceCardPayload,
  type SigiIntelligenceLike,
} from "@/lib/sigi/intelligenceCard";

const baseIntelligence: SigiIntelligenceLike = {
  ticker: "NVDA",
  heroTitle: "NVIDIA",
  heroSummary: "Momentum is active but confirmation still matters.",
  tone: "bullish",
  catalyst: "AI demand remains active.",
  risk: "Failed continuation would weaken the setup.",
};

test("returns a fallback intelligence card when stock context exists but model card is missing", () => {
  const card = normalizeSigiIntelligenceCardPayload(null, baseIntelligence, {
    ticker: "NVDA",
    name: "NVIDIA",
    changePercent: 2.4,
    trend: "bullish",
    support: 200.12,
    resistance: 210.45,
  });

  assert.ok(card);
  assert.equal(card?.ticker, "NVDA");
  assert.equal(card?.companyName, "NVIDIA");
  assert.equal(card?.signalOSScore, 78);
  assert.equal(card?.trendDirection, "Bullish");
  assert.equal(card?.suggestedAction, "Research");
});

test("normalizes card payload values and clamps invalid fields to safe fallbacks", () => {
  const fallback = buildFallbackSigiIntelligenceCard(baseIntelligence, {
    ticker: "NVDA",
    name: "NVIDIA",
    changePercent: 0.3,
    support: 199.5,
    resistance: 208.75,
  });

  const card = normalizeSigiIntelligenceCardPayload(
    {
      intelligenceCard: {
        ticker: " nvda ",
        companyName: "  NVIDIA Corp ",
        signalOSScore: 132,
        trendDirection: "Sideways" as never,
        momentumStatus: "Strong",
        sectorStrength: "Strong",
        riskMeter: "Low",
        analystConfidence: "High",
        suggestedAction: "Research",
        keyLevels: {
          support: " 200.00 ",
          resistance: "",
          breakout: " Above 210 ",
        },
        bullCase: [" AI demand ", " ", "Leadership"],
        bearCase: [],
        summary: "  Clean breakout if volume persists. ",
        disclaimer: "  Educational only. ",
      },
    },
    baseIntelligence,
    {
      ticker: "NVDA",
      name: "NVIDIA",
      changePercent: 0.3,
      support: 199.5,
      resistance: 208.75,
    }
  );

  assert.ok(card);
  assert.equal(card?.ticker, "NVDA");
  assert.equal(card?.companyName, "NVIDIA Corp");
  assert.equal(card?.signalOSScore, 100);
  assert.equal(card?.trendDirection, fallback.trendDirection);
  assert.equal(card?.keyLevels.support, "200.00");
  assert.equal(card?.keyLevels.resistance, fallback.keyLevels.resistance);
  assert.equal(card?.bullCase.length, 2);
  assert.deepEqual(card?.bearCase, fallback.bearCase);
  assert.equal(card?.summary, "Clean breakout if volume persists.");
});