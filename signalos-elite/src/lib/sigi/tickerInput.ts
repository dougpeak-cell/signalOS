export function normalizeTickerInput(value: string) {
  return value.trim().toUpperCase().replace(/^\$/, "");
}

export function looksLikeTicker(value: string) {
  const ticker = normalizeTickerInput(value);
  return /^[A-Z]{1,5}$/.test(ticker);
}