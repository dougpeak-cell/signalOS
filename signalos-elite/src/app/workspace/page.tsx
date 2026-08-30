import { Suspense } from "react";
import TopNav from "@/components/shell/TopNav";
import SigiWorkspace from "@/components/workspace/SigiWorkspace";
import { getStoredMarketContext } from "@/lib/intelligence/contextStore";
import { getSigiSettingsViewForCurrentUser } from "@/lib/sigi/settings";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string | string[] }>;
}) {
  const querySymbol = (await searchParams).symbol;
  const requestedSymbol = (Array.isArray(querySymbol) ? querySymbol[0] : querySymbol)
    ?.trim()
    .toUpperCase() || "NVDA";
  const [storedMarketContext, settings] = await Promise.all([
    getStoredMarketContext(),
    getSigiSettingsViewForCurrentUser(),
  ]);
  const canEvaluateStocks = settings.hasSmartFeatures || settings.hasProFeatures;
  const initialSymbol = canEvaluateStocks || requestedSymbol === "MSFT" || requestedSymbol === "NVDA"
    ? requestedSymbol
    : "NVDA";

  return (
    <>
      <Suspense fallback={null}>
        <TopNav hasAccountSession={Boolean(storedMarketContext.userId)} />
      </Suspense>
      <SigiWorkspace
        initialSymbol={initialSymbol}
        canEvaluateStocks={canEvaluateStocks}
      />
    </>
  );
}
