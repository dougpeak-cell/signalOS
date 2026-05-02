import { NextRequest, NextResponse } from "next/server";
import { getMassiveFundamentals } from "@/lib/market/massiveFundamentals";
import { fetchServerQuoteState } from "@/lib/market/serverQuote";
import { fetchSignalByTicker } from "@/lib/queries/signals";

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

function safeNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function isFreshSignalDate(
  asOfDate?: string | null,
  createdAt?: string | null,
  maxAgeDays = 14
) {
  const rawDate = asOfDate ?? createdAt ?? null;
  if (!rawDate) return false;

  const parsedDate = new Date(rawDate);
  const timestamp = parsedDate.getTime();
  if (!Number.isFinite(timestamp)) return false;

  const ageMs = Date.now() - timestamp;
  if (ageMs < 0) return true;

  return ageMs <= maxAgeDays * 24 * 60 * 60 * 1000;
}

function resolveCanonicalLevels(input: {
  signalSupport: number | null;
  signalResistance: number | null;
  canonicalPrice: number | null;
  signalIsFresh: boolean;
}) {
  const { signalSupport, signalResistance, canonicalPrice, signalIsFresh } = input;

  const support =
    signalIsFresh &&
    signalSupport != null &&
    canonicalPrice != null &&
    signalSupport < canonicalPrice
      ? signalSupport
      : null;

  const resistance =
    signalIsFresh &&
    signalResistance != null &&
    canonicalPrice != null &&
    signalResistance > canonicalPrice
      ? signalResistance
      : null;

  return { support, resistance };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = normalizeTicker(searchParams.get("symbol") ?? "");

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required." }, { status: 400 });
  }

  const [signalRow, companyProfile] = await Promise.all([
    fetchSignalByTicker(symbol),
    getMassiveFundamentals(symbol),
  ]);
  const quoteState = await fetchServerQuoteState(symbol, new URL(request.url).origin);
  const price = quoteState.price ?? signalRow?.price ?? null;
  const previousClose = quoteState.prevClose ?? null;
  const signalSupport =
    safeNumber(signalRow?.entry_low) ??
    safeNumber(signalRow?.stop_loss) ??
    null;
  const signalResistance =
    safeNumber(signalRow?.target_price) ??
    safeNumber(signalRow?.entry_high) ??
    null;
  const signalIsFresh = isFreshSignalDate(
    signalRow?.as_of_date ?? null,
    signalRow?.created_at ?? null
  );
  const { support: canonicalSupport, resistance: canonicalResistance } =
    resolveCanonicalLevels({
      signalSupport,
      signalResistance,
      canonicalPrice: price,
      signalIsFresh,
    });
  const changePercent =
    price != null &&
    previousClose != null &&
    Number.isFinite(price) &&
    Number.isFinite(previousClose) &&
    previousClose !== 0
      ? ((price - previousClose) / previousClose) * 100
      : null;

  return NextResponse.json(
    {
      stock: {
        ticker: symbol,
        name: companyProfile?.name ?? signalRow?.company_name ?? symbol,
        companyDescription: companyProfile?.description ?? null,
        sector: companyProfile?.sector ?? signalRow?.sector ?? null,
        industry: companyProfile?.industry ?? null,
        price,
        prevClose: previousClose,
        previousClose,
        changePercent,
        volume: companyProfile?.volume ?? null,
        avgVolume: companyProfile?.avgVolume ?? null,
        marketCap: companyProfile?.marketCap ?? null,
        peRatio: companyProfile?.pe ?? null,
        trend:
          signalRow?.conviction != null
            ? signalRow.conviction >= 70
              ? "Bullish"
              : signalRow.conviction <= 40
                ? "Bearish"
                : "Neutral"
            : null,
        setup: signalRow?.tier ?? null,
        catalyst: signalRow?.catalysts?.[0] ?? null,
        support: canonicalSupport,
        resistance: canonicalResistance,
        notes: signalRow?.thesis ?? null,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}