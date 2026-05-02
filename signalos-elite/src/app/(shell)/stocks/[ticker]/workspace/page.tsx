import { ClientProvider } from "@/components/ClientProvider";
import StockTradingWorkspace from "@/components/workspace/StockTradingWorkspace";
import { getStockWorkspaceData } from "@/lib/workspace/stockWorkspaceData";

export default async function StockWorkspacePage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const data = await getStockWorkspaceData(ticker);

  return (
    <div className="min-h-screen bg-black text-white">
      <ClientProvider tickers={[data.liveTicker]} sparklineTickers={[data.liveTicker]} />
      <div className="mx-auto w-full max-w-none px-4 pb-10 pt-4 sm:px-5 xl:px-6">
        <StockTradingWorkspace data={data} />
      </div>
    </div>
  );
}