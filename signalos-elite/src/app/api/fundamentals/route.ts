import { NextResponse } from "next/server";
import {
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

  if (!process.env.FMP_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Missing FMP_API_KEY" },
      { status: 503 }
    );
  }

  try {
    const fundamentals = await getFinnhubFundamentals(ticker);
    if (!fundamentals) return NextResponse.json({ ok: false, error: "FMP fundamentals unavailable." }, { status: 502 });

    return NextResponse.json({
      ok: true,
      ticker,
      ...fundamentals,
    });
  } catch (error) {
    console.error("FMP fundamentals error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load fundamentals" },
      { status: 500 }
    );
  }
}