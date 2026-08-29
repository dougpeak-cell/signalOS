import { Suspense } from "react";
import TopNav from "@/components/shell/TopNav";
import SigiWorkspace from "@/components/workspace/SigiWorkspace";
import { getStoredMarketContext } from "@/lib/intelligence/contextStore";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const storedMarketContext = await getStoredMarketContext();

  return (
    <>
      <Suspense fallback={null}>
        <TopNav hasAccountSession={Boolean(storedMarketContext.userId)} />
      </Suspense>
      <SigiWorkspace initialSymbol="NVDA" />
    </>
  );
}
