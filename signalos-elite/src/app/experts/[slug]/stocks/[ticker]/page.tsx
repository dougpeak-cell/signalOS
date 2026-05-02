import GenericStockView, {
  type GenericStockViewContext,
} from "@/components/stocks/GenericStockView";

type PageProps = {
  params: Promise<{
    slug: string;
    ticker: string;
  }>;
  searchParams?: Promise<{
    analyst?: string;
  }>;
};

export default async function ExpertStockHandoffPage({
  params,
  searchParams,
}: PageProps) {
  const { slug, ticker } = await params;
  const query = (await searchParams) ?? {};
  const analystName = typeof query.analyst === "string" ? query.analyst.trim() : "";

  const context: GenericStockViewContext = {
    badge: "From Analyst Profile",
    backHref: `/experts/${slug}`,
    backLabel: "Back to analyst profile",
    subtitle: analystName ? `Coverage handoff from ${analystName}` : undefined,
  };

  return <GenericStockView ticker={ticker} context={context} />;
}