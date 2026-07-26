type CachedClassification = {
  companyName: string | null;
  sector: string | null;
  industry: string | null;
  expiresAt: number;
};

const cache = new Map<string, CachedClassification>();

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function getCachedClassification(symbol: string) {
  const key = symbol.trim().toUpperCase();
  const cached = cache.get(key);

  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return cached;
}

export function setCachedClassification(
  symbol: string,
  value: {
    companyName: string | null;
    sector: string | null;
    industry: string | null;
  },
) {
  cache.set(symbol.trim().toUpperCase(), {
    ...value,
    expiresAt: Date.now() + TTL_MS,
  });
}