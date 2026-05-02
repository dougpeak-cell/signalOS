export function stockPath(ticker?: string | null, source?: string) {
  const symbol = String(ticker ?? "").trim().toUpperCase();

  if (!symbol) return "/stocks";
  if (!source) return `/stocks/${encodeURIComponent(symbol)}`;

  return `/stocks/${encodeURIComponent(symbol)}?source=${encodeURIComponent(source)}`;
}