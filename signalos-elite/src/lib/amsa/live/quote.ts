import {
  isFiniteNumber,
  round,
} from "../math";

import type {
  AMSALiveQuote,
} from "../types";

import {
  fetchJson,
} from "./fetchJson";

/* =========================================================
   LIVE QUOTE ADAPTER

   Connects to the existing route:

   /api/massive/quote?symbol=NVDA

   The normalizer supports several common payload shapes.
========================================================= */

type QuotePayload = {
  symbol?: string;

  price?: number | string;
  currentPrice?: number | string;
  last?: number | string;
  lastPrice?: number | string;

  previousClose?: number | string;
  prevClose?: number | string;

  change?: number | string;
  changePercent?: number | string;
  percentChange?: number | string;

  open?: number | string;
  high?: number | string;
  low?: number | string;
  volume?: number | string;

  bid?: number | string;
  ask?: number | string;

  timestamp?: string | number;

  marketStatus?: string;

  quote?: Record<
    string,
    unknown
  >;

  data?: Record<
    string,
    unknown
  >;

  results?: Record<
    string,
    unknown
  >;

  error?: string;
};

export type QuoteLoadResult = {
  quote: AMSALiveQuote | null;

  durationMs: number;

  warning: string | null;
};

export async function loadLiveQuote({
  origin,
  symbol,
}: {
  origin: string;
  symbol: string;
}): Promise<QuoteLoadResult> {
  const url =
    new URL(
      "/api/massive/quote",
      origin,
    );

  url.searchParams.set(
    "symbol",
    symbol,
  );

  const response =
    await fetchJson<QuotePayload>(
      url.toString(),
      {
        timeoutMs: 7_000,
        cache: "no-store",
      },
    );

  if (
    !response.ok ||
    !response.data
  ) {
    return {
      quote: null,

      durationMs:
        response.durationMs,

      warning:
        response.error ??
        "Live quote was unavailable.",
    };
  }

  const quote =
    normalizeQuote(
      response.data,
      symbol,
    );

  return {
    quote,

    durationMs:
      response.durationMs,

    warning:
      quote
        ? null
        : "Quote response contained no valid price.",
  };
}

function normalizeQuote(
  payload: QuotePayload,
  symbol: string,
): AMSALiveQuote | null {
  const nested =
    firstObject([
      payload.quote,
      payload.data,
      payload.results,
    ]);

  const combined = {
    ...payload,
    ...(nested ?? {}),
  } as Record<
    string,
    unknown
  >;

  const price =
    firstNumber(
      combined,
      [
        "price",
        "currentPrice",
        "last",
        "lastPrice",
        "c",
        "p",
      ],
    );

  if (
    price === null ||
    price <= 0
  ) {
    return null;
  }

  const previousClose =
    firstNumber(
      combined,
      [
        "previousClose",
        "prevClose",
        "pc",
      ],
    );

  const explicitChange =
    firstNumber(
      combined,
      ["change", "d"],
    );

  const explicitPercent =
    firstNumber(
      combined,
      [
        "changePercent",
        "percentChange",
        "dp",
      ],
    );

  const calculatedChange =
    previousClose !== null
      ? price -
        previousClose
      : null;

  const calculatedPercent =
    previousClose !== null &&
    previousClose !== 0
      ? (
          price -
          previousClose
        ) /
        previousClose *
        100
      : null;

  const timestampValue =
    combined.timestamp ??
    combined.updatedAt ??
    combined.time ??
    combined.t ??
    null;

  return {
    symbol:
      String(
        combined.symbol ??
        symbol,
      ).toUpperCase(),

    price:
      roundPrice(price),

    previousClose:
      roundPrice(
        previousClose,
      ),

    change:
      roundValue(
        explicitChange ??
        calculatedChange,
        4,
      ),

    changePercent:
      roundValue(
        explicitPercent ??
        calculatedPercent,
      ),

    open:
      roundPrice(
        firstNumber(
          combined,
          ["open", "o"],
        ),
      ),

    high:
      roundPrice(
        firstNumber(
          combined,
          ["high", "h"],
        ),
      ),

    low:
      roundPrice(
        firstNumber(
          combined,
          ["low", "l"],
        ),
      ),

    volume:
      firstNumber(
        combined,
        ["volume", "v"],
      ),

    bid:
      roundPrice(
        firstNumber(
          combined,
          ["bid", "bp"],
        ),
      ),

    ask:
      roundPrice(
        firstNumber(
          combined,
          ["ask", "ap"],
        ),
      ),

    marketStatus:
      typeof combined
        .marketStatus ===
        "string"
        ? combined
            .marketStatus
        : null,

    timestamp:
      normalizeTimestamp(
        timestampValue,
      ),

    source:
      "Massive",
  };
}

function firstObject(
  values: unknown[],
): Record<
  string,
  unknown
> | null {
  return (
    values.find(
      (value) =>
        value !== null &&
        typeof value ===
          "object" &&
        !Array.isArray(
          value,
        ),
    ) as Record<
      string,
      unknown
    > | undefined
  ) ?? null;
}

function firstNumber(
  source: Record<
    string,
    unknown
  >,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value =
      source[key];

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

      if (
        isFiniteNumber(
          parsed,
        )
      ) {
        return parsed;
      }
    }
  }

  return null;
}

function normalizeTimestamp(
  value: unknown,
): string | null {
  if (
    typeof value ===
      "string"
  ) {
    const date =
      new Date(value);

    return Number.isFinite(
      date.getTime(),
    )
      ? date.toISOString()
      : null;
  }

  if (
    typeof value ===
      "number" &&
    Number.isFinite(value)
  ) {
    const milliseconds =
      value <
      10_000_000_000
        ? value * 1000
        : value;

    return new Date(
      milliseconds,
    ).toISOString();
  }

  return null;
}

function roundPrice(
  value: number | null,
): number | null {
  if (
    value === null ||
    !isFiniteNumber(value)
  ) {
    return null;
  }

  if (value >= 1000) {
    return round(value, 1);
  }

  if (value >= 1) {
    return round(value, 2);
  }

  return round(value, 4);
}

function roundValue(
  value: number | null,
  digits = 2,
): number | null {
  if (
    value === null ||
    !isFiniteNumber(value)
  ) {
    return null;
  }

  return round(value, digits);
}