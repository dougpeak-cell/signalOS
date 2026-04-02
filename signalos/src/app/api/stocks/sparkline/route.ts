import { NextRequest, NextResponse } from "next/server";
import { getQuoteByTicker } from "@/lib/market/quotes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SparkPoint =
  | number
  | {
      value?: number | null;
      close?: number | null;
      price?: number | null;
      c?: number | null;
    };

type SparklinePayload = {
  ticker?: string;
  points?: SparkPoint[] | null;
  candles?: SparkPoint[] | null;
  prices?: SparkPoint[] | null;
  data?: SparkPoint[] | null;
  results?: SparkPoint[] | null;
  history?: SparkPoint[] | null;
  series?: SparkPoint[] | null;
  intraday?: SparkPoint[] | null;
  prevClose?: number | string | null;
  previousClose?: number | string | null;
  price?: number | string | null;
  lastPrice?: number | string | null;
  last?: number | string | null;
  value?: number | string | null;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getPointValue(point: SparkPoint): number | null {
  if (typeof point === "number") {
    return Number.isFinite(point) ? point : null;
  }

  if (!point || typeof point !== "object") return null;

  return (
    toNumber(point.value) ??
    toNumber(point.close) ??
    toNumber(point.price) ??
    toNumber(point.c)
  );
}

function extractPoints(payload: SparklinePayload | SparkPoint[]): number[] {
  const raw = Array.isArray(payload)
    ? payload
    : payload.points ??
      payload.candles ??
      payload.prices ??
      payload.data ??
      payload.results ??
      payload.history ??
      payload.series ??
      payload.intraday ??
      [];

  return raw
    .map(getPointValue)
    .filter((value): value is number => value != null && Number.isFinite(value));
}

function buildFallbackPoints(payload: SparklinePayload): number[] {
  const prevClose = toNumber(payload.prevClose) ?? toNumber(payload.previousClose);
  const price =
    toNumber(payload.price) ??
    toNumber(payload.lastPrice) ??
    toNumber(payload.last) ??
    toNumber(payload.value);

  if (prevClose != null && price != null) {
    return prevClose === price ? [prevClose, price] : [prevClose, price];
  }

  if (price != null) {
    return [price, price];
  }

  return [];
}

function normalizePoints(points: number[]): number[] {
  const clean = points.filter((value) => Number.isFinite(value));

  if (clean.length >= 2) return clean;
  if (clean.length === 1) return [clean[0], clean[0]];
  return [];
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();

  if (!ticker) {
    return NextResponse.json(
      { error: "ticker is required", ticker: "", points: [] },
      { status: 400 }
    );
  }

  try {
    const quoteUrl = new URL("/api/massive/quote", req.url);
    quoteUrl.searchParams.set("ticker", ticker);
    quoteUrl.searchParams.set("ts", Date.now().toString());

    const quoteResponse = await fetch(quoteUrl.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (quoteResponse.ok) {
      const payload = (await quoteResponse.json()) as SparklinePayload;
      const extracted = extractPoints(payload);
      const points = normalizePoints(
        extracted.length ? extracted : buildFallbackPoints(payload)
      );

      return NextResponse.json({
        ticker,
        points,
      });
    }
  } catch (error) {
    console.error(`Sparkline proxy failed for ${ticker}:`, error);
  }

  try {
    const fallbackQuote = await getQuoteByTicker(ticker);
    const fallbackPoints = normalizePoints(
      fallbackQuote?.prevClose != null && fallbackQuote?.price != null
        ? [fallbackQuote.prevClose, fallbackQuote.price]
        : fallbackQuote?.price != null
        ? [fallbackQuote.price, fallbackQuote.price]
        : []
    );

    return NextResponse.json({
      ticker,
      points: fallbackPoints,
    });
  } catch (error) {
    console.error(`Sparkline local fallback failed for ${ticker}:`, error);

    return NextResponse.json({
      ticker,
      points: [],
    });
  }
}