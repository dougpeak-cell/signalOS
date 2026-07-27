import { describe, expect, it } from "vitest";
import { POST } from "./route";

const marketContext = {
  marketHealth: 47,
  regime: "Risk-Off",
  sectorLeaders: ["Healthcare", "Financials"],
  sectorLaggards: ["Technology", "Energy"],
  opportunities: ["DLR"],
  risks: ["Technology remains weak"],
};

function request(body: unknown) {
  return new Request("http://localhost/api/vision/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/vision/ask", () => {
  it("answers a sector leadership question from market context", async () => {
    const response = await POST(request({
      question: "Which sector Pulse is rising?",
      marketContext,
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.answer).toMatchObject({
      headline: "Leadership is concentrated in Healthcare",
      confidence: expect.any(Number),
    });
    expect(payload.answer.summary).toContain("Financials is also improving");
  });

  it("accepts the legacy context key during client rollout", async () => {
    const response = await POST(request({
      question: "What is the main market risk?",
      context: marketContext,
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.answer.headline).toContain("Technology remains weak");
  });
});