import { getMassiveFundamentals } from "@/lib/market/massiveFundamentals";

export type ResolvedSymbolClassification = {
  companyName?: string | null;
  sector?: string | null;
  industry?: string | null;
};

const CLASSIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

const classificationCache = new Map<
  string,
  {
    expiresAt: number;
    value: ResolvedSymbolClassification | null;
  }
>();

function normalizeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export async function resolveSymbolClassification(
  symbol: string,
): Promise<ResolvedSymbolClassification | null> {
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (!normalizedSymbol) {
    return null;
  }

  const cached = classificationCache.get(normalizedSymbol);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const fundamentals = await getMassiveFundamentals(
    normalizedSymbol,
    { profile: "discovery" },
  );

  const resolved = {
    companyName: normalizeText(fundamentals.name),
    sector: normalizeText(fundamentals.sector),
    industry: normalizeText(fundamentals.industry),
  };

  const hasClassification = Boolean(
    resolved.companyName || resolved.sector || resolved.industry,
  );

  const value = hasClassification ? resolved : null;

  classificationCache.set(normalizedSymbol, {
    expiresAt: Date.now() + CLASSIFICATION_TTL_MS,
    value,
  });

  return value;
}