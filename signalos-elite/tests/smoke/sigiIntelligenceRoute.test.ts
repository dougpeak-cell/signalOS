import assert from "node:assert/strict";
import test from "node:test";
import {
  handleSigiIntelligencePost,
  type SigiIntelligenceRouteClient,
} from "@/app/api/sigi/intelligence/route";

test("/api/sigi/intelligence returns a structured card from a mocked response surface", async () => {
  let createCall: Parameters<SigiIntelligenceRouteClient["responses"]["create"]>[0] | null = null;

  const mockClient: SigiIntelligenceRouteClient = {
    responses: {
      create: async (input) => {
        createCall = input;

        return {
          output_text: JSON.stringify({
            ticker: "NVDA",
            companyName: "NVIDIA",
            signalOSScore: 84,
            trendDirection: "Bullish",
            momentumStatus: "Strong",
            sectorStrength: "Strong",
            riskMeter: "Medium",
            analystConfidence: "High",
            suggestedAction: "Research",
            keyLevels: {
              support: "$200.00",
              resistance: "$210.00",
              breakout: "Above $210.00",
            },
            bullCase: ["AI demand remains active"],
            bearCase: ["Failed continuation would weaken the setup"],
            summary: "Momentum remains constructive while demand holds.",
            disclaimer: "Educational only. Not financial advice.",
          }),
        };
      },
    },
  };

  const request = new Request("http://localhost:3000/api/sigi/intelligence", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: "Give me a quick NVDA read",
      ticker: "NVDA",
      marketData: {
        price: 205.42,
        changePercent: 0.27,
        sector: "Semiconductors",
      },
    }),
  });

  const response = await handleSigiIntelligencePost(request, mockClient);
  const data = (await response.json()) as {
    card?: {
      ticker: string;
      signalOSScore: number;
      suggestedAction: string;
    };
  };

  assert.equal(response.status, 200);
  assert.equal(data.card?.ticker, "NVDA");
  assert.equal(data.card?.signalOSScore, 84);
  assert.equal(data.card?.suggestedAction, "Research");
  assert.equal(createCall?.model, "gpt-4o-mini");
  assert.equal(createCall?.text.format.type, "json_schema");
  assert.equal(createCall?.text.format.strict, true);
  assert.match(createCall?.input[1]?.content ?? "", /Give me a quick NVDA read/);
});

test("/api/sigi/intelligence returns the expected 500 shape when provider output is malformed", async () => {
  const mockClient: SigiIntelligenceRouteClient = {
    responses: {
      create: async () => ({
        output_text: "{not-valid-json",
      }),
    },
  };

  const request = new Request("http://localhost:3000/api/sigi/intelligence", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: "Give me a quick NVDA read",
      ticker: "NVDA",
      marketData: {
        price: 205.42,
      },
    }),
  });

  const originalConsoleError = console.error;

  try {
    console.error = () => {};

    const response = await handleSigiIntelligencePost(request, mockClient);
    const data = (await response.json()) as {
      error?: string;
    };

    assert.equal(response.status, 500);
    assert.deepEqual(data, {
      error: "Sigi could not generate intelligence card.",
    });
  } finally {
    console.error = originalConsoleError;
  }
});