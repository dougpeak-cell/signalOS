import GenericStockView from "@/components/stocks/GenericStockView";

type PageProps = {
  params: Promise<{
    ticker: string;
  }>;
};

export default async function StockDetailPage({ params }: PageProps) {
  const { ticker } = await params;
  return <GenericStockView ticker={ticker} />;
}