import { NextResponse } from "next/server";
import { OpenAI } from "openai";

export type SigiIntelligenceRouteClient = {
  responses: {
    create: (input: unknown) => Promise<{
      output_text: string;
    }>;
  };
};

function createOpenAiClient(): SigiIntelligenceRouteClient {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  }) as unknown as SigiIntelligenceRouteClient;
}

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ticker: { type: "string" },
    companyName: { type: "string" },
    signalOSScore: { type: "number" },
    trendDirection: {
      type: "string",
      enum: ["Bullish", "Bearish", "Neutral"],
    },
    momentumStatus: {
      type: "string",
      enum: ["Strong", "Improving", "Weakening", "Mixed"],
    },
    sectorStrength: {
      type: "string",
      enum: ["Strong", "Moderate", "Weak"],
    },
    riskMeter: {
      type: "string",
      enum: ["Low", "Medium", "High"],
    },
    analystConfidence: {
      type: "string",
      enum: ["High", "Strong", "Moderate", "Speculative"],
    },
    suggestedAction: {
      type: "string",
      enum: ["Watch", "Research", "Avoid", "Hold", "Consider Entry"],
    },
    keyLevels: {
      type: "object",
      additionalProperties: false,
      properties: {
        support: { type: "string" },
        resistance: { type: "string" },
        breakout: { type: "string" },
      },
      required: ["support", "resistance", "breakout"],
    },
    bullCase: {
      type: "array",
      items: { type: "string" },
    },
    bearCase: {
      type: "array",
      items: { type: "string" },
    },
    summary: { type: "string" },
    disclaimer: { type: "string" },
  },
  required: [
    "ticker",
    "companyName",
    "signalOSScore",
    "trendDirection",
    "momentumStatus",
    "sectorStrength",
    "riskMeter",
    "analystConfidence",
    "suggestedAction",
    "keyLevels",
    "bullCase",
    "bearCase",
    "summary",
    "disclaimer",
  ],
} as const;

export async function handleSigiIntelligencePost(
  req: Request,
  client: SigiIntelligenceRouteClient = createOpenAiClient()
) {
  try {
    const { question, ticker, marketData } = await req.json();

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "You are Sigi, an AI market intelligence assistant. Return structured market intelligence only. Do not give personalized financial advice. Use careful, educational language.",
        },
        {
          role: "user",
          content: JSON.stringify({
            question,
            ticker,
            marketData,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "sigi_intelligence_card",
          schema,
          strict: true,
        },
      },
    });

    const text = response.output_text;
    const data = JSON.parse(text);

    return NextResponse.json({ card: data });
  } catch (error) {
    console.error("Sigi intelligence error:", error);

    return NextResponse.json(
      { error: "Sigi could not generate intelligence card." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return handleSigiIntelligencePost(req, createOpenAiClient());
}