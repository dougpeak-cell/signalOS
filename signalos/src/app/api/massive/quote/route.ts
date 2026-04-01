import { NextRequest, NextResponse } from "next/server";
import { getQuoteByTicker } from "@/lib/market/quotes";

const INDEX_MAP: Record<string, string> = {
  "^GSPC": "SPY",
  "^IXIC": "QQQ",
  "^DJI": "DIA",
  "^RUT": "IWM",
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let ticker = searchParams.get("ticker");

    if (!ticker) {
      return NextResponse.json({ error: "Missing ticker" }, { status: 400 });
    }

    ticker = ticker.toUpperCase().trim();

    const lookupTicker = INDEX_MAP[ticker] ?? ticker;
    const rawQuote = await getQuoteByTicker(lookupTicker);

    if (rawQuote == null) {
      return NextResponse.json(
        { ticker, error: "No price available" },
        { status: 404 }
      );
    }

    const price =
      typeof rawQuote === "number"
        ? rawQuote
        : toNumber((rawQuote as any).price) ??
          toNumber((rawQuote as any).lastPrice) ??
          toNumber((rawQuote as any).last) ??
          toNumber((rawQuote as any).close);

    const prevClose =
      typeof rawQuote === "object" && rawQuote !== null
        ? toNumber((rawQuote as any).prevClose) ??
          toNumber((rawQuote as any).previousClose) ??
          toNumber((rawQuote as any).priorClose) ??
          toNumber((rawQuote as any).closePrev)
        : null;

    if (price == null) {
      return NextResponse.json(
        { ticker, error: "No price available" },
        { status: 404 }
      );
    }

    const change =
      prevClose != null && prevClose !== 0 ? price - prevClose : null;

    const changePct =
      change != null && prevClose != null && prevClose !== 0
        ? (change / prevClose) * 100
        : null;

    const direction =
      change == null ? "flat" : change > 0 ? "up" : change < 0 ? "down" : "flat";

    return NextResponse.json({
      ticker,
      lookupTicker,
      source: lookupTicker !== ticker ? "index-proxy" : "stock",
      price,
      prevClose,
      change,
      changePct,
      direction,
    });
  } catch (error) {
    console.error("Quote route failed:", error);

    return NextResponse.json(
      { error: "Quote route failed" },
      { status: 500 }
    );
  }
}