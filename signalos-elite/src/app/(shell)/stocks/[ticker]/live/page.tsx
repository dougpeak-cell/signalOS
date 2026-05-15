import GenericStockView, {
  type GenericStockViewContext,
} from "@/components/stocks/GenericStockView";

type PageProps = {
  params: Promise<{ ticker: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function buildStockSummaryTarget(
  ticker: string,
  searchParams: Record<string, string | string[] | undefined>
) {
  const normalizedTicker = String(ticker ?? "").trim().toUpperCase();
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === "string") {
          params.append(key, entry);
        }
      }
      continue;
    }

    if (typeof value === "string") {
      params.set(key, value);
    }
  }

  const query = params.toString();
  const basePath = `/stocks/${encodeURIComponent(normalizedTicker)}`;

  return query ? `${basePath}?${query}` : basePath;
}

function buildLiveContext(
  ticker: string,
  searchParams: Record<string, string | string[] | undefined>
): GenericStockViewContext {
  const normalizedTicker = String(ticker ?? "").trim().toUpperCase();

  return {
    badge: "Live Surface",
    backHref: buildStockSummaryTarget(normalizedTicker, searchParams),
    backLabel: "Back to Stock",
    subtitle: `Real-time stock surface for ${normalizedTicker}.`,
  };
}

export default async function StockLivePageRedirect({
  params,
  searchParams,
}: PageProps) {
  const { ticker } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  return (
    <GenericStockView
      ticker={ticker}
      context={buildLiveContext(ticker, resolvedSearchParams)}
    />
  );
}
