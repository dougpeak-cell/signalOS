import { NextResponse } from "next/server";
import { fetchLatestSignalRows } from "@/lib/queries/signals";

export async function GET() {
  try {
    const rows = await fetchLatestSignalRows(250);

    const seen = new Set<string>();
    const stocks = rows
      .map((row) => ({
        ticker: String(row.ticker ?? "").toUpperCase().trim(),
        company: String(row.company_name ?? row.ticker ?? "").trim(),
      }))
      .filter((row) => row.ticker.length > 0)
      .filter((row) => {
        if (seen.has(row.ticker)) return false;
        seen.add(row.ticker);
        return true;
      })
      .sort((a, b) => a.ticker.localeCompare(b.ticker));

    return NextResponse.json(
      { stocks },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Failed to load stock metadata", error);

    return NextResponse.json(
      { stocks: [] },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
