import { NextResponse } from "next/server";
import {
  getEmptyFinnhubFundamentals,
  getFinnhubFundamentals,
} from "@/lib/fundamentals/finnhubFundamentals";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();

  if (!ticker) {
    return NextResponse.json(
      { ok: false, error: "Missing ticker" },
      { status: 400 }
    );
  }

  if (!process.env.FINNHUB_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Missing FINNHUB_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const fundamentals = await getFinnhubFundamentals(ticker);
    const safeFundamentals = fundamentals ?? getEmptyFinnhubFundamentals();

    return NextResponse.json({
      ok: true,
      ticker,
      ...safeFundamentals,
    });
  } catch (error) {
    console.error("Finnhub fundamentals error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load fundamentals" },
      { status: 500 }
    );
  }
}