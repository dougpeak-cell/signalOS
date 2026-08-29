import { Suspense } from "react";
import TopNav from "@/components/shell/TopNav";
import SigiWorkspace from "@/components/workspace/SigiWorkspace";
import { getStoredMarketContext } from "@/lib/intelligence/contextStore";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string | string[] }>;
}) {
  const querySymbol = (await searchParams).symbol;
  const initialSymbol = (Array.isArray(querySymbol) ? querySymbol[0] : querySymbol)
    ?.trim()
    .toUpperCase() || "NVDA";
  const storedMarketContext = await getStoredMarketContext();

  return (
    <>
      <Suspense fallback={null}>
        <TopNav hasAccountSession={Boolean(storedMarketContext.userId)} />
      </Suspense>
      <SigiWorkspace initialSymbol={initialSymbol} />
    </>
  );
}
