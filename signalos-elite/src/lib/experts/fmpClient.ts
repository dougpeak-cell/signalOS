export type FmpRow = Record<string, unknown>;

export class FmpDataError extends Error {
  constructor(message: string, public readonly status: number = 502) {
    super(message);
    this.name = "FmpDataError";
  }
}

export async function fetchFmpRows(
  path: string,
  params: Record<string, string>,
  revalidate: number
): Promise<FmpRow[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) throw new FmpDataError("FMP_API_KEY is not configured on the server.", 503);
  const url = new URL(`https://financialmodelingprep.com/stable/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("apikey", apiKey);
  let response: Response;
  try {
    response = await fetch(url, { next: { revalidate }, signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new FmpDataError("FMP could not be reached. Please retry.");
  }
  if (response.status === 402) {
    throw new FmpDataError("Your FMP subscription does not include the requested endpoint. Enable access, then retry.", 503);
  }
  if (response.status === 401 || response.status === 403) {
    throw new FmpDataError("FMP rejected access. Check the server API key and endpoint permissions.", 503);
  }
  if (!response.ok) throw new FmpDataError(`FMP data request failed (HTTP ${response.status}). Please retry.`);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new FmpDataError("FMP returned an unreadable data response.");
  }
  if (!Array.isArray(payload) || payload.some((row) => !row || typeof row !== "object" || Array.isArray(row))) {
    throw new FmpDataError("FMP returned an unexpected data format. No research was inferred.");
  }
  return payload as FmpRow[];
}
