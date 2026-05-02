import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ ticker: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function buildRedirectTarget(
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

export default async function StockLivePageRedirect({
  params,
  searchParams,
}: PageProps) {
  const { ticker } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  redirect(buildRedirectTarget(ticker, resolvedSearchParams));
}
