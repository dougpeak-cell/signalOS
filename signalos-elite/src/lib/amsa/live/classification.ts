import type {
  AMSASymbolClassification,
} from "../types";

import {
  fetchJson,
} from "./fetchJson";

/* =========================================================
   SYMBOL CLASSIFICATION ENGINE

   Attempts:
   1. Existing SigiOS company/profile API
   2. Static symbol fallback
   3. Unavailable classification

   Change PROFILE_ROUTE below if your current route differs.
========================================================= */

const PROFILE_ROUTE =
  "/api/company-profile";

type ProfilePayload = {
  symbol?: string;

  companyName?: string;
  name?: string;

  sector?: string;
  industry?: string;

  profile?: Record<
    string,
    unknown
  >;

  data?: Record<
    string,
    unknown
  >;

  error?: string;
};

const SECTOR_ETFS:
  Record<string, string> = {
    Technology: "XLK",

    "Communication Services":
      "XLC",

    "Consumer Cyclical":
      "XLY",

    "Consumer Discretionary":
      "XLY",

    "Consumer Defensive":
      "XLP",

    "Consumer Staples":
      "XLP",

    Energy: "XLE",
    Financials: "XLF",

    "Financial Services":
      "XLF",

    Healthcare: "XLV",
    Industrials: "XLI",

    "Basic Materials":
      "XLB",

    Materials: "XLB",

    "Real Estate":
      "XLRE",

    Utilities: "XLU",
  };

const STATIC_CLASSIFICATIONS:
  Record<
    string,
    {
      companyName: string;
      sector: string;
      industry: string;
    }
  > = {
    AAPL: {
      companyName:
        "Apple Inc.",

      sector:
        "Technology",

      industry:
        "Consumer Electronics",
    },

    AMD: {
      companyName:
        "Advanced Micro Devices",

      sector:
        "Technology",

      industry:
        "Semiconductors",
    },

    AMZN: {
      companyName:
        "Amazon.com",

      sector:
        "Consumer Discretionary",

      industry:
        "Internet Retail",
    },

    AVGO: {
      companyName:
        "Broadcom",

      sector:
        "Technology",

      industry:
        "Semiconductors",
    },

    GOOGL: {
      companyName:
        "Alphabet",

      sector:
        "Communication Services",

      industry:
        "Internet Content & Information",
    },

    META: {
      companyName:
        "Meta Platforms",

      sector:
        "Communication Services",

      industry:
        "Internet Content & Information",
    },

    MSFT: {
      companyName:
        "Microsoft",

      sector:
        "Technology",

      industry:
        "Software—Infrastructure",
    },

    MU: {
      companyName:
        "Micron Technology",

      sector:
        "Technology",

      industry:
        "Semiconductors",
    },

    NVDA: {
      companyName:
        "NVIDIA",

      sector:
        "Technology",

      industry:
        "Semiconductors",
    },

    PLTR: {
      companyName:
        "Palantir Technologies",

      sector:
        "Technology",

      industry:
        "Software—Infrastructure",
    },

    TSLA: {
      companyName:
        "Tesla",

      sector:
        "Consumer Discretionary",

      industry:
        "Auto Manufacturers",
    },
  };

export async function resolveSymbolClassification({
  origin,
  symbol,
}: {
  origin: string;
  symbol: string;
}): Promise<{
  classification:
    AMSASymbolClassification;

  durationMs: number;

  warning: string | null;
}> {
  const normalizedSymbol =
    symbol.toUpperCase();

  const apiResult =
    await loadProfileClassification({
      origin,
      symbol:
        normalizedSymbol,
    });

  if (
    apiResult.classification
  ) {
    return {
      classification:
        apiResult.classification,

      durationMs:
        apiResult.durationMs,

      warning: null,
    };
  }

  const staticResult =
    STATIC_CLASSIFICATIONS[
      normalizedSymbol
    ];

  if (staticResult) {
    return {
      classification: {
        symbol:
          normalizedSymbol,

        companyName:
          staticResult.companyName,

        sector:
          staticResult.sector,

        industry:
          staticResult.industry,

        sectorEtf:
          sectorToEtf(
            staticResult.sector,
          ),

        classificationConfidence:
          70,

        source:
          "static-map",
      },

      durationMs:
        apiResult.durationMs,

      warning:
        apiResult.warning,
    };
  }

  return {
    classification: {
      symbol:
        normalizedSymbol,

      companyName: null,
      sector: null,
      industry: null,
      sectorEtf: null,

      classificationConfidence:
        0,

      source:
        "unavailable",
    },

    durationMs:
      apiResult.durationMs,

    warning:
      apiResult.warning ??
      "Sector and industry classification are unavailable.",
  };
}

export function sectorToEtf(
  sector:
    | string
    | null
    | undefined,
): string | null {
  if (!sector) {
    return null;
  }

  const exact =
    SECTOR_ETFS[sector];

  if (exact) {
    return exact;
  }

  const normalized =
    sector
      .trim()
      .toLowerCase();

  const matchingEntry =
    Object.entries(
      SECTOR_ETFS,
    ).find(
      ([name]) =>
        name.toLowerCase() ===
        normalized,
    );

  return (
    matchingEntry?.[1] ??
    null
  );
}

async function loadProfileClassification({
  origin,
  symbol,
}: {
  origin: string;
  symbol: string;
}): Promise<{
  classification:
    | AMSASymbolClassification
    | null;

  durationMs: number;

  warning: string | null;
}> {
  const url =
    new URL(
      PROFILE_ROUTE,
      origin,
    );

  url.searchParams.set(
    "ticker",
    symbol,
  );

  const response =
    await fetchJson<ProfilePayload>(
      url.toString(),
      {
        timeoutMs: 6_000,

        next: {
          revalidate: 86_400,
          tags: [
            `stock-profile-${symbol}`,
          ],
        },
      },
    );

  if (
    !response.ok ||
    !response.data
  ) {
    return {
      classification: null,

      durationMs:
        response.durationMs,

      warning:
        response.error,
    };
  }

  const nested =
    firstObject([
      response.data.profile,
      response.data.data,
    ]);

  const combined = {
    ...response.data,
    ...(nested ?? {}),
  } as Record<
    string,
    unknown
  >;

  const sector =
    stringValue(
      combined.sector,
    );

  const industry =
    stringValue(
      combined.industry,
    );

  if (
    !sector &&
    !industry
  ) {
    return {
      classification: null,

      durationMs:
        response.durationMs,

      warning:
        "Company profile did not contain a sector or industry.",
    };
  }

  return {
    classification: {
      symbol,

      companyName:
        stringValue(
          combined.companyName,
        ) ??
        stringValue(
          combined.name,
        ),

      sector,
      industry,

      sectorEtf:
        sectorToEtf(
          sector,
        ),

      classificationConfidence:
        sector &&
        industry
          ? 95
          : 78,

      source:
        "profile-api",
    },

    durationMs:
      response.durationMs,

    warning: null,
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

function stringValue(
  value: unknown,
): string | null {
  return typeof value ===
      "string" &&
    value.trim()
    ? value.trim()
    : null;
}