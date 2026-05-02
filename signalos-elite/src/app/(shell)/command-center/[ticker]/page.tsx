import GenericStockView, {
  type GenericStockViewContext,
} from "@/components/stocks/GenericStockView";

type PageProps = {
  params: Promise<{
    ticker: string;
  }>;
  searchParams?: Promise<{
    source?: string;
  }>;
};

export default async function CommandCenterStockPage({
  params,
  searchParams,
}: PageProps) {
  const { ticker } = await params;
  const query = (await searchParams) ?? {};
  const sourceLabel = typeof query.source === "string" ? query.source.trim() : "";

  const context: GenericStockViewContext = {
    badge: "From Command Center",
    backHref: "/today",
    backLabel: "Back to command center",
    subtitle: sourceLabel ? `Opened from ${sourceLabel}` : undefined,
  };

  return <GenericStockView ticker={ticker} context={context} />;
}