import { describe, expect, it } from "vitest";
import { buildAnalystNewsSummary } from "./analystNewsSummary";
import type { SignalNewsItem } from "./scoreNewsHeaderItems";

const NOW = new Date("2026-09-12T16:00:00.000Z");

function news(overrides: Partial<SignalNewsItem>): SignalNewsItem {
  return {
    id: "item",
    headline: "Analyst raises price target on NVDA",
    publishedAt: "2026-09-12T15:30:00.000Z",
    tickers: ["NVDA"],
    primaryTicker: "NVDA",
    tags: [],
    channels: [],
    kind: "news",
    sentiment: "positive",
    source: "Market Wire",
    url: "https://example.com/analyst-read",
    ...overrides,
  };
}

describe("buildAnalystNewsSummary", () => {
  it("prefers fresh analyst coverage and preserves supportive sentiment", () => {
    const summary = buildAnalystNewsSummary(
      [
        news({
          headline: "Analyst raises target on AAPL",
          publishedAt: "2026-09-12T15:55:00.000Z",
          primaryTicker: "AAPL",
          tickers: ["AAPL"],
        }),
        news(),
      ],
      "nvda",
      NOW
    );

    expect(summary).toMatchObject({
      state: "supportive",
      kind: "analyst",
      label: "Supportive analyst update",
      headline: "Analyst raises price target on NVDA",
      ageLabel: "30m ago",
      source: "Market Wire",
      href: "https://example.com/analyst-read",
    });
  });

  it("marks negative analyst coverage as cautious without predicting an outcome", () => {
    const summary = buildAnalystNewsSummary(
      [news({ headline: "Analyst downgrades NVDA", sentiment: "negative" })],
      "NVDA",
      NOW
    );

    expect(summary).toMatchObject({
      state: "cautious",
      kind: "analyst",
      label: "Cautious analyst update",
      summary: "This coverage is cautious, so watch whether price action confirms added pressure.",
    });
  });

  it("uses fresh ticker-specific news when no analyst update is available", () => {
    const summary = buildAnalystNewsSummary(
      [news({ headline: "NVDA launches a new platform", sentiment: "neutral" })],
      "NVDA",
      NOW
    );

    expect(summary).toMatchObject({
      state: "neutral",
      kind: "news",
      label: "Stock news context",
      headline: "NVDA launches a new platform",
      summary: "This fresh company coverage is contextual, so let price and volume decide its impact.",
    });
  });

  it("fails closed when there is no fresh ticker-specific coverage", () => {
    const summary = buildAnalystNewsSummary(
      [news({ publishedAt: "2026-09-10T15:30:00.000Z" })],
      "NVDA",
      NOW
    );

    expect(summary).toMatchObject({
      state: "unavailable",
      kind: "unavailable",
      headline: null,
      label: "No fresh analyst update",
    });
  });
});