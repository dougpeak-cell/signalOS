import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  FALLBACK_RUSSELL2000_SOURCE,
  FALLBACK_RUSSELL2000_TICKER_DATA,
} from "@/lib/market/russell2000FallbackData";

export const RUSSELL2000_PRIVATE_FILE_PATH = ".private/russell2000.constituents.csv";

// Accepted private file formats:
// 1. One ticker per line.
// 2. A CSV whose first row includes a Ticker or Symbol column.
// See .private/russell2000.constituents.example.csv for a checked-in example.

function normalizeCell(value: string): string {
  return value.trim().replace(/^"+|"+$/g, "").toUpperCase();
}

function looksLikeTicker(value: string): boolean {
  return /^[A-Z][A-Z0-9.-]{0,9}$/.test(value);
}

function parsePrivateTickerData(raw: string): string | null {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return null;

  const firstColumns = lines[0]
    .split(",")
    .map((value) => normalizeCell(value).toLowerCase());
  const tickerColumnIndex = firstColumns.findIndex(
    (value) => value === "ticker" || value === "symbol"
  );

  const tickers = new Set<string>();

  for (const line of lines.slice(tickerColumnIndex >= 0 ? 1 : 0)) {
    const columns = line.split(",").map(normalizeCell);
    const candidate =
      tickerColumnIndex >= 0
        ? columns[tickerColumnIndex] ?? ""
        : columns.find((value) => looksLikeTicker(value)) ?? "";

    if (looksLikeTicker(candidate)) {
      tickers.add(candidate);
    }
  }

  return tickers.size ? Array.from(tickers).join(",") : null;
}

function loadPrivateRussell2000TickerData(): string | null {
  const privatePath = path.join(process.cwd(), RUSSELL2000_PRIVATE_FILE_PATH);
  if (!existsSync(privatePath)) return null;

  const raw = readFileSync(privatePath, "utf8");
  return parsePrivateTickerData(raw);
}

const privateRussell2000TickerData = loadPrivateRussell2000TickerData();

export const RUSSELL2000_SOURCE = privateRussell2000TickerData
  ? `Private licensed Russell 2000 constituents (${RUSSELL2000_PRIVATE_FILE_PATH})`
  : FALLBACK_RUSSELL2000_SOURCE;

export const RUSSELL2000_TICKER_DATA =
  privateRussell2000TickerData ?? FALLBACK_RUSSELL2000_TICKER_DATA;
