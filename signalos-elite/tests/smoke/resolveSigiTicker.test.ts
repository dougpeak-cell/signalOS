import assert from "node:assert/strict";
import test from "node:test";
import { resolveSigiTicker } from "@/lib/sigi/resolveTicker";
import { buildSigiPromptLabel } from "@/lib/sigi/sigiInput";

test("prefers an explicit ticker target over an ambiguous metric symbol", () => {
  const ticker = resolveSigiTicker({
    message: "What does ROE mean for AMZN?",
    fallbackTicker: "AMZN",
  });

  assert.equal(ticker, "AMZN");
});

test("keeps AMZN focused in the Core Fundamentals mobile prompt flow", () => {
  const prompt = "What does ROE mean for AMZN? Focus on AMZN.";
  const parsed = buildSigiPromptLabel(prompt);
  const ticker = resolveSigiTicker({
    explicitTicker: parsed.ticker,
    message: prompt,
    source: "type",
  });

  assert.equal(parsed.ticker, "AMZN");
  assert.equal(ticker, "AMZN");
});