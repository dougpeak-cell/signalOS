import {
  getClassificationFallback,
} from "./classificationFallbacks";
import {
  getCachedClassification,
  setCachedClassification,
} from "./classificationCache";

const BATCH_SIZE = 4;
const CLASSIFICATION_TIMEOUT_MS = 6_000;

type PortfolioHolding = {
  symbol: string;
  companyName?: string | null;
  sector?: string | null;
  industry?: string | null;
  [key: string]: unknown;
};

type ProviderResolver = (
  symbol: string,
) => Promise<{
  companyName?: string | null;
  name?: string | null;
  sector?: string | null;
  gicsSector?: string | null;
  industry?: string | null;
  finnhubIndustry?: string | null;
  gicsIndustry?: string | null;
  sicDescription?: string | null;
} | null>;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error("Classification request timed out")),
        timeoutMs,
      );
    }),
  ]);
}

function firstText(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }

  return null;
}

export async function classifyPortfolioHoldings<T extends PortfolioHolding>(
  holdings: T[],
  resolveProviderProfile: ProviderResolver,
): Promise<T[]> {
  const output: T[] = [];

  for (let index = 0; index < holdings.length; index += BATCH_SIZE) {
    const batch = holdings.slice(index, index + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (holding) => {
        const symbol = holding.symbol.trim().toUpperCase();

        if (holding.sector && holding.industry) {
          return holding;
        }

        const cached = getCachedClassification(symbol);

        if (cached?.sector && cached?.industry) {
          return {
            ...holding,
            symbol,
            companyName: holding.companyName ?? cached.companyName,
            sector: holding.sector ?? cached.sector,
            industry: holding.industry ?? cached.industry,
          };
        }

        let providerProfile:
          | Awaited<ReturnType<ProviderResolver>>
          | null = null;

        try {
          providerProfile = await withTimeout(
            resolveProviderProfile(symbol),
            CLASSIFICATION_TIMEOUT_MS,
          );
        } catch (error) {
          console.warn("Portfolio classification provider failed", {
            symbol,
            error,
          });
        }

        const fallback = getClassificationFallback(symbol);

        const resolved = {
          ...holding,
          symbol,
          companyName:
            holding.companyName ??
            firstText(
              providerProfile?.companyName,
              providerProfile?.name,
              fallback?.companyName,
            ),
          sector:
            holding.sector ??
            firstText(
              providerProfile?.sector,
              providerProfile?.gicsSector,
              fallback?.sector,
            ),
          industry:
            holding.industry ??
            firstText(
              providerProfile?.industry,
              providerProfile?.finnhubIndustry,
              providerProfile?.gicsIndustry,
              providerProfile?.sicDescription,
              fallback?.industry,
            ),
        };

        if (resolved.sector || resolved.industry) {
          setCachedClassification(symbol, {
            companyName: resolved.companyName ?? null,
            sector: resolved.sector ?? null,
            industry: resolved.industry ?? null,
          });
        }

        return resolved;
      }),
    );

    output.push(...results);
  }

  return output;
}