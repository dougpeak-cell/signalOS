import type { SigiIntelligenceCard } from "@/types/sigiIntelligence";

export type SigiIntelligenceMarketData = {
  price?: number | null;
  changePercent?: number | null;
  volume?: number | null;
  sector?: string | null;
  signalOSScore?: number | null;
  relativeVolume?: number | null;
  marketCap?: number | null;
  support?: number | null;
  resistance?: number | null;
  trend?: string | null;
  setup?: string | null;
  catalyst?: string | null;
};

type SigiIntelligenceCardApiResponse = {
  card?: SigiIntelligenceCard | null;
  error?: string;
};

export async function fetchSigiIntelligenceCard({
  question,
  ticker,
  marketData,
}: {
  question: string;
  ticker: string;
  marketData: SigiIntelligenceMarketData;
}): Promise<SigiIntelligenceCard | null> {
  try {
    const response = await fetch("/api/sigi/intelligence", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        ticker,
        marketData,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as SigiIntelligenceCardApiResponse;
    return data.card ?? null;
  } catch {
    return null;
  }
}