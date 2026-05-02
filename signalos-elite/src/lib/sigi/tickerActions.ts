export function cleanTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z.]/g, "");
}

export function buildAnalyzeTickerMessage(ticker: string) {
  return `Analyze ${cleanTicker(ticker)}`;
}

export function buildStockPageUrl(ticker: string) {
  return `/stocks/${cleanTicker(ticker)}`;
}

export function buildLiveChartUrl(ticker: string) {
  return `/stocks/${cleanTicker(ticker)}/live`;
}