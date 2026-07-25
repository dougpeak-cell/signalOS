import {
  isFiniteNumber,
} from "../math";

import type {
  HistoricalBar,
} from "../types";

import {
  fetchJson,
} from "./fetchJson";

/* =========================================================
   LIVE HISTORY ADAPTER

   Connects to the existing SigiOS history route:

   /api/history?symbol=NVDA&range=1y&timespan=day
========================================================= */

type HistoryPayload = {
  bars?: unknown[];

  results?: {
    t?: number;
    o?: number;
    h?: number;
    l?: number;
    c?: number;
    v?: number;
  }[];

  data?: unknown[];

  error?: string;
};

export type HistoryLoadResult = {
  bars: HistoricalBar[];

  source: string;

  durationMs: number;

  warning: string | null;
};

export async function loadDailyHistory({
  origin,
  symbol,
  range = "1y",
}: {
  origin: string;
  symbol: string;
  range?: string;
}): Promise<HistoryLoadResult> {
  const url =
    new URL(
      "/api/history",
      origin,
    );

  url.searchParams.set(
    "symbol",
    symbol,
  );

  url.searchParams.set(
    "ticker",
    symbol,
  );

  url.searchParams.set(
    "range",
    range,
  );

  url.searchParams.set(
    "timespan",
    "day",
  );

  const response =
    await fetchJson<HistoryPayload>(
      url.toString(),
      {
        timeoutMs: 10_000,
        cache: "no-store",
      },
    );

  if (
    !response.ok ||
    !response.data
  ) {
    return {
      bars: [],
      source:
        "SigiOS history API",

      durationMs:
        response.durationMs,

      warning:
        response.error ??
        "History was unavailable.",
    };
  }

  const bars =
    normalizeHistory(
      response.data,
    );

  return {
    bars,

    source:
      "SigiOS history API",

    durationMs:
      response.durationMs,

    warning:
      bars.length
        ? null
        : "History response contained no valid bars.",
  };
}

function normalizeHistory(
  payload: HistoryPayload,
): HistoricalBar[] {
  const candidates =
    Array.isArray(payload.bars)
      ? payload.bars
      : Array.isArray(
            payload.data,
          )
        ? payload.data
        : Array.isArray(
              payload.results,
            )
          ? payload.results
          : [];

  return candidates
    .map(normalizeBar)
    .filter(
      (
        bar,
      ): bar is HistoricalBar =>
        bar !== null,
    )
    .sort(
      (first, second) =>
        normalizeTime(
          first.time,
        ) -
        normalizeTime(
          second.time,
        ),
    );
}

function normalizeBar(
  raw: unknown,
): HistoricalBar | null {
  if (
    !raw ||
    typeof raw !== "object"
  ) {
    return null;
  }

  const row =
    raw as Record<
      string,
      unknown
    >;

  const time =
    row.time ??
    row.timestamp ??
    row.t ??
    row.date;

  const open =
    numberValue(
      row.open ?? row.o,
    );

  const high =
    numberValue(
      row.high ?? row.h,
    );

  const low =
    numberValue(
      row.low ?? row.l,
    );

  const close =
    numberValue(
      row.close ?? row.c,
    );

  const volume =
    numberValue(
      row.volume ?? row.v,
    ) ?? 0;

  if (
    time === null ||
    time === undefined ||
    open === null ||
    high === null ||
    low === null ||
    close === null
  ) {
    return null;
  }

  if (
    high < low ||
    high < open ||
    high < close ||
    low > open ||
    low > close
  ) {
    return null;
  }

  return {
    time:
      normalizeBarTime(time),

    open,
    high,
    low,
    close,
    volume,
  };
}

function normalizeBarTime(
  value: unknown,
): string | number {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    const numeric =
      Number(value);

    if (
      Number.isFinite(
        numeric,
      )
    ) {
      return numeric;
    }

    return value;
  }

  return String(value);
}

function normalizeTime(
  value: string | number,
): number {
  if (
    typeof value ===
    "number"
  ) {
    return value <
      10_000_000_000
      ? value * 1000
      : value;
  }

  const numeric =
    Number(value);

  if (
    Number.isFinite(numeric)
  ) {
    return numeric <
      10_000_000_000
      ? numeric * 1000
      : numeric;
  }

  return new Date(
    value,
  ).getTime();
}

function numberValue(
  value: unknown,
): number | null {
  if (
    typeof value ===
      "number" &&
    isFiniteNumber(value)
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    const parsed =
      Number(value);

    return isFiniteNumber(
      parsed,
    )
      ? parsed
      : null;
  }

  return null;
}