export function buildSigiResponse({
  ticker,
  bias,
  confidence,
  setup,
}: {
  ticker: string;
  bias: string;
  confidence: number;
  setup?: string;
}) {
  return `Sigi is tracking ${ticker} with ${bias.toLowerCase()} bias and ${confidence}% confidence.\n\nCurrent structure suggests ${bias.toLowerCase()} continuation if price holds above VWAP.\n\nPrimary setup: ${setup ?? "structure continuation"}.\n\nWhat to watch:\n• Liquidity sweep near session high\n• VWAP reclaim or rejection\n• Momentum confirmation on volume expansion\n\nTrade idea:\nWait for pullback into VWAP or prior demand zone, then watch for confirmation candle.\n\nRisk view:\nFailure below VWAP invalidates bullish structure.\n\nSigi will continue monitoring live structure.`;
}
