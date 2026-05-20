import GenericStockView from "@/components/stocks/GenericStockView";
import StockPremiumAccessGate from "@/components/access/StockPremiumAccessGate";

type PageProps = {
  params: Promise<{
    ticker: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StockDetailPage({ params, searchParams }: PageProps) {
  const { ticker } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const isMobilePreview = resolvedSearchParams.mobilePreview === "1";

  return (
    <StockPremiumAccessGate ticker={ticker}>
      <GenericStockView ticker={ticker} isMobilePreview={isMobilePreview} />
    </StockPremiumAccessGate>
  );
}