import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_KEY = process.env.MASSIVE_API_KEY;

function normalize(value: string) {
  return `X:${value.replace("X:", "").replace("USD", "").toUpperCase()}USD`;
}

export async function GET(req: Request) {
  if (!API_KEY) {
    return NextResponse.json({ ok: false, feed: [] });
  }

  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker") ?? "BTC";

  const t = normalize(ticker);

  try {
    const res = await fetch(
      `https://api.polygon.io/v3/quotes/${t}?limit=15&sort=timestamp&order=desc&apiKey=${API_KEY}`,
      { cache: "no-store" }
    );

    const json = await res.json();

    const feed = Array.isArray(json.results)
      ? json.results.map((q: any) => ({
          id: `${q.t}-${q.bp}`,
          price: q.bp ?? null,
          size: q.bs ?? null,
          timestamp: q.t ?? null,
        }))
      : [];

    return NextResponse.json({ ok: true, feed });
  } catch (err) {
    return NextResponse.json({ ok: false, feed: [] });
  }
}